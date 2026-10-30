# Validación de la red de ocho trenes

Fecha: **30/10/2026**. MATLAB **26.1.0.3346908, R2026a Update 5**, Windows, MATLAB base.

Comando de reproducción: `report = validate_network;`.

## Resultados de la ejecución

| Caso | Completan | Máximo simultáneo | Conflictos de ocupación | Rebases de autorización | Excesos del límite del modelo |
|---|---:|---:|---:|---:|---:|
| Nominal | 8 | 8 | 0 | 0 | 0 |
| Interrupción de autorizaciones | 8 | 8 | 0 | 0 | 0 |
| Parada prolongada | 8 | 8 | 0 | 0 | 0 |

Los contadores se evalúan cada segundo, no solo en las muestras exportadas. La tolerancia de exceso de velocidad es 0,05 m/s. Los límites son los supuestos del experimento, no un CVM operacional validado.

Las **nueve comprobaciones** constan en [`checks.csv`](../results_network/checks.csv). Incluyen el frenado analítico con tres pasos temporales, reservas en convergencias, liberación por la cola, bloqueo de ampliaciones, protección ante entradas opuestas, anticipación de límites, los tres escenarios completos, un encuentro adicional de dos servicios de Granada y convergencia temporal.

Al reducir el paso a **0,5 s**, los ocho trenes siguen completando sin conflictos, rebases ni excesos. La mayor diferencia de llegada frente al paso de 1 s es **8 s**. Los valores individuales están en [`convergence.csv`](../results_network/convergence.csv).

Las **seis familias de pruebas del laboratorio original** también finalizaron correctamente: [`localization_checks.csv`](../results_network/localization_checks.csv). MATLAB Code Analyzer no emitió mensajes en los **33 archivos `.m`** del proyecto.

## Límites observados

En el caso nominal, el menor hueco calculado entre cabeza y cola fue aproximadamente **360 m**. Es un resultado de esta circulación y de sus velocidades en ese momento, **no una distancia reglamentaria ni una separación admisible a máxima velocidad**. La traza pública permite comprobarlo por tren y tiempo; la auditoría usa resolución de 1 s y el visor, de 10 s.

La dinámica idealizada da recorridos Málaga–Madrid de aproximadamente 118–133 minutos según paradas. Estos resultados son demasiado optimistas para tomarlos como horarios comerciales: faltan el perfil local de velocidades, las restricciones de circulación y la dinámica de tracción completa. Se conserva esa limitación visible en vez de ajustar los resultados para aparentar coincidencia con un horario real.

El conjunto de pruebas verifica propiedades concretas del software y los casos ejecutados. No demuestra ausencia de bloqueos para cualquier horario posible, validez del modelo de infraestructura, cumplimiento del RCF ni seguridad de un sistema desplegado.

## Artefactos revisados

Las figuras se han renderizado y revisado visualmente. El visor HTML se ha probado en Chrome con los ocho servicios activos, cambio de escenario, selección de tren, desplazamiento temporal y reproducción. El HTML incluye los datos y no depende de librerías externas de ejecución. La versión Genesis carga tipografías desde Fontshare y Google Fonts, con alternativas locales sin conexión. Para revisar los límites de los datos ferroviarios, consultar [REAL_DATA.md](REAL_DATA.md).
