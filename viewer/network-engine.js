/* Configurable educational traffic model. Position/occupancy are ideal.
   GPS conditions annotate the experiment; they do not feed the regulator. */
(function(root) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const need = (condition,message) => {if (!condition) throw new Error(message);};
  const number = (v,min,max=Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  function routeNodes(route,edges) {
    need(Array.isArray(route) && route.length>0,'La ruta necesita al menos un tramo.');
    need(route.every(e=>Number.isInteger(e) && e!==0 && Math.abs(e)<=edges.length),'La ruta contiene un tramo inexistente.');
    need(new Set(route.map(Math.abs)).size===route.length,'Una ruta no puede repetir un tramo; define otra circulación para la siguiente vuelta.');
    const nodes=[];
    route.forEach((signed,i)=>{
      const e=edges[Math.abs(signed)-1],a=signed>0?e.fromNode:e.toNode,b=signed>0?e.toNode:e.fromNode;
      need(i===0 || nodes.at(-1)===a,'La ruta contiene tramos desconectados.');
      if (!i) nodes.push(a); nodes.push(b);
    });
    return nodes;
  }
  function validate(input) {
    const p=copy(input); need(p && p.version===1,'Formato de red no compatible (version debe ser 1).');
    need(typeof p.id==='string' && typeof p.name==='string' && typeof p.description==='string','Faltan nombre o descripción de la red.');
    const q=p.parameters;
    need(q && ['step_s','sample_s','duration_s','block_m','loop_m','lookahead_m','response_s','reserve_m','release_m','terminal_m','terminal_kmh'].every(k=>number(q[k],0)),'Faltan parámetros o hay valores no válidos.');
    need(number(q.step_s,.2,2) && q.sample_s>=q.step_s && q.duration_s>0,'Paso entre 0,2 y 2 s; duración positiva y muestreo no menor que el paso.');
    need(Math.abs(q.sample_s/q.step_s-Math.round(q.sample_s/q.step_s))<1e-9,'El muestreo debe ser múltiplo del paso.');
    need(q.block_m>=25 && q.loop_m>0 && q.lookahead_m>q.reserve_m,'Cantón mínimo: 25 m. Apartadero positivo. Anticipación mayor que la reserva.');
    need(Array.isArray(p.nodes) && p.nodes.length>=2 && p.nodes.length<=300,'Admite entre 2 y 300 nodos por proyecto.');
    need(Array.isArray(p.edges) && p.edges.length>=1 && p.edges.length<=600,'Admite entre 1 y 600 tramos por proyecto.');
    need(Array.isArray(p.trains) && p.trains.length>=1 && p.trains.length<=64,'Admite entre 1 y 64 circulaciones por proyecto.');
    need(q.duration_s/q.step_s*p.trains.length<=2000000 && q.duration_s/q.sample_s*p.trains.length<=300000,'El ensayo excede el presupuesto de cálculo local. Reduce duración, trenes o frecuencia de muestreo.');
    p.nodes.forEach((n,i)=>{
      need(n.id===i+1 && typeof n.name==='string' && n.name.trim().length>0,'Nodos: IDs consecutivos desde 1 y nombres no vacíos.');
      need(number(n.x,-1e6,1e6) && number(n.y,-1e6,1e6),'Coordenadas de dibujo no válidas.');
      need(typeof n.passingLoop==='boolean' && ['none','directional','exclusive'].includes(n.junction),'Define apartadero y tipo de conflicto de cada nodo.');
      need(['left','right','top','bottom'].includes(n.labelSide),'Posición de etiqueta no válida.');
    });
    p.edges.forEach((e,i)=>{
      need(e.id===i+1 && Number.isInteger(e.fromNode) && Number.isInteger(e.toNode) && e.fromNode>=1 && e.toNode>=1 && e.fromNode<=p.nodes.length && e.toNode<=p.nodes.length && e.fromNode!==e.toNode,'Tramos: revisa IDs, origen y destino.');
      need([1,2].includes(e.tracks),'Usa vía única o doble; para más vías, modela tramos paralelos.');
      need(number(e.length_m,1) && number(e.maxSpeed_kmh,.1,400),'Longitud y velocidad de tramo deben ser positivas.');
      need(Array.isArray(e.gauges_mm) && e.gauges_mm.length>0 && e.gauges_mm.every(g=>Number.isInteger(g) && g>0),'Especifica los anchos de vía de cada tramo en milímetros.');
      const margins=q.loop_m*(Number(p.nodes[e.fromNode-1].passingLoop)+Number(p.nodes[e.toNode-1].passingLoop));
      need(e.length_m>margins,'El tramo '+e.id+' es demasiado corto para los apartaderos configurados.');
      need(['line','source','quality'].every(k=>typeof e[k]==='string'),'Falta la procedencia de un tramo.');
      e.gps=e.gps || 'unknown'; need(['available','unavailable','unknown'].includes(e.gps),'Estado GPS no válido.');
    });
    p.nodes.forEach(n=>need(p.edges.filter(e=>e.fromNode===n.id || e.toNode===n.id).length<=2 || n.junction!=='none','El nodo '+n.id+' tiene una convergencia: configura una reserva exclusiva o direccional.'));
    need(p.edges.reduce((s,e)=>s+Math.ceil(e.length_m/q.block_m)*2+8,0)<=20000,'Demasiados cantones para un ensayo interactivo.');
    const ids=new Set();
    p.trains.forEach(t=>{
      need(typeof t.id==='string' && /^[A-Za-z0-9_-]{1,24}$/.test(t.id) && !ids.has(t.id),'Identificador de tren inválido o repetido.'); ids.add(t.id);
      need(typeof t.label==='string','Falta el nombre de una circulación.');
      need(number(t.departure_s,0) && t.departure_s<q.duration_s,'Salida fuera de la duración del ensayo.');
      need(number(t.length_m,.1) && Number.isInteger(t.gauge_mm) && t.gauge_mm>0,'Longitud o ancho de un tren no válido.');
      need(number(t.maxSpeed_kmh,.1,400) && number(t.acceleration_mps2,.001,3) && number(t.brake_mps2,.001,3),'Velocidad, aceleración o frenado de un tren no válidos.');
      const nodes=routeNodes(t.route,p.edges);
      t.route.forEach(signed=>{
        const e=p.edges[Math.abs(signed)-1]; need(e.gauges_mm.includes(t.gauge_mm),'El ancho del tren '+t.id+' no es compatible con el tramo '+e.id+'.');
        if (e.tracks===1 && (p.nodes[e.fromNode-1].passingLoop || p.nodes[e.toNode-1].passingLoop)) need(t.length_m+q.release_m<q.loop_m,'El tren '+t.id+' no cabe en el apartadero abstracto.');
      });
      need(Array.isArray(t.stops) && t.stops.length>0,'Especifica al menos la parada final.');
      let previous=0;
      t.stops.forEach(stop=>{const j=nodes.findIndex((n,i)=>i>previous && n===stop.node); need(j>=0 && number(stop.dwell_s,0),'Paradas fuera de orden o duración inválida.'); previous=j;});
      need(previous===nodes.length-1,'La última parada debe ser el destino de la ruta.');
      nodes.slice(1,-1).forEach((node,i)=>{if (p.nodes[node-1].junction==='directional') need(Math.sign(t.route[i])===Math.sign(t.route[i+1]),'Usa reserva exclusiva en el nodo '+node+' al cambiar la orientación de los tramos.');});
    });
    routeNodes(p.analysisRoute,p.edges);
    p.gpsFaults=p.gpsFaults || [];
    need(Array.isArray(p.gpsFaults),'gpsFaults debe ser una lista.');
    p.gpsFaults.forEach(f=>need(Number.isInteger(f.edge) && f.edge>=1 && f.edge<=p.edges.length && number(f.start_s,0) && number(f.end_s,0) && f.end_s>f.start_s && ['available','unavailable','unknown'].includes(f.status),'Ventana de fallo GPS no válida.'));
    return p;
  }
  function gpsStatus(project,edge,time) {
    let status=project.edges[edge-1].gps || 'unknown';
    for (const fault of project.gpsFaults || []) if (fault.edge===edge && time>=fault.start_s && time<fault.end_s) status=fault.status;
    return status;
  }
  function compile(input) {
    const p=validate(input),q=p.parameters,resources=[],blocks=[],tokens=[],margins=[],junctions=[];
    const resource=()=>{resources.push(0);return resources.length-1;};
    p.edges.forEach(e=>{
      const len=e.length_m,a=q.loop_m*Number(p.nodes[e.fromNode-1].passingLoop),b=q.loop_m*Number(p.nodes[e.toNode-1].passingLoop);
      margins.push([a,b]); const cut=[0,a,len-b,len]; for(let x=q.block_m;x<=len;x+=q.block_m)cut.push(x);
      const cuts=[...new Set(cut)].sort((a,b)=>a-b), bs=[];
      for(let j=0;j<cuts.length-1;j++) {const id=resource(),shared=e.tracks===1 && cuts[j]>=a && cuts[j+1]<=len-b; bs.push([cuts[j],cuts[j+1],id,shared?id:resource()]);}
      blocks.push(bs); tokens.push(e.tracks===1?resource():-1);
    });
    p.nodes.forEach(n=>{if(n.junction==='none')junctions.push([-1,-1]);else {const id=resource();junctions.push([id,n.junction==='exclusive'?id:resource()]);}});
    const trains=p.trains.map(t=>{
      const edges=t.route.map(s=>Math.abs(s)-1),dirs=t.route.map(Math.sign),nodes=routeNodes(t.route,p.edges),offsets=[0],demands=[];
      edges.forEach(e=>offsets.push(offsets.at(-1)+p.edges[e].length_m));
      edges.forEach((e,j)=>{
        const len=p.edges[e].length_m,dir=dirs[j],off=offsets[j],margin=dir>0?margins[e]:[...margins[e]].reverse();
        blocks[e].forEach(b=>demands.push([dir>0?b[2]:b[3],off+(dir>0?b[0]:len-b[1]),off+(dir>0?b[1]:len-b[0]),1]));
        if(tokens[e]>=0) demands.push([tokens[e],off+margin[0],offsets[j+1]-margin[1],2]);
      });
      nodes.slice(1,-1).forEach((n,k)=>{const j=k+1,id=junctions[n-1][dirs[j-1]>0?0:1],half=Math.min(250,p.edges[edges[j-1]].length_m/2,p.edges[edges[j]].length_m/2);if(id>=0)demands.push([id,offsets[j]-half,offsets[j]+half,3]);});
      demands.sort((a,b)=>a[1]-b[1] || b[3]-a[3]); let previous=0;
      const stops=t.stops.map(stop=>{previous=nodes.findIndex((n,i)=>i>previous && n===stop.node);return offsets[previous];});
      return {...t,edges,dirs,nodes,offsets,demands,stops,stopsOriginal:t.stops,length:offsets.at(-1)};
    });
    return {project:p,q,trains,resources};
  }
  function locate(t,s,p) {
    s=Math.max(0,Math.min(t.length,s));let j=t.offsets.findIndex((end,i)=>i>0 && s<end)-1;
    if(j<0)j=t.edges.length-1; const e=t.edges[j],distance=s-t.offsets[j];
    return {e,j,x:t.dirs[j]>0?distance:p.edges[e].length_m-distance};
  }
  function target(t,s,v,authority,stop,p) {
    const q=p.parameters,{j}=locate(t,s,p),b=t.brake_mps2;
    const caps=t.edges.map(e=>p.edges[e].maxSpeed_kmh/3.6);
    let limit=Math.min(t.maxSpeed_kmh/3.6,caps[j]),speed=limit;
    for(let k=j+1;k<t.edges.length;k++)speed=Math.min(speed,Math.sqrt(Math.max(0,caps[k]**2+2*b*(t.offsets[k]-s-v*(q.response_s+q.step_s)))));
    if(q.terminal_m>0) {
      if(s<q.terminal_m || t.length-s<q.terminal_m){limit=Math.min(limit,q.terminal_kmh/3.6);speed=Math.min(speed,limit);}
      const distance=t.length-q.terminal_m-s;
      if(distance>0)speed=Math.min(speed,Math.sqrt(Math.max(0,(q.terminal_kmh/3.6)**2+2*b*(distance-v*(q.response_s+q.step_s)))));
    }
    speed=Math.min(speed,Math.sqrt(2*b*Math.max(0,authority-s-q.reserve_m-v*(q.response_s+q.step_s))));
    speed=Math.min(speed,Math.sqrt(2*b*Math.max(0,stop-s-v*q.step_s)));
    return {speed,limit};
  }
  async function run(input,{onProgress=()=>{},cancelled=()=>false}={}) {
    const {project:p,q,trains,resources:owner}=compile(input),N=trains.length;
    const st=trains.map(()=>({s:0,v:0,state:0,next:0,dwell:Infinity,arrival:null,departure:null,authority:0,minGap:Infinity,maxSpeed:0,restricted:0,samples:[]}));
    const time=[],audit={Completed:0,MaximumActive:0,BlockConflicts:0,AuthorityViolations:0,SpeedLimitViolations:0,MinimumLeaderGap_m:Infinity,EndTime_s:0,Scenario:'configured'};
    const total=Math.ceil(q.duration_s/q.step_s),every=Math.round(q.sample_s/q.step_s);
    for(let step=0;step<total;step++) {
      if(step%250===0){if(cancelled())throw new Error('Ensayo cancelado.');onProgress(step/total);await new Promise(resolve=>setTimeout(resolve,0));}
      const now=step*q.step_s;
      trains.forEach((t,i)=>{
        const a=st[i];if(a.state===3 || a.state===0 && now<t.departure_s)return;
        const rear=a.s-t.length_m;
        t.demands.forEach(d=>{if(d[2]<rear-q.release_m && owner[d[0]]===i+1)owner[d[0]]=0;});
        a.authority=t.length+500;
        for(const d of t.demands){if(d[2]<rear || d[1]>a.s+q.lookahead_m)continue;const id=d[0];if(owner[id]===i+1)continue;if(owner[id]===0)owner[id]=i+1;else {a.authority=Math.min(a.authority,d[1]);break;}}
        const future=t.demands.find(d=>d[1]>a.s+q.lookahead_m);if(future)a.authority=Math.min(a.authority,future[1]);
        if(a.state===0 && a.authority>q.reserve_m+1){a.state=1;a.departure=now;}
      });
      trains.forEach((t,i)=>{
        const a=st[i];if(a.state===0 || a.state===3)return;
        if(a.state===2){if(now<a.dwell)return;if(a.next>=t.stops.length){a.state=3;owner.forEach((value,k)=>{if(value===i+1)owner[k]=0;});return;}a.state=1;}
        const stop=t.stops[a.next];
        if(stop-a.s<.15 && a.v<.15){a.s=stop;a.v=0;a.state=2;a.dwell=now+t.stopsOriginal[a.next].dwell_s;if(a.next===t.stops.length-1)a.arrival=now;a.next++;return;}
        const goal=target(t,a.s,a.v,a.authority,stop,p);
        if(a.authority-a.s<q.lookahead_m/2 && goal.speed<Math.min(t.maxSpeed_kmh/3.6,goal.limit)-1)a.restricted+=q.step_s;
        const acceleration=Math.max(-t.brake_mps2,Math.min(t.acceleration_mps2,(goal.speed-a.v)/q.step_s));
        const dt=acceleration<0 && a.v+acceleration*q.step_s<0?-a.v/acceleration:q.step_s;
        a.s+=a.v*dt+.5*acceleration*dt*dt;a.v=Math.max(0,a.v+acceleration*q.step_s);a.maxSpeed=Math.max(a.maxSpeed,a.v);
        if(a.s>a.authority+1e-6)audit.AuthorityViolations++;
        if(a.v>target(t,a.s,a.v,a.authority,stop,p).limit+.05)audit.SpeedLimitViolations++;
      });
      const active=st.map((a,i)=>a.state===1 || a.state===2?i:-1).filter(i=>i>=0),physical=new Int32Array(owner.length);
      audit.MaximumActive=Math.max(audit.MaximumActive,active.length);
      active.forEach(i=>trains[i].demands.forEach(d=>{if(d[1]<st[i].s+1e-7 && d[2]>st[i].s-trains[i].length_m+1e-7){if(physical[d[0]] && physical[d[0]]!==i+1)audit.BlockConflicts++;physical[d[0]]=i+1;if(owner[d[0]]!==i+1)audit.AuthorityViolations++;}}));
      const gaps=st.map(()=>Infinity),leaders=st.map(()=>0);
      active.forEach(i=>active.forEach(k=>{
        if(i===k)return;const rear=locate(trains[k],Math.max(0,st[k].s-trains[k].length_m),p),j=trains[i].edges.indexOf(rear.e);
        if(j<0 || trains[i].dirs[j]!==trains[k].dirs[rear.j])return;
        const x=trains[i].dirs[j]>0?rear.x:p.edges[rear.e].length_m-rear.x,gap=trains[i].offsets[j]+x-st[i].s;
        if(gap>=0 && gap<gaps[i]){gaps[i]=gap;leaders[i]=k+1;}
      }));
      active.forEach(i=>{st[i].minGap=Math.min(st[i].minGap,gaps[i]);audit.MinimumLeaderGap_m=Math.min(audit.MinimumLeaderGap_m,gaps[i]);});
      const complete=st.every(a=>a.state===3),sampleTime=now+q.step_s;
      if(step%every===0 || complete || sampleTime>=q.duration_s){
        time.push(sampleTime);
        st.forEach((a,i)=>{const pos=locate(trains[i],a.s,p),gps=gpsStatus(p,pos.e+1,sampleTime);a.samples.push([a.s,a.v,a.state,a.authority,Number.isFinite(gaps[i])?gaps[i]:null,leaders[i],pos.e+1,pos.x,0,trains[i].dirs[pos.j],['available','unavailable','unknown'].indexOf(gps)]);});
      }
      audit.EndTime_s=sampleTime;if(complete)break;
    }
    audit.Completed=st.filter(a=>a.state===3).length;
    if(!Number.isFinite(audit.MinimumLeaderGap_m))audit.MinimumLeaderGap_m=null;
    const summary=trains.map((t,i)=>{const a=st[i];return {Train:t.id,Route:t.label,PlannedDeparture_s:t.departure_s,Departure_s:a.departure,Arrival_s:a.arrival,Travel_min:a.arrival===null||a.departure===null?null:(a.arrival-a.departure)/60,MaxSpeed_kmh:a.maxSpeed*3.6,MinimumLeaderGap_m:Number.isFinite(a.minGap)?a.minGap:null,Restricted_s:a.restricted};});
    onProgress(1);
    return {schemaVersion:3,project:p,nodes:p.nodes.map(n=>({ID:n.id,Name:n.name,X:n.x,Y:n.y})),edges:p.edges.map(e=>({ID:e.id,From:e.fromNode,To:e.toNode,Length_km:e.length_m/1000,Tracks:e.tracks,Line:e.line,ModelCap_kmh:e.maxSpeed_kmh,DistanceStatus:e.quality,Source:e.source})),scenarios:[{id:'configured',time,audit,summary,trains:trains.map((t,i)=>({id:t.id,label:t.label,direction:t.dirs[0],route:t.edges.map(e=>e+1),length:t.length,trainLength:t.length_m,departure:t.departure_s,samples:st[i].samples}))}]};
  }
  const api={validate,routeNodes,gpsStatus,compile,locate,target,run};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.RailNetwork=api;
})(typeof globalThis!=='undefined'?globalThis:this);
