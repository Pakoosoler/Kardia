import React, { useState } from 'react';
import { Lock, UserPlus, Users, X } from 'lucide-react';
import { useAulora } from '../context/AuloraContext';
import type { VisibilityScope } from '../types/aulora';

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  courseId?: string;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  open,
  onClose,
  courseId,
}) => {
  const { addStudent } = useAulora();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
  const [gradeLevel, setGradeLevel] = useState('1º Bachillerato');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [visibility, setVisibility] = useState<VisibilityScope>('private');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setBusy(true);
    try {
      await addStudent({
        firstName,
        lastName,
        code,
        gradeLevel,
        guardianName,
        guardianPhone,
        guardianEmail,
        visibility,
        courseId,
      });
      setFirstName('');
      setLastName('');
      setCode('');
      setGuardianName('');
      setGuardianPhone('');
      setGuardianEmail('');
      onClose();
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
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-display text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Añadir Alumno
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Nombre
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Lucía"
                className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Apellidos
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Martínez"
                className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Código / ID (opcional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="#ALU-101"
                className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Curso / Nivel
              </label>
              <input
                type="text"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Tutor legal (opcional)
            </label>
            <input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Nombre del familiar"
              className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Teléfono familia
              </label>
              <input
                type="text"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Correo familia
              </label>
              <input
                type="email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                placeholder="familia@correo.es"
                className="w-full px-3 py-2 rounded-lg border border-border-default text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Visibilidad de la ficha
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  visibility === 'private'
                    ? 'border-primary bg-soft-accent text-primary'
                    : 'border-border-default text-on-surface-variant'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Privada
              </button>
              <button
                type="button"
                onClick={() => setVisibility('shared')}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  visibility === 'shared'
                    ? 'border-secondary bg-secondary-container/50 text-on-secondary-container'
                    : 'border-border-default text-on-surface-variant'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Compartida
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full btn-primary-gradient py-2.5 rounded-full text-sm font-semibold mt-2"
          >
            Guardar Alumno
          </button>
        </form>
      </div>
    </div>
  );
};
