// src/components/users/UserTable.tsx
'use client';

import { 
  Clock, 
  Home, 
  Settings, 
  UserX, 
  UserCheck 
} from 'lucide-react';
import { UserFormData } from './UserFormModal';

interface UserTableProps {
  users: UserFormData[];
  loading: boolean;
  onEdit: (user: UserFormData) => void;
  onToggleStatus: (user: UserFormData) => void;
}

export default function UserTable({
  users,
  loading,
  onEdit,
  onToggleStatus,
}: UserTableProps) {
  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs border border-slate-800 rounded-2xl bg-slate-950">
        Cargando nómina de trabajadores...
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Trabajador / DNI</th>
              <th className="px-6 py-4">Cargo</th>
              <th className="px-6 py-4">Ingreso / Tolerancia</th>
              <th className="px-6 py-4">Home Office</th>
              <th className="px-6 py-4">Sueldo / H.Extras</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No se encontraron trabajadores con los criterios ingresados.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isActive = u.active !== false;
                return (
                  <tr key={u.id} className="hover:bg-slate-900/50 transition">
                    {/* NOMBRE Y DNI */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-100">{u.name} {u.lastName}</div>
                      <div className="text-[11px] text-[#00B3B3] font-mono">DNI: {u.dni}</div>
                      <div className="text-[10px] text-slate-500">{u.email}</div>
                    </td>

                    {/* CARGO */}
                    <td className="px-6 py-4 font-medium text-slate-300">{u.jobTitle}</td>

                    {/* JORNADA Y TOLERANCIA */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-200">
                        <Clock size={12} className="text-[#00B3B3]" />
                        {u.workStartTime}
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        +{u.toleranceMinutes} min tol
                      </span>
                    </td>

                    {/* CUOTA HOME OFFICE */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-purple-300">
                        <Home size={13} />
                        {u.homeOfficeQuota ?? 4} días/mes
                      </div>
                    </td>

                    {/* SALARIO Y OVERTIME */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-100">S/ {u.baseSalary}</div>
                      <div className="text-[10px] text-emerald-400">Factor: x{u.overtimeRate ?? 1.25}</div>
                    </td>

                    {/* ESTADO LABORAL */}
                    <td className="px-6 py-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          De Baja
                        </span>
                      )}
                    </td>

                    {/* BOTONES DE ACCIÓN */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(u)}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-[#00B3B3] transition"
                          title="Editar Parámetros"
                        >
                          <Settings size={15} />
                        </button>
                        <button
                          onClick={() => onToggleStatus(u)}
                          className={`p-2 rounded-xl border transition ${
                            isActive
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={isActive ? 'Dar de baja' : 'Reactivar'}
                        >
                          {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}