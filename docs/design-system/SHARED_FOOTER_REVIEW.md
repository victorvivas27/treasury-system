# Footer compartido — 2026-10-19

Home y las rutas de MainLayout (incluido perfil) usan ahora
`frontend/src/shared/ui/footer/AppFooter.tsx` y `AppFooter.css`.

Se movió el anterior HomeFooter al directorio compartido. Se eliminaron la
clase `system-home-footer`, su variante de MainLayout.css y las reglas del
footer en HomeMobile.css, HomeCommunityMobile.css, HomeDesktop.css y HomePage.css.
La marca del footer tiene una clase propia para evitar heredar ajustes de la
marca del encabezado público. Los estilos móviles del Home se centralizaron
en el footer y la preferencia de movimiento reducido se atiende allí.

El enlace de login sigue apareciendo únicamente cuando no hay sesión en Home.
El contenido común comparte distribución, tipografía, colores y espaciados.
El ancho disponible puede depender del contenedor y de la navegación lateral.

## Verificaciones

- `pnpm test:run`: 93 archivos y 585 pruebas aprobadas.
- `pnpm lint` y `pnpm build`: aprobados con las advertencias previas.
- `git diff --check`: aprobado.
- `node scripts/check-shared-footer.mjs`: 14 comparaciones aprobadas, 42 vistas.
  Compara estilos calculados del contenido común en Home público, Home con sesión
  y perfil; verifica enlaces visibles y ausencia de desbordamiento horizontal.
- Anchos: 320, 375, 390, 430, 768, 1024 y 1216 px, temas claro y oscuro.
  Desktop de referencia 1216 × 552 px; el resto usa 844 px de alto.
- Capturas y resultado en `frontend/demo-output/shared-footer/`.
  Inspección visual de footer móvil de perfil y desktop de Home.

La auditoría usa API sintética y movimiento reducido. No escribe cuentas reales.
Para repetir, iniciar Vite en `127.0.0.1:5178` y ejecutar el script desde frontend.
