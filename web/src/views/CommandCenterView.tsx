import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  Lock,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAulora } from '../context/AuloraContext';
import { exportGradebookToCsv } from '../lib/gradeUtils';
import {
  computeCourseAutoStats,
  computeStudentAutoMetrics,
} from '../lib/metricsEngine';
import { getTodayKey } from '../data/seedData';
import type { VisibilityScope } from '../types/aulora';
import { CircularScoreRing } from '../components/CircularScoreRing';

export const CommandCenterView: React.FC = () => {
  const {
    profile,
    dataset,
    activeCourse,
    activeCourseStudents,
    activeCourseAssessments,
    activeCourseGrades,
    activeTerm,
    setActiveCourseId,
    setSelectedStudentId,
    setActiveTab,
    addQuickNote,
    toggleQuickNote,
    deleteQuickNote,
    addCourse,
    seedFirebaseAccount,
  } = useAulora();

  const [newNoteText, setNewNoteText] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseRoom, setCourseRoom] = useState('');
  const [coursePeriod, setCoursePeriod] = useState('Periodo 1 · 08:30 - 09:25');
  const [courseVisibility, setCourseVisibility] = useState<VisibilityScope>('private');
  const [seeding, setSeeding] = useState(false);

  const today = getTodayKey();

  // Automatic metrics computed across all courses
  const autoDashboard = useMemo(() => {
    const courseStatsMap = new Map<
      string,
      ReturnType<typeof computeCourseAutoStats>
    >();
    const allMeans: number[] = [];
    const allGradedPcts: number[] = [];
    const allHistAtt: number[] = [];
    const atRiskStudents: {
      studentId: string;
      studentName: string;
      courseId: string;
      courseName: string;
      reasons: string[];
    }[] = [];

    const studentMap = new Map(dataset.students.map((s) => [s.id, s]));

    for (const course of dataset.courses) {
      const cAss = dataset.assessments[course.id] ?? [];
      const cGrades = dataset.grades[course.id] ?? {};
      const cAtt = dataset.attendance[course.id];
      const cBeh = dataset.behaviorLogs[course.id];

      const stats = computeCourseAutoStats(
        course,
        cAss,
        cGrades,
        cAtt,
        cBeh,
        activeTerm,
      );
      courseStatsMap.set(course.id, stats);

      if (stats.mean !== null) allMeans.push(stats.mean);
      if (cAss.length > 0 && course.studentIds.length > 0) {
        allGradedPcts.push(stats.gradedCellsPct);
      }
      if (course.studentIds.length > 0) {
        allHistAtt.push(stats.historicalAttendancePct);
      }

      for (const sid of course.studentIds) {
        const sm = computeStudentAutoMetrics(
          sid,
          course,
          cAss,
          cGrades,
          cAtt,
          cBeh,
          activeTerm,
        );
        if (sm.isAtRisk) {
          const stu = studentMap.get(sid);
          if (stu) {
            atRiskStudents.push({
              studentId: sid,
              studentName: stu.fullName,
              courseId: course.id,
              courseName: course.shortName || course.title,
              reasons: sm.riskReasons,
            });
          }
        }
      }
    }

    const globalMean =
      allMeans.length > 0
        ? Number((allMeans.reduce((a, b) => a + b, 0) / allMeans.length).toFixed(1))
        : null;
    const globalGradedPct =
      allGradedPcts.length > 0
        ? Math.round(allGradedPcts.reduce((a, b) => a + b, 0) / allGradedPcts.length)
        : 0;
    const globalAttPct =
      allHistAtt.length > 0
        ? Number((allHistAtt.reduce((a, b) => a + b, 0) / allHistAtt.length).toFixed(1))
        : 100;

    return {
      courseStatsMap,
      globalMean,
      globalGradedPct,
      globalAttPct,
      atRiskStudents,
    };
  }, [activeTerm, dataset]);

  const dailyPulse = useMemo(() => {
    let present = 0;
    let lateOrExcused = 0;
    let absent = 0;
    let total = 0;

    for (const course of dataset.courses) {
      const dayRecords = dataset.attendance[course.id]?.[today]?.records ?? {};
      for (const sid of course.studentIds) {
        total += 1;
        const st = dayRecords[sid]?.status ?? 'present';
        if (st === 'present') present += 1;
        else if (st === 'absent') absent += 1;
        else lateOrExcused += 1;
      }
    }

    const rate = total > 0 ? Number((((present + lateOrExcused) / total) * 100).toFixed(1)) : 100;
    return { present, lateOrExcused, absent, total, rate };
  }, [dataset.attendance, dataset.courses, today]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    await addQuickNote(newNoteText.trim(), activeCourse?.id);
    setNewNoteText('');
    setShowNoteForm(false);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;
    await addCourse({
      title: courseTitle.trim(),
      shortName: courseTitle.trim().slice(0, 18),
      room: courseRoom.trim() || 'Aula 101',
      periodLabel: coursePeriod.trim(),
      visibility: courseVisibility,
    });
    setCourseTitle('');
    setCourseRoom('');
    setShowNewCourseModal(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Quick Actions */}
      <section className="bento-card p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                {profile ? ` · ${profile.activeCycle}` : ''}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-on-surface">
              Hola, {profile?.displayName ?? 'Docente'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewCourseModal(true)}
              className="btn-primary-gradient px-4 py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Nuevo Grupo
            </button>
            {activeCourse && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className="px-4 py-2 rounded-full bg-soft-accent text-primary font-semibold text-xs sm:text-sm hover:bg-primary-fixed transition-colors flex items-center gap-1.5"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Pasar Lista
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportGradebookToCsv(
                      activeCourse.title,
                      activeTerm,
                      activeCourseStudents,
                      activeCourseAssessments,
                      activeCourse.categories,
                      activeCourseGrades,
                    )
                  }
                  title="Exportar cuaderno actual a CSV"
                  className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowNoteForm((prev) => !prev)}
              className="px-3.5 py-2 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5"
            >
              <StickyNote className="w-4 h-4" />
              + Nota Rápida
            </button>
          </div>
        </div>

        {/* Auto-Computed Global Faculty Metrics Strip */}
        {dataset.courses.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-surface-container-low flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase text-on-surface-variant flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" /> Media Global Clases
              </span>
              <span className="tabular-nums text-2xl font-bold text-primary mt-1">
                {autoDashboard.globalMean !== null ? `${autoDashboard.globalMean}/10` : '—'}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Calculada sola entre tus grupos
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase text-on-surface-variant">
                Asistencia Acumulada
              </span>
              <span className="tabular-nums text-2xl font-bold text-secondary mt-1">
                {autoDashboard.globalAttPct}%
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Histórico automático de sesiones
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase text-on-surface-variant">
                Progreso Corrección
              </span>
              <span className="tabular-nums text-2xl font-bold text-on-surface mt-1">
                {autoDashboard.globalGradedPct}%
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Notas introducidas en {activeTerm.toUpperCase()}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase text-on-surface-variant">
                Alertas Automáticas
              </span>
              <span
                className={`tabular-nums text-2xl font-bold mt-1 ${
                  autoDashboard.atRiskStudents.length > 0 ? 'text-tertiary' : 'text-secondary'
                }`}
              >
                {autoDashboard.atRiskStudents.length}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Alumnos bajo nota de corte o faltas
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Empty State or Active Class Cohorts */}
      {dataset.courses.length === 0 ? (
        <section className="bento-card p-8 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-soft-accent text-primary flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-1">
            <h2 className="font-display text-xl font-bold text-on-surface">
              Tu espacio Aulora está listo y vacío
            </h2>
            <p className="text-sm text-on-surface-variant">
              Crea tu primer grupo desde cero (privado o compartido) o carga cursos de demostración para ver cómo todas las medias y métricas se calculan solas.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowNewCourseModal(true)}
              className="btn-primary-gradient px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear mi primer grupo
            </button>
            <button
              type="button"
              disabled={seeding}
              onClick={async () => {
                setSeeding(true);
                try {
                  await seedFirebaseAccount();
                } finally {
                  setSeeding(false);
                }
              }}
              className="px-5 py-2.5 rounded-full bg-soft-accent hover:bg-primary-fixed text-primary text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Database className="w-4 h-4" />
              {seeding ? 'Cargando datos...' : 'Cargar datos de demostración'}
            </button>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg font-bold text-on-surface">
                Mis Grupos ({dataset.courses.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowNewCourseModal(true)}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-soft-accent text-primary hover:bg-primary-fixed transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Grupo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {dataset.courses.map((course) => {
              const stats = autoDashboard.courseStatsMap.get(course.id);
              const isSelected = course.id === activeCourse?.id;

              return (
                <div
                  key={course.id}
                  className={`bento-card bento-card-interactive p-5 flex flex-col justify-between gap-4 ${
                    isSelected ? 'ring-2 ring-primary/30' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-[11px] font-semibold text-on-surface-variant">
                        {course.room}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          course.visibility === 'shared'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-soft-accent text-primary'
                        }`}
                      >
                        {course.visibility === 'shared' ? (
                          <>
                            <Users className="w-3 h-3" /> Compartido
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" /> Privado
                          </>
                        )}
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-bold text-on-surface">
                      {course.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {course.scheduleSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 bg-surface-container-low rounded-2xl p-3 text-center">
                    <div>
                      <span className="block text-[10px] text-on-surface-variant">Alumnos</span>
                      <span className="tabular-nums font-bold text-sm text-on-surface">
                        {course.studentIds.length}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-on-surface-variant">Media</span>
                      <span className="tabular-nums font-bold text-sm text-primary">
                        {stats?.mean !== null && stats?.mean !== undefined ? stats.mean : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-on-surface-variant">Aprob.</span>
                      <span className="tabular-nums font-bold text-sm text-secondary">
                        {stats && stats.evaluatedCount > 0 ? `${stats.passingPct}%` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-on-surface-variant">Asist.</span>
                      <span className="tabular-nums font-bold text-sm text-on-surface">
                        {course.studentIds.length > 0
                          ? `${stats?.historicalAttendancePct ?? 100}%`
                          : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCourseId(course.id);
                        setActiveTab('gradebook');
                      }}
                      className={`flex-1 py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        isSelected
                          ? 'btn-primary-gradient'
                          : 'bg-surface-container-low hover:bg-soft-accent text-on-surface hover:text-primary'
                      }`}
                    >
                      Abrir Notebooks
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCourseId(course.id);
                        setActiveTab('attendance');
                      }}
                      title="Asistencia y Estadísticas"
                      className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Automatic Risk Radar (only shown when students need attention) */}
      {autoDashboard.atRiskStudents.length > 0 && (
        <section className="bento-card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-tertiary" />
              Seguimiento Detectado Automáticamente ({autoDashboard.atRiskStudents.length})
            </h3>
            <span className="text-[11px] text-on-surface-variant">
              Actualizado en vivo según notas y faltas
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {autoDashboard.atRiskStudents.slice(0, 6).map((item, idx) => (
              <button
                key={`${item.courseId}-${item.studentId}-${idx}`}
                type="button"
                onClick={() => {
                  setActiveCourseId(item.courseId);
                  setSelectedStudentId(item.studentId);
                  setActiveTab('analytics');
                }}
                className="text-left p-3 rounded-2xl bg-tertiary-container/25 hover:bg-tertiary-container/40 border border-tertiary-accent/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-on-surface truncate">
                    {item.studentName}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-tertiary shrink-0">
                    {item.courseName}
                  </span>
                </div>
                <p className="text-[11px] text-tertiary mt-1 truncate">
                  {item.reasons.join(' · ')}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Bento Row: Quick Notes + Daily Pulse */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="bento-card p-6 lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
                Notas Rápidas y Pendientes
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-soft-accent text-primary">
                  Privado
                </span>
              </h3>
              <p className="text-xs text-on-surface-variant">
                Solo visible en tu cuenta docente
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNoteForm((p) => !p)}
              className="px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-soft-accent text-xs font-semibold text-primary"
            >
              + Añadir
            </button>
          </div>

          {showNoteForm && (
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Ej. Preparar práctica del jueves..."
                className="flex-1 px-3 py-2 rounded-xl border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
              <button
                type="submit"
                className="btn-primary-gradient px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Guardar
              </button>
            </form>
          )}

          <div className="space-y-2">
            {dataset.quickNotes.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-4 text-center">
                No tienes notas rápidas todavía.
              </p>
            ) : (
              dataset.quickNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => toggleQuickNote(note.id)}
                    className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        note.done ? 'text-secondary' : 'text-outline'
                      }`}
                    />
                    <span
                      className={`text-sm truncate ${
                        note.done ? 'line-through text-outline' : 'text-on-surface font-medium'
                      }`}
                    >
                      {note.text}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteQuickNote(note.id)}
                    className="text-outline hover:text-tertiary p-1"
                    title="Eliminar nota"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bento-card p-6 lg:col-span-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-on-surface">
                Pulso Diario del Aula
              </h3>
              <p className="text-xs text-on-surface-variant">
                Resumen global de asistencia hoy
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container tabular-nums text-xs font-bold">
              {dailyPulse.total > 0 ? `${dailyPulse.rate}%` : 'Sin registros'}
            </span>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-4 flex items-center gap-5">
            <CircularScoreRing
              value={dailyPulse.total > 0 ? dailyPulse.rate : 0}
              max={100}
              size={84}
              strokeWidth={7}
              label={`${dailyPulse.present}`}
              sublabel="Presentes"
            />
            <div className="space-y-2 text-xs flex-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  Presentes
                </span>
                <span className="tabular-nums font-bold text-on-surface">
                  {dailyPulse.present} / {dailyPulse.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  Retraso / Justificada
                </span>
                <span className="tabular-nums font-bold text-on-surface">
                  {dailyPulse.lateOrExcused}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-tertiary-accent" />
                  Ausencias sin justificar
                </span>
                <span className="tabular-nums font-bold text-tertiary">
                  {dailyPulse.absent}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className="w-full py-2.5 rounded-full bg-soft-accent hover:bg-primary-fixed text-primary text-xs font-semibold transition-colors"
          >
            Ver Estadísticas de Asistencia
          </button>
        </div>
      </section>

      {showNewCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/35 backdrop-blur-sm p-4">
          <div className="bento-card w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setShowNewCourseModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-lg font-bold mb-4">Crear Nuevo Grupo</h3>
            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Nombre del curso / asignatura
                </label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Ej. Biología 1º Bachillerato"
                  className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Aula
                  </label>
                  <input
                    type="text"
                    value={courseRoom}
                    onChange={(e) => setCourseRoom(e.target.value)}
                    placeholder="Aula 204"
                    className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Horario
                  </label>
                  <input
                    type="text"
                    value={coursePeriod}
                    onChange={(e) => setCoursePeriod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Visibilidad en Firebase
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCourseVisibility('private')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      courseVisibility === 'private'
                        ? 'border-primary bg-soft-accent text-primary'
                        : 'border-border-default text-on-surface-variant'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" /> Privado (solo yo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseVisibility('shared')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      courseVisibility === 'shared'
                        ? 'border-secondary bg-secondary-container/50 text-on-secondary-container'
                        : 'border-border-default text-on-surface-variant'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Compartido
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full btn-primary-gradient py-2.5 rounded-full text-sm font-semibold mt-2"
              >
                Crear Grupo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
