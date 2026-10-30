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
  const api = {compareArrivals, commonTrunkKm, prototypeBudget, lifecycleCost, newSection, sectionStep, sectionStatus};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RailMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
