import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  Lock,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { useAulora } from '../context/AuloraContext';
import type { LessonPlan, LessonResource } from '../types/aulora';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const SLOTS = ['08:30', '10:00', '11:30', '13:45'];

export const WeeklyPlannerView: React.FC = () => {
  const {
    dataset,
    activeCourse,
    setActiveCourseId,
    activeCourseLessons,
    addLessonPlan,
    addLessonResource,
    updateLessonCompletion,
    setActiveTab,
  } = useAulora();

  const [viewScale, setViewScale] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [showNewLessonModal, setShowNewLessonModal] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);

  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSubtitle, setLessonSubtitle] = useState('');
  const [lessonDay, setLessonDay] = useState(0);
  const [lessonTime, setLessonTime] = useState('08:30');
  const [lessonObjective, setLessonObjective] = useState('');

  const [resTitle, setResTitle] = useState('');
  const [resKind, setResKind] = useState<LessonResource['kind']>('pdf');

  useEffect(() => {
    if (!activeCourseLessons.some((l) => l.id === selectedLessonId)) {
      setSelectedLessonId(activeCourseLessons[0]?.id ?? '');
    }
  }, [activeCourseLessons, selectedLessonId]);

  const selectedLesson: LessonPlan | undefined = useMemo(
    () => activeCourseLessons.find((l) => l.id === selectedLessonId) ?? activeCourseLessons[0],
    [activeCourseLessons, selectedLessonId],
  );

  if (!activeCourse) {
    return (
      <div className="bento-card p-8 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-soft-accent text-primary flex items-center justify-center">
          <CalendarDays className="w-6 h-6" />
        </div>
        <h2 className="font-display text-xl font-bold">Sin grupos activos</h2>
        <p className="text-sm text-on-surface-variant max-w-md">
          Crea un grupo en el Centro de Mando para organizar su horario semanal y sesiones.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('command')}
          className="btn-primary-gradient px-5 py-2.5 rounded-full text-sm font-semibold"
        >
          Ir al Dashboard
        </button>
      </div>
    );
  }

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;
    await addLessonPlan(activeCourse.id, {
      dayIndex: lessonDay,
      dateLabel: DAYS[lessonDay] ?? 'Lunes',
      startTime: lessonTime,
      endTime: '11:15',
      periodName: 'Sesión Programada',
      room: activeCourse.room,
      title: lessonTitle.trim(),
      subtitle: lessonSubtitle.trim() || 'Unidad didáctica',
      standards: ['LOMLOE.1'],
      objectives: lessonObjective.trim()
        ? [lessonObjective.trim()]
        : ['Comprender los conceptos clave de la sesión y aplicarlos en práctica.'],
      resources: [],
      assignment: {
        title: `Actividad · ${lessonTitle.trim()}`,
        description: 'Entrega en el cuaderno digital de Aulora.',
        dueDate: 'Próxima sesión',
        completedCount: 0,
        totalCount: Math.max(1, activeCourse.studentIds.length),
      },
    });
    setLessonTitle('');
    setLessonSubtitle('');
    setLessonObjective('');
    setShowNewLessonModal(false);
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson || !resTitle.trim()) return;
    await addLessonResource(activeCourse.id, selectedLesson.id, {
      title: resTitle.trim(),
      meta:
        resKind === 'pdf'
          ? 'Documento PDF'
          : resKind === 'doc'
            ? 'Guía editable'
            : 'Quiz interactivo',
      kind: resKind,
    });
    setResTitle('');
    setShowResourceForm(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <section className="bento-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Programación Didáctica · {activeCourse.academicCycle}
          </span>
          <h1 className="font-display text-2xl font-bold text-on-surface mt-0.5">
            Horario Semanal y Planificador de Clases
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeCourse.id}
            onChange={(e) => setActiveCourseId(e.target.value)}
            className="px-3.5 py-2 rounded-full bg-surface-container-low border border-border-default text-xs font-semibold text-on-surface"
          >
            {dataset.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <div className="inline-flex p-1 bg-surface-container-low rounded-full">
            <button
              type="button"
              onClick={() => setViewScale('week')}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold ${
                viewScale === 'week'
                  ? 'bg-white text-on-surface shadow-xs'
                  : 'text-on-surface-variant'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setViewScale('day')}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold ${
                viewScale === 'day'
                  ? 'bg-white text-on-surface shadow-xs'
                  : 'text-on-surface-variant'
              }`}
            >
              Día
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowNewLessonModal(true)}
            className="btn-primary-gradient px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nueva Sesión
          </button>
        </div>
      </section>

      {/* Timetable Grid */}
      <section className="bento-card p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 className="font-display text-base font-bold text-on-surface">
              Parrilla de Sesiones · {activeCourse.shortName}
            </h2>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              activeCourse.visibility === 'shared'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-soft-accent text-primary'
            }`}
          >
            {activeCourse.visibility === 'shared' ? (
              <>
                <Users className="w-3 h-3" /> Programación Compartida
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" /> Programación Privada
              </>
            )}
          </span>
        </div>

        {viewScale === 'day' && (
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, idx) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(idx)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                  selectedDay === idx
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <div
            className={`grid gap-3 min-w-[680px] ${
              viewScale === 'week' ? 'grid-cols-6' : 'grid-cols-2'
            }`}
          >
            <div className="text-xs font-bold text-outline uppercase py-2">Franja</div>
            {(viewScale === 'week' ? DAYS : [DAYS[selectedDay]]).map((dayLabel) => (
              <div
                key={dayLabel}
                className="text-center py-2 rounded-xl text-xs font-bold bg-surface-container-low text-on-surface"
              >
                {dayLabel}
              </div>
            ))}

            {SLOTS.map((slot) => (
              <React.Fragment key={slot}>
                <div className="py-4 text-xs font-bold tabular-nums text-on-surface-variant">
                  {slot}
                </div>
                {(viewScale === 'week' ? [0, 1, 2, 3, 4] : [selectedDay]).map((dayIdx) => {
                  const lesson = activeCourseLessons.find(
                    (l) => l.dayIndex === dayIdx && l.startTime.startsWith(slot.slice(0, 2)),
                  );
                  if (!lesson) {
                    return (
                      <div
                        key={`${slot}-${dayIdx}`}
                        className="rounded-2xl border border-dashed border-border-default bg-surface-container-low/40 p-3 flex items-center justify-center text-[11px] text-outline"
                      >
                        Libre
                      </div>
                    );
                  }
                  const isActive = selectedLesson?.id === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`text-left rounded-2xl p-3 transition-all flex flex-col justify-between gap-1.5 ${
                        isActive
                          ? 'btn-primary-gradient text-white shadow-md'
                          : 'bg-soft-accent hover:bg-primary-fixed text-on-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold opacity-85">
                        <span>{lesson.room}</span>
                        <span>{lesson.startTime}</span>
                      </div>
                      <p className="font-display font-bold text-xs leading-snug">
                        {lesson.title}
                      </p>
                      <p className="text-[11px] opacity-80 truncate">{lesson.subtitle}</p>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {selectedLesson && (
        <section className="bento-card p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-primary">
                {selectedLesson.dateLabel} · {selectedLesson.startTime} · {selectedLesson.room}
              </span>
              <h3 className="font-display text-lg font-bold text-on-surface">
                Detalle de Sesión — {selectedLesson.title}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-surface-container-low p-4 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                Estándares y Objetivos
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedLesson.standards.map((std) => (
                  <span
                    key={std}
                    className="px-2.5 py-0.5 rounded-full bg-soft-accent text-primary text-[11px] font-bold"
                  >
                    {std}
                  </span>
                ))}
              </div>
              <ul className="space-y-2 text-xs text-on-surface">
                {selectedLesson.objectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-surface-container-low p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Recursos Didácticos ({selectedLesson.resources.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowResourceForm((p) => !p)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  + Adjuntar
                </button>
              </div>

              {showResourceForm && (
                <form onSubmit={handleAddResource} className="flex flex-col gap-2">
                  <input
                    type="text"
                    required
                    value={resTitle}
                    onChange={(e) => setResTitle(e.target.value)}
                    placeholder="Nombre del recurso..."
                    className="px-2.5 py-1.5 rounded-lg border border-border-default bg-white text-xs"
                  />
                  <div className="flex gap-2">
                    <select
                      value={resKind}
                      onChange={(e) => setResKind(e.target.value as LessonResource['kind'])}
                      className="px-2 py-1.5 rounded-lg border border-border-default bg-white text-xs"
                    >
                      <option value="pdf">PDF</option>
                      <option value="doc">Guía / Doc</option>
                      <option value="quiz">Quiz</option>
                    </select>
                    <button
                      type="submit"
                      className="btn-primary-gradient px-3 py-1.5 rounded-lg text-xs font-semibold flex-1"
                    >
                      Añadir
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {selectedLesson.resources.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">Sin archivos adjuntos.</p>
                ) : (
                  selectedLesson.resources.map((res) => (
                    <div
                      key={res.id}
                      className="p-2.5 rounded-xl bg-white border border-border-default flex items-center gap-2.5"
                    >
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-on-surface truncate">
                          {res.title}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">{res.meta}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                  Tarea Asociada
                </span>
                <p className="text-sm font-bold text-on-surface">
                  {selectedLesson.assignment.title}
                </p>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  {selectedLesson.assignment.description}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">Entregas completadas</span>
                  <span className="tabular-nums font-bold text-primary">
                    {selectedLesson.assignment.completedCount} /{' '}
                    {selectedLesson.assignment.totalCount}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="h-full bg-secondary-accent rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (selectedLesson.assignment.completedCount /
                            Math.max(1, selectedLesson.assignment.totalCount)) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateLessonCompletion(
                      activeCourse.id,
                      selectedLesson.id,
                      Math.min(
                        selectedLesson.assignment.totalCount,
                        selectedLesson.assignment.completedCount + 1,
                      ),
                    )
                  }
                  className="w-full py-2 rounded-full bg-white border border-border-default hover:bg-soft-accent text-xs font-semibold text-on-surface"
                >
                  + Registrar nueva entrega
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {showNewLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/35 backdrop-blur-sm p-4">
          <div className="bento-card w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setShowNewLessonModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-lg font-bold mb-4">
              Planificar Nueva Sesión
            </h3>
            <form onSubmit={handleCreateLesson} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Título de la sesión
                </label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ej. Síntesis de Proteínas"
                  className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Subtítulo
                </label>
                <input
                  type="text"
                  value={lessonSubtitle}
                  onChange={(e) => setLessonSubtitle(e.target.value)}
                  placeholder="Transcripción y traducción"
                  className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Día
                  </label>
                  <select
                    value={lessonDay}
                    onChange={(e) => setLessonDay(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
                  >
                    {DAYS.map((d, idx) => (
                      <option key={d} value={idx}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Franja horaria
                  </label>
                  <select
                    value={lessonTime}
                    onChange={(e) => setLessonTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
                  >
                    {SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Objetivo principal
                </label>
                <textarea
                  rows={2}
                  value={lessonObjective}
                  onChange={(e) => setLessonObjective(e.target.value)}
                  placeholder="Qué debe dominar el alumnado al finalizar..."
                  className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full btn-primary-gradient py-2.5 rounded-full text-sm font-semibold"
              >
                Guardar Sesión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
