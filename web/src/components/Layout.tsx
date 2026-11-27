import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  GraduationCap,
  LayoutGrid,
  LogIn,
  Menu,
  PanelLeftClose,
  Search,
  User,
  X,
} from 'lucide-react';
import { useAulora } from '../context/AuloraContext';
import type { NavTab } from '../types/aulora';
import { AuthModal } from './AuthModal';

const NAV_ITEMS: {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'command', label: 'Dashboard', icon: LayoutGrid },
  { id: 'gradebook', label: 'Notebooks', icon: BookOpen },
  { id: 'attendance', label: 'Statistics', icon: ClipboardCheck },
  { id: 'planner', label: 'Planner', icon: CalendarDays },
  { id: 'analytics', label: 'Summary', icon: BarChart3 },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    firebaseUser,
    profile,
    syncStatus,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    dataset,
    setActiveCourseId,
    setSelectedStudentId,
  } = useAulora();

  // Collapsible / desplegable sidebar across all screen sizes
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const searchResults = useMemo(() => {
    if (!firebaseUser) return { students: [], courses: [] };
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { students: [], courses: [] };
    return {
      students: dataset.students
        .filter(
          (s) =>
            s.fullName.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q),
        )
        .slice(0, 5),
      courses: dataset.courses
        .filter((c) => c.title.toLowerCase().includes(q))
        .slice(0, 4),
    };
  }, [dataset.courses, dataset.students, firebaseUser, searchQuery]);

  const pendingNotesCount = firebaseUser
    ? dataset.quickNotes.filter((n) => !n.done).length
    : 0;

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Backdrop on mobile/tablet when sidebar is open */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-on-surface/30 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Collapsible Sidebar (Desplegable) */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-white border-r border-border-default z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col justify-between h-full py-5">
          <div className="flex flex-col gap-4">
            {/* Brand + Collapse Button */}
            <div className="px-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-container text-white flex items-center justify-center shadow-[0_4px_12px_rgba(91,70,246,0.28)]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-display text-lg font-bold text-on-surface tracking-tight block leading-none">
                    AULORA
                  </span>
                  <span className="text-[11px] font-semibold text-on-surface-variant tracking-wide">
                    Espacio Docente
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                title="Ocultar menú lateral"
                className="w-8 h-8 rounded-xl bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Academic Cycle (only when signed in) */}
            {profile && (
              <div className="px-4">
                <div className="p-3 bg-surface-container-low rounded-2xl flex items-center justify-between border border-border-default/60">
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-on-surface-variant">
                        Ciclo Académico
                      </span>
                      <span className="tabular-nums text-xs font-bold text-on-surface">
                        {profile.activeCycle}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                    ACTIVO
                  </span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="px-4 flex flex-col gap-1 mt-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all text-left ${
                      isActive
                        ? 'bg-primary text-white font-semibold shadow-[0_4px_14px_rgba(91,70,246,0.3)]'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-medium'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer: Cleanly distinguishes signed-in vs unauthenticated */}
          <div className="px-4 flex flex-col gap-2.5">
            {firebaseUser ? (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors text-left flex flex-col gap-2 border border-border-default/50"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-primary" />
                    Nube Firebase
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-secondary">
                    <span className="w-2 h-2 rounded-full bg-secondary-accent animate-pulse" />
                    En línea
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant leading-snug">
                  {syncStatus}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="w-full btn-primary-gradient py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area (shifts smoothly on desktop when sidebar unfolds) */}
      <div
        className={`flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out ${
          sidebarOpen ? 'lg:pl-72' : 'lg:pl-0'
        }`}
      >
        {/* Top Glass Header */}
        <header className="sticky top-0 h-16 glass-bar z-30 px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Desplegable Sidebar Toggle Button (Always visible on Desktop & Mobile) */}
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
              title={sidebarOpen ? 'Ocultar menú' : 'Desplegar menú'}
              className="w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand visible in top bar when sidebar is folded */}
            {!sidebarOpen && (
              <div className="flex items-center gap-2 shrink-0 mr-2">
                <div className="w-8 h-8 rounded-xl bg-primary-container text-white flex items-center justify-center shadow-xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="font-display text-base font-bold text-on-surface tracking-tight hidden sm:inline">
                  AULORA
                </span>
              </div>
            )}

            {/* Global Search (only when logged in) */}
            {firebaseUser && (
              <div className="relative flex-1 max-w-md">
                <div className="flex items-center bg-surface-container-low rounded-xl px-3 py-1.5 gap-2 border border-border-default/60">
                  <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar alumno, código o grupo..."
                    className="bg-transparent border-0 outline-none w-full text-xs sm:text-sm text-on-surface placeholder:text-outline"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-outline hover:text-on-surface"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {(searchResults.students.length > 0 || searchResults.courses.length > 0) && (
                  <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-border-default shadow-xl p-2 z-50">
                    {searchResults.courses.length > 0 && (
                      <div className="mb-1">
                        <p className="px-2 py-1 text-[10px] font-bold uppercase text-outline">
                          Grupos
                        </p>
                        {searchResults.courses.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setActiveCourseId(c.id);
                              setActiveTab('gradebook');
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-soft-accent text-xs font-medium flex items-center justify-between"
                          >
                            <span>{c.title}</span>
                            <span className="text-[10px] text-primary font-semibold">
                              {c.visibility === 'shared' ? 'Compartido' : 'Privado'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.students.length > 0 && (
                      <div>
                        <p className="px-2 py-1 text-[10px] font-bold uppercase text-outline">
                          Estudiantes
                        </p>
                        {searchResults.students.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(s.id);
                              setActiveTab('analytics');
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-soft-accent text-xs font-medium flex items-center justify-between"
                          >
                            <span>{s.fullName}</span>
                            <span className="tabular-nums text-[11px] text-on-surface-variant">
                              {s.code}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Header Controls: Zero user info when not signed in */}
          <div className="flex items-center gap-3">
            {profile ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotifOpen((p) => !p)}
                    className="relative w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    {pendingNotesCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tertiary-accent" />
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-border-default shadow-xl p-3 z-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-on-surface">
                          Notas rápidas ({pendingNotesCount})
                        </span>
                        <button
                          type="button"
                          onClick={() => setNotifOpen(false)}
                          className="text-outline hover:text-on-surface"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-56 overflow-auto">
                        {dataset.quickNotes.length === 0 ? (
                          <p className="text-xs text-on-surface-variant py-2">
                            No tienes recordatorios pendientes.
                          </p>
                        ) : (
                          dataset.quickNotes.slice(0, 4).map((note) => (
                            <div
                              key={note.id}
                              className="p-2 rounded-xl bg-surface-container-low text-xs flex items-start gap-2"
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                                  note.done ? 'text-secondary' : 'text-primary'
                                }`}
                              />
                              <span
                                className={
                                  note.done ? 'line-through text-outline' : 'text-on-surface'
                                }
                              >
                                {note.text}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2.5 pl-1 hover:opacity-90 transition-opacity text-right"
                >
                  <div className="hidden sm:flex flex-col">
                    <span className="text-xs font-bold text-on-surface leading-tight">
                      {profile.displayName}
                    </span>
                    <span className="text-[11px] text-on-surface-variant leading-tight">
                      {profile.email}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_2px_8px_rgba(91,70,246,0.3)]">
                    <User className="w-4 h-4" />
                  </div>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="btn-primary-gradient px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Iniciar sesión
              </button>
            )}
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1480px] w-full mx-auto">
          {children}
        </main>
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};
