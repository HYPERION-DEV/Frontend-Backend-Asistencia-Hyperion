// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  type: string; // 👈 PRESENTIAL_QR, HOME_OFFICE, etc.
  lateMinutes: number;
  overtimeMinutes: number;
  latitude: number;
  longitude: number;
  user: {
    id: string;
    name: string;
    lastName: string;
    dni: string;
    jobTitle: string;
    baseSalary: number;
    discountRate: number;
    homeOfficeQuota: number; // 👈 Cuota mensual
  };
}

interface UserOption {
  id: string;
  dni: string;
  name: string;
  lastName: string;
  homeOfficeQuota: number;
}

export default function HRDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Estados para el Modal de Edición Manual (Auditoría RRHH)
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [reason, setReason] = useState('');

  const loadData = async () => {
    try {
      // 1. Cargar marcaciones de asistencia
      const resRecords = await fetch('/api/v1/hr/records');
      if (resRecords.ok) {
        const dataRecords = await resRecords.json();
        setRecords(dataRecords.records || []);
      }

      // 2. Cargar lista de usuarios
      const resUsers = await fetch('/api/v1/users');
      if (resUsers.ok) {
        const dataUsers = await resUsers.json();
        setUsers(dataUsers.users || []);
      }
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = selectedUser === 'ALL'
    ? records
    : records.filter((r) => r.user.dni === selectedUser);

  const downloadExcel = () => {
    window.open('/api/v1/reports/excel', '_blank');
  };

  // Extrae limpia y directamente la hora "HH:mm" sin importar si viene como ISO Date o como String "HH:mm"
const extractHoursAndMinutes = (timeVal: string | null | undefined, defaultTime: string) => {
  if (!timeVal) return defaultTime;

  // 1. Si ya viene en formato de hora "HH:mm" o "HH:mm:ss"
  if (typeof timeVal === 'string' && timeVal.includes(':') && !timeVal.includes('T')) {
    const parts = timeVal.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  // 2. Si viene en formato ISO completo de PostgreSQL (ej. "2026-10-09T16:07:00.000Z")
  try {
    const date = new Date(timeVal);
    if (isNaN(date.getTime())) return defaultTime;
    
    // Usar formato de hora local en español
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return defaultTime;
  }
};

const handleAbrirEdicion = (record: AttendanceRecord) => {
  setSelectedRecord(record);

  // Extrae la hora exacta registrada; si no existe registro previo (null/undefined), sugiere 09:00 y 18:00
  const initialCheckIn = extractHoursAndMinutes(record.checkIn, '09:00');
  const initialCheckOut = extractHoursAndMinutes(record.checkOut, '18:00');

  setEditCheckIn(initialCheckIn);
  setEditCheckOut(initialCheckOut);
  setReason('');
  setShowEditModal(true);
};

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (!reason.trim()) {
      alert('Debe ingresar un motivo o justificación para la auditoría ISO 27001.');
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/attendance/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newCheckIn: editCheckIn,
          newCheckOut: editCheckOut,
          reason,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Marcación corregida y registrada en la pista de auditoría.');
        setShowEditModal(false);
        loadData();
      } else {
        alert(data.details || data.error || 'Error actualizando la marcación.');
      }
    } catch (err) {
      alert('Error de comunicación con el servidor.');
    }
  };

  // Función de formateo seguro de horas en 12h/24h
  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return '--:--';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Encabezado Corporativo */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Control de Personal y Asistencia - SaaS
          </h1>
          <p className="text-sm text-slate-500">
            Hyperion Digital Security S.A.C. | RUC: 20608810987 | Sistema Multiusuario (10 Empleados)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/users"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-md hover:bg-indigo-700 transition"
          >
            👥 Gestionar Trabajadores y Cuotas
          </Link>

          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-md hover:bg-emerald-700 transition"
          >
            📊 Exportar Excel Oficial (.xlsx)
          </button>
        </div>
      </header>

      {/* KPI Cards (ISO / Control RRHH) */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Empleados</span>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">
            {loading ? '...' : users.length}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
          <span className="text-xs font-semibold uppercase text-slate-400">Tardanzas Totales</span>
          <p className="mt-2 text-3xl font-extrabold text-red-600">
            {records.reduce((acc, r) => acc + (r.lateMinutes > 0 ? 1 : 0), 0)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
          <span className="text-xs font-semibold uppercase text-slate-400">Marcaciones Home Office</span>
          <p className="mt-2 text-3xl font-extrabold text-purple-600">
            {records.filter((r) => r.type === 'HOME_OFFICE').length}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
          <span className="text-xs font-semibold uppercase text-slate-400">Modificaciones Auditadas</span>
          <p className="mt-2 text-3xl font-extrabold text-indigo-600">ISO 27001 Active</p>
        </div>
      </div>

      {/* Filtro por Trabajador Dinámico */}
      <div className="mb-6 flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <label className="text-sm font-semibold text-slate-700">Filtrar por Empleado:</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">-- Todos los Trabajadores ({users.length}) --</option>
          {users.map((u) => (
            <option key={u.id} value={u.dni}>
              {u.name} {u.lastName} (DNI: {u.dni})
            </option>
          ))}
        </select>
      </div>

      {/* Tabla Principal de Marcaciones */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm border border-slate-200">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-xs uppercase text-slate-700">
            <tr>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Trabajador</th>
              <th className="px-6 py-4">Método</th>
              <th className="px-6 py-4">Ingreso / Salida</th>
              <th className="px-6 py-4">Tardanza</th>
              <th className="px-6 py-4">Horas Extras</th>
              <th className="px-6 py-4">Ubicación GPS</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                  Cargando marcaciones de asistencia...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                  No hay registros de marcación encontrados para la selección actual.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{rec.date}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{rec.user.name} {rec.user.lastName}</div>
                    <div className="text-xs text-slate-400">DNI: {rec.user.dni}</div>
                  </td>

                  {/* Columna Método / Tipo de Marcación */}
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-md ${rec.type === 'HOME_OFFICE'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                      }`}>
                      {rec.type || 'PRESENCIAL'}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-mono text-xs text-slate-800">
                    <div className="font-semibold text-slate-900">IN: {formatTime(rec.checkIn)}</div>
                    <div className="text-slate-500">OUT: {formatTime(rec.checkOut)}</div>
                  </td>

                  {/* Contador de Tardanza en Rojo */}
                  <td className="px-6 py-4">
                    {rec.lateMinutes > 0 ? (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-600/20">
                        +{rec.lateMinutes} min
                      </span>
                    ) : (
                      <span className="text-slate-400">0 min</span>
                    )}
                  </td>

                  {/* Contador de Horas Extras en Verde */}
                  <td className="px-6 py-4">
                    {rec.overtimeMinutes > 0 ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        +{rec.overtimeMinutes} min
                      </span>
                    ) : (
                      <span className="text-slate-400">0 min</span>
                    )}
                  </td>

                  {/* Coordenadas GPS */}
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {rec.latitude && rec.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        📍 {rec.latitude.toFixed(4)}, {rec.longitude.toFixed(4)}
                      </a>
                    ) : (
                      'Sin GPS'
                    )}
                  </td>

                  {/* Columna de Acción: Botón de Corregir Hora */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleAbrirEdicion(rec)}
                      className="rounded bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100 transition"
                    >
                      ✏️ Corregir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Corrección Manual con Auditoría ISO 27001 */}
      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 z-50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">
              Corregir Marcación de {selectedRecord.user.name}
            </h2>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Fecha: {selectedRecord.date} | DNI: {selectedRecord.user.dni}
            </p>

            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Hora Ingreso</label>
                  <input
                    type="time"
                    required
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Hora Salida</label>
                  <input
                    type="time"
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Motivo de la Modificación (ISO 27001)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej: Falla en la red móvil del empleado. Se valida asistencia mediante cámaras de seguridad."
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md"
                >
                  Guardar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}