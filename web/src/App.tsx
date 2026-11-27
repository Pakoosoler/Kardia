import React from 'react';
import { AuloraProvider, useAulora } from './context/AuloraContext';
import { Layout } from './components/Layout';
import { LoginGateView } from './components/LoginGateView';
import { CommandCenterView } from './views/CommandCenterView';
import { GradebookView } from './views/GradebookView';
import { AttendanceBehaviorView } from './views/AttendanceBehaviorView';
import { WeeklyPlannerView } from './views/WeeklyPlannerView';
import { StudentAnalyticsView } from './views/StudentAnalyticsView';

const AuloraRouter: React.FC = () => {
  const { authLoading, firebaseUser, activeTab } = useAulora();

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
          <span className="text-xs font-semibold text-on-surface-variant">
            Verificando sesión...
          </span>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <LoginGateView />;
  }

  switch (activeTab) {
    case 'command':
      return <CommandCenterView />;
    case 'gradebook':
      return <GradebookView />;
    case 'attendance':
      return <AttendanceBehaviorView />;
    case 'planner':
      return <WeeklyPlannerView />;
    case 'analytics':
      return <StudentAnalyticsView />;
    default:
      return <CommandCenterView />;
  }
};

export const App: React.FC = () => {
  return (
    <AuloraProvider>
      <Layout>
        <AuloraRouter />
      </Layout>
    </AuloraProvider>
  );
};

export default App;
