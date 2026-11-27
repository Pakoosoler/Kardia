import type {
  Assessment,
  Category,
  GradeValue,
  RubricLevel,
  Student,
  TermId,
} from '../types/aulora';

export const RUBRIC_SCORE_MAP: Record<RubricLevel, number> = {
  L1: 4.5,
  L2: 6.2,
  L3: 8.2,
  L4: 9.6,
};

export const RUBRIC_LABELS: Record<RubricLevel, { short: string; full: string }> = {
  L1: { short: 'L1 · Inicial', full: 'Refuerzo' },
  L2: { short: 'L2 · En desarrollo', full: 'En desarrollo' },
  L3: { short: 'L3 · Competente', full: 'Competente' },
  L4: { short: 'L4 · Ejemplar', full: 'Ejemplar' },
};

export function resolveNumericScore(
  assessment: Assessment,
  grade: GradeValue | undefined,
): number | null {
  if (!grade) return null;
  if (assessment.type === 'rubric') {
    if (grade.rubricLevel) return RUBRIC_SCORE_MAP[grade.rubricLevel];
    return typeof grade.numeric === 'number' ? grade.numeric : null;
  }
  return typeof grade.numeric === 'number' ? grade.numeric : null;
}

export function computeStudentTermAverage(
  studentId: string,
  assessments: Assessment[],
  categories: Category[],
  courseGrades: Record<string, Record<string, GradeValue>>,
  termId: TermId,
): number | null {
  const studentScores = courseGrades[studentId] ?? {};
  const filteredAssessments =
    termId === 'final'
      ? assessments
      : assessments.filter((a) => a.termId === termId);

  if (filteredAssessments.length === 0) return null;

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const bucketTotals = new Map<string, { weightedSum: number; weightSum: number }>();

  for (const assessment of filteredAssessments) {
    const score = resolveNumericScore(assessment, studentScores[assessment.id]);
    if (score === null) continue;
    const normalized = (score / (assessment.maxScore || 10)) * 10;
    const existing = bucketTotals.get(assessment.categoryId) ?? {
      weightedSum: 0,
      weightSum: 0,
    };
    const itemWeight = assessment.weight > 0 ? assessment.weight : 1;
    existing.weightedSum += normalized * itemWeight;
    existing.weightSum += itemWeight;
    bucketTotals.set(assessment.categoryId, existing);
  }

  let totalScore = 0;
  let totalCategoryWeight = 0;

  for (const [categoryId, stats] of bucketTotals.entries()) {
    if (stats.weightSum === 0) continue;
    const categoryMean = stats.weightedSum / stats.weightSum;
    const catWeight = categoryMap.get(categoryId)?.weight ?? 25;
    totalScore += categoryMean * catWeight;
    totalCategoryWeight += catWeight;
  }

  if (totalCategoryWeight === 0) return null;
  return Number((totalScore / totalCategoryWeight).toFixed(1));
}

export function computeAssessmentMean(
  assessment: Assessment,
  studentIds: string[],
  courseGrades: Record<string, Record<string, GradeValue>>,
): number | null {
  const values: number[] = [];
  for (const studentId of studentIds) {
    const score = resolveNumericScore(assessment, courseGrades[studentId]?.[assessment.id]);
    if (score !== null) values.push(score);
  }
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Number((sum / values.length).toFixed(1));
}

export function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
  }
  return Number(sorted[mid].toFixed(1));
}

export function getQualitativeBadge(score: number | null): {
  label: string;
  tone: 'emerald' | 'indigo' | 'amber' | 'rose';
} {
  if (score === null) return { label: 'Sin datos', tone: 'indigo' };
  if (score >= 9.0) return { label: 'Sobresaliente', tone: 'emerald' };
  if (score >= 7.5) return { label: 'Notable', tone: 'indigo' };
  if (score >= 5.5) return { label: 'En progreso', tone: 'amber' };
  return { label: 'En riesgo', tone: 'rose' };
}

export function exportGradebookToCsv(
  courseTitle: string,
  termId: TermId,
  students: Student[],
  assessments: Assessment[],
  categories: Category[],
  courseGrades: Record<string, Record<string, GradeValue>>,
): void {
  const visibleAssessments =
    termId === 'final' ? assessments : assessments.filter((a) => a.termId === termId);

  const headers = [
    'Código',
    'Estudiante',
    ...visibleAssessments.map((a) => `${a.title} (${a.weight}%)`),
    'Media Ponderada',
  ];

  const rows = students.map((student) => {
    const studentScores = courseGrades[student.id] ?? {};
    const avg = computeStudentTermAverage(
      student.id,
      assessments,
      categories,
      courseGrades,
      termId,
    );
    const cells = visibleAssessments.map((a) => {
      const g = studentScores[a.id];
      if (!g) return '';
      if (a.type === 'rubric' && g.rubricLevel) return g.rubricLevel;
      return g.numeric !== null && g.numeric !== undefined ? String(g.numeric) : '';
    });
    return [student.code, student.fullName, ...cells, avg !== null ? String(avg) : ''];
  });

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((v) => `"${v.replaceAll('"', '""')}"`).join(','))
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aulora-${courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${termId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
