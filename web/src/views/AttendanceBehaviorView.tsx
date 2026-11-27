import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCheck,
  ClipboardCheck,
  Clock,
  LayoutGrid,
  List,
  Send,
  Star,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import { useAulora } from '../context/AuloraContext';
import {
  computeStudentAttendanceSummary,
  resolveCourseMetricsConfig,
} from '../lib/metricsEngine';
import type { AttendanceStatus } from '../types/aulora';
import { AddStudentModal } from '../components/AddStudentModal';

const QUICK_BADGES = [
  { label: 'Pensamiento Crítico', delta: 1, tone: 'bg-soft-accent text-primary' },
  { label: 'Trabajo en Equipo', delta: 2, tone: 'bg-secondary-container text-on-secondary-container' },
  { label: 'Material Listo', delta: 1, tone: 'bg-surface-container-low text-on-surface' },
  { label: 'Aviso Atención', delta: -1, tone: 'bg-tertiary-container text-tertiary' },
];

const STATUS_BADGE: Record<AttendanceStatus, { code: string; label: string; cls: string }> = {
  present: {
    code: 'P',
    label: 'Presente',
    cls: 'bg-secondary-container text-on-secondary-container',
  },
  late: { code: 'R', label: 'Retraso', cls: 'bg-warning/25 text-amber-800' },
  absent: { code: 'F', label: 'Falta', cls: 'bg-tertiary-container text-tertiary' },
  excused: { code: 'J', label: 'Justif.', cls: 'bg-soft-accent text-primary' },
};

const NEXT_STATUS: Record<AttendanceStatus, AttendanceStatus> = {
  present: 'late',
  late: 'absent',
  absent: 'excused',
  excused: 'present',
};

export const AttendanceBehaviorView: React.FC = () => {
  const {
    dataset,
    activeCourse,
    setActiveCourseId,
    activeCourseStudents,
    activeCourseAttendance,
    activeCourseBehaviorLogs,
    setAttendanceStatus,
    markAllPresent,
    commitAttendanceToSis,
    addBehaviorLog,
    setActiveTab,
  } = useAulora();

  const [viewMode, setViewMode] = useState<'seating' | 'roster'>('seating');
  const [armedBadge, setArmedBadge] = useState<(typeof QUICK_BADGES)[number] | null>(null);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [sisSentBanner, setSisSentBanner] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  const metricsConfig = useMemo(
    () => resolveCourseMetricsConfig(activeCourse),
    [activeCourse],
  );

  const historicalAttendanceMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentAttendanceSummary>>();
    if (!activeCourse) return map;
    const days = dataset.attendance[activeCourse.id];
    for (const s of activeCourseStudents) {
      map.set(
        s.id,
        computeStudentAttendanceSummary(s.id, days, metricsConfig.attendanceAlertPct),
      );
    }
    return map;
  }, [activeCourse, activeCourseStudents, dataset.attendance, metricsConfig.attendanceAlertPct]);

  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    for (const s of activeCourseStudents) {
      const st = activeCourseAttendance[s.id]?.status ?? 'present';
      if (st === 'present') present += 1;
      else if (st === 'late') late += 1;
      else if (st === 'absent') absent += 1;
      else excused += 1;
    }
    const total = activeCourseStudents.length || 1;
    const rate =
      activeCourseStudents.length > 0
        ? (((present + late + excused) / total) * 100).toFixed(1)
        : '100.0';
    const behaviorDelta = activeCourseBehaviorLogs.reduce((acc, l) => acc + l.delta, 0);
    return {
      present,
      late,
      absent,
      excused,
      total: activeCourseStudents.length,
      rate,
      behaviorDelta,
    };
  }, [activeCourseAttendance, activeCourseBehaviorLogs, activeCourseStudents]);

  const studentPointMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of activeCourseBehaviorLogs) {
      map.set(log.studentId, (map.get(log.studentId) ?? 0) + log.delta);
    }
    return map;
  }, [activeCourseBehaviorLogs]);

  const unexcusedStudents = useMemo(
    () => activeCourseStudents.filter((s) => activeCourseAttendance[s.id]?.status === 'absent'),
    [activeCourseAttendance, activeCourseStudents],
  );

  if (!activeCourse) {
    return (
      <div className="bento-card p-8 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-soft-accent text-primary flex items-center justify-center">
          <ClipboardCheck className="w-6 h-6" />
        </div>
        <h2 className="font-display text-xl font-bold">Sin grupos activos</h2>
        <p className="text-sm text-on-surface-variant max-w-md">
          Crea un grupo en el Dashboard para empezar a pasar lista y calcular estadísticas automáticamente.
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

  const handleDeskClick = async (studentId: string) => {
    if (armedBadge) {
      await addBehaviorLog(
        activeCourse.id,
        studentId,
        armedBadge.delta,
        armedBadge.label,
        'Insignia asignada desde el plano de aula',
      );
      setArmedBadge(null);
      return;
    }
    const current = activeCourseAttendance[studentId]?.status ?? 'present';
    await setAttendanceStatus(activeCourse.id, studentId, NEXT_STATUS[current]);
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="bento-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {activeCourse.room} · {activeCourse.periodLabel}
          </span>
          <h1 className="font-display text-2xl font-bold text-on-surface mt-0.5">
            Estadísticas de Asistencia y Conducta
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
                {c.shortName}
              </option>
            ))}
          </select>

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
            onClick={() => markAllPresent(activeCourse.id)}
            className="px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center gap-1.5 hover:brightness-95"
          >
            <CheckCheck className="w-4 h-4" />
            Todos Presentes
          </button>

          <button
            type="button"
            onClick={async () => {
              await commitAttendanceToSis(activeCourse.id);
              setSisSentBanner(true);
              setTimeout(() => setSisSentBanner(false), 3000);
            }}
            className="btn-primary-gradient px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Guardar Parte
          </button>
        </div>
      </section>

      {sisSentBanner && (
        <div className="rounded-2xl bg-secondary-container text-on-secondary-container px-4 py-2.5 text-xs font-bold">
          Parte guardado en Firebase; porcentajes acumulados actualizados automáticamente.
        </div>
      )}

      {/* 5 KPI Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bento-card p-4">
          <span className="text-[11px] font-bold uppercase text-on-surface-variant">
            Asistencia Hoy
          </span>
          <div className="tabular-nums text-2xl font-bold text-on-surface mt-1">
            {stats.rate}%
          </div>
        </div>
        <div className="bento-card p-4">
          <span className="text-[11px] font-bold uppercase text-on-surface-variant flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-secondary" /> Presentes
          </span>
          <div className="tabular-nums text-2xl font-bold text-secondary mt-1">
            {stats.present}{' '}
            <span className="text-sm font-normal text-on-surface-variant">/ {stats.total}</span>
          </div>
        </div>
        <div className="bento-card p-4">
          <span className="text-[11px] font-bold uppercase text-on-surface-variant flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Retrasos
          </span>
          <div className="tabular-nums text-2xl font-bold text-amber-600 mt-1">
            {stats.late}
          </div>
        </div>
        <div className="bento-card p-4">
          <span className="text-[11px] font-bold uppercase text-on-surface-variant flex items-center gap-1">
            <UserX className="w-3.5 h-3.5 text-tertiary" /> Faltas Hoy
          </span>
          <div className="tabular-nums text-2xl font-bold text-tertiary mt-1">
            {stats.absent}
          </div>
        </div>
        <div className="bento-card p-4 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase text-on-surface-variant flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-primary" /> Balance Puntos
          </span>
          <div className="tabular-nums text-2xl font-bold text-primary mt-1">
            {stats.behaviorDelta >= 0 ? `+${stats.behaviorDelta}` : stats.behaviorDelta}
          </div>
        </div>
      </section>

      {/* Seating Grid or Roster */}
      <section className="bento-card p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-surface-container-low rounded-full">
            <button
              type="button"
              onClick={() => setViewMode('seating')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'seating'
                  ? 'bg-white text-on-surface shadow-xs'
                  : 'text-on-surface-variant'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-primary" />
              Plano del Aula
            </button>
            <button
              type="button"
              onClick={() => setViewMode('roster')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'roster'
                  ? 'bg-white text-on-surface shadow-xs'
                  : 'text-on-surface-variant'
              }`}
            >
              <List className="w-3.5 h-3.5 text-primary" />
              Lista + Acumulado
            </button>
          </div>

          <span className="text-xs text-on-surface-variant">
            {armedBadge
              ? `Insignia activa: "${armedBadge.label}" — pulsa en un pupitre`
              : 'Pulsa en un pupitre para rotar asistencia; el % acumulado se actualiza solo'}
          </span>
        </div>

        {activeCourseStudents.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center gap-3">
            <p className="text-sm text-on-surface-variant">
              Añade alumnos a este grupo para ver sus pupitres en el plano.
            </p>
            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="btn-primary-gradient px-4 py-2 rounded-full text-xs font-semibold"
            >
              + Añadir Alumno
            </button>
          </div>
        ) : viewMode === 'seating' ? (
          <div className="flex flex-col gap-4">
            <div className="mx-auto px-6 py-1.5 rounded-full bg-surface-container-low border border-border-default text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Pizarra Digital y Mesa del Profesor
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {activeCourseStudents.map((student, idx) => {
                const status = activeCourseAttendance[student.id]?.status ?? 'present';
                const statusInfo = STATUS_BADGE[status];
                const points = studentPointMap.get(student.id) ?? 0;
                const hist = historicalAttendanceMap.get(student.id);
                const seatNum = activeCourse.seatAssignments[student.id] ?? idx + 1;

                return (
                  <div
                    key={student.id}
                    onClick={() => handleDeskClick(student.id)}
                    className={`cursor-pointer rounded-2xl p-3.5 border transition-all flex flex-col justify-between gap-3 ${
                      armedBadge
                        ? 'ring-2 ring-primary/30 hover:ring-primary bg-soft-accent/30'
                        : status === 'absent' || hist?.isAlert
                          ? 'bg-tertiary-container/25 border-tertiary-accent/40'
                          : 'bg-surface-container-low/70 border-border-default hover:border-primary/40 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="tabular-nums text-[11px] font-bold text-outline">
                        #{String(seatNum).padStart(2, '0')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.cls}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-9 h-9 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: student.avatarColor }}
                      >
                        {student.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">
                          {student.fullName}
                        </p>
                        <p className="tabular-nums text-[10px] text-on-surface-variant truncate">
                          Acum: {hist?.attendanceRatePct ?? 100}% ({hist?.absent ?? 0} faltas)
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between pt-1 border-t border-border-default/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            addBehaviorLog(
                              activeCourse.id,
                              student.id,
                              1,
                              'Positivo rápido',
                              'Participación activa en clase',
                            )
                          }
                          title="+1 Estrella"
                          className="w-6 h-6 rounded-lg bg-white border border-border-default flex items-center justify-center text-primary hover:bg-soft-accent"
                        >
                          <Star className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            addBehaviorLog(
                              activeCourse.id,
                              student.id,
                              -1,
                              'Aviso rápido',
                              'Llamada de atención en clase',
                            )
                          }
                          title="-1 Aviso"
                          className="w-6 h-6 rounded-lg bg-white border border-border-default flex items-center justify-center text-tertiary hover:bg-tertiary-container/40"
                        >
                          <AlertTriangle className="w-3 h-3" />
                        </button>
                      </div>
                      <span
                        className={`tabular-nums text-xs font-bold px-2 py-0.5 rounded-full ${
                          points >= 0
                            ? 'bg-soft-accent text-primary'
                            : 'bg-tertiary-container text-tertiary'
                        }`}
                      >
                        {points >= 0 ? `+${points}` : points}★
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-on-surface">
                Lanzador Rápido de Insignias:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_BADGES.map((b) => {
                  const active = armedBadge?.label === b.label;
                  return (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => setArmedBadge(active ? null : b)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        active ? 'ring-2 ring-primary scale-105 ' + b.tone : b.tone + ' hover:opacity-90'
                      }`}
                    >
                      {b.delta > 0 ? `+${b.delta}` : b.delta} · {b.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {activeCourseStudents.map((student) => {
              const status = activeCourseAttendance[student.id]?.status ?? 'present';
              const hist = historicalAttendanceMap.get(student.id);
              return (
                <div
                  key={student.id}
                  className="p-3 rounded-2xl bg-surface-container-low flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-full text-white text-xs font-bold flex items-center justify-center"
                      style={{ backgroundColor: student.avatarColor }}
                    >
                      {student.initials}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-on-surface flex items-center gap-2">
                        {student.fullName}
                        {hist?.isAlert && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tertiary-container text-tertiary">
                            Alerta {hist.unexcusedRatePct}% faltas
                          </span>
                        )}
                      </p>
                      <p className="tabular-nums text-xs text-on-surface-variant">
                        Asistencia acumulada: <strong>{hist?.attendanceRatePct ?? 100}%</strong> ({hist?.present ?? 0}P · {hist?.late ?? 0}R · {hist?.absent ?? 0}F) · Puntos: {studentPointMap.get(student.id) ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAttendanceStatus(activeCourse.id, student.id, st)}
                        className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                          status === st
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white border border-border-default text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {STATUS_BADGE[st].code}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="bento-card p-5 lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-on-surface">
              Registro de Puntos del Periodo
            </h3>
            <span className="tabular-nums text-xs font-bold text-primary">
              {activeCourseBehaviorLogs.length} registros
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-auto">
            {activeCourseBehaviorLogs.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-4 text-center">
                Aún no hay registros de conducta en este grupo.
              </p>
            ) : (
              activeCourseBehaviorLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`px-2.5 py-1 rounded-full tabular-nums text-xs font-bold ${
                        log.delta >= 0
                          ? 'bg-soft-accent text-primary'
                          : 'bg-tertiary-container text-tertiary'
                      }`}
                    >
                      {log.delta >= 0 ? `+${log.delta}` : log.delta}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">
                        {log.studentName} · <span className="text-primary">{log.badge}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">{log.reason}</p>
                    </div>
                  </div>
                  <span className="tabular-nums text-[11px] text-outline shrink-0">
                    {log.time}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bento-card p-5 lg:col-span-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-on-surface">
              Aviso Automático a Familias
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
              {autoEscalate ? 'Activo' : 'Manual'}
            </span>
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Detecta automáticamente faltas de hoy y alumnos que superan el {metricsConfig.attendanceAlertPct}% de absentismo.
          </p>

          <div className="p-3.5 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-on-surface">Alerta automática</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                {unexcusedStudents.length > 0
                  ? `Hoy sin justificar: ${unexcusedStudents.map((s) => s.fullName).join(', ')}`
                  : 'Sin ausencias injustificadas hoy'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoEscalate((p) => !p)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                autoEscalate ? 'bg-primary' : 'bg-surface-dim'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoEscalate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      <AddStudentModal
        open={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        courseId={activeCourse.id}
      />
    </div>
  );
};
