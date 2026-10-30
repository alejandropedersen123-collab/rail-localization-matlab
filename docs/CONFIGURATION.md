# Redes configurables

El motor acepta grafos, rutas y vehículos definidos en JSON. La web ofrece cuatro ejemplos sin pedir datos al visitante:

| Ejemplo | Ancho | Vías | Trenes | Procedencia |
|---|---:|---|---:|---|
| Madrid–Andalucía | 1435 mm | Doble y ramal único | 8 | Infraestructura simplificada con referencias de Adif; tráfico sintético |
| Regional ibérico | 1668 mm | Doble | 2 | Mapa, distancias, horarios y límites ficticios |
| Regional métrico | 1000 mm | Única con apartaderos abstractos | 2 | Mapa, distancias, horarios y límites ficticios |
| Metro en anillo | 1435 mm | Doble | 3 | Mapa, distancias, horarios y límites ficticios |

La selección de ancho comprueba compatibilidad geométrica declarada; no demuestra compatibilidad con equipos o redes reales. Los límites de velocidad son consignas del modelo, no CVM vigentes.

## Datos del proyecto

Los archivos de `networks/` son ejemplos completos del formato versión 1. Se pueden importar en «Para autores» o pasar a `rail_network_demo` mediante `options.project`.

- `parameters`: paso y duración del cálculo, muestreo, longitud de cantones, márgenes de apartaderos, anticipación, respuesta, reserva, liberación y aproximación terminal. Unidades explícitas en cada nombre.
- `nodes`: ID consecutivo desde 1, nombre, coordenadas de dibujo `x/y` sin unidad geográfica, posición de etiqueta, `passingLoop` y reserva de cruce `junction`.
- `edges`: ID consecutivo, nodos de origen/destino, longitud en metros, una o dos vías, lista de anchos admitidos en milímetros, límite en km/h y procedencia.
- `trains`: ID, nombre, salida en segundos, longitud, ancho fijo, velocidad, aceleración, frenado, ruta y paradas con permanencia.
- `analysisRoute`: ruta orientada usada como eje del diagrama espacio–tiempo; los ramales fuera de ella no se representan en el diagrama.
- `gpsFaults`: ventanas por tramo con `start_s`, `end_s` y estado `available`, `unavailable` o `unknown`. Cada tramo también tiene un estado base `gps`; si falta, se toma desconocido.

En las rutas, `2` recorre el tramo 2 de origen a destino y `-2` lo recorre al revés. Los tramos deben conectar. Se admiten anillos de una vuelta, sin repetir un tramo dentro de una circulación. Las paradas deben seguir el orden de la ruta y terminar en su destino. Un cambiador de ancho o un cambio de cabina dentro de la misma circulación no se simula.

`junction: exclusive` reserva el nodo para todos los movimientos; `directional` separa recursos por sentido canónico y exige orientación coherente de los tramos. Esta última opción es una simplificación, no una matriz real de incompatibilidades. Un nodo con más de dos tramos debe declarar reserva. Los extremos de un tramo único con apartadero representan vías de espera separadas; el tren y el margen de liberación deben caber. Se reserva el tramo único compartido para evitar entradas opuestas simultáneas.

Hay límites para mantener el navegador utilizable: 300 nodos, 600 tramos, 64 trenes, dos millones de pasos-tren, 300.000 muestras-tren y una estimación de hasta 20.000 recursos. El paso debe estar entre 0,2 y 2 s. Se puede cancelar el cálculo. El cálculo acaba si todos los trenes terminan o se agota el horizonte; una ejecución incompleta no se presenta como completada.

## GPS y posición mostrada

Las tres condiciones preparadas son señal disponible supuesta, pérdidas y cobertura desconocida, o cobertura totalmente desconocida. Las ventanas son inclusivas al inicio y exclusivas al final; si se solapan, prevalece la última declarada. Los botones buscan un tren activo dentro de la ventana y del tramo afectado; si no existe, se informa.

No hay mediciones de cobertura de esas rutas. «Sin GPS» no implica pérdida de detección local ni pérdida de comunicación. El mapa y el regulador usan posición ideal: la capa GPS permite plantear el ensayo, pero **no simula todavía la degradación del estimador conectado al tráfico**. El laboratorio de sensores sigue siendo un experimento separado.

Importar un JSON conserva su cobertura y ventanas originales. Elegir un ejemplo preparado aplica la condición seleccionada. Los enlaces de ejemplos conservan la red, condición GPS, escenario, tren e instante; para una red importada hay que compartir también el JSON.

## Alcance de adaptación

Se pueden preparar otras topologías españolas con sus propios datos, siempre dentro de estas abstracciones. No se afirma compatibilidad universal con cualquier sistema ferroviario: faltan electrificación y gálibos, enclavamientos reales, señalización y protocolos, maniobras, pendientes/adherencia por tramo, matrices completas de desvíos, detección física y resolución general de bloqueos. La prioridad de reserva depende del orden de los trenes. Una topología admisible puede acabar bloqueada o necesitar más horizonte; revisar la auditoría y las finalizaciones es parte del ensayo.

`validate_configurable` genera referencias MATLAB para tres topologías distintas y verifica rechazos de ancho/ruta/apartadero/GPS inválidos y exportación de un único tren, tramo e instante. `node --test tests/*.test.cjs` compara todos los estados físicos muestreados de esas referencias y las llegadas de Madrid–Andalucía con el motor del navegador.
