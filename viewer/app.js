'use strict';
let data = JSON.parse(document.getElementById('data').textContent);
const originalData = JSON.parse(JSON.stringify(data));
const el = id => document.getElementById(id), cv = el('map'), ctx = cv.getContext('2d');
const palette = {
  light: ['#14776E','#94620F','#9656A5','#AB4665','#316E9D','#79701D','#B35C36','#526F32'],
  dark: ['#75CFBE','#E7BE76','#CAA2DC','#E69DB1','#8DC3EA','#D5CC88','#ECA786','#B2CC8E']
};
let positions = [], names = [], trainButtons = [];
const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const scenarioNames = {nominal:'Circulación nominal',signal_outage:'Interrupción de autorizaciones',station_delay:'Parada prolongada',configured:'Red configurada'};
const stateNames = ['Pendiente de salida','En circulación','Parada en estación','Finalizado'];
let sim = data.scenarios[0], frame = 0, selected = 0, playing = false, simTime = 0, last = null;
let theme = 'light', ink;
const pad = n => String(n).padStart(2,'0');
const clock = s => pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60))+':'+pad(Math.floor(s%60));
const km = x => Number.isFinite(x) ? (x/1000).toFixed(2)+' km' : '—';
const label = text => text.replaceAll('Malaga','Málaga').replaceAll(' > ',' → ');
function loadNetworkView() {
  names = data.nodes.map(n => label(n.Name).replaceAll('Cordoba','Córdoba'));
  const xs=data.nodes.map(n=>n.X),ys=data.nodes.map(n=>n.Y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  const scale=Math.min(760/Math.max(1,Math.max(...xs)-Math.min(...xs)),650/Math.max(1,Math.max(...ys)-Math.min(...ys)));
  positions=data.nodes.map(n=>[(n.X-cx)*scale+500,(n.Y-cy)*scale+420]);
  // Historical exports get their presentation coordinates from the project definition.
  if(data.project?.nodes.length===data.nodes.length) {
    const ns=data.project.nodes,xx=ns.map(n=>n.x),yy=ns.map(n=>n.y),mx=(Math.min(...xx)+Math.max(...xx))/2,my=(Math.min(...yy)+Math.max(...yy))/2;
    const k=Math.min(760/Math.max(1,Math.max(...xx)-Math.min(...xx)),650/Math.max(1,Math.max(...yy)-Math.min(...yy)));
    positions=ns.map(n=>[(n.x-mx)*k+500,(n.y-my)*k+420]);
  }
  sim=data.scenarios[0]; selected=0;
  el('scenario').innerHTML=data.scenarios.map(s=>'<option value="'+s.id+'">'+(scenarioNames[s.id]||s.id)+'</option>').join('');
  el('rows').innerHTML=sim.trains.map((t,i)=>'<tr id="row'+i+'"><td><button data-train="'+i+'" aria-pressed="false" title="Seleccionar '+escapeHTML(t.id)+'"><span class="dot" id="dot'+i+'"></span>'+escapeHTML(t.id)+'</button><span class="route">'+escapeHTML(label(t.label))+'</span></td><td class="num" id="v'+i+'"></td><td class="num" id="g'+i+'"></td></tr>').join('');
  trainButtons=[...document.querySelectorAll('[data-train]')];
  trainButtons.forEach(button=>button.addEventListener('click',()=>{selected=+button.dataset.train;render();}));
  el('chartKey').innerHTML=sim.trains.map((t,i)=>'<button data-chart-train="'+i+'" aria-label="Destacar '+escapeHTML(t.id)+' en el diagrama"><span class="dot"></span>'+escapeHTML(t.id)+'</button>').join('');
  document.querySelectorAll('[data-chart-train]').forEach(b=>b.addEventListener('click',()=>{selected=+b.dataset.chartTrain;render();}));
  el('simulation-title').textContent=data.project.name+' · '+sim.trains.length+' trenes';
  el('trains-title').textContent='Circulaciones del ejemplo';
  el('networkDescription').textContent=data.project.description;
  el('mapCaption').textContent='Esquema sin escala geográfica · '+data.nodes.length+' nodos · '+data.edges.length+' tramos';
}

function setPlaying(value) {
  playing = value;
  el('playIcon').textContent = playing ? 'Ⅱ' : '▶';
  el('playText').textContent = playing ? 'Pausar' : 'Reproducir';
  el('play').setAttribute('aria-label', playing ? 'Pausar simulación' : 'Reproducir simulación');
}
function pickScenario() {
  sim = data.scenarios.find(s => s.id === el('scenario').value);
  frame = 0; simTime = sim.time[0]; setPlaying(false);
  el('slider').max = sim.time.length-1;
  el('duration').textContent = clock(sim.time.at(-1)).slice(0,5);
  renderComparison();
  render();
}
function setTheme(value) {
  theme = value; document.documentElement.dataset.theme = theme;
  const style = getComputedStyle(document.documentElement);
  ink = Object.fromEntries(['surface','text','secondary','track','single','node','primary'].map(key => [key,style.getPropertyValue('--'+key).trim()]));
  el('theme').setAttribute('aria-pressed', String(theme === 'dark'));
  el('theme').setAttribute('aria-label', theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro');
  document.querySelector('meta[name="theme-color"]').content = style.getPropertyValue('--background').trim();
  render();
}
el('theme').addEventListener('click', () => setTheme(theme === 'light' ? 'dark' : 'light'));
el('scenario').addEventListener('change', pickScenario);
el('slider').addEventListener('input', () => { frame = +el('slider').value; simTime = sim.time[frame]; render(); });
el('play').addEventListener('click', () => {
  if (frame === sim.time.length-1) { frame = 0; simTime = sim.time[0]; }
  setPlaying(!playing); render();
});
function point(row) {
  const e = data.edges[row[6]-1], a = positions[e.From-1], b = positions[e.To-1];
  const q = row[7]/(e.Length_km*1000);
  return {x:a[0]+(b[0]-a[0])*q,y:a[1]+(b[1]-a[1])*q,dx:b[0]-a[0],dy:b[1]-a[1]};
}
function renderMap() {
  ctx.clearRect(0,0,cv.width,cv.height); ctx.lineCap = 'round';
  data.edges.forEach(e => {
    const a = positions[e.From-1], b = positions[e.To-1];
    const gps=RailNetwork.gpsStatus(data.project,e.ID,sim.time[frame]);
    ctx.strokeStyle=gps==='unavailable' ? ink.single : gps==='unknown' ? ink.secondary : ink.track;
    ctx.lineWidth = e.Tracks === 1 ? 3 : 6;
    ctx.setLineDash(gps==='unknown' ? [3,7] : e.Tracks === 1 ? [8,7] : []);
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    if (e.Tracks === 2) { ctx.lineWidth = 2; ctx.strokeStyle = ink.surface; ctx.stroke(); }
    ctx.setLineDash([]);
  });
  data.nodes.forEach(n => {
    const [nx,ny] = positions[n.ID-1];
    ctx.beginPath(); ctx.arc(nx,ny,4,0,Math.PI*2); ctx.fillStyle = ink.node; ctx.fill();
    ctx.font = '400 17px "DM Sans", sans-serif'; ctx.fillStyle = ink.secondary;
    let x = nx+14, y = ny+6, align = 'left';
    const side=data.project.nodes[n.ID-1]?.labelSide || 'bottom';
    if(side==='left'){x=nx-18;align='right';}
    if(side==='top' || side==='bottom'){x=nx;align='center';y=ny+(side==='top'?-24:32);}
    ctx.textAlign = align; ctx.fillText(names[n.ID-1],x,y);
  });
  sim.trains.forEach((t,i) => {
    const r = t.samples[frame]; if (r[2] === 0 || r[2] === 3) return;
    const p = point(r), norm = Math.hypot(p.dx,p.dy);
    const ox = -p.dy/norm*8*(r[9] ?? t.direction), oy = p.dx/norm*8*(r[9] ?? t.direction);
    ctx.save(); ctx.translate(p.x+ox,p.y+oy);
    if (i === selected) {
      ctx.beginPath(); ctx.arc(0,0,17,0,Math.PI*2); ctx.strokeStyle = ink.primary; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.rotate(Math.atan2(p.dy,p.dx)+((r[9] ?? t.direction) < 0 ? Math.PI : 0));
    ctx.fillStyle = palette[theme][i % palette[theme].length]; ctx.strokeStyle = ink.surface; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(2,-6); ctx.lineTo(-10,-6);
    ctx.lineTo(-10,6); ctx.lineTo(2,6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.font = '400 14px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = palette[theme][i % palette[theme].length]; ctx.fillText(t.id,p.x+ox+18,p.y+oy-12);
  });
}
function render() {
  if (!ink) return;
  renderMap(); let active = 0;
  sim.trains.forEach((t,i) => {
    const r = t.samples[frame]; if (r[2] === 1 || r[2] === 2) active++;
    el('v'+i).textContent = (r[1]*3.6).toFixed(0); el('g'+i).textContent = km(r[4]);
    el('row'+i).classList.toggle('selected',i === selected);
    el('dot'+i).style.background = palette[theme][i % palette[theme].length];
    trainButtons[i].setAttribute('aria-pressed',String(i === selected));
  });
  const t = sim.trains[selected], r = t.samples[frame], edge = data.edges[r[6]-1];
  el('active').textContent = active+' activos / '+sim.trains.length; el('time').textContent = clock(sim.time[frame]);
  el('slider').value = frame; el('slider').setAttribute('aria-valuetext',clock(sim.time[frame]));
  el('fault').textContent = r[8] ? 'Autorizaciones sin ampliación' : '';
  el('detailTitle').textContent = t.id;
  el('selectedRoute').textContent = label(t.label)+' · '+(t.trainLength ?? 200)+' m · Ruta ≈ '+Math.round(t.length/1000)+' km';
  el('state').textContent = r[2] === 1 && r[1] < .05 ? 'Detenido en vía' : stateNames[r[2]];
  el('distance').textContent = km(r[0]);
  el('authority').textContent = r[2] === 1 || r[2] === 2 ? km(Math.max(0,r[3]-r[0])) : '—';
  el('detail').textContent = (r[5] > 0 ? 'Líder sobre la ruta: '+sim.trains[r[5]-1].id+'. ' : 'Sin líder aplicable en la ruta y sentido actuales. ')
    +(r[2] === 0 ? 'Salida prevista: T+'+clock(t.departure)+'. ' : '')
    +'Tramo: '+names[edge.From-1]+' – '+names[edge.To-1]+' (≈ '+edge.Length_km.toFixed(1)+' km). Límite asumido: '+edge.ModelCap_kmh+' km/h.';
  el('gpsDetail').textContent=gpsNames[RailNetwork.gpsStatus(data.project,r[6],sim.time[frame])]+'. Posición del mapa: verdad de la simulación, no una medición GNSS.';
  renderDiagram();
}
function tick(now) {
  if (last !== null && playing) {
    simTime += Math.min((now-last)/1000,.1)*+el('rate').value;
    while (frame < sim.time.length-1 && sim.time[frame+1] <= simTime) frame++;
    if (frame === sim.time.length-1) setPlaying(false);
    render();
  }
  last = now; requestAnimationFrame(tick);
}
const metrics = RailMetrics;
let currentPanel = 'proposal';
const tabs = [...document.querySelectorAll('[data-panel]')];
function showPanel(id, focus = false) {
  if (!tabs.some(t => t.dataset.panel === id)) return;
  currentPanel = id;
  if (id !== 'simulation') setPlaying(false);
  tabs.forEach(tab => {
    const active = tab.dataset.panel === id;
    tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    el(tab.dataset.panel).hidden = !active;
    if (active && focus) tab.focus();
  });
  render();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => showPanel(tab.dataset.panel));
  tab.addEventListener('keydown', event => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (offset || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + offset + tabs.length) % tabs.length;
      showPanel(tabs[next].dataset.panel, true);
    }
  });
});

function download(name, content, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], {type: mime}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csv(rows) { return rows.map(row => row.map(v => '"'+String(v ?? '').replaceAll('"','""')+'"').join(',')).join('\r\n'); }
const signedMinutes = s => s === null ? '—' : (s > 0 ? '+' : '')+(s/60).toFixed(2)+' min';
function comparison() {
  const baseline = data.scenarios.find(s => s.id === 'nominal');
  return metrics.compareArrivals(sim, baseline || {summary: []});
}
function renderComparison() {
  const rows = comparison(), deltas = rows.filter(r => r.delta !== null);
  el('auditComplete').textContent = sim.audit.Completed+' / '+sim.trains.length;
  el('auditConflicts').textContent = sim.audit.BlockConflicts;
  el('auditConflicts').title = 'Rebases de autorización: '+sim.audit.AuthorityViolations+'; excesos de límite: '+sim.audit.SpeedLimitViolations;
  el('arrivalDelta').textContent = deltas.length ? signedMinutes(deltas.reduce((a,b) => Math.abs(a.delta) >= Math.abs(b.delta) ? a : b).delta) : '—';
  el('arrivalRows').innerHTML = rows.map(r => '<tr><td class="num">'+escapeHTML(r.train)+'</td><td class="num">'+(Number.isFinite(r.arrival) ? clock(r.arrival) : '—')+'</td><td class="num">'+signedMinutes(r.delta)+'</td></tr>').join('');
}
el('exportComparison').addEventListener('click', () => download('rail-lab-'+sim.id+'-vs-nominal.csv', csv([
  ['Scenario','Train','Arrival_s','NominalArrival_s','Difference_s'],
  ...comparison().map(r => [sim.id,r.train,r.arrival,r.baseline,r.delta])
])));
function renderDiagram() {
  const canvas = el('diagram'), dc = canvas.getContext('2d');
  const left = 196, right = 964, top = 28, bottom = 456;
  const path=data.project.analysisRoute;
  const distance=path.reduce((sum,e)=>sum+data.edges[Math.abs(e)-1].Length_km,0);
  const x = time => left + time / sim.time.at(-1) * (right-left);
  const y = km => top + km / distance * (bottom-top);
  dc.clearRect(0,0,1000,520); dc.font = '400 17px "DM Sans", sans-serif';
  if (sim.id === 'signal_outage') {
    dc.fillStyle = theme === 'dark' ? '#382D19' : '#FFF7E6'; dc.fillRect(x(3600),top,x(4200)-x(3600),bottom-top);
  }
  const routeNodes=RailNetwork.routeNodes(path,data.project.edges);let distanceAlong=0;
  const stations=routeNodes.map((n,i)=>{if(i)distanceAlong+=data.edges[Math.abs(path[i-1])-1].Length_km;return [distanceAlong,names[n-1].slice(0,18)+' · '+Math.round(distanceAlong)];});
  let lastLabel=-Infinity;
  stations.forEach(([distance,name]) => {
    dc.strokeStyle = theme === 'dark' ? '#35353E' : '#E8E8EC'; dc.lineWidth = 1;
    dc.beginPath(); dc.moveTo(left,y(distance)); dc.lineTo(right,y(distance)); dc.stroke();
    if(y(distance)-lastLabel>20){dc.fillStyle=ink.secondary;dc.textAlign='right';dc.fillText(name,left-12,y(distance)+4);lastLabel=y(distance);}
  });
  for (let minute=0, interval=sim.time.at(-1)<3600?5:30; minute <= sim.time.at(-1)/60; minute+=interval) {
    dc.fillStyle = ink.secondary; dc.textAlign = 'center'; dc.fillText(minute+' min',x(minute*60),bottom+28);
  }
  dc.textAlign = 'left'; dc.fillText('Distancia acumulada del modelo (km) · Tiempo desde el inicio',left,509);
  sim.trains.forEach((t,i) => {
    dc.beginPath(); let open = false;
    t.samples.forEach((row,k) => {
      const d = metrics.commonTrunkKm(row,data.edges,path);
      if (d === null) { open = false; return; }
      if (open) dc.lineTo(x(sim.time[k]),y(d)); else dc.moveTo(x(sim.time[k]),y(d));
      open = true;
    });
    dc.globalAlpha = i === selected ? 1 : .55; dc.lineWidth = i === selected ? 3.5 : 1.5;
    dc.strokeStyle = palette[theme][i % palette[theme].length]; dc.stroke(); dc.globalAlpha = 1;
    const d = metrics.commonTrunkKm(t.samples[frame],data.edges,path);
    if (d !== null) { dc.beginPath(); dc.arc(x(sim.time[frame]),y(d),i === selected ? 6 : 3,0,Math.PI*2); dc.fillStyle = palette[theme][i % palette[theme].length]; dc.fill(); }
  });
  dc.strokeStyle = ink.primary; dc.lineWidth = 1.5; dc.setLineDash([5,5]); dc.beginPath(); dc.moveTo(x(sim.time[frame]),top); dc.lineTo(x(sim.time[frame]),bottom); dc.stroke(); dc.setLineDash([]);
  document.querySelectorAll('[data-chart-train]').forEach((b,i) => { b.querySelector('.dot').style.background = palette[theme][i % palette[theme].length]; b.setAttribute('aria-pressed',String(i === selected)); });
}
function seek(seconds) {
  const next = sim.time.findIndex(t => t >= seconds);
  frame = next < 0 ? sim.time.length-1 : next; simTime = sim.time[frame]; setPlaying(false); render();
}
el('diagram').addEventListener('click', event => {
  const box = el('diagram').getBoundingClientRect();
  seek(Math.max(0,Math.min(1,((event.clientX-box.left)/box.width*1000-196)/(964-196)))*sim.time.at(-1));
});
el('shareView').addEventListener('click', async () => {
  const url = new URL(location.href); url.hash = '';
  if (!activeExample) { el('shareStatus').textContent='Para compartir una red importada, envía también su configuración JSON.'; return; }
  url.search = new URLSearchParams({panel:'simulation',network:activeExample,gps:activeGpsMode,scenario:sim.id,train:sim.trains[selected].id,time:String(sim.time[frame])});
  try { await navigator.clipboard.writeText(url.href); el('shareStatus').textContent = 'Enlace copiado: conserva red, GPS, escenario, tren e instante.'; }
  catch { el('shareStatus').textContent = url.href; }
});

const sensorLabels = ['Aproximación nominal','Pérdida de GNSS','Salto de GNSS (−400 m)','Medida de distancia aberrante','Mensaje de ocupación antiguo','Pérdida de sensores de movimiento','Vías paralelas ambiguas','Frenado insuficiente','Vía libre','Vía libre con pérdida de GNSS','Deriva común de posición','Mapa desplazado','Mapa equivocado pero coherente','Pendiente y baja adherencia','Vía libre con ambigüedad','Deslizamiento de rueda','Falsa ocupación con mensaje reciente'];
const architectures = {'GPS':'GNSS','GPS + controls':'GNSS + controles','Fusion':'Fusión','Fusion + controls':'Fusión + controles'};
const sensorRows = data.sensorEvidence || [];
const sensorIds = [...new Set(sensorRows.map(r => r.ScenarioID))];
el('sensorScenario').innerHTML = sensorIds.map(id => '<option value="'+id+'">'+sensorLabels[id-1]+'</option>').join('');
el('sensorScenario').value = sensorIds.includes(3) ? '3' : String(sensorIds[0]);
function renderEvidence() {
  const id = +el('sensorScenario').value, rows = sensorRows.filter(r => r.ScenarioID === id);
  if (!rows.length) { el('finding').textContent = 'No se ha incorporado una ejecución del laboratorio de sensores.'; return; }
  const max = Math.max(...rows.map(r => r.OpenRMSE_m)), obstacle = !!rows[0].HasObstacle;
  el('evidenceSize').textContent = rows[0].Runs+' semillas por configuración';
  el('brakeHeading').textContent = obstacle ? 'Cruces del obstáculo' : 'Ensayos con orden de freno';
  el('evidenceRows').innerHTML = rows.map(r => '<tr><td class="'+(r.Architecture === 'Fusion + controls' ? 'emphasis' : '')+'">'+architectures[r.Architecture]+'</td><td class="barcell"><span class="num">'+r.OpenRMSE_m.toFixed(3)+' m</span><div class="metric-bar" aria-hidden="true"><span style="width:'+(max ? r.OpenRMSE_m/max*100 : 0)+'%"></span></div></td><td class="num">'+(r.Formal3SigmaCoverage*100).toFixed(1)+' %</td><td class="num">'+(obstacle ? r.ClosedCollisionTrials : r.NoObstacleBrakeTrials)+' / '+r.Runs+'</td></tr>').join('');
  const a = rows.find(r => r.Architecture === 'GPS'), b = rows.find(r => r.Architecture === 'GPS + controls'), f = rows.find(r => r.Architecture === 'Fusion + controls');
  const findings = {
    1:'La fusión reduce el error de posición en el ensayo nominal. Una mejor precisión no basta para demostrar integridad ni fiabilidad operativa.',
    2:'La fusión conserva una estimación más precisa durante esta pérdida de GNSS. El resultado depende de los otros sensores sintéticos y de sus hipótesis de fallo.',
    3:'Ante el salto artificial de GNSS, el RMSE pasa de '+a.OpenRMSE_m.toFixed(2)+' m a '+f.OpenRMSE_m.toFixed(2)+' m con fusión y controles. Los controles por sí solos también mejoran GNSS: '+b.OpenRMSE_m.toFixed(2)+' m. Comparar ambos factores evita atribuir toda la mejora a añadir sensores.',
    4:'El rechazo de observaciones incoherentes se ensaya frente a una distancia aberrante. Las distancias proceden de anclas sintéticas; no de una instalación de radio real.',
    5:'La antigüedad del mensaje activa una respuesta conservadora en las configuraciones con controles. Datos antiguos y una vía libre confirmada no son equivalentes.',
    6:'Este caso degrada los sensores de movimiento. La combinación de sensores debe evaluarse también cuando pierde sus fuentes auxiliares.',
    7:'La posición longitudinal no resuelve por sí sola qué vía ocupa el tren. El módulo lateral considera solo dos vías rectas y puede declarar ambigüedad.',
    8:'Las cuatro configuraciones cruzan geométricamente el obstáculo con estos frenos insuficientes. Mejor localización no corrige una capacidad física de frenado insuficiente.',
    9:'El trayecto libre sirve de control para revisar órdenes de freno innecesarias. Tres ensayos sin intervención no estiman una tasa de falsas alarmas en servicio.',
    10:'Con GNSS y controles se ordena frenar en los '+b.NoObstacleBrakeTrials+' ensayos; con fusión y controles, en '+f.NoObstacleBrakeTrials+'. Sugiere continuidad ante este fallo concreto, pendiente de medir en operación real.',
    11:'Fallo común: con fusión y controles, la cobertura de ±3σ cae a '+(f.Formal3SigmaCoverage*100).toFixed(1)+' %. El estimador puede parecer confiado mientras se equivoca. La diversidad de sensores no elimina todos los fallos compartidos.',
    12:'Un desplazamiento del mapa puede forzar un diagnóstico de vía desconocida y una parada conservadora. Es necesario comprobar el mapa además de los sensores.',
    13:'El mapa equivocado produce una identidad de vía incorrecta con aparente confianza en el '+(f.WrongConfidentTrackFraction*100).toFixed(0)+' % de las muestras. Es una limitación sin resolver, aunque el error longitudinal parezca pequeño.',
    14:'La pendiente y la baja adherencia hacen insuficiente el frenado de este ensayo: todas las configuraciones cruzan el obstáculo. Este laboratorio no representa una curva ETCS validada.',
    15:'Una incertidumbre de vía puede producir una parada conservadora aun sin obstáculo. Debe medirse ese coste de disponibilidad junto con la detección de peligros.',
    16:'El deslizamiento de rueda altera la odometría. Este ensayo comprueba la respuesta al fallo de una fuente distinta de GNSS.',
    17:'Un mensaje reciente con ocupación falsa provoca órdenes de freno en todas las configuraciones. Reciente no significa verdadero: hace falta contrastar origen y coherencia.'
  };
  el('finding').textContent = findings[id] || '';
}
el('sensorScenario').addEventListener('change', renderEvidence);
el('exportEvidence').disabled = !sensorRows.length;
el('exportEvidence').addEventListener('click', () => {
  if (!sensorRows.length) return;
  const keys = Object.keys(sensorRows[0]);
  download('rail-lab-resultados-sensores.csv',csv([keys,...sensorRows.map(row => keys.map(key => row[key]))]));
});

let detector = metrics.newSection(true), detectorLog = [];
const occupancyLabels = {clear:'Libre',occupied:'Ocupado',unknown:'Indeterminado'};
const eventLabels = {entry:'Entrada contabilizada',exit:'Salida contabilizada',hold:'Tren detenido: el balance no cambia',link_down:'Enlace con el centro interrumpido',link_up:'Enlace con el centro restablecido',detector_fault:'Fallo de detector o enlace local'};
function renderDetector() {
  const local = metrics.sectionStatus(detector), remote = metrics.sectionStatus(detector,true);
  el('axleBalance').textContent = detector.count+' ejes contabilizados';
  el('localStatus').textContent = occupancyLabels[local]; el('remoteStatus').textContent = occupancyLabels[remote];
  el('localDecision').textContent = local === 'clear' ? 'Recuento equilibrado y estado inicial verificado. La reserva de itinerario es una condición adicional.' : 'Sin confirmación de vía libre: no se habilita una entrada nueva en este ensayo.';
  el('remoteDecision').textContent = detector.link ? 'Enlace disponible. Refleja la decisión local del demostrador.' : 'Sin dato actual confirmado. La pérdida de enlace no permite asumir vía libre.';
  el('detectorFault').textContent = detector.uncertain ? detector.fault+' · El estado indeterminado queda retenido; recuperar el enlace o equilibrar el recuento no lo borra.' : 'Detección local disponible. El ensayo empieza con sección vacía verificada.';
  el('toggleLink').textContent = detector.link ? 'Cortar enlace remoto' : 'Restablecer enlace remoto';
  el('detectorEvents').innerHTML = detectorLog.length ? detectorLog.slice().reverse().map(e => '<li><span class="num">'+pad(e.sequence)+'</span><span>'+eventLabels[e.kind]+(e.axles ? ' · '+e.axles+' ejes' : '')+'<br>'+occupancyLabels[e.local]+' local / '+occupancyLabels[e.remote]+' remoto</span></li>').join('') : '<li>00 · Nuevo ensayo con sección vacía verificada. Ningún tren dentro.</li>';
}
function detectorEvent(kind, axles) {
  const event = {kind,sequence:detector.sequence+1}; if (axles) event.axles = axles;
  detector = metrics.sectionStep(detector,event);
  detectorLog.push({...event,balance:detector.count,local:metrics.sectionStatus(detector),remote:metrics.sectionStatus(detector,true)});
  renderDetector();
}
document.querySelectorAll('[data-event]').forEach(b => b.addEventListener('click', () => detectorEvent(b.dataset.event,+b.dataset.axles)));
el('toggleLink').addEventListener('click', () => detectorEvent(detector.link ? 'link_down' : 'link_up'));
el('newSection').addEventListener('click', () => {detector = metrics.newSection(true); detectorLog = []; renderDetector();});
el('exportDetection').addEventListener('click', () => download('rail-lab-deteccion-local.json',JSON.stringify({model:'Pedagogical one-direction section; not a hardware controller',initialCondition:'Verified empty',events:detectorLog,final:detector},null,2),'application/json'));

const money = n => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const rangeMoney = values => values.map(money).join(' – ');
function renderBudget() {
  const result=metrics.prototypeBudget(+el('budgetExample').value);
  el('budgetMaterial').textContent=rangeMoney(result.material);
  el('budgetWork').textContent=rangeMoney(result.engineering);
  el('budgetTotal').textContent=rangeMoney(result.total);
  el('budgetScope').textContent=result.vehicles+' vehículo(s) de pruebas · '+result.points+' puntos de detección de maqueta. '+result.hours.join('–')+' horas de ingeniería supuestas a 45–70 €/h.';
  el('budgetRows').innerHTML=result.rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="num">'+rangeMoney([r[2],r[3]])+'</td><td class="num">'+rangeMoney([r[1]*r[2],r[1]*r[3]])+'</td></tr>').join('');
}
el('budgetExample').addEventListener('change',renderBudget);
el('exportBudget').addEventListener('click',()=>{const r=metrics.prototypeBudget(+el('budgetExample').value);download('rail-lab-ejemplo-presupuesto.csv',csv([['Concepto','Unidades','EUR_min','EUR_max'],...r.rows.map(row=>[row[0],row[1],row[1]*row[2],row[1]*row[3]]),['Material total','',...r.material],['Ingenieria hipotetica','',...r.engineering],['Total de laboratorio','',...r.total],['Alcance','No incluye instalacion ni validacion ferroviaria; bandas de ejemplo, no cotizacion','','']]));});

const gpsNames={available:'GPS disponible (supuesto)',unavailable:'Sin GPS en este ensayo',unknown:'Cobertura GPS desconocida'};
function gpsProject(project,mode) {
  const p=JSON.parse(JSON.stringify(project));
  if(mode==='unknown'){p.edges.forEach(e=>e.gps='unknown');p.gpsFaults=[];}
  else if(mode==='normal'){p.edges.forEach(e=>e.gps='available');p.gpsFaults=[];}
  else {
    p.edges.forEach(e=>e.gps='available');
    if(p.id==='madrid-andalucia')p.gpsFaults=[{edge:9,start_s:0,end_s:1500,status:'unavailable'},{edge:7,start_s:1500,end_s:3300,status:'unknown'}];
  }
  return p;
}
const exampleProjects=originalData.examples;
el('networkExample').innerHTML=exampleProjects.map(p=>'<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+'</option>').join('');
let runningExample=false,cancelExample=false,activeExample=exampleProjects[0].id,activeGpsMode='outage';
async function loadExample(project, imported=false) {
  if(runningExample)return;
  setPlaying(false);runningExample=true;cancelExample=false;el('loadExample').disabled=true;el('cancelExample').hidden=false;
  try {
    const gpsMode=el('gpsExample').value;
    const p=imported?RailNetwork.validate(project):gpsProject(project,gpsMode);
    if(project.id==='madrid-andalucia' && project===exampleProjects[0]) {
      data=JSON.parse(JSON.stringify(originalData));data.project=p;
    } else {
      const result=await RailNetwork.run(p,{onProgress:f=>el('exampleStatus').textContent='Calculando en tu navegador… '+Math.round(f*100)+' %',cancelled:()=>cancelExample});
      if(result.scenarios[0].audit.BlockConflicts || result.scenarios[0].audit.AuthorityViolations || result.scenarios[0].audit.SpeedLimitViolations)throw new Error('La auditoría del modelo detectó una violación. Revisa esta configuración antes de usar el resultado.');
      data={...result,sensorEvidence:originalData.sensorEvidence,examples:exampleProjects};
    }
    activeExample=imported?null:project.id;activeGpsMode=gpsMode;
    loadNetworkView();pickScenario();
    const a=sim.audit;el('exampleStatus').textContent=(imported?'Red importada: '+p.name+'. ':'')+a.Completed+'/'+sim.trains.length+' recorridos completados. '+(a.Completed<sim.trains.length?'Quedan trenes pendientes: revisa duración, horarios y reservas; no se garantiza resolver todos los bloqueos.':'Ejemplo listo: pulsa Reproducir.');
    renderGpsSchedule();
  } catch(error) {el('exampleStatus').textContent=error.message;}
  finally {runningExample=false;el('loadExample').disabled=false;el('cancelExample').hidden=true;}
}
el('loadExample').addEventListener('click',()=>loadExample(exampleProjects.find(p=>p.id===el('networkExample').value)));
el('cancelExample').addEventListener('click',()=>{cancelExample=true;});
el('projectFile').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try {if(file.size>1000000)throw new Error('El archivo supera 1 MB.');const p=RailNetwork.validate(JSON.parse(await file.text()));await loadExample(p,true);}catch(error){el('exampleStatus').textContent=error.message;}event.target.value='';});
el('exportProject').addEventListener('click',()=>download('rail-lab-red.json',JSON.stringify(data.project,null,2),'application/json'));
function renderGpsSchedule() {
  const faults=data.project.gpsFaults||[];
  el('gpsSchedule').innerHTML=faults.length?faults.map((f,index)=>{const e=data.edges[f.edge-1];return '<button data-gps-window="'+index+'">'+escapeHTML(names[e.From-1]+' → '+names[e.To-1])+': '+clock(f.start_s)+'–'+clock(f.end_s)+' · '+({available:'Disponible',unavailable:'Sin GPS',unknown:'Desconocido'}[f.status])+'</button>';}).join(''):'<span>Sin cambios temporales. El mapa muestra el estado GPS supuesto de cada tramo.</span>';
  document.querySelectorAll('[data-gps-window]').forEach(b=>b.addEventListener('click',()=>{
    const f=faults[+b.dataset.gpsWindow];
    for(let k=0;k<sim.time.length;k++) {
      if(sim.time[k]<f.start_s || sim.time[k]>=f.end_s) continue;
      const i=sim.trains.findIndex(t=>t.samples[k][6]===f.edge && [1,2].includes(t.samples[k][2]));
      if(i>=0){selected=i;seek(sim.time[k]);el('exampleStatus').textContent='Mostrando '+sim.trains[i].id+' dentro del tramo: '+gpsNames[f.status]+'.';return;}
    }
    seek(f.start_s+1);el('exampleStatus').textContent='No hay un tren en este tramo durante esa ventana en el caso seleccionado.';
  }));
}
el('startDemo').addEventListener('click',()=>{showPanel('simulation');el('workspace').scrollIntoView();setPlaying(true);});
el('seeBudget').addEventListener('click',()=>{showPanel('economics');el('workspace').scrollIntoView();});
data.project=gpsProject(data.project,'outage');
loadNetworkView(); renderEvidence(); renderDetector(); renderBudget(); renderGpsSchedule();
setTheme('light'); pickScenario();
async function restoreView() {
  const params = new URLSearchParams(location.search);
  const project=exampleProjects.find(p=>p.id===params.get('network'));
  if(['normal','unknown','outage'].includes(params.get('gps'))) el('gpsExample').value=params.get('gps');
  if(project || params.has('gps')) {
    el('networkExample').value=(project||exampleProjects[0]).id;
    await loadExample(project||exampleProjects[0]);
  }
  if (data.scenarios.some(s => s.id === params.get('scenario'))) { el('scenario').value = params.get('scenario'); pickScenario(); }
  const train = sim.trains.findIndex(t => t.id === params.get('train'));
  if (train >= 0) selected = train;
  if (params.has('time') && Number.isFinite(+params.get('time'))) seek(Math.max(0,+params.get('time')));
  showPanel(params.get('panel') || (location.hash === '#simulation' ? 'simulation' : 'proposal'));
}
restoreView();

document.fonts.ready.then(render);
requestAnimationFrame(tick);
