# Motor de circulación de ocho trenes

`rail_network_demo` utiliza MATLAB base. El resultado es determinista: no introduce ruido aleatorio. El laboratorio de sensores `+rail` sigue siendo un experimento separado; la red utiliza posición y ocupación ideales, sin fingir que ha integrado GNSS, odometría o comunicaciones reales.

## Estado y circulación

Cada tren conserva su ruta, progreso longitudinal de la cabeza, velocidad, longitud, próxima parada, hora de salida y reservas. El motor asigna reservas a todos los trenes antes de moverlos en cada paso de 1 s. El orden de solicitud es SIM01–SIM08; esta prioridad fija puede afectar a las esperas. No optimiza un horario comercial.

Los tramos de doble vía tienen recursos independientes por sentido. Los de vía única comparten cantones y un recurso exclusivo adicional que protege la sección completa entre apartaderos. Las convergencias de Málaga/Sevilla y Málaga/Granada tienen una reserva de itinerario por sentido. Se simplifican las geometrías de los nudos; no se simulan todos sus desvíos ni posibles movimientos incompatibles.

Las reservas se conservan hasta que la cola haya superado el recurso con 10 m de margen. La anticipación se limita a 12 km. Si otro tren tiene el siguiente recurso, la autorización termina antes de él. Las secciones largas de vía única pueden reservarse enteras; su capacidad es deliberadamente conservadora. Los extremos representan vías de apartado independientes de 250 m por lado, no una reproducción de las estaciones reales.

## Física y control

La velocidad objetivo es el mínimo de la consigna, el límite del tramo, la anticipación de límites posteriores, la envolvente de parada ante la autorización y la parada programada. La envolvente usa `v² = 2 b d`, un margen temporal de 2 s y la anticipación de un paso de integración. El regulador tiene realimentación ideal, aceleración limitada y deceleración constante de servicio.

La posición se integra con aceleración constante durante cada paso. Si el tren se detiene dentro del paso, se integra hasta el instante exacto de parada. No se recorta la posición al final de una autorización para ocultar un rebase. Solo se admite un ajuste numérico inferior a 15 cm al estacionar, a velocidad inferior a 0,15 m/s.

No hay modelo de potencia frente a velocidad, pendiente, resistencia, adherencia variable, avería del freno o latencia real en este motor. Por ello los tiempos son los de una dinámica idealizada y pueden ser bastante menores que los horarios comerciales. Los fallos de sensores y frenado del laboratorio original no se trasladan automáticamente a esta red.

## Casos

| Caso | Cambio |
|---|---|
| `nominal` | Ocho salidas ficticias entre T+0 y T+30 min |
| `signal_outage` | Entre T+60 y T+70 min no se conceden recursos nuevos; se conservan los ya concedidos |
| `station_delay` | SIM01 permanece 20 min adicionales en su primera parada, Antequera Santa Ana |

La interrupción no pretende reproducir el procedimiento ante una avería real de LZB/ETCS. Las terminales retiran el tren del modelo 60 s después de la llegada y se supone capacidad suficiente para ello. No hay maniobras, inversión ni reutilización del material.

## Salidas

- `trains.csv`: salida planificada/efectiva, llegada, duración, máximo de velocidad y mínimo hueco aplicable por tren.
- `traces.csv`: muestras cada 10 s y una muestra final. Incluye cabeza, velocidad, estado, fin de autorización, hueco de cabeza a cola, líder, tramo y coordenada del tramo.
- `stops.csv`: llegada y duración de cada parada.
- `audit.csv`: comprobaciones **en cada paso**, aunque la traza exportada se reduzca a 10 s.
- `nodes.csv` y `edges.csv`: red, referencias de longitud y límites asumidos.
- `visor.html`: reproducción independiente y sin servidor; seleccionar caso, tren, velocidad de reproducción o instante.
- `operations.png` y `separation.png`: figuras de circulación y comparación. La distancia desde Madrid es una coordenada por ruta; curvas de ramales diferentes que se crucen en el gráfico no implican un conflicto físico.

Estados: 0 pendiente, 1 circulando, 2 en estación, 3 finalizado. El tiempo es relativo al inicio del experimento, no una hora del horario real. Las métricas de mínimo hueco se calculan cada segundo; el mínimo puede no coincidir exactamente con una muestra del visor.

## Ejecutar y comprobar

```matlab
results = rail_network_demo;
report = validate_network;

% Solo un escenario, sin volver a dibujar figuras:
r = rail_network_demo(fullfile(pwd,'results_smoke'), ...
    struct('scenarios',{{'nominal'}},'makePlots',false));
```

`validate_network` ejecuta los tres escenarios, comprueba distancia analítica de frenado, exclusión de recursos y liberación por la cola, interrupción de autorizaciones, protección de vía única y anticipación de reducción de velocidad. Añade un encuentro de dos trenes de Granada, una ejecución nominal a 0,5 s y las pruebas del laboratorio original. El criterio de convergencia exige una diferencia máxima de llegada inferior a 90 s; no una igualdad exacta, porque reservas y paradas se deciden en instantes discretos.

La auditoría reconstruye la ocupación a partir de la cabeza y la cola. Comprueba que ningún recurso físico lo ocupen dos trenes y que exista reserva para cada ocupación. También cuenta los rebases de autorización y los excesos de límite. Superar estas pruebas valida los casos ejecutados bajo sus supuestos, no la seguridad de una implementación ferroviaria real.
