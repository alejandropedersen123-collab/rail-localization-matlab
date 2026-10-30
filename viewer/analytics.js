/* Pure, independently testable calculations. No railway equipment interface. */
(function (root) {
  'use strict';
  function compareArrivals(scenario, baseline) {
    return scenario.summary.map(row => {
      const ref = baseline.summary.find(item => item.Train === row.Train);
      const delta = ref && Number.isFinite(row.Arrival_s) && Number.isFinite(ref.Arrival_s)
        ? row.Arrival_s - ref.Arrival_s : null;
      return {train: row.Train, arrival: row.Arrival_s, baseline: ref?.Arrival_s ?? null, delta};
    });
  }
  // Reading aid for these synthetic trials, not a railway acceptance standard.
  const evidenceCoverageFloor = .95;
  function assessEvidence(r) {
    const result=(status,reason)=>({status,label:{positive:'Favorable',caution:'Con reservas',negative:'Desfavorable'}[status],reason});
    const counts=['ClosedCollisionTrials','ClosedStoppedTrials','LateOrMissingAlertTrials','NoObstacleHazardAlarmTrials','NoObstacleBrakeTrials','DiagnosticAlertTrials'];
    const fractions=['Formal3SigmaCoverage','WrongConfidentTrackFraction','UnknownTrackFraction'];
    if(!r || !Number.isInteger(r.Runs) || r.Runs<1 || ![0,1].includes(r.HasObstacle)
      || counts.some(k=>!Number.isInteger(r[k]) || r[k]<0 || r[k]>r.Runs)
      || fractions.some(k=>!Number.isFinite(r[k]) || r[k]<0 || r[k]>1)
      || !Number.isFinite(r.OpenRMSE_m) || r.OpenRMSE_m<0)
      return result('caution','Faltan datos válidos para interpretar este resultado.');
    const ratio=n=>n+' de '+r.Runs, percent=v=>(v*100).toLocaleString('es-ES',{maximumFractionDigits:1})+' %';
    if(r.ClosedCollisionTrials>0) return result('negative','Rebasa el obstáculo en '+ratio(r.ClosedCollisionTrials)+' ensayos: el frenado no lo evita.');
    if(r.WrongConfidentTrackFraction>0) return result('negative','Cree estar en otra vía en el '+percent(r.WrongConfidentTrackFraction)+' de las muestras, sin reconocer el error.');
    if(!r.HasObstacle && r.NoObstacleHazardAlarmTrials>0) return result('negative','Da una falsa alarma de obstáculo en '+ratio(r.NoObstacleHazardAlarmTrials)+' ensayos con la vía libre.');
    if(r.LateOrMissingAlertTrials>0) return result('negative','El aviso llega tarde o no llega en '+ratio(r.LateOrMissingAlertTrials)+' ensayos.');
    if(r.UnknownTrackFraction>0) {
      if(r.DiagnosticAlertTrials===0) return result('negative','No identifica la vía y no activa un aviso por esa incertidumbre.');
      return result('caution','Avisa por incertidumbre, pero sigue sin identificar la vía. La ambigüedad no está resuelta.');
    }
    if(r.Formal3SigmaCoverage<evidenceCoverageFloor) return result('caution','Subestima su error: solo el '+percent(r.Formal3SigmaCoverage)+' de las muestras queda dentro del margen que calcula.');
    if(!r.HasObstacle && r.NoObstacleBrakeTrials>0) return result('caution','Ordena frenar en '+ratio(r.NoObstacleBrakeTrials)+' ensayos sin obstáculo: respuesta prudente que interrumpe la marcha.');
    if(r.HasObstacle && r.ClosedStoppedTrials<r.Runs) return result('caution','No se confirma una parada en todos los ensayos con obstáculo.');
    return result('positive',r.HasObstacle
      ? 'Se detiene antes del obstáculo en los '+r.Runs+' ensayos de esta muestra.'
      : 'No ordena frenar en ninguno de los '+r.Runs+' ensayos sin obstáculo.');
  }
  function experimentReading(rows) {
    const assessments=rows.map(assessEvidence),counts={positive:0,caution:0,negative:0};
    assessments.forEach(a=>counts[a.status]++);
    const status=rows.length && counts.positive===rows.length?'positive':rows.length && counts.negative===rows.length?'negative':'caution';
    const labels={positive:'Resultado favorable en este ensayo',negative:'Problema observado en todas las configuraciones',caution:'Resultado con reservas'};
    if(counts.positive && counts.positive<rows.length)labels.caution='El resultado depende de la configuración';
    const id=rows[0]?.ScenarioID, byName=name=>rows.find(r=>r.Architecture===name);
    const a=byName('GPS'),f=byName('Fusion + controls');
    const error=r=>Number.isFinite(r?.OpenRMSE_m)?r.OpenRMSE_m.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' m':'sin dato';
    const explanations={
      1:['En condiciones normales, las cuatro configuraciones consiguen detener el tren antes del obstáculo. La fusión reduce el error de posición: '+error(a)+' con GNSS frente a '+error(f)+' con fusión y controles.','Repetir con más condiciones y datos reales; esta muestra no mide fiabilidad en servicio.'],
      2:['Al perder el GPS, las otras fuentes de información ayudan a mantener la posición. La fusión con controles registra '+error(f)+' de error frente a '+error(a)+' con GNSS, y las cuatro configuraciones evitan el obstáculo.','Comprobar pérdidas más largas y fallos simultáneos de los sensores restantes.'],
      3:['El GPS da un salto falso de posición. GNSS sin controles no evita el obstáculo; los controles rechazan la información incoherente. La fusión sin controles también se equivoca mucho, aunque aquí consigue detenerse.','Mantener controles de coherencia: combinar sensores por sí solo no resuelve este fallo.'],
      4:['Una medida de distancia falsa empeora la fusión sin controles. Al rechazarla, la fusión con controles mantiene un error de '+error(f)+'. GNSS no utiliza esa medida y apenas cambia.','Probar varias medidas falsas a la vez y mediciones reales, además de las distancias sintéticas.'],
      5:['El mensaje sobre el otro tren ha quedado desactualizado. Sin controles se rebasa el obstáculo; con controles se detecta que la información es demasiado antigua y se frena antes.','Comprobar retrasos, mensajes perdidos y recuperación de las comunicaciones.'],
      6:['Se dejan de recibir medidas de posición y movimiento. La estimación empeora, especialmente con GNSS. En esta muestra todas las configuraciones se detienen antes del obstáculo; la fusión con controles registra '+error(f)+' de error.','Ensayar pérdidas más largas y medir cuánto crece el error antes de que deje de ser aceptable para la función estudiada.'],
      7:['El tren puede estar en una de dos vías cercanas. Saber cuánto ha avanzado no basta para identificar cuál: los controles avisan y provocan una parada prudente, pero no resuelven la ambigüedad.','Añadir y validar información independiente que permita distinguir las vías.'],
      8:['Los frenos de este ensayo son insuficientes: todas las configuraciones rebasan el obstáculo. Localizar mejor al tren no compensa esa falta de capacidad de frenado.','Revisar capacidad de frenado, velocidad y anticipación en el modelo.'],
      9:['No hay obstáculos y ninguna configuración ordena frenar. Es un resultado favorable para continuar la marcha en estas condiciones, pero aquí no se pone a prueba la capacidad de evitar un obstáculo.','Repetir en más recorridos para medir falsas alarmas, además de probar situaciones con obstáculos.'],
      10:['La vía está libre cuando desaparece el GPS. GNSS con controles ordena frenar por falta de información; la fusión con controles conserva la marcha usando las otras fuentes.','Medir cuánto dura esa continuidad y qué ocurre si fallan también los sensores auxiliares.'],
      11:['Varias fuentes se desvían juntas. El tren se detiene antes del obstáculo, pero el cálculo cree conocer su posición mejor de lo que realmente la conoce: su margen de incertidumbre es demasiado pequeño.','Detectar fallos compartidos y contrastar la posición con una referencia independiente.'],
      12:['El mapa está desplazado. Los controles detectan que la vía no está clara y provocan una parada prudente; las configuraciones sin controles no avisan de esa incertidumbre.','Verificar y corregir el mapa antes de confiar en la identidad de vía.'],
      13:['El mapa parece coherente, pero sitúa al tren en la vía equivocada. Todas las configuraciones aceptan ese error. Un error pequeño de posición longitudinal no significa que se haya identificado bien la vía.','Contrastar el mapa y la identidad de vía con información independiente. Este fallo sigue sin resolverse.'],
      14:['La pendiente y la poca adherencia impiden frenar a tiempo: todas las configuraciones rebasan el obstáculo. La fusión con controles tiene solo '+error(f)+' de error de posición, pero eso no evita el fallo de frenado.','Incorporar esas condiciones al cálculo de frenado y revisar velocidad y distancia de anticipación.'],
      15:['No hay obstáculo, pero tampoco certeza sobre la vía. Los controles provocan una parada prudente; continuar sin esa certeza no se considera un resultado favorable, aunque no haya choque.','Resolver la identidad de vía y medir las interrupciones que provoca la incertidumbre.'],
      16:['La rueda desliza y falsea la distancia recorrida. La fusión sin controles se deja arrastrar por ese dato y rebasa el obstáculo; con controles consigue frenarlo. GNSS no utiliza esa fuente.','Contrastar la odometría y probar distintos niveles y duraciones de deslizamiento.'],
      17:['Llega un mensaje reciente que anuncia un obstáculo inexistente. Todas las configuraciones lo creen y ordenan frenar. El problema es la falsa información de ocupación, aunque la posición sea precisa.','Contrastar el origen y la coherencia de la ocupación: que un mensaje sea reciente no demuestra que sea verdadero.']
    };
    const [summary,next]=explanations[id]||['No hay una explicación preparada para este caso. Revisa las métricas y su procedencia.','Completar los datos del ensayo antes de extraer conclusiones.'];
    return {status,label:labels[status],counts,summary,next};
  }
  function commonTrunkKm(row, edges, route = [1,2,3,4,5]) {
    const edge = edges[row[6] - 1];
    const j = route.findIndex(e => Math.abs(e) === edge?.ID);
    if (!edge || j < 0 || row[2] === 0 || row[2] === 3) return null;
    return route.slice(0,j).reduce((sum,e) => sum + edges[Math.abs(e)-1].Length_km,0)
      + (route[j] > 0 ? row[7]/1000 : edge.Length_km-row[7]/1000);
  }
  function prototypeBudget(index) {
    const cases=[{name:'Un vehículo de pruebas',vehicles:1,points:2,hours:[160,320]},
      {name:'Tres vehículos de pruebas',vehicles:3,points:4,hours:[240,480]},
      {name:'Ocho vehículos de pruebas',vehicles:8,points:6,hours:[400,800]}];
    const c=cases[index]; if(!c)return null;
    // Scenario bands in EUR, not supplier quotations or railway installation costs.
    const rows=[['GNSS y antena',c.vehicles,220,350],['IMU y odometría de laboratorio',c.vehicles,60,150],
      ['Ordenador, alimentación y caja',c.vehicles,160,260],['Detector local de maqueta',c.points,40,100],['Material común de banco',1,150,350]];
    const material=[0,1].map(k=>rows.reduce((sum,r)=>sum+r[1]*r[k+2],0));
    const engineering=[c.hours[0]*45,c.hours[1]*70];
    return {...c,rows,material,engineering,total:material.map((v,i)=>v+engineering[i])};
  }
  function lifecycleCost(p) {
    const keys = ['trains','years','onboard','integration','validation','trackside','annual','avoided'];
    if (keys.some(k => typeof p[k] !== 'number' || !Number.isFinite(p[k]) || p[k] < 0)
      || !Number.isInteger(p.trains) || p.trains < 1 || !Number.isInteger(p.years) || p.years < 1) return null;
    const investment = p.trains * p.onboard + p.integration + p.validation + p.trackside;
    const cost = investment + p.years * p.annual, benefit = p.years * p.avoided;
    const annualNet = p.avoided - p.annual;
    if (![investment,cost,benefit,annualNet].every(Number.isFinite)) return null;
    return {investment, cost, benefit, net: benefit - cost,
      requiredAnnualBenefit: cost / p.years,
      paybackYears: investment === 0 && annualNet >= 0 ? 0 : annualNet > 0 ? investment / annualNet : null};
  }
  // Pedagogical axle balance for one section, one direction, no junctions.
  // A verified-empty initial condition is explicit; a cold start is unknown.
  function newSection(verifiedEmpty = false) {
    return {count: 0, uncertain: !verifiedEmpty, link: true, sequence: 0, fault: ''};
  }
  function sectionStatus(s, remote = false) {
    if ((remote && !s.link) || s.uncertain) return 'unknown';
    return s.count === 0 ? 'clear' : 'occupied';
  }
  function sectionStep(previous, event) {
    const s = {...previous};
    if (event.sequence !== s.sequence + 1) {
      s.uncertain = true; s.fault = 'Secuencia de eventos incoherente'; return s;
    }
    s.sequence = event.sequence;
    if (event.kind === 'link_down') s.link = false;
    else if (event.kind === 'link_up') s.link = true;
    else if (event.kind === 'detector_fault') { s.uncertain = true; s.fault = 'Detector o enlace local sin diagnóstico válido'; }
    else if (event.kind === 'entry' || event.kind === 'exit') {
      if (!Number.isInteger(event.axles) || event.axles <= 0) {
        s.uncertain = true; s.fault = 'Recuento de ejes inválido';
      } else {
        s.count += (event.kind === 'entry' ? 1 : -1) * event.axles;
        if (s.count < 0) { s.uncertain = true; s.fault = 'Más salidas que entradas'; }
      }
    } else if (event.kind !== 'hold') { s.uncertain = true; s.fault = 'Evento no reconocido'; }
    // No automatic clear after a detector fault, even if the balance returns to zero.
    return s;
  }
  const api = {compareArrivals, assessEvidence, experimentReading, evidenceCoverageFloor, commonTrunkKm, prototypeBudget, lifecycleCost, newSection, sectionStep, sectionStatus};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RailMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
