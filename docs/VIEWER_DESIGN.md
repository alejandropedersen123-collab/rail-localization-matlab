# Genesis aplicado al visor ferroviario

Referencia: documento `genesis-DESIGN.md` proporcionado por el autor del proyecto. La interfaz se compone de `viewer/template.html`, `viewer/app.js` y las funciones puras de `viewer/analytics.js`. El exportador incorpora las tres partes y los datos en un HTML independiente. La dinámica de MATLAB y sus trayectorias no cambian.

- Fondo `#FAFAFA`, tarjetas `#FFFFFF`, texto `#0A0A0A` y bordes `#E8E8EC`.
- Índigo `#6366F1` para reproducción, selección y foco; enlaces y hover con `#4F46E5`. Sin degradados ni sombras en superficies estáticas.
- General Sans para títulos, DM Sans para interfaz y JetBrains Mono para cifras. Solo pesos 400 y 700.
- Navegación de 56 px, espaciado en múltiplos de 4, tarjetas de radio 12 px y controles de radio 6 px.
- Tema claro inicial y conmutador de tema oscuro. El color de trazado, etiquetas y trenes se adapta al tema.
- En pantallas estrechas, controles y tarjetas se apilan; el mapa conserva un ancho legible y permite desplazamiento horizontal dentro de su panel.
- Acceso por teclado, enlace para saltar al simulador, etiquetas de controles y selección con `aria-pressed`. La tabla ofrece los valores equivalentes al esquema de canvas. Las transiciones respetan `prefers-reduced-motion`.

Los colores categóricos de los trenes se conservan como apoyo a sus identificadores: ningún tren depende únicamente del color para ser reconocido. El aviso de interrupción usa colores de advertencia.

## Tipografías

Se cargan mediante las hojas de estilo oficiales de [Fontshare](https://www.fontshare.com/fonts/general-sans) y [Google Fonts](https://fonts.google.com/). No se redistribuyen archivos de fuentes dentro del repositorio. Si no hay red, los datos y los controles siguen funcionando con Segoe UI, sans-serif y Consolas/monospace.

## Regenerar la interfaz

Si ya existe la ejecución local guardada, no es necesario volver a simular:

```matlab
load('results_network/network_results.mat','results');
network.export_viewer(results,'results_network');
```

También se regenera al ejecutar `rail_network_demo`. La comparación del JSON incorporado antes y después de la ampliación confirmó que nodos, tramos y los tres escenarios (trayectorias, resúmenes y auditorías) permanecen idénticos. Se añaden configuración, versión de esquema y evidencia de sensores, leída del CSV publicado.

## Laboratorio de investigación

Cuatro áreas con navegación por pestañas y teclado separan visión/evidencias, circulación, detección local y costes/despliegue. La portada explica el objetivo de autonomía y distingue resultados del prototipo de objetivos de coste y fiabilidad.

El comparador de sensores incorpora los 17 escenarios completos. El diagrama espacio–tiempo restringe la distancia a los cinco tramos comunes para evitar mezclar ramales distintos. La comparación de llegadas identifica sus cifras como resultados del caso completo. El contador distingue estado local y remoto; el evaluador económico exige datos y permite resultados negativos. Los CSV y JSON se generan en el navegador sin enviar los supuestos introducidos a un servidor.

Las vistas pequeñas permiten desplazamiento dentro de tablas y diagramas. Las categorías se identifican con texto además de color. El estado desconocido no se presenta como vía libre, y los ceros del formulario se distinguen de datos ausentes.

## Revisión visual y funcional

Comprobado en Chrome el 30/10/2026: temas claro y oscuro, disposición de escritorio y pantalla de 390 × 844 px. La página móvil no desborda horizontalmente; el desplazamiento se limita al panel del mapa y funciona también con las flechas del teclado. Se comprobaron los tres escenarios, reproducción/pausa, selección de tren, desplazamiento temporal, estado final y apertura de fuentes. La consola no registró errores ni advertencias durante esas acciones. La sintaxis JavaScript pasó `node --check`.

La ampliación de investigación añade 11 grupos de pruebas con `node --test tests/viewer.test.cjs`, todos superados. Se volvieron a ejecutar los 7 grupos de `network.selftest(results)` y los 6 del laboratorio original, sin fallos. No se repitió toda la campaña de simulación: el motor no se modificó y se verificó que el contenido de la red sigue idéntico al publicado previamente.

En el navegador se comprobaron la selección de fallos de sensores, la permanencia del estado indeterminado tras recuperar enlace y equilibrar ejes, un caso económico con sobrecoste de 40.000 € (valores exclusivamente de prueba), navegación por áreas y restauración de escenario/tren/instante mediante enlace. Las descargas de sensores (68 filas) y comparación de llegadas (8 filas) se contrastaron con las métricas originales. Móvil sin desbordamiento de página y tema oscuro revisados; consola sin errores observados.
