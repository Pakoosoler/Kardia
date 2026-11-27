import React, { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Calculator,
  Download,
  Lock,
  Plus,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAulora } from '../context/AuloraContext';
import {
  computeAssessmentMean,
  exportGradebookToCsv,
  getQualitativeBadge,
  RUBRIC_LABELS,
} from '../lib/gradeUtils';
import {
  computeCourseAutoStats,
  computeStudentAutoMetrics,
  formatScore,
  resolveCourseMetricsConfig,
} from '../lib/metricsEngine';
import type { Category, RubricLevel, TermId } from '../types/aulora';
import { CircularScoreRing } from '../components/CircularScoreRing';
import { AddStudentModal } from '../components/AddStudentModal';
import { MetricsConfigModal } from '../components/MetricsConfigModal';

const TERMS: { id: TermId; label: string }[] = [
  { id: 'term1', label: 'Trimestre 1' },
  { id: 'term2', label: 'Trimestre 2' },
  { id: 'term3', label: 'Trimestre 3' },
  { id: 'final', label: 'Media Final (Auto)' },
];

export const GradebookView: React.FC = () => {
  const {
    dataset,
    activeCourse,
    setActiveCourseId,
    activeCourseStudents,
    activeCourseAssessments,
    activeCourseGrades,
    activeTerm,
    setActiveTerm,
    updateGrade,
    addAssessment,
    updateCategories,
    setSelectedStudentId,
    setActiveTab,
  } = useAulora();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  const [colTitle, setColTitle] = useState('');
  const [colSubtitle, setColSubtitle] = useState('');
  const [colCategoryId, setColCategoryId] = useState('cat-exams');
  const [colWeight, setColWeight] = useState(20);
  const [colMaxScore, setColMaxScore] = useState(10);
  const [colType, setColType] = useState<'numeric' | 'rubric'>('numeric');

  const [draftCategories, setDraftCategories] = useState<Category[]>([]);

  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});

  const metricsConfig = useMemo(
    () => resolveCourseMetricsConfig(activeCourse),
    [activeCourse],
  );

  const visibleCustomMetrics = useMemo(
    () => metricsConfig.customMetrics.filter((cm) => cm.showInGradebook),
    [metricsConfig.customMetrics],
  );

  const visibleAssessments = useMemo(() => {
    const byTerm =
      activeTerm === 'final'
        ? activeCourseAssessments
        : activeCourseAssessments.filter((a) => a.termId === activeTerm);
    if (selectedCategoryId === 'all') return byTerm;
    return byTerm.filter((a) => a.categoryId === selectedCategoryId);
  }, [activeCourseAssessments, activeTerm, selectedCategoryId]);

  const categoryMap = useMemo(
    () => new Map((activeCourse?.categories ?? []).map((c) => [c.id, c])),
    [activeCourse?.categories],
  );

  const studentAutoMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentAutoMetrics>>();
    if (!activeCourse) return map;
    const cAtt = dataset.attendance[activeCourse.id];
    const cBeh = dataset.behaviorLogs[activeCourse.id];
    for (const s of activeCourseStudents) {
      map.set(
        s.id,
        computeStudentAutoMetrics(
          s.id,
          activeCourse,
          activeCourseAssessments,
          activeCourseGrades,
          cAtt,
          cBeh,
          activeTerm,
        ),
      );
    }
    return map;
  }, [
    activeCourse,
    activeCourseAssessments,
    activeCourseGrades,
    activeCourseStudents,
    activeTerm,
    dataset.attendance,
    dataset.behaviorLogs,
  ]);

  const courseStats = useMemo(() => {
    if (!activeCourse) return null;
    return computeCourseAutoStats(
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
  ]);

  const buckets = useMemo(() => {
    const nums = Array.from(studentAutoMap.values())
      .map((m) => m.effectiveAverage)
      .filter((v): v is number => v !== null);
    return {
      total: nums.length,
      excellent: nums.filter((v) => v >= 8).length,
      good: nums.filter((v) => v >= 7 && v < 8).length,
      mid: nums.filter((v) => v >= metricsConfig.passingThreshold && v < 7).length,
      low: nums.filter((v) => v < metricsConfig.passingThreshold).length,
    };
  }, [metricsConfig.passingThreshold, studentAutoMap]);

  if (!activeCourse) {
    return (
      <div className="bento-card p-8 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-soft-accent text-primary flex items-center justify-center">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 className="font-display text-xl font-bold">Aún no tienes grupos creados</h2>
        <p className="text-sm text-on-surface-variant max-w-md">
          Ve al Dashboard para crear tu primer grupo o cargar datos de prueba.
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

  const handleKeyDownCell = (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextStu = activeCourseStudents[rowIdx + 1];
      const col = visibleAssessments[colIdx];
      if (nextStu && col) {
        cellRefs.current[`${nextStu.id}_${col.id}`]?.focus();
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      const nextCol = visibleAssessments[colIdx + 1];
      const stu = activeCourseStudents[rowIdx];
      if (stu && nextCol) {
        e.preventDefault();
        cellRefs.current[`${stu.id}_${nextCol.id}`]?.focus();
      }
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colTitle.trim()) return;
    await addAssessment(activeCourse.id, {
      termId: activeTerm === 'final' ? 'term2' : activeTerm,
      categoryId: colCategoryId,
      title: colTitle.trim(),
      subtitle:
        colSubtitle.trim() ||
        (colType === 'rubric' ? 'Rúbrica 4 niveles' : `Escala 0 - ${colMaxScore} (auto /10)`),
      weight: Number(colWeight) || 10,
      maxScore: Math.max(1, Number(colMaxScore) || 10),
      type: colType,
      dueDate: new Date().toISOString().slice(0, 10),
    });
    setColTitle('');
    setColSubtitle('');
    setColMaxScore(10);
    setShowAddColumnModal(false);
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCategories(activeCourse.id, draftCategories);
    setShowWeightModal(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Course & Controls Header */}
      <section className="bento-card p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={activeCourse.id}
              onChange={(e) => {
                setActiveCourseId(e.target.value);
                setSelectedCategoryId('all');
              }}
              className="px-4 py-2 rounded-2xl bg-surface-container-low border border-border-default font-display font-bold text-sm sm:text-base text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
            >
              {dataset.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.room})
                </option>
              ))}
            </select>

            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                activeCourse.visibility === 'shared'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-soft-accent text-primary'
              }`}
            >
              {activeCourse.visibility === 'shared' ? (
                <>
                  <Users className="w-3.5 h-3.5" /> Curso Compartido
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Curso Privado
                </>
              )}
            </span>

            <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
              {activeCourseStudents.length} alumnos
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="px-3.5 py-2 rounded-full bg-soft-accent text-primary hover:bg-primary-fixed text-xs font-semibold flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Alumno
            </button>
            <button
              type="button"
              onClick={() => setShowMetricsModal(true)}
              className="px-3.5 py-2 rounded-full bg-secondary-container/60 hover:bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
              Métricas Auto ({visibleCustomMetrics.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftCategories(activeCourse.categories);
                setShowWeightModal(true);
              }}
              className="px-3.5 py-2 rounded-full border border-border-default hover:bg-surface-container-low text-xs font-semibold text-on-surface flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              Pesos ({activeCourse.categories.reduce((acc, c) => acc + c.weight, 0)}%)
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
              className="px-3.5 py-2 rounded-full border border-border-default hover:bg-surface-container-low text-xs font-semibold text-on-surface flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setColCategoryId(activeCourse.categories[0]?.id ?? 'cat-exams');
                setShowAddColumnModal(true);
              }}
              className="btn-primary-gradient px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nueva Columna
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border-default pb-3">
          {TERMS.map((term) => (
            <button
              key={term.id}
              type="button"
              onClick={() => setActiveTerm(term.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTerm === term.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {term.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              selectedCategoryId === 'all'
                ? 'bg-on-surface text-white'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Todas las categorías
          </button>
          {activeCourse.categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedCategoryId === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-soft-accent text-primary hover:bg-primary-fixed'
              }`}
            >
              {cat.name} ({cat.weight}%)
            </button>
          ))}
        </div>
      </section>

      {/* Matrix or Empty Roster */}
      {activeCourseStudents.length === 0 ? (
        <section className="bento-card p-8 text-center flex flex-col items-center gap-3">
          <p className="text-sm font-semibold text-on-surface">
            Este grupo aún no tiene alumnos matriculados.
          </p>
          <button
            type="button"
            onClick={() => setShowAddStudentModal(true)}
            className="btn-primary-gradient px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Añadir primer alumno
          </button>
        </section>
      ) : (
        <section className="bento-card overflow-hidden">
          <div className="px-5 py-3 bg-surface-container-low border-b border-border-default flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Introduce solo las notas base: medias, normalización a /10 y métricas extra se calculan solas
            </span>
            <span className="text-[11px] text-on-surface-variant font-medium">
              Teclado:{' '}
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-border-default">
                Enter
              </kbd>{' '}
              ↓{' '}
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-border-default">
                Tab
              </kbd>{' '}
              →
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[820px]">
              <thead>
                <tr className="border-b border-border-default bg-white">
                  <th className="sticky left-0 z-20 bg-white/95 backdrop-blur-md px-5 py-3.5 border-r border-border-default min-w-[220px]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Estudiante / Código
                    </span>
                  </th>

                  {activeTerm === 'final' ? (
                    <>
                      <th className="px-3 py-3 min-w-[110px] bg-soft-accent/30 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-soft-accent text-primary text-[10px] font-bold">
                          AUTO
                        </span>
                        <div className="text-xs font-bold text-on-surface mt-1">Media T1</div>
                      </th>
                      <th className="px-3 py-3 min-w-[110px] bg-soft-accent/30 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-soft-accent text-primary text-[10px] font-bold">
                          AUTO
                        </span>
                        <div className="text-xs font-bold text-on-surface mt-1">Media T2</div>
                      </th>
                      <th className="px-3 py-3 min-w-[110px] bg-soft-accent/30 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-soft-accent text-primary text-[10px] font-bold">
                          AUTO
                        </span>
                        <div className="text-xs font-bold text-on-surface mt-1">Media T3</div>
                      </th>
                    </>
                  ) : (
                    visibleAssessments.map((ass) => {
                      const cat = categoryMap.get(ass.categoryId);
                      return (
                        <th key={ass.id} className="px-3 py-3 min-w-[145px] align-top">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-soft-accent text-primary text-[10px] font-bold">
                              {cat?.name ?? 'Eval'} · {ass.weight}%
                            </span>
                            <span className="tabular-nums text-[10px] text-outline">
                              /{ass.maxScore}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-on-surface leading-tight">
                            {ass.title}
                          </div>
                          <div className="text-[11px] text-on-surface-variant font-normal truncate">
                            {ass.subtitle}
                          </div>
                        </th>
                      );
                    })
                  )}

                  {/* Custom Auto-Calculated Columns */}
                  {visibleCustomMetrics.map((cm) => (
                    <th
                      key={cm.id}
                      className="px-3 py-3 min-w-[135px] bg-secondary-container/20 border-l border-border-default/60 text-center align-top"
                    >
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                        FÓRMULA AUTO
                      </span>
                      <div className="text-xs font-bold text-on-surface mt-1 leading-tight">
                        {cm.name}
                      </div>
                      <div className="font-mono text-[10px] text-on-surface-variant truncate">
                        {cm.formula}
                      </div>
                    </th>
                  ))}

                  <th className="sticky right-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 border-l border-border-default min-w-[160px] text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                      {activeTerm === 'final' ? 'Media Final' : 'Media Auto'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-normal">
                      {metricsConfig.averageMode === 'category_weighted'
                        ? 'Por categorías'
                        : metricsConfig.averageMode === 'assessment_weighted'
                          ? 'Por columnas'
                          : 'Media simple'}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeCourseStudents.map((student, rowIdx) => {
                  const m = studentAutoMap.get(student.id);
                  const avg = m?.effectiveAverage ?? null;
                  const badge = getQualitativeBadge(avg);

                  return (
                    <tr
                      key={student.id}
                      className="border-b border-border-default/70 hover:bg-soft-accent/60 transition-colors group"
                    >
                      <td className="sticky left-0 z-10 bg-white/95 group-hover:bg-soft-accent backdrop-blur-md px-5 py-2.5 border-r border-border-default">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setActiveTab('analytics');
                          }}
                          className="flex items-center gap-3 text-left w-full"
                        >
                          <span
                            className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                            style={{ backgroundColor: student.avatarColor }}
                          >
                            {student.initials}
                          </span>
                          <div className="min-w-0">
                            <span className="block text-sm font-semibold text-on-surface truncate hover:text-primary">
                              {student.fullName}
                            </span>
                            <span className="tabular-nums block text-[11px] text-on-surface-variant">
                              {student.code}
                              {m && m.attendance.totalDays > 0
                                ? ` · ${m.attendance.attendanceRatePct}% asist.`
                                : ''}
                            </span>
                          </div>
                        </button>
                      </td>

                      {activeTerm === 'final' ? (
                        <>
                          <td className="px-3 py-2 text-center bg-soft-accent/15 tabular-nums text-sm font-bold text-on-surface">
                            {formatScore(m?.t1Raw ?? null, metricsConfig.roundingMode)}
                          </td>
                          <td className="px-3 py-2 text-center bg-soft-accent/15 tabular-nums text-sm font-bold text-on-surface">
                            {formatScore(m?.t2Raw ?? null, metricsConfig.roundingMode)}
                          </td>
                          <td className="px-3 py-2 text-center bg-soft-accent/15 tabular-nums text-sm font-bold text-on-surface">
                            {formatScore(m?.t3Raw ?? null, metricsConfig.roundingMode)}
                          </td>
                        </>
                      ) : (
                        visibleAssessments.map((ass, colIdx) => {
                          const val = activeCourseGrades[student.id]?.[ass.id];
                          const key = `${student.id}_${ass.id}`;

                          if (ass.type === 'rubric') {
                            const level = val?.rubricLevel ?? '';
                            return (
                              <td key={ass.id} className="px-3 py-2">
                                <select
                                  ref={(el) => {
                                    cellRefs.current[key] = el;
                                  }}
                                  value={level}
                                  onKeyDown={(e) => handleKeyDownCell(e, rowIdx, colIdx)}
                                  onChange={(e) => {
                                    const next = e.target.value as RubricLevel | '';
                                    if (!next) return;
                                    void updateGrade(activeCourse.id, student.id, ass.id, {
                                      rubricLevel: next,
                                    });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-border-default bg-surface-container-low text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                                >
                                  <option value="">— Evaluar —</option>
                                  {(Object.keys(RUBRIC_LABELS) as RubricLevel[]).map((lvl) => (
                                    <option key={lvl} value={lvl}>
                                      {RUBRIC_LABELS[lvl].short}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          }

                          const numVal = val?.numeric ?? '';
                          const normalizedPreview =
                            typeof numVal === 'number'
                              ? (numVal / (ass.maxScore || 10)) * 10
                              : null;
                          const isLow =
                            normalizedPreview !== null &&
                            normalizedPreview < metricsConfig.passingThreshold;

                          return (
                            <td key={ass.id} className="px-3 py-2">
                              <input
                                ref={(el) => {
                                  cellRefs.current[key] = el;
                                }}
                                type="number"
                                step="0.1"
                                min="0"
                                max={ass.maxScore}
                                value={numVal}
                                placeholder="—"
                                onKeyDown={(e) => handleKeyDownCell(e, rowIdx, colIdx)}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === '') {
                                    void updateGrade(activeCourse.id, student.id, ass.id, {
                                      numeric: null,
                                    });
                                    return;
                                  }
                                  const parsed = Number(raw);
                                  if (!Number.isNaN(parsed)) {
                                    const clamped = Math.max(0, Math.min(ass.maxScore, parsed));
                                    void updateGrade(activeCourse.id, student.id, ass.id, {
                                      numeric: clamped,
                                    });
                                  }
                                }}
                                className={`w-full text-center tabular-nums px-2 py-1.5 rounded-lg border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container transition-colors ${
                                  isLow
                                    ? 'bg-tertiary-container/40 border-tertiary-accent/40 text-tertiary'
                                    : 'bg-surface-container-low/70 border-border-default text-on-surface focus:bg-white'
                                }`}
                              />
                            </td>
                          );
                        })
                      )}

                      {/* Custom Auto-Calculated Cells */}
                      {visibleCustomMetrics.map((cm) => {
                        const cVal = m?.customValues[cm.id] ?? null;
                        return (
                          <td
                            key={cm.id}
                            className="px-3 py-2 text-center bg-secondary-container/10 border-l border-border-default/60 tabular-nums text-sm font-bold text-secondary"
                          >
                            {cVal !== null ? `${cVal}${cm.unit ?? ''}` : '—'}
                          </td>
                        );
                      })}

                      {/* Sticky Auto-Calculated Term / Final Average */}
                      <td className="sticky right-0 z-10 bg-white/95 group-hover:bg-soft-accent backdrop-blur-md px-4 py-2 border-l border-border-default">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="text-right">
                            <span className="tabular-nums text-sm font-bold text-on-surface block leading-none">
                              {formatScore(avg, metricsConfig.roundingMode)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold ${
                                !m?.isPassing
                                  ? 'text-tertiary'
                                  : badge.tone === 'emerald'
                                    ? 'text-secondary'
                                    : 'text-primary'
                              }`}
                            >
                              {!m?.isPassing && avg !== null ? 'Bajo corte' : badge.label}
                            </span>
                          </div>
                          <CircularScoreRing
                            value={avg !== null ? avg * 10 : 0}
                            max={100}
                            size={34}
                            strokeWidth={3.5}
                            label={formatScore(avg, metricsConfig.roundingMode)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="bg-surface-container-low border-t border-border-default">
                  <td className="sticky left-0 bg-surface-container-low px-5 py-3 border-r border-border-default">
                    <span className="text-xs font-bold text-on-surface block">
                      Estadística Automática
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Media de cada columna
                    </span>
                  </td>

                  {activeTerm === 'final' ? (
                    <>
                      <td className="px-3 py-3 text-center text-xs font-bold text-primary">Auto T1</td>
                      <td className="px-3 py-3 text-center text-xs font-bold text-primary">Auto T2</td>
                      <td className="px-3 py-3 text-center text-xs font-bold text-primary">Auto T3</td>
                    </>
                  ) : (
                    visibleAssessments.map((ass) => {
                      const mean = computeAssessmentMean(
                        ass,
                        activeCourseStudents.map((s) => s.id),
                        activeCourseGrades,
                      );
                      return (
                        <td key={ass.id} className="px-3 py-3 text-center">
                          <span className="block text-[10px] font-bold uppercase text-outline">
                            Media
                          </span>
                          <span className="tabular-nums text-sm font-bold text-primary">
                            {mean !== null ? `${mean.toFixed(1)}/${ass.maxScore}` : '—'}
                          </span>
                        </td>
                      );
                    })
                  )}

                  {visibleCustomMetrics.map((cm) => (
                    <td key={cm.id} className="px-3 py-3 text-center text-[11px] font-semibold text-secondary">
                      Auto
                    </td>
                  ))}

                  <td className="sticky right-0 bg-surface-container-low px-4 py-3 border-l border-border-default text-right">
                    <span className="tabular-nums text-sm font-bold text-on-surface block">
                      {courseStats?.mean !== null && courseStats?.mean !== undefined
                        ? `${courseStats.mean} Media`
                        : '—'}
                    </span>
                    <span className="tabular-nums text-[11px] text-secondary font-semibold">
                      {courseStats?.passingPct ?? 0}% aprobados
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* Bottom 4 KPI Bento Cards (100% Automatic) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bento-card p-5">
          <span className="text-xs font-semibold text-on-surface-variant">
            Media y Mediana Automáticas
          </span>
          <div className="tabular-nums text-3xl font-bold text-on-surface mt-1">
            {courseStats?.mean !== null && courseStats?.mean !== undefined
              ? courseStats.mean
              : '—'}
          </div>
          <span className="tabular-nums text-xs text-secondary font-semibold mt-1 block">
            Mediana: {courseStats?.median ?? '—'} · σ: {courseStats?.stdDev ?? '—'}
          </span>
        </div>

        <div className="bento-card p-5">
          <span className="text-xs font-semibold text-on-surface-variant">
            Tasa de Aprobados (≥ {metricsConfig.passingThreshold})
          </span>
          <div className="tabular-nums text-3xl font-bold text-secondary mt-1">
            {courseStats?.passingPct ?? 0}%
          </div>
          <span className="tabular-nums text-xs text-on-surface-variant mt-1 block">
            {courseStats?.passingCount ?? 0} de {courseStats?.evaluatedCount ?? 0} evaluados · Rango{' '}
            {courseStats?.min ?? '—'}–{courseStats?.max ?? '—'}
          </span>
        </div>

        <div className="bento-card p-5">
          <span className="text-xs font-semibold text-on-surface-variant">
            Celdas Calificadas
          </span>
          <div className="tabular-nums text-3xl font-bold text-primary mt-1">
            {courseStats?.gradedCellsPct ?? 0}%
          </div>
          <span className="text-xs text-on-surface-variant mt-1 block">
            Sincronización automática en la nube
          </span>
        </div>

        <div className="bento-card p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-on-surface-variant">
            Distribución (N={buckets.total})
          </span>
          <div className="grid grid-cols-4 gap-1.5 items-end h-12 mt-2">
            {[
              { label: '≥8', val: buckets.excellent, color: 'bg-secondary' },
              { label: '7-8', val: buckets.good, color: 'bg-primary' },
              {
                label: `${metricsConfig.passingThreshold}-7`,
                val: buckets.mid,
                color: 'bg-warning',
              },
              {
                label: `<${metricsConfig.passingThreshold}`,
                val: buckets.low,
                color: 'bg-tertiary-accent',
              },
            ].map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-md ${b.color}`}
                  style={{ height: `${Math.max(6, (b.val / Math.max(1, buckets.total)) * 36)}px` }}
                />
                <span className="tabular-nums text-[10px] text-on-surface-variant">
                  {b.label} ({b.val})
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal: New Assessment Column */}
      {showAddColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/35 backdrop-blur-sm p-4">
          <div className="bento-card w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setShowAddColumnModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-lg font-bold mb-4">
              Nueva Columna de Evaluación
            </h3>
            <form onSubmit={handleAddColumn} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Título de la evaluación
                </label>
                <input
                  type="text"
                  required
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  placeholder="Ej. Examen Tema 1"
                  className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Subtítulo / Instrumento
                </label>
                <input
                  type="text"
                  value={colSubtitle}
                  onChange={(e) => setColSubtitle(e.target.value)}
                  placeholder="Prueba objetiva"
                  className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Categoría
                  </label>
                  <select
                    value={colCategoryId}
                    onChange={(e) => setColCategoryId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-border-default text-xs"
                  >
                    {activeCourse.categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Peso (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={colWeight}
                    onChange={(e) => setColWeight(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-border-default text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Nota máx.
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={colMaxScore}
                    onChange={(e) => setColMaxScore(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-border-default text-sm tabular-nums"
                  />
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Puedes calificar sobre 10, 20 o 100: Aulora lo normaliza automáticamente a escala 0–10 en las medias.
              </p>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Tipo de entrada
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setColType('numeric')}
                    className={`py-2 rounded-xl border text-xs font-semibold ${
                      colType === 'numeric'
                        ? 'border-primary bg-soft-accent text-primary'
                        : 'border-border-default text-on-surface-variant'
                    }`}
                  >
                    Numérica
                  </button>
                  <button
                    type="button"
                    onClick={() => setColType('rubric')}
                    className={`py-2 rounded-xl border text-xs font-semibold ${
                      colType === 'rubric'
                        ? 'border-primary bg-soft-accent text-primary'
                        : 'border-border-default text-on-surface-variant'
                    }`}
                  >
                    Rúbrica (L1 - L4)
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full btn-primary-gradient py-2.5 rounded-full text-sm font-semibold mt-2"
              >
                Añadir Columna
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Weight Settings */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/35 backdrop-blur-sm p-4">
          <div className="bento-card w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setShowWeightModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-lg font-bold mb-1">
              Ponderación por Categorías
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Ajusta los porcentajes para el cálculo automático de la media trimestral.
            </p>
            <form onSubmit={handleSaveWeights} className="space-y-3">
              {draftCategories.map((cat, idx) => (
                <div key={cat.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-on-surface">{cat.name}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={cat.weight}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setDraftCategories((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, weight: val } : item)),
                        );
                      }}
                      className="w-20 px-2.5 py-1.5 rounded-lg border border-border-default text-right tabular-nums text-sm font-bold"
                    />
                    <span className="text-xs text-on-surface-variant">%</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border-default flex items-center justify-between text-xs font-bold">
                <span>Suma total</span>
                <span className="tabular-nums text-primary">
                  {draftCategories.reduce((acc, c) => acc + c.weight, 0)}%
                </span>
              </div>
              <button
                type="submit"
                className="w-full btn-primary-gradient py-2.5 rounded-full text-sm font-semibold"
              >
                Guardar Ponderación
              </button>
            </form>
          </div>
        </div>
      )}

      <AddStudentModal
        open={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        courseId={activeCourse.id}
      />

      <MetricsConfigModal
        open={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        course={activeCourse}
      />
    </div>
  );
};
