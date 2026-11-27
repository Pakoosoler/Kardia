# Aulora — Esquema de Base de Datos Firebase (Cloud Firestore)

Este documento define el modelo de datos compartido entre la **Web App (React + TypeScript)** y la futura **App Android (Kotlin + Jetpack Compose)** usando un único proyecto de Firebase.

## Principio de Diseño: Datos Privados vs. Datos Compartidos

En una app tipo Additio colaborativa hay dos realidades:
1. **Datos privados del docente:** sus notas rápidas, sus cursos propios, alumnos de tutoría particular u observaciones confidenciales.
2. **Datos compartidos entre docentes / centro:** cursos codocentes (varios profesores evalúan el mismo grupo), fichas base de alumnos compartidas en el departamento, rúbricas comunes y observaciones pedagógicas del claustro.

Para evitar duplicar datos y mantener consultas rápidas y seguras en Firestore, cada entidad principal incorpora:
- `ownerId: string` — UID del creador/propietario.
- `visibility: "private" | "shared"` — Ámbito de visibilidad.
- `sharedWith?: string[]` — Lista explícita de UIDs de compañeros autorizados (para cursos se usa `coTeacherIds`, `viewerIds` y el array denormalizado `memberIds`).
- `schoolId?: string | null` — Identificador opcional de centro/departamento si se trabaja en equipo institucional.

---

## Colecciones Principales

### 1. `users/{uid}` y `users/{uid}/notes/{noteId}`
- **Acceso:** Exclusivo del usuario propietario (`uid`).
- `users/{uid}`:
  - `uid`, `email`, `displayName`, `roleTitle`, `department`, `schoolIds[]`, `activeCycle`, `createdAt`, `updatedAt`.
- `users/{uid}/notes/{noteId}` (Notas rápidas privadas):
  - `id`, `text`, `done`, `courseId?`, `studentId?`, `createdAt`.

### 2. `userDirectory/{uid}`
- **Acceso:** Lectura para cualquier usuario autenticado; escritura solo para el propio `uid`.
- Sirve para buscar compañeros por correo al compartir un curso o ficha de alumno sin exponer datos privados de `users/{uid}`.

### 3. `schools/{schoolId}`
- **Acceso:** Lectura para miembros (`uid in memberIds`); escritura solo administradores (`roles[uid] == "admin"`).
- `name`, `academicCycles[]`, `memberIds[]`, `roles: Record<uid, "admin" | "teacher">`.

### 4. `students/{studentId}`
- **Acceso:** Privado del `ownerId` o compartido (`visibility == "shared"`) con `sharedWith` o miembros del mismo `schoolId`.
- Campos:
  - `id`, `code` (ej. `#BIO-2024-089`), `firstName`, `lastName`, `fullName`, `avatarUrl?`, `initials`
  - `gradeLevel` (ej. `1º Bachillerato`), `track`, `homeroom`
  - `guardianName`, `guardianPhone`, `guardianEmail`
  - `ownerId`, `visibility`, `sharedWith[]`, `schoolId`
  - `competencies`: `{ inquiry: number, lab: number, theory: number, rigor: number }`
  - `createdAt`, `updatedAt`

### 5. `studentObservations/{obsId}`
- **Acceso:** El autor siempre puede leer/editar/borrar. Si `visibility == "shared"`, pueden leerlo los docentes en `sharedWith` o del mismo `schoolId`.
- Campos:
  - `studentId`, `authorId`, `authorName`, `authorRole`
  - `visibility: "private" | "shared"`, `sharedWith[]`, `schoolId`
  - `text`, `tags[]`, `createdAt`

### 6. `courses/{courseId}` y Subcolecciones
- **Acceso al curso:**
  - Lectura: `ownerId`, `coTeacherIds`, `viewerIds` (todos indexados en `memberIds[]`), o miembros del `schoolId` si `visibility == "shared"`.
  - Escritura en curso y subcolecciones: `ownerId` y `coTeacherIds`.
  - `viewerIds` solo tienen acceso de lectura (útil para jefatura de estudios o profesores de apoyo).
- Campos de `courses/{courseId}`:
  - `id`, `title`, `shortName`, `room`, `periodLabel`, `scheduleSummary`, `academicCycle`
  - `colorAccent` (`"indigo" | "teal" | "amber"`)
  - `ownerId`, `coTeacherIds[]`, `viewerIds[]`, `memberIds[]`, `visibility`, `schoolId`
  - `studentIds[]` — Orden de lista del grupo
  - `seatAssignments: Record<studentId, number>` — Posición en el plano del aula
  - `categories[]` — `{ id, name, weight, color }`

#### Subcolecciones de `courses/{courseId}`:
1. **`assessments/{assessmentId}`** (Columnas del cuaderno):
   - `id`, `termId` (`"term1" | "term2" | "term3"`), `categoryId`, `title`, `subtitle`, `weight`, `maxScore` (`10`), `type` (`"numeric" | "rubric"`), `dueDate`, `order`, `createdBy`.
2. **`grades/{studentId}`** (Optimización de lecturas: 1 documento por alumno en el curso):
   - `studentId`, `scores: Record<assessmentId, { numeric?: number | null, rubricLevel?: "L1" | "L2" | "L3" | "L4", updatedAt: string, updatedBy: string }>`.
   - *Por qué este patrón:* En lugar de leer 500 documentos individuales por cada celda del cuaderno, abrir un grupo de 30 alumnos cuesta solo **30 lecturas** en Firestore y funciona en tiempo real tanto en Web como en Android.
3. **`attendance/{dateKey}`** (ej. `2026-11-27`, 1 documento por día lectivo):
   - `date`, `records: Record<studentId, { status: "present" | "late" | "absent" | "excused", note?: string, time?: string, updatedBy: string }>`, `committedToSis: boolean`.
4. **`behaviorLogs/{logId}`** (Insignias y puntos positivos/negativos):
   - `studentId`, `studentName`, `delta` (`+1`, `+2`, `-1`), `badge`, `reason`, `time`, `createdAt`, `authorId`.
5. **`lessonPlans/{planId}`** (Horario semanal y programación didáctica):
   - `dayIndex` (`0..4`), `dateLabel`, `startTime`, `endTime`, `periodName`, `room`, `title`, `subtitle`, `standards[]`, `objectives[]`, `resources[]`, `assignment`: `{ title, description, dueDate, completedCount, totalCount }`.

### 7. `rubrics/{rubricId}`
- **Acceso:** Privada (`ownerId`) o compartida (`visibility == "shared"`).
- Contiene plantillas reutilizables de criterios y niveles (L1–L4) para aplicar en cualquier columna de evaluación.

---

## Sincronización 100% en la Nube (Web ↔ Android)

- **Web:** Usa `initializeFirestore(app, { localCache: memoryLocalCache() })` sin persistencia en disco local (`localStorage` ni `IndexedDB`), manteniendo los datos siempre sincronizados directamente contra Firebase Cloud.
- **Android:** Usa el SDK nativo `com.google.firebase:firebase-firestore-ktx` con `MemoryCacheSettings` para operar siempre contra los datos en vivo de la nube.
- Ambos clientes escuchan con `SnapshotListener` / `onSnapshot` las mismas rutas (`courses/{courseId}/grades`, `courses/{courseId}/attendance`), garantizando latencia mínima entre ordenador y móvil.
