import React, { useState } from 'react';
import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Lock,
  LogIn,
  Users,
} from 'lucide-react';
import { useAulora } from '../context/AuloraContext';

export const LoginGateView: React.FC = () => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAulora();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isRegister) {
        await registerWithEmail(name || 'Docente', email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo autenticar con Google');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl w-full items-stretch">
        {/* Value Proposition Bento Card */}
        <div className="bento-card p-8 lg:col-span-7 flex flex-col justify-between gap-6 bg-white">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-soft-accent text-primary text-xs font-bold">
              <GraduationCap className="w-4 h-4" />
              Cuaderno Docente Web + Android
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-on-surface leading-tight">
              Tu gestión de aula en un entorno limpio y colaborativo.
            </h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Inicia sesión para acceder a tus propios grupos, calificaciones ponderadas, plano interactivo de asistencia y observaciones compartidas con tu departamento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-surface-container-low space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <BookOpen className="w-4 h-4" />
                Cuaderno Inteligente
              </div>
              <p className="text-xs text-on-surface-variant">
                Notas numéricas, rúbricas L1–L4, pesos por categoría y exportación CSV.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low space-y-1">
              <div className="flex items-center gap-2 text-secondary font-bold text-xs">
                <ClipboardCheck className="w-4 h-4" />
                Asistencia y Conducta
              </div>
              <p className="text-xs text-on-surface-variant">
                Plano de aula por pupitres, pase de lista rápido e insignias positivas.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Lock className="w-4 h-4" />
                Datos Privados
              </div>
              <p className="text-xs text-on-surface-variant">
                Tus notas rápidas, grupos propios y anotaciones confidenciales solo los ves tú.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low space-y-1">
              <div className="flex items-center gap-2 text-secondary font-bold text-xs">
                <Users className="w-4 h-4" />
                Datos Compartidos
              </div>
              <p className="text-xs text-on-surface-variant">
                Codocencia y observaciones del claustro sincronizadas en Firebase.
              </p>
            </div>
          </div>
        </div>

        {/* Sign-in / Register Form Bento Card */}
        <div className="bento-card p-8 lg:col-span-5 flex flex-col justify-center">
          <div className="inline-flex p-1 bg-surface-container-low rounded-full mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${
                !isRegister ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${
                isRegister ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Nombre y apellidos
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Laura Gómez"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@centro.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>

            {error && (
              <p className="text-xs text-tertiary bg-tertiary-container/50 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full btn-primary-gradient py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 mt-1"
            >
              <LogIn className="w-4 h-4" />
              {isRegister ? 'Crear mi cuenta' : 'Entrar a Aulora'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-outline">o accede con un clic</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full py-2.5 rounded-full border border-border-default text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
          >
            Continuar con Google
          </button>
        </div>
      </div>
    </div>
  );
};
