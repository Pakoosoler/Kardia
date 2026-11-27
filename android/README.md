# Aulora Android — Blueprint de Arquitectura (Siguiente Fase)

Esta carpeta alojará el proyecto nativo **Android (Kotlin + Jetpack Compose + Material 3)** basado en las pantallas móviles de `Diseño bbase/` (*Aulora Faculty Go / Companion UI*).

## Stack Tecnológico Recomendado
- **Lenguaje:** Kotlin 2.x + Coroutines + Flow
- **UI:** Jetpack Compose + Material 3 (usando la paleta exacta de `Diseño bbase/tactile_bento_edtech/DESIGN.md`)
- **Arquitectura:** MVVM + Clean Repositories (`ui/` -> `viewmodel/` -> `data/repository/`)
- **Inyección de dependencias:** Hilt
- **Backend y Caché Offline:**
  - `firebase-auth-ktx` (mismo login Email/Google que la web)
  - `firebase-firestore-ktx` con caché persistente local activada (`setPersistentCacheSettings`) para pasar lista y poner notas **sin cobertura en el aula** y sincronizar al instante al reconectar.

## Pantallas Clave (según `Diseño bbase/`)
1. **Home / Daily Cockpit (`window_1`):** Tarjeta de clase actual/siguiente, acceso rápido a *Pasar Lista*, media de clase, % asistencia y *Rapid Roll Check*.
2. **Gradebook Móvil con Teclado Rápido (`window_2`):** Selector de categoría y evaluación, lista compacta de alumnos y teclado numérico inferior + selector rápido de nivel de rúbrica (`L1 Init`, `L2 Dev`, `L3 Prof`, `L4 Exemp`).
3. **Fast-Tap Roll Call (`window_3`):** Botones táctiles `P / L / A / E` por alumno + gestos rápidos (`+Estrella` / `+Nota`).
4. **My Daily Schedule (`window_4`):** Tira de días Lun–Vie y tarjetas expandibles con objetivo de sesión, adjuntos y botón directo a *Pasar Lista*.
5. **Student Profile (`window_5`):** Ficha del alumno con KPIs, gráfico de evolución, últimas notas y acceso directo a llamar/escribir a la familia.

## Cómo iniciarlo cuando termines la Web
Usa el plugin/herramienta `android-cli` o abre Android Studio en esta carpeta `android/` apuntando al **mismo proyecto de Firebase** (`google-services.json`) que configures para la Web. Toda la estructura de colecciones definida en `docs/FIREBASE_SCHEMA.md` es 100% compatible.
