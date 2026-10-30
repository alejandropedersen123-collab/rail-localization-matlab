# Genesis aplicado al visor ferroviario

Referencia: documento `genesis-DESIGN.md` proporcionado por el autor del proyecto. La interfaz se compone de `viewer/template.html`, `viewer/app.js`, las funciones puras de `viewer/analytics.js` y el motor configurable `viewer/network-engine.js`. El exportador incorpora código y datos en un HTML independiente. Los ejemplos regionales y de metro se ejecutan localmente en el navegador.

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

También se regenera al ejecutar `rail_network_demo`. La exportación conserva listas JSON incluso para un único nodo de destino, tramo, vehículo o instante. Incorpora cuatro proyectos y los resultados del laboratorio de sensores.

## Laboratorio de investigación

Cuatro áreas con navegación por pestañas y teclado separan visión/evidencias, circulación, detección local y costes/despliegue. La portada explica el objetivo de autonomía y distingue resultados del prototipo de objetivos de coste y fiabilidad.

El comparador de sensores incorpora los 17 escenarios completos. La portada incluye accesos directos a los trenes y a los costes. La red se elige entre cuatro mapas; el diagrama usa una ruta de referencia configurable. Las condiciones GPS y sus ventanas son ejemplos, con acceso al primer tren afectado en cada ventana.

Los costes se eligen entre tres tamaños preparados, sin campos de entrada de precios. Material y trabajo se muestran por separado, con sus hipótesis y referencias. La configuración técnica de redes queda en un desplegable opcional para autores. CSV y JSON se descargan desde el navegador; los archivos importados no se envían a un servidor.

Las vistas pequeñas permiten desplazamiento dentro de tablas y diagramas. Las categorías se identifican con texto además de color. El estado desconocido no se presenta como vía libre. Las leyendas distinguen fallo GPS, incertidumbre de cobertura y ocupación local.

## Revisión visual y funcional

Comprobado en Chrome el 30/10/2026: temas claro y oscuro, disposición de escritorio y pantalla de 390 × 844 px. La página móvil no desborda horizontalmente; el desplazamiento se limita al panel del mapa y funciona también con las flechas del teclado. Se comprobaron los tres escenarios, reproducción/pausa, selección de tren, desplazamiento temporal, estado final y apertura de fuentes. La consola no registró errores ni advertencias durante esas acciones. La sintaxis JavaScript pasó `node --check`.

La versión configurable supera 20 pruebas Node: lógica de detección, costes preparados, correspondencia con las 68 filas originales de sensores, exportación mínima, validación de configuraciones y comparación de estados físicos entre MATLAB y navegador. Se repitió `validate_network`: los tres casos originales terminan 8/8, sin violaciones auditadas; la diferencia máxima con paso de 0,5 s continúa en 8 s. `validate_configurable` verifica las tres redes adicionales y entradas inválidas. Véase [CONFIGURATION.md](CONFIGURATION.md).

Revisión de los ejemplos: cuatro redes seleccionables, condiciones GPS, salto a un tren afectado, enlace que restaura metro/tren/instante, tres tamaños de presupuesto y CSV contrastado con las cifras visibles. En 390 × 844 px las tarjetas se apilan y la página no desborda horizontalmente. La carga de archivo por la automatización de Chrome no se pudo ensayar porque la extensión no tiene acceso a archivos locales; el lector y la validación JSON se comprobaron mediante pruebas de código.

## Lectura de los ensayos para visitantes sin experiencia técnica

Los 17 casos incluyen una conclusión, un siguiente paso de mejora y un recuento de configuraciones favorables/con reservas/desfavorables. Cada fila muestra un símbolo, una etiqueta y un motivo: no depende solo del color. La conclusión se anuncia con `role=status`; los contrastes tienen variantes para los temas claro y oscuro.

La valoración se calcula a partir de las métricas, con prioridad de los fallos sobre la precisión. Son desfavorables los rebases de obstáculo, identidad de vía errónea aceptada, falsas alarmas de obstáculo, avisos tardíos/ausentes o identidad de vía desconocida sin diagnóstico. Se muestran reservas ante incertidumbre no resuelta, frenadas prudentes sin obstáculo, parada no confirmada, datos ausentes o cobertura inferior al 95 % dentro de ±3σ. Este 95 % es una regla visual explícita del laboratorio, no un criterio ferroviario ni una probabilidad de seguridad. Verde significa resultado favorable en esta muestra sin esas señales; no certifica fiabilidad.

Las explicaciones distinguen los ensayos de posición sin actuación de los ensayos de frenado con actuación. El error RMSE no se describe como error máximo ni como margen de seguridad. La cabecera ya no presenta tres semillas como evidencia estadística amplia: indica tres ensayos por configuración. Las 24 pruebas incluyen los resultados esperados de las 68 filas, casos con posición precisa y frenado fallido, errores de vía, incertidumbre, frenadas prudentes y datos ausentes. La física y los resultados numéricos no se han modificado.

Se revisaron en Chrome las conclusiones de frenado fallido, vía libre y pérdida de GNSS, además de la vista móvil de 390 × 844 px y el tema oscuro: sin desbordamiento de página ni errores de consola. Se puede abrir un caso concreto con `?panel=proposal&sensor=14#experiments`, por ejemplo.
