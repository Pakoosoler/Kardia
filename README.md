# AULORA · Cuaderno Docente & Gestión de Aula (Web + Firebase + Android)

Proyecto inspirado en el sistema de diseño **Tactile Bento EdTech** (`Diseño bbase/`) para construir una alternativa moderna a Additio con sincronización 100% en la nube (Web + Android) y soporte para **datos privados del docente** y **datos compartidos con el claustro**.

---

## Despliegue en Vivo (Firebase)

- **URL Pública Oficial:** https://aulora.web.app (y https://aulora.firebaseapp.com)
- **Consola Firebase:** https://console.firebase.google.com/project/kardia-edu/overview
- **Región de Cloud Firestore:** `eur3` (Europa)

---

## Qué incluye este repositorio

- `web/` — **Aplicación Web funcional** en React 19 + TypeScript + Vite + Tailwind CSS v4 con las 5 vistas principales:
  1. **Dashboard** (grupos activos privados/compartidos, notas rápidas privadas y pulso diario).
  2. **Notebooks** (tabla de alta densidad con columna fija, edición con `Enter`/`Tab`, rúbricas L1–L4, pesos configurables, medias ponderadas en tiempo real y exportación CSV).
  3. **Statistics** (plano interactivo del aula por pupitres, lista rápida, lanzador de insignias y avisos a familias).
  4. **Planner** (cuadrícula semanal/diaria por franjas, estándares curriculares, recursos y seguimiento de entregas).
  5. **Summary** (expediente integral del alumno, gráfico de evolución, competencias y **observaciones privadas o compartidas**).
- `firestore.rules` y `firestore.indexes.json` — Reglas de seguridad e índices en Firebase preparadas para separar datos **privados** (`private`) y **compartidos** (`shared`).
- `docs/FIREBASE_SCHEMA.md` — Esquema completo de colecciones y sincronización en tiempo real en la nube Web/Android.
- `docs/AI_MODEL_GUIDE.md` — Recomendación de qué modelo de IA usar en cada fase del proyecto.
- `android/README.md` — Blueprint de arquitectura para la app Android (Kotlin + Jetpack Compose) conectada al mismo Firebase.

---

## Desarrollo local

```bash
cd web
npm install
npm run dev
```

---

## Publicar actualizaciones en Producción (`https://aulora.web.app`)

```bash
cd web ; npm run build ; cd ..
npx -y firebase-tools@latest deploy --only hosting
```
