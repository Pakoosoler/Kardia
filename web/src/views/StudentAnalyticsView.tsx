import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Calculator,
  Lock,
  Mail,
  MessageSquarePlus,
  Phone,
  Printer,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAulora } from '../context/AuloraContext';
import {
  computeStudentAutoMetrics,
  computeStudentCrossCourseSummary,
  formatScore,
  resolveCourseMetricsConfig,
} from '../lib/metricsEngine';
import type { VisibilityScope } from '../types/aulora';
import { CircularScoreRing } from '../components/CircularScoreRing';
import { AddStudentModal } from '../components/AddStudentModal';
import { MetricsConfigModal } from '../components/MetricsConfigModal';

export const StudentAnalyticsView: React.FC = () => {
  const {
    dataset,
    activeCourse,
    activeCourseAssessments,
    activeCourseGrades,
    activeTerm,
    selectedStudentId,
    setSelectedStudentId,
    setActiveCourseId,
    addObservation,
  } = useAulora();

  const [obsText, setObsText] = useState('');
  const [obsTag, setObsTag] = useState('Seguimiento Académico');
  const [obsVisibility, setObsVisibility] = useState<VisibilityScope>('shared');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  const student = useMemo(
    () => dataset.students.find((s) => s.id === selectedStudentId) ?? dataset.students[0] ?? null,
    [dataset.students, selectedStudentId],
  );

  const studentObservations = useMemo(
    () => (student ? dataset.observations.filter((o) => o.studentId === student.id) : []),
    [dataset.observations, student],
  );

  const metricsConfig = useMemo(
    () => resolveCourseMetricsConfig(activeCourse),
    [activeCourse],
  );

  const autoStudentMetrics = useMemo(() => {
    if (!student || !activeCourse) return null;
    return computeStudentAutoMetrics(
      student.id,
      activeCourse,
      activeCourseAssessments,
      activeCourseGrades,
      dataset.attendance[activeCourse.id],
      dataset.behaviorLogs[activeCourse.id],
      activeTerm,
    );
  }, [
    activeCourse,
    activeCourseAssessments,
    activeCourseGrades,
    activeTerm,
    dataset.attendance,
    dataset.behaviorLogs,
    student,
  ]);

  const crossSummary = useMemo(() => {
    if (!student) return { globalAverage: null, perCourse: [], evolution: [] };
    return computeStudentCrossCourseSummary(student.id, dataset, activeCourse, activeTerm);
  }, [activeCourse, activeTerm, dataset, student]);

  if (!student) {
    return (
      <div className="bento-card p-8 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-soft-accent text-primary flex items-center justify-center">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h2 className="font-display text-xl font-bold">No hay alumnos registrados</h2>
        <p className="text-sm text-on-surface-variant max-w-md">
          Añade un alumno para generar automáticamente su resumen de notas, asistencia y evolución.
        </p>
        <button
          type="button"
          onClick={() => setShowAddStudentModal(true)}
          className="btn-primary-gradient px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Añadir Alumno
        </button>
        <AddStudentModal
          open={showAddStudentModal}
          onClose={() => setShowAddStudentModal(false)}
          courseId={activeCourse?.id}
        />
      </div>
    );
  }

  const history =
    crossSummary.evolution.length > 0
      ? crossSummary.evolution
      : student.termHistory.length > 0
        ? student.termHistory
        : [
            {
              label: 'Actual',
              studentScore: autoStudentMetrics?.effectiveAverage ?? 0,
              classMean: 7.5,
            },
          ];

  const width = 320;
  const height = 120;
  const minVal = 0;
  const maxVal = 10;
  const mapY = (val: number) =>
    height -
    ((Math.max(minVal, Math.min(maxVal, val)) - minVal) / (maxVal - minVal)) * (height - 28) -
    14;

  const coords = history.map((h, idx) => {
    const x = history.length === 1 ? width / 2 : 24 + (idx / (history.length - 1)) * (width - 48);
    return {
      x,
      y: mapY(h.studentScore),
      meanY: mapY(h.classMean),
      label: h.label,
      score: h.studentScore,
    };
  });

  const stuPts = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const meanPts = coords.map((c) => `${c.x},${c.meanY}`).join(' ');

  const handleSubmitObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsText.trim()) return;
    await addObservation({
      studentId: student.id,
      text: obsText.trim(),
      tags: [obsTag],
      visibility: obsVisibility,
    });
    setObsText('');
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="bento-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold uppercase text-on-surface-variant">
            Summary del Alumno:
          </label>
          <select
            value={student.id}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-4 py-2 rounded-full bg-surface-container-low border border-border-default text-sm font-bold text-on-surface"
          >
            {dataset.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.code})
              </option>
            ))}
          </select>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              student.visibility === 'shared'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-soft-accent text-primary'
            }`}
          >
            {student.visibility === 'shared' ? (
              <>
                <Users className="w-3.5 h-3.5" /> Ficha Compartida
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" /> Ficha Privada
              </>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeCourse && (
            <button
              type="button"
              onClick={() => setShowMetricsModal(true)}
              className="px-3.5 py-2 rounded-full bg-secondary-container/60 text-on-secondary-container text-xs font-bold flex items-center gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5" />
              Personalizar Métricas
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddStudentModal(true)}
            className="px-3.5 py-2 rounded-full bg-soft-accent text-primary text-xs font-semibold flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Alumno
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-full border border-border-default hover:bg-surface-container-low text-xs font-semibold text-on-surface flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir / PDF
          </button>
        </div>
      </section>

      {/* Profile Identity Card + Automatic Global GPA */}
      <section className="bento-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-3xl text-white font-display font-bold text-2xl flex items-center justify-center shadow-md shrink-0"
            style={{ backgroundColor: student.avatarColor }}
          >
            {student.initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-on-surface">
                {student.fullName}
              </h1>
              <span className="tabular-nums text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant">
                {student.code}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                {student.gradeLevel}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              Tutor legal: <strong>{student.guardianName}</strong>
            </p>

            {/* Automatic Multi-Course Averages */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-soft-accent text-primary text-xs font-bold tabular-nums">
                <Sparkles className="w-3.5 h-3.5" />
                Media Global Auto:{' '}
                {crossSummary.globalAverage !== null
                  ? `${crossSummary.globalAverage} / 10`
                  : '—'}
              </span>
              {crossSummary.perCourse.map((pc) => (
                <button
                  key={pc.courseId}
                  type="button"
                  onClick={() => setActiveCourseId(pc.courseId)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums border transition-colors ${
                    activeCourse?.id === pc.courseId
                      ? 'border-primary bg-primary text-white'
                      : 'border-border-default bg-white text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {pc.courseTitle}: {pc.average !== null ? pc.average : '—'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(student.guardianPhone || student.guardianEmail) && (
          <div className="flex flex-wrap md:flex-col gap-2 w-full md:w-auto">
            {student.guardianPhone && (
              <a
                href={`tel:${student.guardianPhone}`}
                className="px-4 py-2 rounded-full bg-surface-container-low hover:bg-soft-accent text-xs font-semibold text-on-surface flex items-center justify-center gap-2"
              >
                <Phone className="w-3.5 h-3.5 text-primary" />
                Llamar ({student.guardianPhone})
              </a>
            )}
            {student.guardianEmail && (
              <a
                href={`mailto:${student.guardianEmail}`}
                className="px-4 py-2 rounded-full bg-surface-container-low hover:bg-soft-accent text-xs font-semibold text-on-surface flex items-center justify-center gap-2"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                Enviar Correo
              </a>
            )}
          </div>
        )}
      </section>

      {/* Middle Analytics Grid (100% Live Derived Data) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Live Attendance Health */}
        <div className="bento-card p-5 lg:col-span-4 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-on-surface">
              Asistencia Real ({activeCourse?.shortName ?? 'Curso'})
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
              Automático
            </span>
          </div>

          <div className="flex justify-center py-2">
            <CircularScoreRing
              value={autoStudentMetrics?.attendance.attendanceRatePct ?? 100}
              max={100}
              size={128}
              strokeWidth={10}
              label={`${autoStudentMetrics?.attendance.attendanceRatePct ?? 100}%`}
              sublabel={autoStudentMetrics?.attendance.isAlert ? 'Alerta' : 'Óptimo'}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-container-low">
              <span className="text-on-surface-variant block">Presentes</span>
              <span className="tabular-nums font-bold text-secondary">
                {autoStudentMetrics?.attendance.present ?? 0} sesiones
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container-low">
              <span className="text-on-surface-variant block">Retrasos / Just.</span>
              <span className="tabular-nums font-bold text-on-surface">
                {(autoStudentMetrics?.attendance.late ?? 0) +
                  (autoStudentMetrics?.attendance.excused ?? 0)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container-low">
              <span className="text-on-surface-variant block">Faltas injustif.</span>
              <span className="tabular-nums font-bold text-tertiary">
                {autoStudentMetrics?.attendance.absent ?? 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container-low">
              <span className="text-on-surface-variant block">Puntos conducta</span>
              <span className="tabular-nums font-bold text-primary">
                {(autoStudentMetrics?.behavior.netPoints ?? 0) >= 0
                  ? `+${autoStudentMetrics?.behavior.netPoints ?? 0}`
                  : autoStudentMetrics?.behavior.netPoints}
              </span>
            </div>
          </div>
        </div>

        {/* Live Chronological Evolution */}
        <div className="bento-card p-5 lg:col-span-4 flex flex-col justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-on-surface">
              Evolución por Evaluaciones
            </h3>
            <p className="text-xs text-on-surface-variant">
              Alumno (violeta) vs. media automática de la clase (discontinua)
            </p>
          </div>

          <svg viewBox="0 0 320 130" className="w-full h-36 overflow-visible">
            <polyline
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeDasharray="4 4"
              points={meanPts}
            />
            <polyline
              fill="none"
              stroke="#5B46F6"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={stuPts}
            />
            {coords.map((c, idx) => (
              <g key={`${c.label}-${idx}`}>
                <circle cx={c.x} cy={c.y} r="5" fill="#4223DE" stroke="#fff" strokeWidth="2" />
                <text
                  x={c.x}
                  y={c.y - 10}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-primary tabular-nums"
                >
                  {c.score}
                </text>
                <text
                  x={c.x}
                  y={128}
                  textAnchor="middle"
                  className="text-[9px] fill-on-surface-variant"
                >
                  {c.label}
                </text>
              </g>
            ))}
          </svg>

          <div className="p-3 rounded-2xl bg-soft-accent text-xs text-primary font-semibold flex items-center justify-between">
            <span>Media {activeCourse?.shortName ?? ''}</span>
            <span className="tabular-nums font-bold">
              {formatScore(
                autoStudentMetrics?.effectiveAverage ?? null,
                metricsConfig.roundingMode,
              )}{' '}
              / 10
            </span>
          </div>
        </div>

        {/* Automatic Category Breakdown & Custom Teacher Metrics */}
        <div className="bento-card p-5 lg:col-span-4 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-on-surface">
              Rendimiento por Categorías
            </h3>
            <ShieldCheck className="w-4 h-4 text-secondary" />
          </div>

          <div className="space-y-3">
            {(autoStudentMetrics?.categoryBreakdown ?? []).map((cat) => (
              <div key={cat.categoryId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface font-medium truncate pr-2">
                    {cat.name} ({cat.weight}%)
                  </span>
                  <span className="tabular-nums font-bold text-primary">
                    {cat.score10 !== null ? `${cat.score10}/10` : 'Sin notas'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-low overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-container to-secondary-accent transition-all"
                    style={{ width: `${cat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {metricsConfig.customMetrics.length > 0 && (
            <div className="pt-3 border-t border-border-default space-y-1.5">
              <span className="text-[11px] font-bold uppercase text-secondary block">
                Métricas Personalizadas del Profesor
              </span>
              {metricsConfig.customMetrics.map((cm) => {
                const val = autoStudentMetrics?.customValues[cm.id] ?? null;
                return (
                  <div
                    key={cm.id}
                    className="p-2 rounded-xl bg-secondary-container/25 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-on-surface truncate pr-2">{cm.name}</span>
                    <span className="tabular-nums font-bold text-secondary shrink-0">
                      {val !== null ? `${val}${cm.unit ?? ''}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Faculty Observations (Private vs Shared) */}
      <section className="bento-card p-6 flex flex-col gap-5">
        <div>
          <h3 className="font-display text-lg font-bold text-on-surface">
            Observaciones del Claustro y Notas Privadas
          </h3>
          <p className="text-xs text-on-surface-variant">
            Elige si cada observación se comparte con otros docentes o queda privada en tu perfil.
          </p>
        </div>

        <form
          onSubmit={handleSubmitObservation}
          className="p-4 rounded-2xl bg-surface-container-low space-y-3"
        >
          <textarea
            rows={2}
            required
            value={obsText}
            onChange={(e) => setObsText(e.target.value)}
            placeholder={`Añadir observación sobre ${student.fullName}...`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border-default bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={obsTag}
                onChange={(e) => setObsTag(e.target.value)}
                className="px-3 py-1.5 rounded-full border border-border-default bg-white text-xs font-semibold"
              >
                <option value="Seguimiento Académico">Seguimiento Académico</option>
                <option value="Liderazgo y Convivencia">Liderazgo y Convivencia</option>
                <option value="Orientación / Familia">Orientación / Familia</option>
              </select>

              <button
                type="button"
                onClick={() => setObsVisibility('shared')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  obsVisibility === 'shared'
                    ? 'bg-secondary-container text-on-secondary-container ring-2 ring-secondary/30'
                    : 'bg-white border border-border-default text-on-surface-variant'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Compartida
              </button>

              <button
                type="button"
                onClick={() => setObsVisibility('private')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  obsVisibility === 'private'
                    ? 'bg-soft-accent text-primary ring-2 ring-primary/30'
                    : 'bg-white border border-border-default text-on-surface-variant'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Privada (solo yo)
              </button>
            </div>

            <button
              type="submit"
              className="btn-primary-gradient px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Guardar Observación
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studentObservations.length === 0 ? (
            <p className="text-xs text-on-surface-variant">
              No hay observaciones registradas para este estudiante.
            </p>
          ) : (
            studentObservations.map((obs) => (
              <div
                key={obs.id}
                className="p-4 rounded-2xl bg-surface-container-low border border-border-default/60 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-on-surface">{obs.authorName}</p>
                    <p className="text-[11px] text-on-surface-variant">{obs.authorRole}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      obs.visibility === 'shared'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-soft-accent text-primary'
                    }`}
                  >
                    {obs.visibility === 'shared' ? (
                      <>
                        <Users className="w-3 h-3" /> Compartida
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" /> Privada
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs text-on-surface leading-relaxed italic">
                  “{obs.text}”
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {obs.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-0.5 rounded-full bg-white text-[10px] font-semibold text-on-surface-variant border border-border-default"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <AddStudentModal
        open={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        courseId={activeCourse?.id}
      />

      {activeCourse && (
        <MetricsConfigModal
          open={showMetricsModal}
          onClose={() => setShowMetricsModal(false)}
          course={activeCourse}
        />
      )}
    </div>
  );
};
