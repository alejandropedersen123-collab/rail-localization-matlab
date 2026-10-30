'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engine=require('../viewer/network-engine.js');
const metrics=require('../viewer/analytics.js');
const root=path.resolve(__dirname,'..');
const project=id=>JSON.parse(fs.readFileSync(path.join(root,'networks',id+'.json'),'utf8'));
const payload=file=>JSON.parse(fs.readFileSync(file,'utf8').match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);

test('Browser reproduces every sampled physical state and arrival of three MATLAB networks',async()=>{
  const references=JSON.parse(fs.readFileSync(path.join(root,'results_configurable/matlab-reference.json'),'utf8'));
  for(const ref of references) {
    const actual=(await engine.run(project(ref.id))).scenarios[0];
    assert.deepEqual(actual.time,ref.time);
    assert.deepEqual(actual.summary.map(t=>t.Arrival_s),ref.summary.map(t=>t.Arrival_s));
    assert.equal(actual.audit.Completed,ref.trains.length);
    assert.equal(actual.audit.BlockConflicts+actual.audit.AuthorityViolations+actual.audit.SpeedLimitViolations,0);
    ref.trains.forEach((tr,i)=>tr.samples.forEach((row,j)=>row.forEach((expected,k)=>{
      const value=actual.trains[i].samples[j][k];
      if(expected===null)assert.equal(value,null);
      else assert.ok(Math.abs(value-expected)<1e-7,`${ref.id}: train ${i}, frame ${j}, field ${k}`);
    })));
  }
});

test('Madrid browser nominal agrees with the published MATLAB arrivals',async()=>{
  const expected=payload(path.join(root,'results_network/visor.html')).scenarios[0];
  const actual=(await engine.run(project('madrid-andalucia'))).scenarios[0];
  assert.deepEqual(actual.summary.map(t=>t.Arrival_s),expected.summary.map(t=>t.Arrival_s));
  assert.equal(actual.audit.Completed,8);
  assert.equal(actual.audit.BlockConflicts+actual.audit.AuthorityViolations+actual.audit.SpeedLimitViolations,0);
});

test('Gauge mismatch, disconnected or repeated routes and overlong trains are rejected',()=>{
  let p=project('regional-metrico');p.trains[0].gauge_mm=1435;assert.throws(()=>engine.validate(p),/ancho/);
  p=project('regional-metrico');p.trains[0].route=[1,3];assert.throws(()=>engine.validate(p),/desconectados/);
  p=project('regional-metrico');p.trains[0].route=[1,-1,1,-2,3];assert.throws(()=>engine.validate(p),/repetir/);
  p=project('regional-metrico');p.trains[0].length_m=1000;assert.throws(()=>engine.validate(p),/apartadero/);
  p=project('regional-metrico');p.gpsFaults[0].edge=99;assert.throws(()=>engine.validate(p),/GPS/);
  p=project('madrid-andalucia');p.nodes[5].junction='none';assert.throws(()=>engine.validate(p),/convergencia/);
});

test('Mixed edge directions locate vehicles in the right canonical coordinate',()=>{
  const c=engine.compile(project('regional-metrico'));
  assert.deepEqual(c.trains[0].dirs,[1,-1,1]);
  const pos=engine.locate(c.trains[0],9000,c.project);
  assert.equal(pos.e,1);assert.equal(pos.x,5000);
  const edges=c.project.edges.map(e=>({ID:e.id,Length_km:e.length_m/1000}));
  assert.equal(metrics.commonTrunkKm([9000,10,1,10000,null,0,2,5000],edges,[1,-2,3]),9);
});

test('GPS windows have precise boundaries; missing coverage stays unknown',()=>{
  const p=project('regional-metrico');
  assert.equal(engine.gpsStatus(p,2,299),'available');
  assert.equal(engine.gpsStatus(p,2,300),'unavailable');
  assert.equal(engine.gpsStatus(p,2,1499),'unavailable');
  assert.equal(engine.gpsStatus(p,2,1500),'available');
  assert.equal(engine.gpsStatus(p,3,1500),'unknown');
  delete p.edges[0].gps;
  assert.equal(engine.gpsStatus(engine.validate(p),1,0),'unknown');
});

test('GPS overlays do not alter the ideal-position regulator',async()=>{
  const p=project('metro-anillo'),a=(await engine.run(p)).scenarios[0];
  p.edges.forEach(e=>e.gps='unknown');p.gpsFaults=[];
  const b=(await engine.run(p)).scenarios[0];
  assert.deepEqual(a.summary,b.summary);
  a.trains.forEach((t,i)=>assert.deepEqual(t.samples.map(r=>r.slice(0,10)),b.trains[i].samples.map(r=>r.slice(0,10))));
});

test('More than eight vehicles and early cancellation work without fixed-size assumptions',async()=>{
  const p=project('regional-iberico');p.parameters.duration_s=20;
  p.trains=Array.from({length:9},(_,i)=>({...p.trains[0],id:'TEST'+i,departure_s:i}));
  const s=(await engine.run(p)).scenarios[0];assert.equal(s.trains.length,9);
  assert.equal(s.audit.Completed,0);assert.equal(s.audit.BlockConflicts+s.audit.AuthorityViolations+s.audit.SpeedLimitViolations,0);
  await assert.rejects(engine.run(p,{cancelled:()=>true}),/cancelado/);
});

test('Singleton MATLAB exports preserve all lists and are accepted by the browser',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(root,'results_configurable/singleton-export.json'),'utf8'));
  assert.equal(d.nodes.length,2);assert.equal(d.edges.length,1);assert.equal(d.scenarios.length,1);
  const s=d.scenarios[0];assert.equal(s.time.length,1);assert.equal(s.trains.length,1);
  assert.equal(s.trains[0].samples.length,1);assert.equal(s.trains[0].samples[0].length,10);
  assert.equal(s.summary.length,1);assert.equal(s.trains[0].route.length,1);
  assert.equal(engine.validate(d.project).trains.length,1);
});

test('Prepared budgets scale quantities and keep labor separate, without visitor price inputs',()=>{
  const small=metrics.prototypeBudget(0),large=metrics.prototypeBudget(2);
  assert.deepEqual(small.material,[670,1310]);assert.deepEqual(small.engineering,[7200,22400]);
  assert.deepEqual(small.total,[7870,23710]);assert.deepEqual(large.material,[3910,7030]);
  assert.deepEqual(large.engineering,[18000,56000]);assert.deepEqual(large.total,[21910,63030]);
  assert.equal(metrics.prototypeBudget(-1),null);
  const html=fs.readFileSync(path.join(root,'results_network/visor.html'),'utf8');
  assert.ok(!/type="number"/.test(html));
  assert.ok(!html.includes('__ENGINE_JS__'));
});
