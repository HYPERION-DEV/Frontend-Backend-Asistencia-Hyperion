// src/app/dashboard/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Edit, ShieldCheck, Sliders } from 'lucide-react';

interface PayrollPolicyOption {
  id: string;
  name: string;
  daysInMonth: number;
  hoursPerDay: number;
  overtimeFirst2HoursRate: number;
}

interface User {
  id: string;
  dni: string;
  name: string;
  lastName: string;
  email: string;
  jobTitle: string;
  workStartTime: string;
  toleranceMinutes: number;
  homeOfficeQuota: number;
  baseSalary: number;
  payrollPolicyId?: string | null;
  payrollPolicy?: PayrollPolicyOption | null;
  active?: boolean;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [policies, setPolicies] = useState<PayrollPolicyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    dni: '',
    name: '',
    lastName: '',
    email: '',
    jobTitle: '',
    workStartTime: '09:00',
    toleranceMinutes: 10,
    homeOfficeQuota: 4,
    baseSalary: 1500,
    payrollPolicyId: '',
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/v1/hr/policies');
      const data = await res.json();
      if (data.success) setPolicies(data.policies || []);
    } catch (err) {
      console.error('Error cargando políticas:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPolicies();
  }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      dni: '',
      name: '',
      lastName: '',
      email: '',
      jobTitle: '',
      workStartTime: '09:00',
      toleranceMinutes: 10,
      homeOfficeQuota: 4,
      baseSalary: 1500,
      payrollPolicyId: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      dni: user.dni,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      jobTitle: user.jobTitle,
      workStartTime: user.workStartTime,
      toleranceMinutes: user.toleranceMinutes,
      homeOfficeQuota: user.homeOfficeQuota || 4,
      baseSalary: user.baseSalary || 0,
      payrollPolicyId: user.payrollPolicyId || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser && !editingUser.id) {
      alert('Error: No se encontró el ID del usuario seleccionado');
      return;
    }

    const endpoint = editingUser ? `/api/v1/users/${editingUser.id}` : '/api/v1/users';
    const method = editingUser ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        alert(editingUser ? 'Configuración actualizada' : 'Trabajador registrado');
        setShowModal(false);
        fetchUsers();
      } else {
        alert(data.details || data.error || 'Error procesando la solicitud');
      }
    } catch (err) {
      alert('Error de conexión con el servidor');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase()) ||
      u.dni.includes(search)
  );

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-[#00BFA5] focus:outline-none focus:ring-1 focus:ring-[#00BFA5] font-semibold';

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#00BFA5]" />
            Administración de Personal y Parámetros Laborales
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de fichas de colaboradores y asignación centralizada de regímenes laborales.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-[#005F87] hover:bg-[#005F87]/80 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md border border-[#00BFA5]/30 transition"
        >
          <UserPlus className="w-4 h-4 text-[#00BFA5]" />
          Registrar Nuevo Trabajador
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar trabajador por Nombre, Apellido o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#00BFA5]"
        />
      </div>

      {/* TABLA PRINCIPAL DE USUARIOS */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
            <tr>
              <th className="px-5 py-3.5">Trabajador / Documento</th>
              <th className="px-5 py-3.5">Cargo / Puesto</th>
              <th className="px-5 py-3.5">Régimen Laboral</th>
              <th className="px-5 py-3.5">Ingreso / Tolerancia</th>
              <th className="px-5 py-3.5">Home Office</th>
              <th className="px-5 py-3.5">Sueldo Base</th>
              <th className="px-5 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  Cargando directorio de personal...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  No hay trabajadores registrados.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/50 transition">
                  <td className="px-5 py-3.5 font-semibold text-white">
                    {u.name} {u.lastName}
                    <div className="text-[10px] font-mono text-slate-500">DNI: {u.dni}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{u.jobTitle || 'Especialista'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-900 text-[#00BFA5] px-2 py-1 rounded border border-[#00BFA5]/30">
                      <Sliders className="w-3 h-3" />
                      {u.payrollPolicy?.name || 'Asignar Estándar General'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono">
                    <span className="text-slate-200 font-bold">{u.workStartTime}</span>
                    <span className="ml-2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50 px-2 py-0.5 text-[10px] font-bold">
                      +{u.toleranceMinutes}m tol
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="bg-slate-900 text-slate-300 font-bold px-2 py-1 rounded border border-slate-800">
                      {u.homeOfficeQuota ?? 4} días/mes
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono font-bold text-white">
                    S/ {u.baseSalary?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="inline-flex items-center gap-1 text-slate-300 hover:text-[#00BFA5] bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL SIMPLIFICADO */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl bg-slate-950 p-6 shadow-2xl border border-slate-800 text-slate-200 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00BFA5]" />
                {editingUser ? `Editar Parámetros: ${editingUser.name}` : 'Registrar Nuevo Trabajador'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure el puesto, sueldo base y asigne el régimen laboral correspondiente.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {!editingUser && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">DNI</label>
                    <input
                      type="text"
                      placeholder="Ingrese DNI (8 dígitos)"
                      required
                      className={inputClass}
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Nombres</label>
                      <input
                        type="text"
                        placeholder="Nombres"
                        required
                        className={inputClass}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Apellidos</label>
                      <input
                        type="text"
                        placeholder="Apellidos"
                        required
                        className={inputClass}
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="correo@hyperion.com"
                      required
                      className={inputClass}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Cargo / Puesto</label>
                <input
                  type="text"
                  placeholder="Ej: Especialista de Ciberseguridad"
                  required
                  className={inputClass}
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </div>

              {/* ASIGNACIÓN CENTRALIZADA DE RÉGIMEN */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Política / Régimen de Planilla
                </label>
                <select
                  className={inputClass}
                  value={formData.payrollPolicyId || ''}
                  onChange={(e) => setFormData({ ...formData, payrollPolicyId: e.target.value })}
                >
                  <option value="">-- Asignar Estándar (0 días / 0h / HE: 0%-0%) --</option>
                  {policies.map((pol) => (
                    <option key={pol.id} value={pol.id}>
                      {pol.name} ({pol.daysInMonth}d / {pol.hoursPerDay}h - HE: x{pol.overtimeFirst2HoursRate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Hora Ingreso</label>
                  <input
                    type="time"
                    required
                    className={inputClass}
                    value={formData.workStartTime}
                    onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Tolerancia (Minutos)</label>
                  <input
                    type="number"
                    required
                    className={inputClass}
                    value={formData.toleranceMinutes}
                    onChange={(e) => setFormData({ ...formData, toleranceMinutes: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Cuota Home Office</label>
                  <input
                    type="number"
                    required
                    className={inputClass}
                    value={formData.homeOfficeQuota}
                    onChange={(e) => setFormData({ ...formData, homeOfficeQuota: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Sueldo Base (S/)</label>
                  <input
                    type="number"
                    required
                    className={inputClass}
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
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
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}