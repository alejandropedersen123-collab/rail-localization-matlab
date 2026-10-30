# Datos contrastados y supuestos del modelo

Consulta: **30 de octubre de 2026**. Esta es una red reducida apoyada en documentación pública, no una copia del inventario de Adif ni de la circulación de un día concreto. Los ocho servicios SIM01–SIM08 son ficticios.

## Qué se ha podido verificar

| Dato publicado | Valor o hecho | Fuente | Uso y límite |
|---|---|---|---|
| Madrid–Sevilla | Aproximadamente 471 km; doble vía; referencia final 470+500 | S01 | Total de referencia de 470,5 km en el modelo; no certifica el centro de cada andén |
| Ramal de Málaga | 155 km desde el enlace en Almodóvar del Río; doble vía; diseño para 350 km/h | S02 | Contraste general; **no** son 155 km desde Córdoba estación, ni 350 km/h autorizados hoy |
| Ciudad Real–Calatrava–Puertollano | 25,73 + 12,97 = 38,70 km | S04 | Longitud documental de estos tramos, incorporada al modelo |
| Córdoba Central–Bif. Málaga AV | 14,33 km | S04 | Longitud documental del tramo |
| Referencias técnicas del ramal de Málaga | Puente Genil 61+664; Antequera Santa Ana 97+190; Málaga 154+041 | S05 | Puntos técnicos, usados como aproximaciones de los nodos; no equivalen necesariamente al eje de los andenes |
| Antequera Santa Ana–Granada | 114,20 km en el pliego; máximo publicado 300 km/h | S06, pág. 8 | Total del tramo modelado; máximo publicado, no perfil de velocidades vigente |
| Topología hacia Granada | Doble hasta Archidona; tramos de vía única; posibilidad de cruce en Loja | S06, págs. 8–10 | Dos secciones largas exclusivas, con apartadero abstracto en Loja |
| Ampliación de capacidad de Granada | Adjudicación de 46 km de duplicación; variante de Loja aún en obras/contratada | S10, 05/08/2026 | Las obras futuras no se consideran en servicio |
| Tramo doble Antequera–Archidona | 9,5 km entre estación de Antequera y viaducto de Archidona | S10 | Aproximación entre nodos; la bifurcación y el viaducto no son el mismo punto |
| Vehículo de referencia S-102/112 | Longitud 200 m; máximo 330 km/h | S07 | Longitud física y techo del vehículo; no implica que todos los servicios reales usen ese material |

S06 también recoge restricciones temporales de 140 km/h y una limitación de 135 km/h en el entorno de Tocón. **No se ha verificado su vigencia actual y no se ha importado ese documento como un CVM completo.** Por tanto, este modelo no sirve para predecir tiempos de viaje comerciales.

## Cómo se construyen las distancias

Las filas exactas usadas por MATLAB están en [`edges.csv`](../results_network/edges.csv), con las columnas `DistanceStatus` y `Source`. Los decimales conservan las operaciones de cálculo; no indican precisión topográfica.

| Tramo reducido | km del modelo | Procedencia y tratamiento |
|---|---:|---|
| Madrid–Ciudad Real | 170,750 | Aproximación a la referencia técnica 170+749 de S03; no PK verificado de andén |
| Ciudad Real–Puertollano | 38,700 | S04; coordenada acumulada de Puertollano 209,450, derivada |
| Puertollano–Villanueva de Córdoba | 76,250 | Diferencia hasta una referencia aproximada 285,700 del entorno de la estación, S04a |
| Villanueva–Córdoba | 57,970 | Residuo hasta Córdoba 343,670, definido en el modelo como 358 − 14,33; **no es un PK oficial atribuido a la estación** |
| Córdoba–Bif. Málaga | 14,330 | S04; la bifurcación se sitúa aproximadamente a 358 km desde el origen del modelo |
| Bif. Málaga–Sevilla | 112,500 | Diferencia de referencias aproximadas: 470,5 − 358 |
| Bif. Málaga–Puente Genil | 61,664 | S05; origen del ramal simplificado |
| Puente Genil–Antequera Santa Ana | 35,526 | 97,190 − 61,664, S05 |
| Antequera Santa Ana–Málaga | 56,851 | 154,041 − 97,190, S05 |
| Antequera Santa Ana–Antequera AV | 23,320 | Aproximación: (130,010 − 9,5) − 97,190; S05/S06/S10 |
| Antequera AV–Archidona | 9,500 | Aproximación a la longitud publicada por S10 |
| Archidona–Loja | 29,390 | Diferencia de referencias del esquema de S06, pág. 9: 159,400 − 130,010; no levantamiento geométrico |
| Loja–Granada | 51,990 | Residuo para conservar el total documental de 114,20 km desde Santa Ana |

Totales del modelo: **Madrid–Málaga 512,041 km**, **Madrid–Sevilla 470,500 km** y **Madrid–Granada 569,390 km**. Deben leerse como aproximadamente 512, 471 y 569 km. No se ha comprobado la continuidad de todos los sistemas de kilometraje ni todas las ecuaciones de PK. S03 sitúa instalaciones de mantenimiento, no necesariamente edificios de viajeros. Por eso no se copian sus PK directamente como coordenadas de estaciones.

Se han omitido PAET, PIB, desvíos, curvas y estaciones intermedias. El ramal 014 permite movimientos Málaga–Granada, pero no forma parte de los ocho servicios Madrid–Andalucía de este experimento. El esquema del visor no es un mapa geográfico. La referencia pública de 122 km del proyecto Antequera–Granada tiene otro alcance; no se fuerza a coincidir con los 114,20 km del tramo descrito en S06.

## Velocidades, frenado y separación

| Parámetro | Valor usado | Naturaleza |
|---|---:|---|
| Techo del vehículo | 330 km/h | Ficha S-102/112, S07 |
| Consigna máxima del experimento | 300 km/h | Elección del modelo, compatible con los máximos publicados; no acredita autorización local |
| Límites por tramo | 300, 220 o 160 km/h | **Supuestos** de `ModelCap_kmh`; falta el CVM completo vigente |
| Aproximación/salida de terminal | 80 km/h durante 3 km | Supuesto |
| Aceleración / deceleración de servicio | 0,45 / 0,60 m/s² | Supuestos constantes; no curva certificada del S-102 |
| Margen temporal de la envolvente | 2 s | Supuesto del controlador ideal, no una latencia de comunicaciones medida |
| Cantones | Unos 2 km, con subdivisión en extremos | Discretización sintética; no cantones reales de LZB/ERTMS |
| Reserva ante fin de autorización | 100 m | Supuesto |
| Liberación tras la cola | 10 m adicionales | Supuesto espacial; no retardo temporal reglamentario |
| Extremos de secciones de vía única | 250 m por lado | Geometría abstracta de apartaderos; no planos reales de enclavamiento |
| Parada ordinaria / retirada en terminal | 120 / 60 s | Supuestos |

**No hay un número único de kilómetros de separación que se pueda asignar a todos los trenes.** El RCF describe en el BCA la protección mediante cantones, reservas, itinerarios y supervisión de velocidad (S08, 4.2.3.1–4.2.3.2). Este prototipo toma esas ideas; no implementa sus protocolos ni verifica cumplimiento normativo.

El hueco de salida es una magnitud calculada: distancia recorrida sobre la ruta desde la cabeza del seguidor hasta la cola del líder, en el mismo sentido. Se exporta por tren y tiempo. La longitud del tren se descuenta; los trenes en sentidos opuestos no se contabilizan como líderes. Si no existe líder aplicable se muestra «—» (`Inf` en la traza de MATLAB, `null` en JSON). Un hueco pequeño con trenes detenidos no equivale a admitirlo a 300 km/h.

## Los ocho trenes de la noticia

S09 menciona ocho trenes detenidos, pero no proporciona un registro sincronizado de sus posiciones, velocidades, longitudes, reservas y horas. No se ha localizado ese conjunto de datos en las fuentes consultadas. No se atribuyen a los ocho trenes reales los sentidos, salidas ni separaciones de este proyecto.

El experimento reparte ocho servicios ficticios: cuatro Málaga–Madrid (dos por sentido), dos Sevilla–Madrid y dos Granada–Madrid. Las salidas se escalonan durante 30 minutos para observar convergencias y ocho circulaciones simultáneas. Las incidencias son inyectadas por el modelo. No reconstruyen el suceso de la noticia ni sus causas.

## Registro de fuentes

- **S01 — Adif AV, LAV Madrid–Sevilla, financiación 2021–2027.** Longitud, doble vía y límites regionales. [Página oficial](https://www.adifaltavelocidad.es/financiacion-europea/2021-2027/lav-madrid-sevilla).
- **S02 — Adif AV, línea Córdoba–Málaga.** Longitud desde Almodóvar, doble vía, velocidad de diseño. [Página oficial](https://www.adifaltavelocidad.es/sobre-adif-av/red-av/cordoba-malaga). El acceso directo dio errores 502 intermitentes; se contrastó el contenido indexado y la variante de la misma página.
- **S03 — Adif, pliego de mantenimiento, 11/07/2019.** Referencias de instalaciones y línea Madrid–Sevilla, págs. 17–19. [Documento de contratación](https://contrataciondelestado.es/wps/wcm/connect/e7d9eefa-5e21-42c2-8276-618c179ac05d/DOC20190711112750PliegoDePrescripcionesTecnicas.PDF?CACHE=NONE&CONTENTCACHE=NONE&MOD=AJPERES&attachment=true). Verificación mediante extractos indexados; la descarga directa no estuvo disponible. Uso limitado a referencias aproximadas.
- **S04 — Adif, pliego de 23/06/2022, anexo I, tabla CIRTRA 2021, pág. 7 del anexo.** Distancias entre puntos operacionales. [Documento de contratación](https://contrataciondelestado.es/wps/wcm/connect/17e37cfb-d1f4-46a0-b5da-883bcaa83d8f/DOC20220623130641PliegoDePrescripcionesTecnicas.PDF?MOD=AJPERES). Tabla contrastada en el extracto indexado; no se da por actualizada a 2026.
- **S04a — Adif, actuaciones en Villanueva de Córdoba.** Referencia de obras 285+700 en el entorno de la estación. [Documento de contratación](https://contrataciondelestado.es/wps/wcm/connect/PLACE_es/Site/area/docAccCmpnt?DocumentIdParam=0267d4c9-bcaf-4977-a4ec-06a1de578db7&cmpntname=GetDocumentsById&source=library&srv=cmpnt). Uso aproximado, extracto indexado.
- **S05 — Adif, catálogo técnico de señales, 138 páginas.** Tablas de Córdoba–Málaga y Antequera–Granada; PDF descargado y texto comprobado. [Documento de contratación](https://contrataciondelestado.es/wps/wcm/connect/PLACE_es/Site/area/docAccCmpnt?DocumentIdParam=e899412d-03a3-4916-b807-ac27078c8899&cmpntname=GetDocumentsById&source=library&srv=cmpnt). No se ha establecido una fecha de vigencia operacional para todas sus filas.
- **S06 — Adif AV, PPTP de acondicionamiento de plataforma, fin variante de Loja–PB Íllora, 290 páginas.** Págs. 8–10 y 22; PDF descargado y esquema inspeccionado visualmente. Incluye referencia al estudio funcional de febrero de 2023. [Documento de contratación](https://contrataciondelestado.es/wps/wcm/connect/PLACE_es/Site/area/docAccCmpnt?DocumentIdParam=57ab8815-9386-4333-8efd-81ec002ed70a&cmpntname=GetDocumentsById&source=library&srv=cmpnt). CSV documental: `JQ2KHCJKR0RYSWS1X03042RF4G`.
- **S07 — Renfe of America, ficha S-102/112.** Longitud y velocidad máxima del vehículo. [Ficha de Renfe](https://renfeofamerica.com/es/es/renfe-world-wide/flota-de-trenes/s-102-112).
- **S08 — BOE, Reglamento de Circulación Ferroviaria.** Texto consolidado con última actualización indicada 12/07/2023; artículos 4.2.3.1 y 4.2.3.2. [RCF](https://www.boe.es/buscar/act.php?id=BOE-A-2015-8042).
- **S09 — laSexta, información de 28/10/2026.** Solo se usa para identificar la mención periodística a los ocho trenes; no como registro técnico ni conclusión causal. [Noticia](https://www.lasexta.com/noticias/sociedad/guardia-civil-ciaf-interrogan-operario-centro-control-accidente-tren-toledo_202610286ae214fb6973466c29e0549a.html).
- **S10 — Adif, 05/08/2026, duplicación de 46 km de Antequera–Granada.** Estado de obras y tramo doble existente. [Nota oficial](https://www.adif.es/w/adif-av-adjudica-obras-duplicacion-46km-via-lav-antequera-granada).

## Datos pendientes para una reproducción operacional

Se necesitarían un inventario homogéneo de PK y ecuaciones de kilometraje, CVM y limitaciones temporales para una fecha concreta, planos y tiempos de enclavamiento, composición y curvas de frenado de cada tren, surcos horarios, y registros sincronizados de posición, velocidad, ocupación y autorizaciones. Sin ellos se puede estudiar el comportamiento del **modelo**, pero no afirmar que las separaciones o tiempos obtenidos fueran los reales.
