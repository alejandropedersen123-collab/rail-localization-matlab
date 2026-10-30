# Ejemplos de coste del prototipo

La web muestra tres casos listos para consultar. No hay formulario de precios. Los importes siguientes son **bandas propias para un prototipo de laboratorio**, no ofertas de proveedores ni presupuestos para instalar un sistema ferroviario.

| Partida | Cantidad | Banda por unidad, EUR |
|---|---|---:|
| GNSS y antena | Una por vehículo de pruebas | 220–350 |
| IMU y odometría de laboratorio | Una por vehículo | 60–150 |
| Ordenador, alimentación y caja | Uno por vehículo | 160–260 |
| Detector local de maqueta | 2, 4 o 6 puntos | 40–100 |
| Material común de banco | Un conjunto | 150–350 |

| Caso | Material | Trabajo hipotético | Material + trabajo |
|---|---:|---:|---:|
| 1 vehículo, 2 detectores | 670–1.310 € | 7.200–22.400 € | 7.870–23.710 € |
| 3 vehículos, 4 detectores | 1.630–3.030 € | 10.800–33.600 € | 12.430–36.630 € |
| 8 vehículos, 6 detectores | 3.910–7.030 € | 18.000–56.000 € | 21.910–63.030 € |

El trabajo supone respectivamente 160–320, 240–480 y 400–800 horas a 45–70 €/h. Las horas y tarifas son hipótesis del autor, no una medición ni una oferta profesional. El extremo inferior multiplica mínimos y el superior máximos; no son intervalos estadísticos. Si lo construye el autor, el material puede ser su desembolso, pero su tiempo sigue teniendo valor.

## Referencias de componentes

Consultadas el 30/10/2026:

- [ArduSimple simpleRTK2B](https://www.ardusimple.com/product/simplertk2b/): placa GNSS a 172 € de catálogo. No equivale a un conjunto instalado con antena.
- [BerryBase Raspberry Pi 5, 4 GB](https://www.berrybase.de/raspberry-pi-5-4gb-ram): 123,90 €, IVA alemán incluido. Alimentación, caja y almacenamiento se venden aparte.
- [Adafruit BNO085, producto 4754](https://www.adafruit.com/product/4754): 29,50 USD por la placa IMU.

Estos precios orientan el orden de magnitud de componentes de laboratorio. Las bandas se expresan antes de IVA y envíos y no son la suma directa ni una conversión de esas tres fichas. No se presupone que esas placas sean aptas para instalarse en un ferrocarril.

Los detectores presupuestados son de maqueta. No son contadores de ejes ferroviarios. Quedan fuera vehículo/maqueta física, herramientas no disponibles, obra civil, acceso a vía, montaje en material rodante, comunicaciones de seguridad, homologación, evaluación de seguridad, operación y mantenimiento reales. Un piloto en vía o tren reales requeriría definir alcance con el operador y obtener presupuestos específicos. Estos ejemplos no prueban ahorro frente a ETCS, LZB, CBTC u otra arquitectura.

Los rangos se calculan en `viewer/analytics.js`, función `prototypeBudget`. La tabla y la exportación CSV utilizan el mismo resultado.
