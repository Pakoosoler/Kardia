import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { createSeedDataset, getTodayKey } from '../data/seedData';
import { DEFAULT_METRICS_CONFIG } from '../lib/metricsEngine';
import type {
  Assessment,
  AttendanceStatus,
  BehaviorLog,
  Category,
  Course,
  CourseMetricsConfig,
  FacultyObservation,
  GradeValue,
  AuloraDataset,
  LessonPlan,
  LessonResource,
  NavTab,
  QuickNote,
  RubricLevel,
  Student,
  TermId,
  UserProfile,
  VisibilityScope,
} from '../types/aulora';

const EMPTY_DATASET: AuloraDataset = {
  courses: [],
  students: [],
  assessments: {},
  grades: {},
  attendance: {},
  behaviorLogs: {},
  lessonPlans: {},
  observations: [],
  quickNotes: [],
};

const AVATAR_PALETTE = [
  '#5B46F6',
  '#006A62',
  '#2563EB',
  '#7C3AED',
  '#0D9488',
  '#B45309',
];

function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

interface AuloraContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  syncStatus: string;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeCourseId: string;
  setActiveCourseId: (id: string) => void;
  activeTerm: TermId;
  setActiveTerm: (term: TermId) => void;
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  dataset: AuloraDataset;
  activeCourse: Course | null;
  activeCourseStudents: Student[];
  activeCourseAssessments: Assessment[];
  activeCourseGrades: Record<string, Record<string, GradeValue>>;
  activeCourseAttendance: Record<
    string,
    { status: AttendanceStatus; note?: string; time?: string; updatedBy: string }
  >;
  activeCourseBehaviorLogs: BehaviorLog[];
  activeCourseLessons: LessonPlan[];

  // Auth actions
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  seedFirebaseAccount: () => Promise<void>;

  // Domain mutations
  updateGrade: (
    courseId: string,
    studentId: string,
    assessmentId: string,
    value: { numeric?: number | null; rubricLevel?: RubricLevel },
  ) => Promise<void>;
  addAssessment: (
    courseId: string,
    input: Omit<Assessment, 'id' | 'courseId' | 'order'>,
  ) => Promise<void>;
  updateCategories: (courseId: string, categories: Category[]) => Promise<void>;
  updateCourseMetricsConfig: (
    courseId: string,
    metricsConfig: CourseMetricsConfig,
    saveAsTeacherDefault?: boolean,
  ) => Promise<void>;
  setAttendanceStatus: (
    courseId: string,
    studentId: string,
    status: AttendanceStatus,
    dateKey?: string,
  ) => Promise<void>;
  markAllPresent: (courseId: string, dateKey?: string) => Promise<void>;
  commitAttendanceToSis: (courseId: string, dateKey?: string) => Promise<void>;
  addBehaviorLog: (
    courseId: string,
    studentId: string,
    delta: number,
    badge: string,
    reason: string,
  ) => Promise<void>;
  addCourse: (input: {
    title: string;
    shortName: string;
    room: string;
    periodLabel: string;
    visibility: VisibilityScope;
  }) => Promise<void>;
  addStudent: (input: {
    firstName: string;
    lastName: string;
    code?: string;
    gradeLevel?: string;
    guardianName?: string;
    guardianPhone?: string;
    guardianEmail?: string;
    visibility: VisibilityScope;
    courseId?: string;
  }) => Promise<void>;
  addLessonPlan: (courseId: string, plan: Omit<LessonPlan, 'id' | 'courseId'>) => Promise<void>;
  addLessonResource: (
    courseId: string,
    lessonId: string,
    resource: Omit<LessonResource, 'id'>,
  ) => Promise<void>;
  updateLessonCompletion: (
    courseId: string,
    lessonId: string,
    completedCount: number,
  ) => Promise<void>;
  addObservation: (input: {
    studentId: string;
    text: string;
    tags: string[];
    visibility: VisibilityScope;
  }) => Promise<void>;
  addQuickNote: (text: string, courseId?: string) => Promise<void>;
  toggleQuickNote: (noteId: string) => Promise<void>;
  deleteQuickNote: (noteId: string) => Promise<void>;
}

const AuloraContext = createContext<AuloraContextValue | null>(null);

export const AuloraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [dataset, setDataset] = useState<AuloraDataset>(EMPTY_DATASET);
  const [activeTab, setActiveTab] = useState<NavTab>('command');
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [activeTerm, setActiveTerm] = useState<TermId>('term2');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<string>('Sin sesión iniciada');
  const [defaultMetricsConfig, setDefaultMetricsConfig] = useState<CourseMetricsConfig>(
    DEFAULT_METRICS_CONFIG,
  );

  // Listen to Firebase Auth state (100% Cloud-synced)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (user) {
        setDataset(EMPTY_DATASET);
        setSyncStatus('Sincronizado en tiempo real con Firebase Cloud');
        await setDoc(
          doc(db, 'userDirectory', user.uid),
          {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Docente',
            email: user.email || 'docente@aulora.edu',
            role: 'teacher',
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        ).catch(() => undefined);
      } else {
        setDataset(EMPTY_DATASET);
        setActiveCourseId('');
        setSelectedStudentId('');
        setSyncStatus('Sin sesión iniciada');
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listeners when authenticated
  useEffect(() => {
    if (!db || !firebaseUser) return;
    const uid = firebaseUser.uid;
    const firestore = db;

    let ownedStudentsList: Student[] = [];
    let sharedStudentsList: Student[] = [];
    const mergeStudents = () => {
      const map = new Map<string, Student>();
      for (const s of [...ownedStudentsList, ...sharedStudentsList]) {
        map.set(s.id, s);
      }
      const list = Array.from(map.values());
      setDataset((prev) => ({ ...prev, students: list }));
      setSelectedStudentId((curr) =>
        list.some((s) => s.id === curr) ? curr : (list[0]?.id ?? ''),
      );
    };

    let ownedObsList: FacultyObservation[] = [];
    let sharedObsList: FacultyObservation[] = [];
    const mergeObs = () => {
      const map = new Map<string, FacultyObservation>();
      for (const o of [...ownedObsList, ...sharedObsList]) {
        map.set(o.id, o);
      }
      const list = Array.from(map.values()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      setDataset((prev) => ({ ...prev, observations: list }));
    };

    const unsubUserDoc = onSnapshot(doc(firestore, 'users', uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { metricsConfig?: CourseMetricsConfig };
        if (data.metricsConfig) {
          setDefaultMetricsConfig(data.metricsConfig);
        }
      }
    });

    const unsubCourses = onSnapshot(
      query(collection(firestore, 'courses'), where('memberIds', 'array-contains', uid)),
      (snap) => {
        const courses = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Course, 'id'>) }));
        setDataset((prev) => ({ ...prev, courses }));
        setActiveCourseId((current) =>
          courses.some((c) => c.id === current) ? current : (courses[0]?.id ?? ''),
        );
      },
    );

    const hydrateStudent = (id: string, data: Partial<Student>): Student => ({
      id,
      code: data.code ?? '#STU-001',
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      fullName: data.fullName ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      initials:
        data.initials ??
        `${(data.firstName?.[0] ?? 'A').toUpperCase()}${(data.lastName?.[0] ?? '').toUpperCase()}`,
      avatarColor: pickAvatarColor(id),
      gradeLevel: data.gradeLevel ?? 'Secundaria / Bachillerato',
      track: data.track ?? 'General',
      homeroom: data.homeroom ?? 'Grupo A',
      guardianName: data.guardianName ?? 'Sin especificar',
      guardianPhone: data.guardianPhone ?? '',
      guardianEmail: data.guardianEmail ?? '',
      ownerId: data.ownerId ?? uid,
      visibility: data.visibility ?? 'private',
      sharedWith: data.sharedWith ?? [],
      schoolId: data.schoolId ?? null,
      competencies: data.competencies ?? { inquiry: 80, lab: 80, theory: 80, rigor: 80 },
      termHistory: data.termHistory ?? [],
      upcomingMilestones: data.upcomingMilestones ?? [],
    });

    const unsubStudentsOwned = onSnapshot(
      query(collection(firestore, 'students'), where('ownerId', '==', uid)),
      (snap) => {
        ownedStudentsList = snap.docs.map((d) => hydrateStudent(d.id, d.data() as Partial<Student>));
        mergeStudents();
      },
    );

    const unsubStudentsShared = onSnapshot(
      query(collection(firestore, 'students'), where('sharedWith', 'array-contains', uid)),
      (snap) => {
        sharedStudentsList = snap.docs.map((d) =>
          hydrateStudent(d.id, d.data() as Partial<Student>),
        );
        mergeStudents();
      },
    );

    const unsubNotes = onSnapshot(collection(firestore, 'users', uid, 'notes'), (snap) => {
      const quickNotes = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<QuickNote, 'id'>),
      }));
      setDataset((prev) => ({ ...prev, quickNotes }));
    });

    const unsubObsOwned = onSnapshot(
      query(collection(firestore, 'studentObservations'), where('authorId', '==', uid)),
      (snap) => {
        ownedObsList = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FacultyObservation, 'id'>),
        }));
        mergeObs();
      },
    );

    const unsubObsShared = onSnapshot(
      query(collection(firestore, 'studentObservations'), where('sharedWith', 'array-contains', uid)),
      (snap) => {
        sharedObsList = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FacultyObservation, 'id'>),
        }));
        mergeObs();
      },
    );

    return () => {
      unsubUserDoc();
      unsubCourses();
      unsubStudentsOwned();
      unsubStudentsShared();
      unsubNotes();
      unsubObsOwned();
      unsubObsShared();
    };
  }, [firebaseUser]);

  // Listen to active course subcollections
  useEffect(() => {
    if (!db || !firebaseUser || !activeCourseId) return;
    const firestore = db;

    const unsubAssessments = onSnapshot(
      collection(firestore, 'courses', activeCourseId, 'assessments'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({
            id: d.id,
            courseId: activeCourseId,
            ...(d.data() as Omit<Assessment, 'id' | 'courseId'>),
          }))
          .sort((a, b) => a.order - b.order);
        setDataset((prev) => ({
          ...prev,
          assessments: { ...prev.assessments, [activeCourseId]: list },
        }));
      },
    );

    const unsubGrades = onSnapshot(
      collection(firestore, 'courses', activeCourseId, 'grades'),
      (snap) => {
        const courseGrades: Record<string, Record<string, GradeValue>> = {};
        for (const d of snap.docs) {
          const data = d.data() as { scores?: Record<string, GradeValue> };
          courseGrades[d.id] = data.scores ?? {};
        }
        setDataset((prev) => ({
          ...prev,
          grades: { ...prev.grades, [activeCourseId]: courseGrades },
        }));
      },
    );

    const unsubAttendance = onSnapshot(
      collection(firestore, 'courses', activeCourseId, 'attendance'),
      (snap) => {
        const days: Record<
          string,
          {
            date: string;
            records: Record<
              string,
              { status: AttendanceStatus; note?: string; time?: string; updatedBy: string }
            >;
            committedToSis: boolean;
          }
        > = {};
        for (const d of snap.docs) {
          days[d.id] = d.data() as (typeof days)[string];
        }
        setDataset((prev) => ({
          ...prev,
          attendance: { ...prev.attendance, [activeCourseId]: days },
        }));
      },
    );

    const unsubBehavior = onSnapshot(
      collection(firestore, 'courses', activeCourseId, 'behaviorLogs'),
      (snap) => {
        const logs = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<BehaviorLog, 'id'>),
          }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setDataset((prev) => ({
          ...prev,
          behaviorLogs: { ...prev.behaviorLogs, [activeCourseId]: logs },
        }));
      },
    );

    const unsubLessons = onSnapshot(
      collection(firestore, 'courses', activeCourseId, 'lessonPlans'),
      (snap) => {
        const lessons = snap.docs.map((d) => ({
          id: d.id,
          courseId: activeCourseId,
          ...(d.data() as Omit<LessonPlan, 'id' | 'courseId'>),
        }));
        setDataset((prev) => ({
          ...prev,
          lessonPlans: { ...prev.lessonPlans, [activeCourseId]: lessons },
        }));
      },
    );

    return () => {
      unsubAssessments();
      unsubGrades();
      unsubAttendance();
      unsubBehavior();
      unsubLessons();
    };
  }, [firebaseUser, activeCourseId]);

  const profile: UserProfile | null = useMemo(() => {
    if (!firebaseUser) return null;
    const fallbackName = firebaseUser.email?.split('@')[0] || 'Docente';
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      displayName: firebaseUser.displayName || fallbackName,
      roleTitle: 'Docente',
      department: 'Espacio Aulora',
      schoolIds: [],
      activeCycle: 'Curso 2025/26',
      defaultMetricsConfig,
    };
  }, [firebaseUser, defaultMetricsConfig]);

  const activeCourse: Course | null = useMemo(() => {
    if (dataset.courses.length === 0) return null;
    return dataset.courses.find((c) => c.id === activeCourseId) ?? dataset.courses[0];
  }, [dataset.courses, activeCourseId]);

  const activeCourseStudents = useMemo(() => {
    if (!activeCourse) return [];
    const map = new Map(dataset.students.map((s) => [s.id, s]));
    return activeCourse.studentIds
      .map((id) => map.get(id))
      .filter((s): s is Student => Boolean(s));
  }, [activeCourse, dataset.students]);

  const activeCourseAssessments = useMemo(() => {
    if (!activeCourse) return [];
    return dataset.assessments[activeCourse.id] ?? [];
  }, [activeCourse, dataset.assessments]);

  const activeCourseGrades = useMemo(() => {
    if (!activeCourse) return {};
    return dataset.grades[activeCourse.id] ?? {};
  }, [activeCourse, dataset.grades]);

  const activeCourseAttendance = useMemo(() => {
    if (!activeCourse) return {};
    const today = getTodayKey();
    const courseAtt = dataset.attendance[activeCourse.id];
    if (!courseAtt) return {};
    return courseAtt[today]?.records ?? {};
  }, [activeCourse, dataset.attendance]);

  const activeCourseBehaviorLogs = useMemo(() => {
    if (!activeCourse) return [];
    return dataset.behaviorLogs[activeCourse.id] ?? [];
  }, [activeCourse, dataset.behaviorLogs]);

  const activeCourseLessons = useMemo(() => {
    if (!activeCourse) return [];
    return dataset.lessonPlans[activeCourse.id] ?? [];
  }, [activeCourse, dataset.lessonPlans]);

  // Auth helpers
  const loginWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase no disponible');
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      if (!auth) throw new Error('Firebase no disponible');
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      if (db) {
        const now = new Date().toISOString();
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email,
          displayName: name,
          roleTitle: 'Docente',
          role: 'teacher',
          schoolIds: [],
          createdAt: now,
          updatedAt: now,
        });
      }
    },
    [],
  );

  const loginWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase no disponible');
    await signInWithPopup(auth, googleProvider);
  }, []);

  const logout = useCallback(async () => {
    if (auth) await signOut(auth);
  }, []);

  const seedFirebaseAccount = useCallback(async () => {
    if (!db || !firebaseUser) return;
    const uid = firebaseUser.uid;
    const authorDisplay =
      firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Docente';
    const now = new Date().toISOString();
    const seed = createSeedDataset(uid);
    const batch = writeBatch(db);

    for (const student of seed.students) {
      batch.set(doc(db, 'students', student.id), {
        id: student.id,
        code: student.code,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: student.fullName,
        initials: student.initials,
        gradeLevel: student.gradeLevel,
        track: student.track,
        homeroom: student.homeroom,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        guardianEmail: student.guardianEmail,
        ownerId: uid,
        visibility: student.visibility,
        sharedWith: [],
        schoolId: null,
        competencies: student.competencies,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const course of seed.courses) {
      batch.set(doc(db, 'courses', course.id), {
        id: course.id,
        title: course.title,
        shortName: course.shortName,
        room: course.room,
        periodLabel: course.periodLabel,
        scheduleSummary: course.scheduleSummary,
        academicCycle: 'Curso 2025/26',
        colorAccent: course.colorAccent,
        ownerId: uid,
        coTeacherIds: [],
        viewerIds: [],
        memberIds: [uid],
        visibility: course.visibility,
        schoolId: null,
        studentIds: course.studentIds,
        seatAssignments: course.seatAssignments,
        categories: course.categories,
        createdAt: now,
        updatedAt: now,
      });
      for (const ass of seed.assessments[course.id] ?? []) {
        const { courseId: _omitCourseId, ...assPayload } = ass;
        void _omitCourseId;
        batch.set(doc(db, 'courses', course.id, 'assessments', ass.id), {
          ...assPayload,
          createdBy: uid,
          createdAt: now,
          updatedAt: now,
        });
      }
      const gradeMap = seed.grades[course.id] ?? {};
      for (const [stuId, scores] of Object.entries(gradeMap)) {
        batch.set(doc(db, 'courses', course.id, 'grades', stuId), {
          studentId: stuId,
          scores,
          updatedAt: now,
        });
      }
      const attMap = seed.attendance[course.id] ?? {};
      for (const [dateKey, dayDoc] of Object.entries(attMap)) {
        batch.set(doc(db, 'courses', course.id, 'attendance', dateKey), {
          ...dayDoc,
          updatedAt: now,
          updatedBy: uid,
        });
      }
      for (const log of seed.behaviorLogs[course.id] ?? []) {
        batch.set(doc(db, 'courses', course.id, 'behaviorLogs', log.id), {
          ...log,
          authorId: uid,
        });
      }
      for (const lp of seed.lessonPlans[course.id] ?? []) {
        const { courseId: _omitLpCourse, ...lpPayload } = lp;
        void _omitLpCourse;
        batch.set(doc(db, 'courses', course.id, 'lessonPlans', lp.id), {
          ...lpPayload,
          assignment: {
            ...lp.assignment,
            dueDate: null,
          },
          createdBy: uid,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    for (const obs of seed.observations) {
      batch.set(doc(db, 'studentObservations', obs.id), {
        id: obs.id,
        studentId: obs.studentId,
        authorId: uid,
        authorName: authorDisplay,
        authorRole: 'Docente',
        visibility: obs.visibility,
        sharedWith: [],
        schoolId: null,
        text: obs.text,
        tags: obs.tags,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const note of seed.quickNotes) {
      batch.set(doc(db, 'users', uid, 'notes', note.id), note);
    }

    await batch.commit();
    setSyncStatus('Datos de ejemplo cargados en Firebase');
  }, [firebaseUser]);

  // Domain mutations
  const updateGrade = useCallback(
    async (
      courseId: string,
      studentId: string,
      assessmentId: string,
      value: { numeric?: number | null; rubricLevel?: RubricLevel },
    ) => {
      if (!profile || !db) return;
      const now = new Date().toISOString();
      const updatedValue: GradeValue = {
        ...value,
        updatedAt: now,
        updatedBy: profile.uid,
      };
      await setDoc(
        doc(db, 'courses', courseId, 'grades', studentId),
        {
          studentId,
          scores: { [assessmentId]: updatedValue },
          updatedAt: now,
        },
        { merge: true },
      );
    },
    [profile],
  );

  const addAssessment = useCallback(
    async (courseId: string, input: Omit<Assessment, 'id' | 'courseId' | 'order'>) => {
      if (!profile || !db) return;
      const currentList = dataset.assessments[courseId] ?? [];
      const id = `ass-${Date.now()}`;
      const now = new Date().toISOString();
      await setDoc(doc(db, 'courses', courseId, 'assessments', id), {
        ...input,
        id,
        order: currentList.length + 1,
        createdBy: profile.uid,
        createdAt: now,
        updatedAt: now,
      });
    },
    [dataset.assessments, profile],
  );

  const updateCategories = useCallback(async (courseId: string, categories: Category[]) => {
    if (!db) return;
    await updateDoc(doc(db, 'courses', courseId), {
      categories,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const updateCourseMetricsConfig = useCallback(
    async (
      courseId: string,
      metricsConfig: CourseMetricsConfig,
      saveAsTeacherDefault: boolean = false,
    ) => {
      if (!db || !firebaseUser) return;
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'courses', courseId), {
        metricsConfig,
        updatedAt: now,
      });
      if (saveAsTeacherDefault) {
        setDefaultMetricsConfig(metricsConfig);
        const userRef = doc(db, 'users', firebaseUser.uid);
        await updateDoc(userRef, {
          metricsConfig,
          updatedAt: now,
        }).catch(() =>
          setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'docente@aulora.edu',
            displayName:
              firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Docente',
            role: 'teacher',
            metricsConfig,
            createdAt: now,
            updatedAt: now,
          }),
        );
      }
    },
    [firebaseUser],
  );

  const setAttendanceStatus = useCallback(
    async (
      courseId: string,
      studentId: string,
      status: AttendanceStatus,
      dateKey: string = getTodayKey(),
    ) => {
      if (!profile || !db) return;
      const timeStr =
        status === 'late'
          ? new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          : undefined;
      const entry = {
        status,
        ...(timeStr ? { time: timeStr } : {}),
        updatedBy: profile.uid,
      };
      const existingDay = dataset.attendance[courseId]?.[dateKey];
      await setDoc(
        doc(db, 'courses', courseId, 'attendance', dateKey),
        {
          date: dateKey,
          committedToSis: existingDay?.committedToSis ?? false,
          records: { [studentId]: entry },
          updatedAt: new Date().toISOString(),
          updatedBy: profile.uid,
        },
        { merge: true },
      );
    },
    [dataset.attendance, profile],
  );

  const markAllPresent = useCallback(
    async (courseId: string, dateKey: string = getTodayKey()) => {
      if (!profile || !db) return;
      const course = dataset.courses.find((c) => c.id === courseId);
      if (!course) return;
      const records: Record<string, { status: AttendanceStatus; updatedBy: string }> = {};
      for (const sid of course.studentIds) {
        records[sid] = { status: 'present', updatedBy: profile.uid };
      }
      await setDoc(
        doc(db, 'courses', courseId, 'attendance', dateKey),
        {
          date: dateKey,
          committedToSis: false,
          records,
          updatedAt: new Date().toISOString(),
          updatedBy: profile.uid,
        },
        { merge: true },
      );
    },
    [dataset.courses, profile],
  );

  const commitAttendanceToSis = useCallback(
    async (courseId: string, dateKey: string = getTodayKey()) => {
      if (!profile || !db) return;
      const existingDay = dataset.attendance[courseId]?.[dateKey];
      await setDoc(
        doc(db, 'courses', courseId, 'attendance', dateKey),
        {
          date: dateKey,
          records: existingDay?.records ?? {},
          committedToSis: true,
          updatedAt: new Date().toISOString(),
          updatedBy: profile.uid,
        },
        { merge: true },
      );
    },
    [dataset.attendance, profile],
  );

  const addBehaviorLog = useCallback(
    async (
      courseId: string,
      studentId: string,
      delta: number,
      badge: string,
      reason: string,
    ) => {
      if (!profile || !db) return;
      const student = dataset.students.find((s) => s.id === studentId);
      const id = `beh-${Date.now()}`;
      const log: BehaviorLog = {
        id,
        courseId,
        studentId,
        studentName: student?.fullName ?? 'Estudiante',
        delta,
        badge,
        reason,
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        authorId: profile.uid,
      };
      await setDoc(doc(db, 'courses', courseId, 'behaviorLogs', id), log);
    },
    [dataset.students, profile],
  );

  const addCourse = useCallback(
    async (input: {
      title: string;
      shortName: string;
      room: string;
      periodLabel: string;
      visibility: VisibilityScope;
    }) => {
      if (!profile || !db) return;
      const id = `course-${Date.now()}`;
      const now = new Date().toISOString();
      const newCourse = {
        id,
        title: input.title,
        shortName: input.shortName,
        room: input.room,
        periodLabel: input.periodLabel,
        scheduleSummary: input.periodLabel,
        academicCycle: profile.activeCycle,
        colorAccent: input.visibility === 'shared' ? 'indigo' : 'teal',
        ownerId: profile.uid,
        coTeacherIds: [],
        viewerIds: [],
        memberIds: [profile.uid],
        visibility: input.visibility,
        schoolId: null,
        studentIds: [],
        seatAssignments: {},
        categories: [
          { id: 'cat-exams', name: 'Exámenes', weight: 50, color: 'indigo' },
          { id: 'cat-labs', name: 'Actividades', weight: 30, color: 'teal' },
          { id: 'cat-partic', name: 'Participación', weight: 20, color: 'amber' },
        ],
        metricsConfig: profile.defaultMetricsConfig ?? DEFAULT_METRICS_CONFIG,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'courses', id), newCourse);
      setActiveCourseId(id);
    },
    [profile],
  );

  const addStudent = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      code?: string;
      gradeLevel?: string;
      guardianName?: string;
      guardianPhone?: string;
      guardianEmail?: string;
      visibility: VisibilityScope;
      courseId?: string;
    }) => {
      if (!profile || !db) return;
      const id = `stu-${Date.now()}`;
      const now = new Date().toISOString();
      const first = input.firstName.trim();
      const last = input.lastName.trim();
      const initials = `${(first[0] ?? 'A').toUpperCase()}${(last[0] ?? '').toUpperCase()}`;
      const code = input.code?.trim() || `#ALU-${String(Date.now()).slice(-4)}`;

      await setDoc(doc(db, 'students', id), {
        id,
        code,
        firstName: first,
        lastName: last,
        fullName: `${first} ${last}`.trim(),
        initials,
        gradeLevel: input.gradeLevel?.trim() || '1º ESO / Bachillerato',
        track: 'General',
        homeroom: 'Grupo A',
        guardianName: input.guardianName?.trim() || null,
        guardianPhone: input.guardianPhone?.trim() || null,
        guardianEmail: input.guardianEmail?.trim() || '',
        ownerId: profile.uid,
        visibility: input.visibility,
        sharedWith: [],
        schoolId: null,
        competencies: { inquiry: 80, lab: 80, theory: 80, rigor: 80 },
        createdAt: now,
        updatedAt: now,
      });

      const targetCourseId = input.courseId ?? activeCourse?.id;
      if (targetCourseId) {
        const targetCourse = dataset.courses.find((c) => c.id === targetCourseId);
        if (targetCourse && !targetCourse.studentIds.includes(id)) {
          const nextIds = [...targetCourse.studentIds, id];
          const nextSeats = {
            ...targetCourse.seatAssignments,
            [id]: nextIds.length,
          };
          await updateDoc(doc(db, 'courses', targetCourseId), {
            studentIds: nextIds,
            seatAssignments: nextSeats,
            updatedAt: now,
          });
        }
      }
      setSelectedStudentId(id);
    },
    [activeCourse?.id, dataset.courses, profile],
  );

  const addLessonPlan = useCallback(
    async (courseId: string, plan: Omit<LessonPlan, 'id' | 'courseId'>) => {
      if (!profile || !db) return;
      const id = `lp-${Date.now()}`;
      const now = new Date().toISOString();
      await setDoc(doc(db, 'courses', courseId, 'lessonPlans', id), {
        ...plan,
        id,
        assignment: { ...plan.assignment, dueDate: null },
        createdBy: profile.uid,
        createdAt: now,
        updatedAt: now,
      });
    },
    [profile],
  );

  const addLessonResource = useCallback(
    async (courseId: string, lessonId: string, resource: Omit<LessonResource, 'id'>) => {
      if (!db) return;
      const existing = (dataset.lessonPlans[courseId] ?? []).find((l) => l.id === lessonId);
      if (!existing) return;
      const newRes: LessonResource = { ...resource, id: `res-${Date.now()}` };
      await updateDoc(doc(db, 'courses', courseId, 'lessonPlans', lessonId), {
        resources: [...existing.resources, newRes],
        updatedAt: new Date().toISOString(),
      });
    },
    [dataset.lessonPlans],
  );

  const updateLessonCompletion = useCallback(
    async (courseId: string, lessonId: string, completedCount: number) => {
      if (!db) return;
      const existing = (dataset.lessonPlans[courseId] ?? []).find((l) => l.id === lessonId);
      if (!existing) return;
      await updateDoc(doc(db, 'courses', courseId, 'lessonPlans', lessonId), {
        assignment: {
          ...existing.assignment,
          dueDate: null,
          completedCount,
        },
        updatedAt: new Date().toISOString(),
      });
    },
    [dataset.lessonPlans],
  );

  const addObservation = useCallback(
    async (input: {
      studentId: string;
      text: string;
      tags: string[];
      visibility: VisibilityScope;
    }) => {
      if (!profile || !db) return;
      const now = new Date().toISOString();
      const id = `obs-${Date.now()}`;
      await setDoc(doc(db, 'studentObservations', id), {
        id,
        studentId: input.studentId,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorRole: profile.roleTitle,
        visibility: input.visibility,
        sharedWith: [],
        schoolId: null,
        text: input.text,
        tags: input.tags,
        createdAt: now,
        updatedAt: now,
      });
    },
    [profile],
  );

  const addQuickNote = useCallback(
    async (text: string, courseId?: string) => {
      if (!firebaseUser || !db) return;
      const id = `qn-${Date.now()}`;
      await setDoc(doc(db, 'users', firebaseUser.uid, 'notes', id), {
        id,
        text,
        done: false,
        courseId: courseId ?? null,
        createdAt: new Date().toISOString(),
      });
    },
    [firebaseUser],
  );

  const toggleQuickNote = useCallback(
    async (noteId: string) => {
      if (!firebaseUser || !db) return;
      const target = dataset.quickNotes.find((n) => n.id === noteId);
      if (!target) return;
      await updateDoc(doc(db, 'users', firebaseUser.uid, 'notes', noteId), {
        done: !target.done,
        updatedAt: new Date().toISOString(),
      });
    },
    [dataset.quickNotes, firebaseUser],
  );

  const deleteQuickNote = useCallback(
    async (noteId: string) => {
      if (!firebaseUser || !db) return;
      await deleteDoc(doc(db, 'users', firebaseUser.uid, 'notes', noteId));
    },
    [firebaseUser],
  );

  const value: AuloraContextValue = {
    firebaseUser,
    profile,
    authLoading,
    syncStatus,
    activeTab,
    setActiveTab,
    activeCourseId,
    setActiveCourseId,
    activeTerm,
    setActiveTerm,
    selectedStudentId,
    setSelectedStudentId,
    searchQuery,
    setSearchQuery,
    dataset,
    activeCourse,
    activeCourseStudents,
    activeCourseAssessments,
    activeCourseGrades,
    activeCourseAttendance,
    activeCourseBehaviorLogs,
    activeCourseLessons,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
    seedFirebaseAccount,
    updateGrade,
    addAssessment,
    updateCategories,
    updateCourseMetricsConfig,
    setAttendanceStatus,
    markAllPresent,
    commitAttendanceToSis,
    addBehaviorLog,
    addCourse,
    addStudent,
    addLessonPlan,
    addLessonResource,
    updateLessonCompletion,
    addObservation,
    addQuickNote,
    toggleQuickNote,
    deleteQuickNote,
  };

  return <AuloraContext.Provider value={value}>{children}</AuloraContext.Provider>;
};

export function useAulora(): AuloraContextValue {
  const ctx = useContext(AuloraContext);
  if (!ctx) throw new Error('useAulora debe usarse dentro de AuloraProvider');
  return ctx;
}
