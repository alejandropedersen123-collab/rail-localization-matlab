# Propuesta de operación autónoma: de la hipótesis a la evidencia

La visión de Rail Lab es investigar una arquitectura ferroviaria capaz de conducir y coordinar trenes automáticamente, conservar información de ocupación durante degradaciones y reducir el coste total de operación. Es un objetivo de desarrollo, no una capacidad ya acreditada. El demostrador permite revisar tres piezas separadas y explorar la viabilidad económica con hipótesis explícitas.

## Referencia y aportación que se quiere investigar

El [metro de Copenhague](https://metroselskabet.dk/en/about-us/about-the-metro/rolling-stock-train-systems-and-signalling/) describe su control automático mediante supervisión del tráfico (ATS), conducción (ATO) y protección (ATP). Mantiene [personal en el centro de control](https://www.metroservice.dk/en/careers/positions/control-room/). Es una referencia funcional para el objetivo de autonomía; no un caso comparable directamente con la red interurbana Madrid–Andalucía.

La detección de tren por circuitos de vía y contadores de ejes ya existe: [documentación técnica de Adif](https://www.adif.es/documents/20124/45207799/02.-%2BTechnical%2BDocumentation%2BITE%2Bcompliant%2Btrain%2Bdetection_ADIF.SPAIN%2Bes.pdf/51e8d77c-da3f-c859-60c6-09c385b3a1b2?t=1756892978735) y [contadores de Frauscher](https://www.frauscher.com/en/products/axle-counters). Tampoco es nueva la investigación en fusión de sensores ferroviarios: [Europe’s Rail](https://rail-research.europa.eu/solutions-catalogue/satellite-positioning-set-to-enhance-train-localisation/) documenta trabajos de posicionamiento por satélite, sensores complementarios y mapas.

La posible aportación de este proyecto se deberá concretar y comparar: integración modular, tratamiento verificable de degradaciones y una relación coste/prestaciones favorable para un ámbito de operación definido. El prototipo no demuestra todavía novedad técnica, sustitución viable de sistemas existentes ni superioridad frente a equipos comerciales. Fuentes consultadas el 30 de octubre de 2026.

## Qué demuestra hoy cada pieza

| Pieza | Comportamiento implementado | Límite de la evidencia |
|---|---|---|
| Red de ocho trenes | Reservas exclusivas, liberación por cola, regulación de velocidad y paradas, tres escenarios | Posición y ocupación ideales; dinámica simplificada; sin sensores reales ni integración ATO/ATP |
| Laboratorio de sensores | Cuatro arquitecturas, observaciones comunes en replay, controles de coherencia y frenado hipotético | Un tren, obstáculo fijo, tres semillas publicadas; no tasas de fiabilidad ni prueba de campo |
| Sección de detección local | Balance de ejes, ocupación persistente, pérdida de enlace remoto, fallo local retenido | Modelo lógico unidireccional, sin hardware, desvíos, inversión, vehículos que entran por puntos no instrumentados ni garantía de detección de fallos |
| Presupuestos de prototipo | Tres ejemplos preparados de material y trabajo, con referencias de componentes | Bandas propias, sin cotización de instalación ferroviaria ni ahorro validado |

El estimador de sensores y el contador de ejes **no están conectados** a la regulación de los ocho trenes. La navegación común de la web no implica integración funcional. Madrid–Andalucía reproduce trayectorias de MATLAB; los otros mapas preparados y los JSON importados se calculan en el navegador. La detección lógica y los presupuestos también se ejecutan localmente. Los fallos GPS del mapa son etiquetas de ensayo y no alimentan al regulador ideal.

## Evidencias favorables y casos pendientes

Resultados procedentes de [`results_v2/summary.csv`](../results_v2/summary.csv), tres semillas por escenario y arquitectura:

- **Salto GNSS de −400 m:** RMSE de 247,588 m con GNSS; 6,354 m con GNSS y controles; 113,689 m con fusión; 0,765 m con fusión y controles. La mejora no se atribuye solo a añadir sensores: los controles también aportan por separado.
- **Vía libre con pérdida de GNSS:** GNSS con controles ordena frenar en 3/3 ensayos; fusión con controles, en 0/3. Es una señal favorable para estudiar continuidad ante esa degradación, no una estimación de disponibilidad en servicio.
- **Deriva compartida:** fusión con controles presenta RMSE de 15,020 m y cobertura empírica de ±3σ del 31,46 %. La incertidumbre formal puede subestimar el error.
- **Mapa coherente pero equivocado:** identidad de vía incorrecta con aparente confianza en el 100 % de las muestras de este caso. No resuelto.
- **Frenado insuficiente o baja adherencia con pendiente:** las cuatro configuraciones cruzan geométricamente el obstáculo. Mejor estimación no sustituye capacidad física de frenado.

La referencia «GNSS» es un estimador del experimento; no representa ETCS, LZB, un enclavamiento o un sistema comercial completo. No corresponde presentar estos cocientes de RMSE como porcentaje de mejora de seguridad frente al ferrocarril actual.

## Detección sin cobertura pública

El demostrador conserva un balance de ejes en un procesador local abstracto. Entra un eje: suma uno; sale un eje: resta uno. Una parada no modifica el balance. El estado inicial solo es libre si se especifica una sección vacía verificada; un arranque sin esa condición es indeterminado.

Se separan dos degradaciones:

1. **Enlace con el centro remoto interrumpido:** el recuento local sigue funcionando; el centro carece de confirmación actual. Incluso si el tren sale por completo, el estado remoto sigue indeterminado hasta recuperar enlace. En este modelo la recuperación transmite instantáneamente el estado local; no se ha modelado un protocolo real ni su latencia.
2. **Detector o enlace local con fallo conocido:** el estado local queda indeterminado y retenido. Recuperar comunicaciones o volver a un balance cero no declara libre la sección. Una secuencia incoherente, recuento inválido o balance negativo produce también ese estado.

«Nuevo ensayo» inicia otro experimento con vía vacía verificada; no es un procedimiento de rearme operativo. El equilibrio del contador no basta para autorizar circulación: también harían falta reserva de itinerario y el resto de condiciones de protección. No se modela detección de rotura de carril. Un pulso perdido o espurio no diagnosticado puede invalidar el balance: este demostrador no garantiza descubrirlo.

Funcionar sin internet exige conservar alimentación y la comunicación local entre detectores, procesador y funciones pertinentes. La autonomía no equivale a circular indefinidamente sin conocer el estado de la infraestructura.

## Economía: ejemplos preparados y alcance explícito

La web ofrece tres presupuestos de laboratorio para uno, tres u ocho vehículos de pruebas. No pide precios al visitante. Se separan material, horas hipotéticas de desarrollo y total; el desglose se puede descargar en CSV. [Bandas, referencias y exclusiones](COST_EXAMPLES.md).

Los costes completos de una implantación requerirían equipos adecuados, infraestructura, comunicaciones, energía, centro de control, integración, validación, ciberseguridad, soporte, reposiciones y mantenimiento. Sin esas partidas y una alternativa equivalente no puede afirmarse que la propuesta sea más barata. La función de coste de ciclo de vida se conserva en el código como utilidad, pero ya no es el flujo público de la web.

## Próximos hitos y criterios medibles

| Hito | Qué medir antes de avanzar |
|---|---|
| Integración en simulación | Propagar incertidumbre y estados desconocidos al regulador; retardos, pérdida de paquetes, reinicios, inversión y fallos de causa común |
| Ensayo con hardware | Comparación con verdad de referencia; detecciones omitidas/espurias, tiempo de detección, consistencia de estado después de reinicio |
| Piloto sin tomar el mando | Disponibilidad por condición, paradas y alertas injustificadas por hora o kilómetro, errores de vía y posición, latencia, recuperación y mantenimiento |
| Comparación económica | Presupuestos e intervenciones observadas, coste total por tren y por kilómetro, sensibilidad al alcance y a los fallos |
| Evaluación para operación autónoma | Protección, puertas, accesos, evacuación, comunicaciones, supervisión y modos degradados con especialistas y operadores |

La fiabilidad necesita una definición operacional, exposición suficiente, condiciones representativas y tratamiento de incertidumbre estadística. Los ensayos de software detectan errores del prototipo; no sustituyen esa evaluación.

## Reproducibilidad y comprobaciones

- `network.export_viewer` incorpora los CSV de sensores y los resultados guardados de la red en un HTML independiente. El motor configurable del navegador se contrasta con referencias de MATLAB.
- `viewer/analytics.js` contiene las funciones puras de comparación, coste y detección. `viewer/app.js` conecta los controles y las vistas.
- `node --test tests/*.test.cjs` comprueba ocupación, fallos retenidos, pérdidas de enlace, entradas inválidas, resultados económicos positivos y negativos, ámbito del diagrama y correspondencia con las 68 filas de sensores.
- `network.selftest(results)` y `rail.selftest(rail.default_config())` comprueban el motor y el laboratorio original. El alcance completo de validación está en [NETWORK_VALIDATION.md](NETWORK_VALIDATION.md) y [VALIDATION.md](VALIDATION.md).
