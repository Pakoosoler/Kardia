export type VisibilityScope = 'private' | 'shared';

export type NavTab = 'command' | 'gradebook' | 'attendance' | 'planner' | 'analytics';

export type TermId = 'term1' | 'term2' | 'term3' | 'final';

export type RubricLevel = 'L1' | 'L2' | 'L3' | 'L4';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export type AverageCalculationMode = 'category_weighted' | 'assessment_weighted' | 'simple_mean';

export type RoundingMode = 'one_decimal' | 'two_decimals' | 'integer_nearest';

export interface CustomMetricDefinition {
  id: string;
  name: string;
  description?: string;
  /**
   * Formula expression using safe built-in variables:
   * MEDIA (0-10), T1, T2, T3, ASISTENCIA (0-100), ASISTENCIA10 (0-10),
   * PUNTOS (net behavior points), TAREAS (0-100)
   * Functions: MIN(a,b), MAX(a,b), ROUND(x, decimals)
   */
  formula: string;
  unit?: '/10' | '%' | 'pts';
  showInGradebook: boolean;
}

export interface CourseMetricsConfig {
  averageMode: AverageCalculationMode;
  roundingMode: RoundingMode;
  passingThreshold: number; // default 5.0
  attendanceAlertPct: number; // default 15 (% absences/unexcused trigger alert)
  behaviorBonusPerPoint: number; // e.g. 0.05 pts per net positive star (0 = disabled)
  maxBehaviorBonus: number; // e.g. 0.5 pts max
  unexcusedPenaltyPerAbsence: number; // e.g. 0.1 pts per unexcused absence (0 = disabled)
  customMetrics: CustomMetricDefinition[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  roleTitle: string;
  department: string;
  schoolIds: string[];
  activeCycle: string;
  defaultMetricsConfig?: CourseMetricsConfig;
}

export interface StudentCompetencies {
  inquiry: number;
  lab: number;
  theory: number;
  rigor: number;
}

export interface Student {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  avatarColor: string;
  gradeLevel: string;
  track: string;
  homeroom: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  ownerId: string;
  visibility: VisibilityScope;
  sharedWith: string[];
  schoolId: string | null;
  competencies: StudentCompetencies;
  termHistory: {
    label: string;
    studentScore: number;
    classMean: number;
  }[];
  upcomingMilestones: {
    id: string;
    title: string;
    dueLabel: string;
    status: 'Borrador listo' | 'Programado' | 'En revisión';
  }[];
}

export interface Category {
  id: string;
  name: string;
  weight: number;
  color: 'indigo' | 'teal' | 'amber' | 'rose';
}

export interface Assessment {
  id: string;
  courseId: string;
  termId: Exclude<TermId, 'final'>;
  categoryId: string;
  title: string;
  subtitle: string;
  weight: number;
  maxScore: number;
  type: 'numeric' | 'rubric';
  dueDate: string;
  order: number;
}

export interface GradeValue {
  numeric?: number | null;
  rubricLevel?: RubricLevel;
  updatedAt: string;
  updatedBy: string;
}

export interface StudentGradesDoc {
  studentId: string;
  scores: Record<string, GradeValue>;
}

export interface AttendanceEntry {
  status: AttendanceStatus;
  note?: string;
  time?: string;
  updatedBy: string;
}

export interface AttendanceDayDoc {
  date: string;
  records: Record<string, AttendanceEntry>;
  committedToSis: boolean;
}

export interface BehaviorLog {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  delta: number;
  badge: string;
  reason: string;
  time: string;
  createdAt: string;
  authorId: string;
}

export interface LessonResource {
  id: string;
  title: string;
  meta: string;
  kind: 'pdf' | 'doc' | 'quiz';
}

export interface LessonPlan {
  id: string;
  courseId: string;
  dayIndex: number; // 0 = Lunes .. 4 = Viernes
  dateLabel: string;
  startTime: string;
  endTime: string;
  periodName: string;
  room: string;
  title: string;
  subtitle: string;
  standards: string[];
  objectives: string[];
  resources: LessonResource[];
  assignment: {
    title: string;
    description: string;
    dueDate: string;
    completedCount: number;
    totalCount: number;
  };
}

export interface Course {
  id: string;
  title: string;
  shortName: string;
  room: string;
  periodLabel: string;
  scheduleSummary: string;
  academicCycle: string;
  colorAccent: 'indigo' | 'teal' | 'amber';
  ownerId: string;
  coTeacherIds: string[];
  viewerIds: string[];
  memberIds: string[];
  visibility: VisibilityScope;
  schoolId: string | null;
  studentIds: string[];
  seatAssignments: Record<string, number>;
  categories: Category[];
  metricsConfig?: CourseMetricsConfig;
}

export interface FacultyObservation {
  id: string;
  studentId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  visibility: VisibilityScope;
  sharedWith: string[];
  schoolId: string | null;
  text: string;
  tags: string[];
  createdAt: string;
}

export interface QuickNote {
  id: string;
  text: string;
  done: boolean;
  courseId?: string;
  createdAt: string;
}

export interface AuloraDataset {
  courses: Course[];
  students: Student[];
  assessments: Record<string, Assessment[]>;
  grades: Record<string, Record<string, Record<string, GradeValue>>>;
  attendance: Record<string, Record<string, AttendanceDayDoc>>;
  behaviorLogs: Record<string, BehaviorLog[]>;
  lessonPlans: Record<string, LessonPlan[]>;
  observations: FacultyObservation[];
  quickNotes: QuickNote[];
}
