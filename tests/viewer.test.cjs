'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const m = require('../viewer/analytics.js');
const root = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(root,'results_network/visor.html'),'utf8');
const data = JSON.parse(html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const advance = (s,kind,axles) => m.sectionStep(s,{kind,axles,sequence:s.sequence+1});
test('Cold start cannot confirm a clear section', () => {
  assert.equal(m.sectionStatus(m.newSection()),'unknown');
  assert.equal(m.sectionStatus(m.newSection(true)),'clear');
});
test('Entry, stopping and partial exit preserve occupancy until the last axle', () => {
  let s = advance(m.newSection(true),'entry',4);
  for (let i=0; i<100; i++) s=advance(s,'hold');
  assert.equal(s.count,4); assert.equal(m.sectionStatus(s),'occupied');
  for (let i=0; i<3; i++) {s=advance(s,'exit',1); assert.equal(m.sectionStatus(s),'occupied');}
  s=advance(s,'exit',1); assert.equal(m.sectionStatus(s),'clear');
});
test('Remote link loss neither clears local occupancy nor confirms remote state', () => {
  let s=advance(advance(m.newSection(true),'entry',4),'link_down');
  assert.equal(m.sectionStatus(s),'occupied'); assert.equal(m.sectionStatus(s,true),'unknown');
  s=advance(s,'exit',4);
  assert.equal(m.sectionStatus(s),'clear'); assert.equal(m.sectionStatus(s,true),'unknown');
  s=advance(s,'link_up'); assert.equal(m.sectionStatus(s,true),'clear');
});
test('Detector fault stays latched after balanced count and link recovery', () => {
  let s=advance(advance(m.newSection(true),'entry',4),'detector_fault');
  s=advance(advance(advance(s,'link_down'),'exit',4),'link_up');
  assert.equal(s.count,0); assert.equal(m.sectionStatus(s),'unknown'); assert.equal(m.sectionStatus(s,true),'unknown');
});
test('Invalid, missing and duplicate events cannot produce a clear state', () => {
  for (const axles of [-1,0,0.5,NaN,Infinity]) assert.equal(m.sectionStatus(advance(m.newSection(true),'entry',axles)),'unknown');
  let s=advance(m.newSection(true),'exit',4); assert.equal(m.sectionStatus(s),'unknown');
  s=advance(s,'entry',4); assert.equal(s.count,0); assert.equal(m.sectionStatus(s),'unknown');
  for (const sequence of [0,2]) assert.equal(m.sectionStatus(m.sectionStep(m.newSection(true),{kind:'exit',axles:1,sequence})),'unknown');
});
test('Cost model reveals loss as well as savings and has no default prices', () => {
  const p={trains:8,years:5,onboard:2500,integration:60000,validation:15000,trackside:10000,annual:17000,avoided:30000};
  const r=m.lifecycleCost(p);
  assert.equal(r.investment,105000); assert.equal(r.cost,190000); assert.equal(r.net,-40000);
  assert.equal(r.requiredAnnualBenefit,38000); assert.equal(r.paybackYears,105000/13000);
  assert.equal(m.lifecycleCost({...p,avoided:50000}).net,60000);
  assert.equal(m.lifecycleCost({...p,avoided:10000}).paybackYears,null);
  assert.equal(m.lifecycleCost({...p,onboard:NaN}),null);
  assert.equal(m.lifecycleCost({...p,trains:1.5}),null);
  assert.equal(m.lifecycleCost({...p,annual:-1}),null);
});
test('Arrival comparison preserves negative changes and missing baselines', () => {
  const scenario={summary:[{Train:'A',Arrival_s:90},{Train:'B',Arrival_s:120},{Train:'C',Arrival_s:null}]};
  const baseline={summary:[{Train:'A',Arrival_s:100},{Train:'B',Arrival_s:100},{Train:'C',Arrival_s:100}]};
  assert.deepEqual(m.compareArrivals(scenario,baseline).map(r=>r.delta),[-10,20,null]);
  assert.equal(m.compareArrivals(scenario,{summary:[]})[0].delta,null);
});
test('Space-time excludes branches and inactive trains; canonical coordinates serve both directions', () => {
  const row=[0,10,1,0,null,0,5,14330];
  assert.ok(Math.abs(m.commonTrunkKm(row,data.edges)-358)<1e-9);
  assert.equal(m.commonTrunkKm([...row.slice(0,6),7,0],data.edges),null);
  assert.equal(m.commonTrunkKm([0,0,0,0,null,0,1,0],data.edges),null);
  assert.equal(m.commonTrunkKm([0,0,3,0,null,0,1,0],data.edges),null);
});
test('Generated evidence preserves every CSV scenario and numerical result', () => {
  const lines=fs.readFileSync(path.join(root,'results_v2/summary.csv'),'utf8').trim().split(/\r?\n/);
  const keys=lines.shift().split(',');
  assert.equal(data.sensorEvidence.length,68);
  lines.forEach((line,i) => line.split(',').forEach((value,j) => {
    const actual=data.sensorEvidence[i][keys[j]], expected=Number(value);
    if (keys[j] === 'Scenario' || keys[j] === 'Architecture') assert.equal(actual,value);
    else if (!Number.isFinite(expected)) assert.equal(actual,null);
    else assert.ok(Math.abs(actual-expected)<1e-9,keys[j]);
  }));
});

test('Every published experiment has an explanation and the expected outcomes for all four configurations',()=>{
  // Order: GNSS, GNSS + controls, fusion, fusion + controls.
  const expected=['PPPP','PPPP','NPAP','PPAP','NPNP','PPPP','NANA','NNNN','PPPP','PAPP','AAAA','NANA','NNNN','NNNN','NANA','PPNP','NNNN'];
  const short={positive:'P',caution:'A',negative:'N'};
  for(let id=1;id<=17;id++) {
    const rows=data.sensorEvidence.filter(r=>r.ScenarioID===id),reading=m.experimentReading(rows);
    assert.equal(rows.map(r=>short[m.assessEvidence(r).status]).join(''),expected[id-1],'Scenario '+id);
    assert.ok(reading.summary.length>50 && reading.next.length>20);
    assert.ok(!reading.summary.includes('sin dato') && !reading.summary.includes('No hay una explicación'));
    assert.equal(Object.values(reading.counts).reduce((a,b)=>a+b),4);
  }
});

test('Accurate position cannot make failed braking or a wrong track green',()=>{
  for(const id of [8,13,14]) {
    const rows=data.sensorEvidence.filter(r=>r.ScenarioID===id);
    assert.equal(m.experimentReading(rows).status,'negative');
    const fusion=rows.find(r=>r.Architecture==='Fusion + controls');
    assert.ok(fusion.OpenRMSE_m<1);
    assert.equal(m.assessEvidence(fusion).status,'negative');
  }
});

test('Precautionary braking differs from false obstacle alarms and unresolved uncertainty',()=>{
  const row=(id,arch='Fusion + controls')=>data.sensorEvidence.find(r=>r.ScenarioID===id && r.Architecture===arch);
  assert.equal(m.assessEvidence(row(10,'GPS + controls')).status,'caution');
  assert.equal(m.assessEvidence(row(17)).status,'negative');
  assert.equal(m.assessEvidence(row(15)).status,'caution');
  assert.equal(m.assessEvidence(row(15,'Fusion')).status,'negative');
  assert.equal(m.assessEvidence(row(11)).status,'caution');
  assert.equal(m.assessEvidence(row(9)).status,'positive');
});

test('Missing evidence, incomplete stopping and the stated coverage threshold cannot give an unjustified green',()=>{
  const row=data.sensorEvidence[0];
  assert.equal(m.assessEvidence({...row,Formal3SigmaCoverage:m.evidenceCoverageFloor}).status,'positive');
  assert.equal(m.assessEvidence({...row,Formal3SigmaCoverage:m.evidenceCoverageFloor-.0001}).status,'caution');
  assert.equal(m.assessEvidence({...row,ClosedStoppedTrials:2}).status,'caution');
  for(const key of ['Runs','OpenRMSE_m','Formal3SigmaCoverage','ClosedCollisionTrials','WrongConfidentTrackFraction']) {
    assert.equal(m.assessEvidence({...row,[key]:null}).status,'caution');
  }
  assert.equal(m.experimentReading([]).status,'caution');
});
test('All network cases retain alignment, completions and source arrival comparisons', () => {
  assert.equal(data.scenarios.length,3);
  for (const s of data.scenarios) {
    assert.equal(s.trains.length,8);
    assert.equal(s.audit.Completed,8);
    assert.equal(s.audit.BlockConflicts+s.audit.AuthorityViolations+s.audit.SpeedLimitViolations,0);
    s.trains.forEach(t=> {assert.equal(t.samples.length,s.time.length); assert.equal(t.samples.at(-1)[2],3);});
  }
  const delay=m.compareArrivals(data.scenarios.find(s=>s.id==='station_delay'),data.scenarios[0]);
  assert.equal(delay[0].delta,1183); assert.equal(delay[1].delta,0);
});
test('Export is self-contained, parses as JavaScript and has unique HTML ids', () => {
  assert.ok(!html.includes('__NETWORK_DATA__') && !html.includes('__APP_JS__'));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
  const code=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  new (require('node:vm').Script)(code);
});
