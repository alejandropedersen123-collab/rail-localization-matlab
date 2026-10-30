# Genesis aplicado al visor ferroviario

Referencia: documento `genesis-DESIGN.md` proporcionado por el autor del proyecto. La adaptación afecta a `viewer/template.html` y al visor exportado; los datos, la dinámica de MATLAB y los resultados numéricos no cambian.

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

También se regenera al ejecutar `rail_network_demo`. La comparación del JSON incorporado antes y después del rediseño confirmó que los datos de simulación permanecen idénticos.

## Revisión visual y funcional

Comprobado en Chrome el 30/10/2026: temas claro y oscuro, disposición de escritorio y pantalla de 390 × 844 px. La página móvil no desborda horizontalmente; el desplazamiento se limita al panel del mapa y funciona también con las flechas del teclado. Se comprobaron los tres escenarios, reproducción/pausa, selección de tren, desplazamiento temporal, estado final y apertura de fuentes. La consola no registró errores ni advertencias durante esas acciones. La sintaxis JavaScript pasó `node --check`.
