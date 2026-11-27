# Guía de Modelos de IA Recomendados para Desarrollar Aulora

Para optimizar **coste, velocidad y calidad** durante el desarrollo de Aulora (Web + Firebase + Android), no conviene usar el mismo modelo para todo. Aquí tienes la matriz recomendada según la tarea concreta:

---

## 1. Arquitectura, Seguridad Firebase y Lógica Compleja
**Modelo recomendado:** Modelo **Pro / Razonamiento profundo** (ej. *Gemini 2.5 Pro / Gemini Pro / Claude Opus o Sonnet Thinking*).

**Cuándo usarlo:**
- Diseñar y auditar **`firestore.rules`** e índices compuestos (cualquier fallo aquí es un agujero de seguridad).
- Definir el esquema de datos **privado vs. compartido** y resolver conflictos de sincronización offline entre Web y Android.
- Implementar motores de cálculo complejos: medias ponderadas por categorías, rúbricas multidimensionales, redondeos oficiales (LOMLOE / escalas 1–10), exportación a boletines/PDF.
- Depurar errores difíciles de estado reactivo, fugas de suscripciones `onSnapshot` o race conditions.

---

## 2. Construcción de Pantallas Web, Componentes UI y CRUD Rápido
**Modelo recomendado:** Modelo **Flash / Rápido** (ej. *Gemini Flash / Gemini Neon Medium*).

**Cuándo usarlo:**
- Crear nuevos componentes visuales en React + Tailwind siguiendo los tokens de `DESIGN.md` (modales, tarjetas Bento, badges, filtros).
- Generar formularios, validaciones visuales, vistas responsivas y adaptaciones de textos/idiomas.
- Crear datos de prueba (`seedData`), refactorizar iconos o ajustar espaciados y animaciones.
- Iterar rápido sobre cambios visuales: es mucho más barato y responde en segundos.

---

## 3. Desarrollo de la App Android (Kotlin + Jetpack Compose)
**Modelo recomendado:**
- **Pro / Razonamiento** para: configurar el proyecto Gradle/Kotlin, inyección de dependencias (Hilt), capa `Repository` con Firebase offline + Flow/StateFlow, y el teclado numérico rápido de notas (como en `window_2`).
- **Flash** para: traducir cada pantalla (`CommandCenter`, `Gradebook`, `Attendance`, `Planner`, `StudentProfile`) a `@Composable` con Material 3, previews (`@Preview`) y animaciones.

---

## 4. Visión Multimodal y Diseño desde Capturas / Bocetos
**Modelo recomendado:** Modelo con **alta capacidad multimodal** (ej. *Gemini Pro / Flash multimodal*).

**Cuándo usarlo:**
- Subir capturas de pantalla de Additio o bocetos propios hechos en papel/Figma y pedirle que genere el layout Bento equivalente o detecte desalineaciones visuales.
- Revisar capturas de la app Android en el emulador frente a los diseños de `Diseño bbase/`.

---

## 5. Flujo de Trabajo Práctico (Regla 80/20)
1. **Planifica con un modelo Pro** antes de tocar arquitectura o base de datos (puedes usar `/plan` o `/grill-me`).
2. **Ejecuta la UI y el día a día con un modelo Flash / Medium** manteniendo `DESIGN.md` como referencia fija.
3. **Vuelve a un modelo Pro** únicamente para:
   - Revisar `firestore.rules` antes de publicar en producción.
   - Escribir tests unitarios de cálculo de notas.
   - Resolver bugs que no salgan a la primera.
