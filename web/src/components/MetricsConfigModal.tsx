import React, { useMemo, useState } from 'react';
import { Calculator, Plus, Sparkles, Trash2, X } from 'lucide-react';
import type {
  AverageCalculationMode,
  Course,
  CourseMetricsConfig,
  CustomMetricDefinition,
  RoundingMode,
} from '../types/aulora';
import {
  evaluateCustomFormula,
  PRESET_CUSTOM_METRICS,
  resolveCourseMetricsConfig,
} from '../lib/metricsEngine';
import { useAulora } from '../context/AuloraContext';

interface MetricsConfigModalProps {
  open: boolean;
  onClose: () => void;
  course: Course;
}

export const MetricsConfigModal: React.FC<MetricsConfigModalProps> = ({
  open,
  onClose,
  course,
}) => {
  const { updateCourseMetricsConfig } = useAulora();
  const initial = resolveCourseMetricsConfig(course);

  const [tab, setTab] = useState<'rules' | 'custom'>('rules');
  const [averageMode, setAverageMode] = useState<AverageCalculationMode>(initial.averageMode);
  const [roundingMode, setRoundingMode] = useState<RoundingMode>(initial.roundingMode);
  const [passingThreshold, setPassingThreshold] = useState<number>(initial.passingThreshold);
  const [attendanceAlertPct, setAttendanceAlertPct] = useState<number>(
    initial.attendanceAlertPct,
  );
  const [behaviorBonusPerPoint, setBehaviorBonusPerPoint] = useState<number>(
    initial.behaviorBonusPerPoint,
  );
  const [maxBehaviorBonus, setMaxBehaviorBonus] = useState<number>(initial.maxBehaviorBonus);
  const [unexcusedPenaltyPerAbsence, setUnexcusedPenaltyPerAbsence] = useState<number>(
    initial.unexcusedPenaltyPerAbsence,
  );
  const [customMetrics, setCustomMetrics] = useState<CustomMetricDefinition[]>(
    initial.customMetrics,
  );
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  // New custom metric builder
  const [newName, setNewName] = useState('');
  const [newFormula, setNewFormula] = useState('ROUND(MEDIA * 0.85 + ASISTENCIA10 * 0.15, 1)');
  const [newUnit, setNewUnit] = useState<'/10' | '%' | 'pts'>('/10');
  const [newShowInGradebook, setNewShowInGradebook] = useState(true);

  const previewResult = useMemo(
    () =>
      evaluateCustomFormula(newFormula, {
        MEDIA: 8.2,
        T1: 7.8,
        T2: 8.2,
        T3: 8.5,
        ASISTENCIA: 92,
        ASISTENCIA10: 9.2,
        PUNTOS: 3,
        FALTAS: 1,
      }),
    [newFormula],
  );

  if (!open) return null;

  const handleAddCustomMetric = () => {
    if (!newName.trim() || previewResult === null) return;
    const item: CustomMetricDefinition = {
      id: `cm-${Date.now()}`,
      name: newName.trim(),
      formula: newFormula.trim().toUpperCase(),
      unit: newUnit,
      showInGradebook: newShowInGradebook,
    };
    setCustomMetrics((prev) => [...prev, item]);
    setNewName('');
  };

  const handleAddPreset = (preset: (typeof PRESET_CUSTOM_METRICS)[number]) => {
    setCustomMetrics((prev) => [
      ...prev,
      {
        ...preset,
        id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      },
    ]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const nextConfig: CourseMetricsConfig = {
        averageMode,
        roundingMode,
        passingThreshold,
        attendanceAlertPct,
        behaviorBonusPerPoint,
        maxBehaviorBonus,
        unexcusedPenaltyPerAbsence,
        customMetrics,
      };
      await updateCourseMetricsConfig(course.id, nextConfig, saveAsDefault);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/35 backdrop-blur-sm p-4">
      <div className="bento-card w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-primary-container text-white flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-on-surface">
              Automatización y Métricas Personalizadas
            </h3>
            <p className="text-xs text-on-surface-variant">
              Tú solo introduces notas, asistencia y puntos; Aulora calcula el resto solo.
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="inline-flex p-1 bg-surface-container-low rounded-full mb-5">
          <button
            type="button"
            onClick={() => setTab('rules')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              tab === 'rules' ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant'
            }`}
          >
            1. Reglas Automáticas de Media
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
              tab === 'custom' ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            2. Fórmulas y Métricas Propia ({customMetrics.length})
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {tab === 'rules' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Modo de cálculo de medias
                  </label>
                  <select
                    value={averageMode}
                    onChange={(e) =>
                      setAverageMode(e.target.value as AverageCalculationMode)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border-default text-xs font-semibold bg-white"
                  >
                    <option value="category_weighted">
                      Ponderada por Categorías (Exámenes, Prácticas...)
                    </option>
                    <option value="assessment_weighted">
                      Ponderada directa por peso de cada columna
                    </option>
                    <option value="simple_mean">
                      Media aritmética simple (todas valen igual)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Redondeo / Precisión automática
                  </label>
                  <select
                    value={roundingMode}
                    onChange={(e) => setRoundingMode(e.target.value as RoundingMode)}
                    className="w-full px-3 py-2 rounded-xl border border-border-default text-xs font-semibold bg-white"
                  >
                    <option value="one_decimal">1 decimal (ej. 8.4)</option>
                    <option value="two_decimals">2 decimales (ej. 8.38)</option>
                    <option value="integer_nearest">Entero para boletín (ej. 8)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Nota mínima de aprobado (0 - 10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="9"
                    value={passingThreshold}
                    onChange={(e) => setPassingThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border-default text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Alerta automática de absentismo (% faltas)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={attendanceAlertPct}
                    onChange={(e) => setAttendanceAlertPct(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border-default text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low space-y-3">
                <span className="text-xs font-bold text-on-surface block">
                  Modificadores Automáticos de Actitud y Asistencia (Opcionales)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Bonus por punto positivo (+)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={behaviorBonusPerPoint}
                      onChange={(e) => setBehaviorBonusPerPoint(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border-default bg-white text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Tope máximo bonus
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={maxBehaviorBonus}
                      onChange={(e) => setMaxBehaviorBonus(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border-default bg-white text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Penalización por falta injustif. (-)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={unexcusedPenaltyPerAbsence}
                      onChange={(e) =>
                        setUnexcusedPenaltyPerAbsence(Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border-default bg-white text-xs tabular-nums"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Déjalos en <code>0</code> si prefieres que la conducta y las faltas no sumen ni resten en la nota numérica.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-on-surface block">
                  Añadir métrica automática en 1 clic:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_CUSTOM_METRICS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="px-3 py-1.5 rounded-full bg-soft-accent hover:bg-primary-fixed text-primary text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formula Builder */}
              <div className="p-4 rounded-2xl bg-surface-container-low space-y-3">
                <span className="text-xs font-bold text-on-surface block">
                  Crear fórmula personalizada para este profesor / grupo
                </span>
                <p className="text-[11px] text-on-surface-variant">
                  Variables automáticas disponibles:{' '}
                  <code>MEDIA</code> (0-10), <code>T1</code>, <code>T2</code>, <code>T3</code>,{' '}
                  <code>ASISTENCIA</code> (0-100), <code>ASISTENCIA10</code> (0-10),{' '}
                  <code>PUNTOS</code>, <code>FALTAS</code>. Funciones: <code>ROUND(x,1)</code>,{' '}
                  <code>MIN(a,b)</code>, <code>MAX(a,b)</code>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nombre (ej. Nota Actitud)"
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-border-default bg-white text-xs"
                  />
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as '/10' | '%' | 'pts')}
                    className="px-3 py-2 rounded-lg border border-border-default bg-white text-xs font-semibold"
                  >
                    <option value="/10">Escala /10</option>
                    <option value="%">Porcentaje %</option>
                    <option value="pts">Puntos</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newFormula}
                    onChange={(e) => setNewFormula(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border-default bg-white font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMetric}
                    disabled={!newName.trim() || previewResult === null}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-50"
                  >
                    + Añadir Métrica
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-2 text-on-surface-variant cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newShowInGradebook}
                      onChange={(e) => setNewShowInGradebook(e.target.checked)}
                    />
                    Mostrar como columna automática en Notebooks
                  </label>
                  <span className="tabular-nums font-semibold text-primary">
                    Simulación ejemplo:{' '}
                    {previewResult !== null ? `${previewResult}${newUnit}` : 'Fórmula inválida'}
                  </span>
                </div>
              </div>

              {/* Active Custom Metrics List */}
              <div className="space-y-2">
                {customMetrics.length === 0 ? (
                  <p className="text-xs text-on-surface-variant text-center py-3">
                    No hay métricas personalizadas extra activas en este curso.
                  </p>
                ) : (
                  customMetrics.map((cm) => (
                    <div
                      key={cm.id}
                      className="p-3 rounded-xl bg-white border border-border-default flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">
                          {cm.name}{' '}
                          <span className="text-[10px] text-primary font-semibold">
                            ({cm.showInGradebook ? 'Columna en Notebooks + Summary' : 'Solo en Summary'})
                          </span>
                        </p>
                        <p className="font-mono text-[11px] text-on-surface-variant truncate">
                          {cm.formula}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomMetrics((prev) => prev.filter((x) => x.id !== cm.id))
                        }
                        className="text-outline hover:text-tertiary p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-border-default flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
              />
              Guardar también como mi perfil de métricas por defecto
            </label>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary-gradient px-6 py-2.5 rounded-full text-xs font-semibold"
            >
              {busy ? 'Guardando...' : 'Aplicar Automatización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
