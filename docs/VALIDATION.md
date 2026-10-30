# Validación de la muestra publicada

Fecha: **30 de octubre de 2026**. Entorno: **MATLAB 26.1.0.3346908 (R2026a) Update 5 en Windows**, usando MATLAB base. No se ha comprobado la compatibilidad con Octave ni con otras versiones de MATLAB.

## Ejecución reproducible

Desde la raíz del repositorio:

```matlab
results = rail_modular_demo(fullfile(pwd,'results_v2'), 3);
comparison = compare_sensor_module(results);

files = [dir('*.m'); dir('+rail/*.m')];
for k = 1:numel(files)
    issues = checkcode(fullfile(files(k).folder,files(k).name), '-id');
    assert(isempty(issues), files(k).name);
end
```

La muestra principal utiliza las semillas **1001, 1002 y 1003**: 17 escenarios, 4 configuraciones, 51 combinaciones escenario/semilla, 204 ensayos y 408 simulaciones al contar replay y lazo cerrado. `summary.csv` tiene 68 filas y `trials.csv`, 204. No son 408 situaciones independientes.

La comparación sin distancias utiliza **una semilla (1001)**: 68 ensayos y 136 simulaciones adicionales. `module_comparison.csv` compara esa semilla con la misma semilla de la muestra principal. El adaptador elimina únicamente el canal de distancias; las configuraciones GPS mantienen exactamente las mismas estimaciones y trayectorias en ambos modos.

El valor por defecto del programa es **30 semillas**. Los archivos incluidos corresponden a la muestra de tres semillas, no a una ejecución completa de ese valor por defecto. Para generar el experimento de 30 semillas, ejecutar `results = rail_modular_demo;`.

## Comprobaciones

Las seis familias de pruebas deterministas de `rail.selftest` se ejecutan antes de cada experimento y constan en [`checks.csv`](../results_v2/checks.csv):

1. Distancia de parada frente a dinámica integrada, límite de frenado constante, paso temporal, pendiente, adherencia y ausencia de marcha atrás.
2. Trayectoria y observaciones idénticas para las cuatro configuraciones en replay.
3. Sustitución transparente del adaptador y retirada aislada del canal de distancias.
4. Ambigüedad de vía, mapa desplazado y mapa coherente pero equivocado.
5. Separación entre avisos de peligro y paradas por diagnóstico en trayectos libres.
6. Rechazo de saltos GNSS y distancias aberrantes, antigüedad de mensajes y pérdida de sensores.

El programa también comprueba covarianzas semidefinidas positivas dentro de tolerancia, errores finitos, velocidades finales no negativas y observaciones emparejadas. La comparación modular comprueba igualdad exacta de las salidas GPS y un efecto medible en las configuraciones de fusión. **Todas estas comprobaciones finalizaron correctamente**. Code Analyzer no informó de incidencias en los **20 archivos MATLAB**.

## Resultados que delimitan el alcance

Estos valores proceden de [`summary.csv`](../results_v2/summary.csv), usando `Fusion + controls`:

| Caso | Resultado de esta muestra |
|---|---|
| Salto GNSS de −400 m | RMSE longitudinal medio en replay: 0,765 m |
| Deriva compartida | RMSE: 15,020 m; cobertura empírica del intervalo formal ±3 sigma: 31,46 % |
| Mapa coherente pero equivocado | Identidad incorrecta considerada conocida en el 100 % de las muestras |
| Frenado insuficiente | Cruce geométrico del obstáculo en 3 de 3 ensayos |
| Pendiente y baja adherencia | Cruce geométrico del obstáculo en 3 de 3 ensayos |

Las pruebas superadas verifican propiedades concretas del código y del diseño experimental. No significan que todos los escenarios terminen bien: los fallos compartidos, el mapa incorrecto y los límites físicos de frenado permanecen visibles. La muestra es pequeña y sintética; no permite inferir tasas de fallo reales ni una garantía de seguridad.

## Archivos regenerables

Se incluyen las tablas agregadas, métricas por ensayo, informes y tres figuras. Las trazas detalladas de la primera semilla y `rail_results.mat` se generan al ejecutar el programa y se excluyen de Git para evitar duplicar grandes cantidades de datos. `compare_sensor_module(results)` puede ejecutarse inmediatamente después de generar la muestra; su ejecución sin argumentos requiere ese archivo MAT local.
