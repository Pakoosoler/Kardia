import type {
  Assessment,
  AttendanceDayDoc,
  AuloraDataset,
  BehaviorLog,
  Category,
  Course,
  CourseMetricsConfig,
  CustomMetricDefinition,
  GradeValue,
  RoundingMode,
  TermId,
} from '../types/aulora';
import { computeMedian, resolveNumericScore } from './gradeUtils';

export const DEFAULT_METRICS_CONFIG: CourseMetricsConfig = {
  averageMode: 'category_weighted',
  roundingMode: 'one_decimal',
  passingThreshold: 5.0,
  attendanceAlertPct: 15,
  behaviorBonusPerPoint: 0,
  maxBehaviorBonus: 0.5,
  unexcusedPenaltyPerAbsence: 0,
  customMetrics: [],
};

export const PRESET_CUSTOM_METRICS: Omit<CustomMetricDefinition, 'id'>[] = [
  {
    name: 'Nota Integral (90% Nota + 10% Asist.)',
    description: 'Combina automáticamente la media académica con la regularidad de asistencia.',
    formula: 'ROUND(MEDIA * 0.9 + ASISTENCIA10 * 0.1, 1)',
    unit: '/10',
    showInGradebook: true,
  },
  {
    name: 'Nota Boletín Oficial (Entero)',
    description: 'Redondea la calificación final a número entero entre 1 y 10 para actas.',
    formula: 'MAX(1, MIN(10, ROUND(MEDIA, 0)))',
    unit: '/10',
    showInGradebook: true,
  },
  {
    name: 'Índice de Compromiso',
    description: 'Combina asistencia (%) con bonificación por puntos positivos de aula.',
    formula: 'MIN(100, ROUND(ASISTENCIA + PUNTOS * 2, 0))',
    unit: '%',
    showInGradebook: false,
  },
];

export function resolveCourseMetricsConfig(course?: Course | null): CourseMetricsConfig {
  if (!course?.metricsConfig) return DEFAULT_METRICS_CONFIG;
  return {
    ...DEFAULT_METRICS_CONFIG,
    ...course.metricsConfig,
    customMetrics: course.metricsConfig.customMetrics ?? [],
  };
}

export function applyRounding(value: number, mode: RoundingMode): number {
  if (mode === 'integer_nearest') return Math.round(value);
  if (mode === 'two_decimals') return Number(value.toFixed(2));
  return Number(value.toFixed(1));
}

export function formatScore(value: number | null, mode: RoundingMode = 'one_decimal'): string {
  if (value === null || Number.isNaN(value)) return '—';
  if (mode === 'integer_nearest') return String(Math.round(value));
  if (mode === 'two_decimals') return value.toFixed(2);
  return value.toFixed(1);
}

/**
 * Computes raw academic score (0-10 scale) for a single trimester using the configured mode.
 */
export function computeSingleTrimesterRawAverage(
  studentId: string,
  termId: Exclude<TermId, 'final'>,
  assessments: Assessment[],
  categories: Category[],
  courseGrades: Record<string, Record<string, GradeValue>>,
  config: CourseMetricsConfig,
): number | null {
  const studentScores = courseGrades[studentId] ?? {};
  const termAssessments = assessments.filter((a) => a.termId === termId);
  if (termAssessments.length === 0) return null;

  if (config.averageMode === 'simple_mean') {
    const vals: number[] = [];
    for (const a of termAssessments) {
      const s = resolveNumericScore(a, studentScores[a.id]);
      if (s !== null) vals.push((s / (a.maxScore || 10)) * 10);
    }
    if (vals.length === 0) return null;
    return vals.reduce((acc, v) => acc + v, 0) / vals.length;
  }

  if (config.averageMode === 'assessment_weighted') {
    let weightedSum = 0;
    let weightTotal = 0;
    for (const a of termAssessments) {
      const s = resolveNumericScore(a, studentScores[a.id]);
      if (s === null) continue;
      const w = a.weight > 0 ? a.weight : 1;
      weightedSum += ((s / (a.maxScore || 10)) * 10) * w;
      weightTotal += w;
    }
    if (weightTotal === 0) return null;
    return weightedSum / weightTotal;
  }

  // Default: category_weighted
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const buckets = new Map<string, { sum: number; wSum: number }>();

  for (const a of termAssessments) {
    const s = resolveNumericScore(a, studentScores[a.id]);
    if (s === null) continue;
    const norm = (s / (a.maxScore || 10)) * 10;
    const w = a.weight > 0 ? a.weight : 1;
    const prev = buckets.get(a.categoryId) ?? { sum: 0, wSum: 0 };
    prev.sum += norm * w;
    prev.wSum += w;
    buckets.set(a.categoryId, prev);
  }

  let total = 0;
  let catWeightTotal = 0;
  for (const [catId, b] of buckets.entries()) {
    if (b.wSum === 0) continue;
    const catMean = b.sum / b.wSum;
    const cw = categoryMap.get(catId)?.weight ?? 25;
    total += catMean * cw;
    catWeightTotal += cw;
  }

  if (catWeightTotal === 0) return null;
  return total / catWeightTotal;
}

export interface StudentAttendanceSummary {
  totalDays: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  attendanceRatePct: number; // (present + late + excused) / totalDays * 100
  unexcusedRatePct: number; // absent / totalDays * 100
  isAlert: boolean;
}

export function computeStudentAttendanceSummary(
  studentId: string,
  courseAttendanceDays: Record<string, AttendanceDayDoc> | undefined,
  alertThresholdPct: number = 15,
): StudentAttendanceSummary {
  const days = Object.values(courseAttendanceDays ?? {});
  let totalDays = 0;
  let present = 0;
  let late = 0;
  let excused = 0;
  let absent = 0;

  for (const d of days) {
    const rec = d.records?.[studentId];
    if (!rec) continue;
    totalDays += 1;
    if (rec.status === 'present') present += 1;
    else if (rec.status === 'late') late += 1;
    else if (rec.status === 'excused') excused += 1;
    else if (rec.status === 'absent') absent += 1;
  }

  if (totalDays === 0) {
    return {
      totalDays: 0,
      present: 0,
      late: 0,
      excused: 0,
      absent: 0,
      attendanceRatePct: 100,
      unexcusedRatePct: 0,
      isAlert: false,
    };
  }

  const attendanceRatePct = Number((((present + late + excused) / totalDays) * 100).toFixed(1));
  const unexcusedRatePct = Number(((absent / totalDays) * 100).toFixed(1));
  return {
    totalDays,
    present,
    late,
    excused,
    absent,
    attendanceRatePct,
    unexcusedRatePct,
    isAlert: unexcusedRatePct >= alertThresholdPct || absent >= 3,
  };
}

export interface StudentBehaviorSummary {
  positivePoints: number;
  negativePoints: number;
  netPoints: number;
  logsCount: number;
}

export function computeStudentBehaviorSummary(
  studentId: string,
  logs: BehaviorLog[] | undefined,
): StudentBehaviorSummary {
  let positivePoints = 0;
  let negativePoints = 0;
  let logsCount = 0;
  for (const log of logs ?? []) {
    if (log.studentId !== studentId) continue;
    logsCount += 1;
    if (log.delta >= 0) positivePoints += log.delta;
    else negativePoints += Math.abs(log.delta);
  }
  return {
    positivePoints,
    negativePoints,
    netPoints: positivePoints - negativePoints,
    logsCount,
  };
}

/**
 * Safe recursive-descent formula evaluator for teacher custom metrics.
 * Supports numbers, +, -, *, /, parentheses, MIN(a,b), MAX(a,b), ROUND(x, d),
 * and predefined uppercase metric variables. Never uses eval/Function.
 */
export function evaluateCustomFormula(
  formula: string,
  vars: Record<string, number>,
): number | null {
  try {
    const src = formula.trim().toUpperCase();
    if (!src) return null;

    let pos = 0;
    const skipWs = () => {
      while (pos < src.length && /\s/.test(src[pos])) pos += 1;
    };

    const parseExpression = (): number => {
      let val = parseTerm();
      skipWs();
      while (pos < src.length && (src[pos] === '+' || src[pos] === '-')) {
        const op = src[pos++];
        const right = parseTerm();
        val = op === '+' ? val + right : val - right;
        skipWs();
      }
      return val;
    };

    const parseTerm = (): number => {
      let val = parseFactor();
      skipWs();
      while (pos < src.length && (src[pos] === '*' || src[pos] === '/')) {
        const op = src[pos++];
        const right = parseFactor();
        val = op === '*' ? val * right : right === 0 ? 0 : val / right;
        skipWs();
      }
      return val;
    };

    const parseFactor = (): number => {
      skipWs();
      if (src[pos] === '+') {
        pos += 1;
        return parseFactor();
      }
      if (src[pos] === '-') {
        pos += 1;
        return -parseFactor();
      }
      if (src[pos] === '(') {
        pos += 1;
        const inner = parseExpression();
        skipWs();
        if (src[pos] === ')') pos += 1;
        return inner;
      }

      // Number literal
      const numMatch = src.slice(pos).match(/^\d+(\.\d+)?/);
      if (numMatch) {
        pos += numMatch[0].length;
        return Number(numMatch[0]);
      }

      // Identifier or Function
      const idMatch = src.slice(pos).match(/^[A-Z_][A-Z0-9_]*/);
      if (idMatch) {
        const name = idMatch[0];
        pos += name.length;
        skipWs();
        if (src[pos] === '(') {
          pos += 1; // consume '('
          const args: number[] = [];
          skipWs();
          if (src[pos] !== ')') {
            args.push(parseExpression());
            skipWs();
            while (src[pos] === ',') {
              pos += 1;
              args.push(parseExpression());
              skipWs();
            }
          }
          if (src[pos] === ')') pos += 1;
          if (name === 'MIN') return args.length ? Math.min(...args) : 0;
          if (name === 'MAX') return args.length ? Math.max(...args) : 0;
          if (name === 'ROUND') {
            const v = args[0] ?? 0;
            const dec = Math.max(0, Math.min(4, Math.round(args[1] ?? 1)));
            const factor = 10 ** dec;
            return Math.round(v * factor) / factor;
          }
          return 0;
        }
        return vars[name] ?? 0;
      }

      throw new Error('Token inválido');
    };

    const result = parseExpression();
    skipWs();
    if (pos < src.length || Number.isNaN(result) || !Number.isFinite(result)) {
      return null;
    }
    return Number(result.toFixed(2));
  } catch {
    return null;
  }
}

export interface StudentAutoMetrics {
  t1Raw: number | null;
  t2Raw: number | null;
  t3Raw: number | null;
  rawSelectedTerm: number | null;
  behaviorAdjustment: number;
  attendanceAdjustment: number;
  effectiveAverage: number | null;
  isPassing: boolean;
  isAtRisk: boolean;
  riskReasons: string[];
  attendance: StudentAttendanceSummary;
  behavior: StudentBehaviorSummary;
  categoryBreakdown: {
    categoryId: string;
    name: string;
    weight: number;
    score10: number | null;
    pct: number;
  }[];
  customValues: Record<string, number | null>;
}

export function computeStudentAutoMetrics(
  studentId: string,
  course: Course,
  assessments: Assessment[],
  courseGrades: Record<string, Record<string, GradeValue>>,
  courseAttendanceDays: Record<string, AttendanceDayDoc> | undefined,
  courseBehaviorLogs: BehaviorLog[] | undefined,
  activeTerm: TermId,
): StudentAutoMetrics {
  const config = resolveCourseMetricsConfig(course);

  const t1Raw = computeSingleTrimesterRawAverage(
    studentId,
    'term1',
    assessments,
    course.categories,
    courseGrades,
    config,
  );
  const t2Raw = computeSingleTrimesterRawAverage(
    studentId,
    'term2',
    assessments,
    course.categories,
    courseGrades,
    config,
  );
  const t3Raw = computeSingleTrimesterRawAverage(
    studentId,
    'term3',
    assessments,
    course.categories,
    courseGrades,
    config,
  );

  let rawSelectedTerm: number | null = null;
  if (activeTerm === 'term1') rawSelectedTerm = t1Raw;
  else if (activeTerm === 'term2') rawSelectedTerm = t2Raw;
  else if (activeTerm === 'term3') rawSelectedTerm = t3Raw;
  else {
    // 'final': automatic mean across evaluated trimesters!
    const validTerms = [t1Raw, t2Raw, t3Raw].filter((v): v is number => v !== null);
    rawSelectedTerm =
      validTerms.length > 0
        ? validTerms.reduce((a, b) => a + b, 0) / validTerms.length
        : null;
  }

  const attendance = computeStudentAttendanceSummary(
    studentId,
    courseAttendanceDays,
    config.attendanceAlertPct,
  );
  const behavior = computeStudentBehaviorSummary(studentId, courseBehaviorLogs);

  const behaviorAdjustment =
    config.behaviorBonusPerPoint > 0 && behavior.netPoints > 0
      ? Math.min(config.maxBehaviorBonus, behavior.netPoints * config.behaviorBonusPerPoint)
      : 0;

  const attendanceAdjustment =
    config.unexcusedPenaltyPerAbsence > 0 && attendance.absent > 0
      ? -(attendance.absent * config.unexcusedPenaltyPerAbsence)
      : 0;

  const effectiveAverage =
    rawSelectedTerm !== null
      ? applyRounding(
          Math.max(0, Math.min(10, rawSelectedTerm + behaviorAdjustment + attendanceAdjustment)),
          config.roundingMode,
        )
      : null;

  // Automatic Category Breakdown (used in Summary & Analytics)
  const studentScores = courseGrades[studentId] ?? {};
  const relevantAssessments =
    activeTerm === 'final'
      ? assessments
      : assessments.filter((a) => a.termId === activeTerm);

  const categoryBreakdown = course.categories.map((cat) => {
    const catAssessments = relevantAssessments.filter((a) => a.categoryId === cat.id);
    let wSum = 0;
    let totalW = 0;
    for (const a of catAssessments) {
      const s = resolveNumericScore(a, studentScores[a.id]);
      if (s === null) continue;
      const w = a.weight > 0 ? a.weight : 1;
      wSum += ((s / (a.maxScore || 10)) * 10) * w;
      totalW += w;
    }
    const score10 = totalW > 0 ? Number((wSum / totalW).toFixed(1)) : null;
    return {
      categoryId: cat.id,
      name: cat.name,
      weight: cat.weight,
      score10,
      pct: score10 !== null ? Math.round(score10 * 10) : 0,
    };
  });

  // Risk detection
  const riskReasons: string[] = [];
  if (effectiveAverage !== null && effectiveAverage < config.passingThreshold) {
    riskReasons.push(`Media (${effectiveAverage}) bajo ${config.passingThreshold}`);
  }
  if (attendance.isAlert) {
    riskReasons.push(`${attendance.absent} faltas (${attendance.unexcusedRatePct}%)`);
  }
  if (behavior.netPoints <= -3) {
    riskReasons.push(`Conducta (${behavior.netPoints})`);
  }

  // Evaluate teacher's Custom Metrics automatically
  const vars: Record<string, number> = {
    MEDIA: effectiveAverage ?? 0,
    T1: t1Raw !== null ? applyRounding(t1Raw, config.roundingMode) : (effectiveAverage ?? 0),
    T2: t2Raw !== null ? applyRounding(t2Raw, config.roundingMode) : (effectiveAverage ?? 0),
    T3: t3Raw !== null ? applyRounding(t3Raw, config.roundingMode) : (effectiveAverage ?? 0),
    ASISTENCIA: attendance.attendanceRatePct,
    ASISTENCIA10: Number((attendance.attendanceRatePct / 10).toFixed(2)),
    PUNTOS: behavior.netPoints,
    FALTAS: attendance.absent,
  };

  const customValues: Record<string, number | null> = {};
  for (const cm of config.customMetrics) {
    customValues[cm.id] =
      effectiveAverage === null && attendance.totalDays === 0
        ? null
        : evaluateCustomFormula(cm.formula, vars);
  }

  return {
    t1Raw: t1Raw !== null ? applyRounding(t1Raw, config.roundingMode) : null,
    t2Raw: t2Raw !== null ? applyRounding(t2Raw, config.roundingMode) : null,
    t3Raw: t3Raw !== null ? applyRounding(t3Raw, config.roundingMode) : null,
    rawSelectedTerm:
      rawSelectedTerm !== null ? applyRounding(rawSelectedTerm, config.roundingMode) : null,
    behaviorAdjustment: Number(behaviorAdjustment.toFixed(2)),
    attendanceAdjustment: Number(attendanceAdjustment.toFixed(2)),
    effectiveAverage,
    isPassing: effectiveAverage !== null ? effectiveAverage >= config.passingThreshold : true,
    isAtRisk: riskReasons.length > 0,
    riskReasons,
    attendance,
    behavior,
    categoryBreakdown,
    customValues,
  };
}

export interface CourseAutoStats {
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  passingCount: number;
  evaluatedCount: number;
  passingPct: number;
  gradedCellsPct: number;
  atRiskCount: number;
  historicalAttendancePct: number;
}

export function computeCourseAutoStats(
  course: Course,
  assessments: Assessment[],
  courseGrades: Record<string, Record<string, GradeValue>>,
  courseAttendanceDays: Record<string, AttendanceDayDoc> | undefined,
  courseBehaviorLogs: BehaviorLog[] | undefined,
  activeTerm: TermId,
): CourseAutoStats {
  const config = resolveCourseMetricsConfig(course);
  const avgs: number[] = [];
  let atRiskCount = 0;
  let attSum = 0;
  let attStudents = 0;

  for (const sid of course.studentIds) {
    const m = computeStudentAutoMetrics(
      sid,
      course,
      assessments,
      courseGrades,
      courseAttendanceDays,
      courseBehaviorLogs,
      activeTerm,
    );
    if (m.effectiveAverage !== null) avgs.push(m.effectiveAverage);
    if (m.isAtRisk) atRiskCount += 1;
    if (m.attendance.totalDays > 0) {
      attSum += m.attendance.attendanceRatePct;
      attStudents += 1;
    }
  }

  const relevantAssessments =
    activeTerm === 'final'
      ? assessments
      : assessments.filter((a) => a.termId === activeTerm);

  const totalCells = course.studentIds.length * relevantAssessments.length;
  let filledCells = 0;
  for (const sid of course.studentIds) {
    for (const a of relevantAssessments) {
      if (resolveNumericScore(a, courseGrades[sid]?.[a.id]) !== null) {
        filledCells += 1;
      }
    }
  }

  const gradedCellsPct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  if (avgs.length === 0) {
    return {
      mean: null,
      median: null,
      stdDev: null,
      min: null,
      max: null,
      passingCount: 0,
      evaluatedCount: 0,
      passingPct: 0,
      gradedCellsPct,
      atRiskCount,
      historicalAttendancePct:
        attStudents > 0 ? Number((attSum / attStudents).toFixed(1)) : 100,
    };
  }

  const meanRaw = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  const variance = avgs.reduce((acc, v) => acc + (v - meanRaw) ** 2, 0) / avgs.length;
  const stdDev = Number(Math.sqrt(variance).toFixed(2));
  const passingCount = avgs.filter((v) => v >= config.passingThreshold).length;

  return {
    mean: applyRounding(meanRaw, config.roundingMode),
    median: computeMedian(avgs),
    stdDev,
    min: Number(Math.min(...avgs).toFixed(1)),
    max: Number(Math.max(...avgs).toFixed(1)),
    passingCount,
    evaluatedCount: avgs.length,
    passingPct: Math.round((passingCount / avgs.length) * 100),
    gradedCellsPct,
    atRiskCount,
    historicalAttendancePct:
      attStudents > 0 ? Number((attSum / attStudents).toFixed(1)) : 100,
  };
}

/**
 * Computes global cross-course summary for a single student (GPA/Media Global + per-course cards)
 * and live chronological evolution across assessments in the active course.
 */
export function computeStudentCrossCourseSummary(
  studentId: string,
  dataset: AuloraDataset,
  activeCourse: Course | null,
  activeTerm: TermId,
) {
  const enrolledCourses = dataset.courses.filter((c) => c.studentIds.includes(studentId));
  const perCourse = enrolledCourses.map((c) => {
    const m = computeStudentAutoMetrics(
      studentId,
      c,
      dataset.assessments[c.id] ?? [],
      dataset.grades[c.id] ?? {},
      dataset.attendance[c.id],
      dataset.behaviorLogs[c.id],
      activeTerm,
    );
    return {
      courseId: c.id,
      courseTitle: c.shortName || c.title,
      average: m.effectiveAverage,
      attendancePct: m.attendance.attendanceRatePct,
      isPassing: m.isPassing,
    };
  });

  const validAvgs = perCourse
    .map((p) => p.average)
    .filter((v): v is number => v !== null);
  const globalAverage =
    validAvgs.length > 0
      ? Number((validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length).toFixed(2))
      : null;

  // Live chronological assessment evolution in activeCourse
  const evolution: { label: string; studentScore: number; classMean: number }[] = [];
  if (activeCourse) {
    const cAssessments = [...(dataset.assessments[activeCourse.id] ?? [])].sort(
      (a, b) => a.dueDate.localeCompare(b.dueDate) || a.order - b.order,
    );
    const cGrades = dataset.grades[activeCourse.id] ?? {};
    for (const ass of cAssessments) {
      const stuRaw = resolveNumericScore(ass, cGrades[studentId]?.[ass.id]);
      if (stuRaw === null) continue;
      const stu10 = Number(((stuRaw / (ass.maxScore || 10)) * 10).toFixed(1));

      const classVals: number[] = [];
      for (const sid of activeCourse.studentIds) {
        const r = resolveNumericScore(ass, cGrades[sid]?.[ass.id]);
        if (r !== null) classVals.push((r / (ass.maxScore || 10)) * 10);
      }
      const cMean =
        classVals.length > 0
          ? Number((classVals.reduce((a, b) => a + b, 0) / classVals.length).toFixed(1))
          : stu10;

      evolution.push({
        label: ass.title.slice(0, 10),
        studentScore: stu10,
        classMean: cMean,
      });
    }
  }

  return { globalAverage, perCourse, evolution };
}
