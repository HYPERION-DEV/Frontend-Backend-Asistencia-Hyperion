// src/app/dashboard/policies/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Sliders, PlusCircle, ShieldCheck, Clock, Calculator, Users, Edit3 } from 'lucide-react';

interface PayrollPolicy {
  id: string;
  name: string;
  daysInMonth: number;
  hoursPerDay: number;
  overtimeFirst2HoursRate: number;
  overtimeNextHoursRate: number;
  _count?: { users: number };
}

export default function PayrollPoliciesPage() {
  const [policies, setPolicies] = useState<PayrollPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PayrollPolicy | null>(null);

  const [formData, setFormData] = useState({
    name: 'Régimen General 728',
    daysInMonth: 30,
    hoursPerDay: 8.0,
    overtimeFirst2HoursRate: 1.25,
    overtimeNextHoursRate: 1.35,
  });

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/v1/hr/policies');
      const data = await res.json();
      if (data.success) setPolicies(data.policies || []);
    } catch (e) {
      console.error('Error cargando políticas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setFormData({
      name: 'Régimen General 728',
      daysInMonth: 30,
      hoursPerDay: 8.0,
      overtimeFirst2HoursRate: 1.25,
      overtimeNextHoursRate: 1.35,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (policy: PayrollPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      daysInMonth: policy.daysInMonth,
      hoursPerDay: policy.hoursPerDay,
      overtimeFirst2HoursRate: policy.overtimeFirst2HoursRate,
      overtimeNextHoursRate: policy.overtimeNextHoursRate,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = editingPolicy ? `/api/v1/hr/policies/${editingPolicy.id}` : '/api/v1/hr/policies';
    const method = editingPolicy ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert(editingPolicy ? 'Política de cálculo actualizada correctamente' : 'Política de cálculo registrada correctamente');
        setShowModal(false);
        fetchPolicies();
      } else {
        const data = await res.json();
        alert(data.error || 'Error procesando la política');
      }
    } catch (e) {
      alert('Error de conexión con el servidor');
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-[#00BFA5] focus:outline-none';

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-[#00BFA5]" />
            Políticas de Cálculo de Planilla y Sobretasas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configuración de parámetros para divisores de jornada, cálculo de minutos de tardanza y recargos por hora extra.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-[#005F87] hover:bg-[#005F87]/80 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md border border-[#00BFA5]/30 transition"
        >
          <PlusCircle className="w-4 h-4 text-[#00BFA5]" />
          Nueva Política de Planilla
        </button>
      </div>

      {/* Grid de Políticas */}
      {loading ? (
        <p className="text-xs text-slate-500 text-center py-8">Cargando políticas de cálculo...</p>
      ) : policies.length === 0 ? (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
          No hay políticas configuradas. Se usará el Estándar Legal por defecto (30 días / 8h / 25% y 35%).
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {policies.map((p) => (
            <div
              key={p.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition relative overflow-hidden group"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00BFA5]" />
                  {p.name}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#00BFA5]" />
                    {p._count?.users || 0} Trabajadores
                  </span>
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-[#00BFA5] transition"
                    title="Editar Régimen"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Divisor Mensual:
                  </span>
                  <span className="font-mono font-bold text-white">{p.daysInMonth} días / mes</span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" /> Jornada Diaria:
                  </span>
                  <span className="font-mono font-bold text-white">{p.hoursPerDay} horas / día</span>
                </div>

                <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-900">
                  <span className="text-slate-500">Factor 1as 2 Horas (25%):</span>
                  <span className="font-mono font-bold text-emerald-400">x{p.overtimeFirst2HoursRate}</span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Factor 3ra Hora a más (35%):</span>
                  <span className="font-mono font-bold text-emerald-400">x{p.overtimeNextHoursRate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Crear/Editar Política */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 z-50">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 p-6 shadow-2xl border border-slate-800 text-slate-200 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#00BFA5]" />
                {editingPolicy ? `Editar Política: ${editingPolicy.name}` : 'Registrar Política de Cálculo'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Defina los divisores para las fórmulas de hora base y sobretasas de la empresa.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Nombre del Régimen / Política</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Régimen Administrativo 40H"
                  className={inputClass}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Días del Mes (Divisor)</label>
                  <input
                    type="number"
                    required
                    className={inputClass}
                    value={formData.daysInMonth}
                    onChange={(e) => setFormData({ ...formData, daysInMonth: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Horas Jornada Diaria</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    className={inputClass}
                    value={formData.hoursPerDay}
                    onChange={(e) => setFormData({ ...formData, hoursPerDay: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Factor 1as 2H (25%)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    className={inputClass}
                    value={formData.overtimeFirst2HoursRate}
                    onChange={(e) => setFormData({ ...formData, overtimeFirst2HoursRate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Factor +3H (35%)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    className={inputClass}
                    value={formData.overtimeNextHoursRate}
                    onChange={(e) => setFormData({ ...formData, overtimeNextHoursRate: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#005F87] hover:bg-[#005F87]/80 px-4 py-2 text-xs font-bold text-white shadow-md border border-[#00BFA5]/30"
                >
                  {editingPolicy ? 'Guardar Cambios' : 'Guardar Política'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}