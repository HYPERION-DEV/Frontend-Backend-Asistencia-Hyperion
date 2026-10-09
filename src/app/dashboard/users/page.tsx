// src/app/dashboard/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  overtimeRate: number;
  baseSalary: number;
  active?: boolean;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
    overtimeRate: 1.25,
    baseSalary: 1500,
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
      overtimeRate: 1.25,
      baseSalary: 1500,
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
      overtimeRate: user.overtimeRate || 1.25,
      baseSalary: user.baseSalary || 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Asegurarse de que editingUser?.id exista y no sea undefined
    if (editingUser && !editingUser.id) {
      alert('Error: No se encontró el ID del usuario seleccionado');
      return;
    }

    const endpoint = editingUser 
      ? `/api/v1/admin/users/${editingUser.id}` 
      : '/api/v1/users';
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

  // ESTILO DE INPUT CON TEXTO NEGRO TOTALMENTE VISIBLE
  const inputClass = "w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold placeholder:text-slate-400";

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administración de Nómina y Trabajadores</h1>
          <p className="text-sm text-slate-500">Configuración de tolerancias, sueldos y cuotas</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 shadow-md"
        >
          + Registrar Nuevo Trabajador
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Cargando lista de trabajadores...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-100 text-xs uppercase text-slate-700">
              <tr>
                <th className="px-6 py-3">DNI / Nombre</th>
                <th className="px-6 py-3">Cargo</th>
                <th className="px-6 py-3">Ingreso / Tolerancia</th>
                <th className="px-6 py-3">Cuota Home Office</th>
                <th className="px-6 py-3">Factor Horas Extra</th>
                <th className="px-6 py-3">Sueldo Base</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{u.name} {u.lastName}</div>
                    <div className="text-xs text-slate-400">DNI: {u.dni}</div>
                  </td>
                  <td className="px-6 py-4">{u.jobTitle}</td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-700">{u.workStartTime}</span>
                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      +{u.toleranceMinutes} min tol
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{u.homeOfficeQuota ?? 4} días/mes</td>
                  <td className="px-6 py-4 font-medium text-emerald-600">x{u.overtimeRate ?? 1.25}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">S/ {u.baseSalary}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="rounded bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 border border-slate-300"
                    >
                      ⚙️ Editar Parámetros
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CORREGIDO CON TEXTO NEGRO VISIBLE */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h2 className="mb-1 text-xl font-bold text-slate-900">
              {editingUser ? `Editar Parámetros de ${editingUser.name}` : 'Registrar Nuevo Trabajador'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">Complete la información del perfil del trabajador.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingUser && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">DNI</label>
                    <input
                      type="text"
                      placeholder="Ingrese DNI"
                      required
                      className={inputClass}
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Nombres</label>
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
                      <label className="text-xs font-bold text-slate-700 block mb-1">Apellidos</label>
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
                    <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="Correo Electrónico"
                      required
                      className={inputClass}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Cargo / Puesto</label>
                <input
                  type="text"
                  placeholder="Cargo o Puesto"
                  required
                  className={inputClass}
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Hora Ingreso</label>
                  <input
                    type="time"
                    required
                    className={inputClass}
                    value={formData.workStartTime}
                    onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tolerancia (Minutos)</label>
                  <input
                    type="number"
                    required
                    className={inputClass}
                    value={formData.toleranceMinutes}
                    onChange={(e) => setFormData({ ...formData, toleranceMinutes: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cuota Home Office</label>
                  <input
                    type="number"
                    required
                    className={inputClass}
                    value={formData.homeOfficeQuota}
                    onChange={(e) => setFormData({ ...formData, homeOfficeQuota: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Factor H. Extras</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    className={inputClass}
                    value={formData.overtimeRate}
                    onChange={(e) => setFormData({ ...formData, overtimeRate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sueldo Base (S/)</label>
                  <input
                    type="number"
                    required
                    className={inputClass}
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md"
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