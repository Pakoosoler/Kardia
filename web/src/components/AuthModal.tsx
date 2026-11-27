import React, { useState } from 'react';
import { Cloud, Database, LogIn, LogOut, X } from 'lucide-react';
import { useAulora } from '../context/AuloraContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const {
    firebaseUser,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
    seedFirebaseAccount,
  } = useAulora();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

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
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al autenticar');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar con Google');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/35 backdrop-blur-sm p-4">
      <div className="bento-card w-full max-w-md p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-primary-container text-white flex items-center justify-center">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-on-surface">
              {firebaseUser ? 'Tu Cuenta Aulora' : 'Acceder a Aulora'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {firebaseUser ? 'Sesión sincronizada con Firebase' : 'Inicia sesión o regístrate'}
            </p>
          </div>
        </div>

        {firebaseUser ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-container-low p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">
                  {firebaseUser.displayName || 'Docente'}
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  {firebaseUser.email}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container shrink-0">
                Activa
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  setBusy(true);
                  await seedFirebaseAccount();
                  setBusy(false);
                  onClose();
                }}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-soft-accent text-primary font-semibold text-xs hover:bg-primary-fixed transition-colors"
              >
                <Database className="w-4 h-4" />
                Cargar datos de demostración en mi cuenta
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-border-default text-tertiary font-semibold text-xs hover:bg-tertiary-container/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full px-3 py-2 rounded-lg border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
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
                placeholder="docente@centro.edu"
                className="w-full px-3 py-2 rounded-lg border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
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
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>

            {error && (
              <p className="text-xs text-tertiary bg-tertiary-container/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full btn-primary-gradient py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {isRegister ? 'Crear cuenta docente' : 'Iniciar sesión'}
            </button>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full py-2.5 rounded-full border border-border-default text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
            >
              Continuar con Google
            </button>

            <button
              type="button"
              onClick={() => setIsRegister((prev) => !prev)}
              className="w-full text-xs text-primary font-medium hover:underline pt-1"
            >
              {isRegister
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
