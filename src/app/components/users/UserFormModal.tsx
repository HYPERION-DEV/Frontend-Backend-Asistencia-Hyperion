// src/components/users/UserFormModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Save, Shield, BadgeCheck } from 'lucide-react';

export interface UserFormData {
  id?: string;
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

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<void>;
  userToEdit: UserFormData | null;
}

const DEFAULT_FORM_STATE: UserFormData = {
  dni: '',
  name: '',
  lastName: '',
  email: '',
  jobTitle: '',
  workStartTime: '09:00',
  toleranceMinutes: 10,
  homeOfficeQuota: 4,
  overtimeRate: 1.25,
  baseSalary: 2500,
  active: true,
};

export default function UserFormModal({
  isOpen,
  onClose,
  onSave,
  userToEdit,
}: UserFormModalProps) {
  const [formData, setFormData] = useState<UserFormData>(DEFAULT_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        id: userToEdit.id,
        dni: userToEdit.dni || '',
        name: userToEdit.name || '',
        lastName: userToEdit.lastName || '',
        email: userToEdit.email || '',
        jobTitle: userToEdit.jobTitle || '',
        workStartTime: userToEdit.workStartTime || '09:00',
        toleranceMinutes: userToEdit.toleranceMinutes ?? 10,
        homeOfficeQuota: userToEdit.homeOfficeQuota ?? 4,
        overtimeRate: userToEdit.overtimeRate ?? 1.25,
        baseSalary: userToEdit.baseSalary ?? 2500,
        active: userToEdit.active ?? true,
      });
    } else {
      setFormData(DEFAULT_FORM_STATE);
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estilo con prioridad de color de texto forzado
  const inputStyle = "w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00B3B3]";
  const inputInlineStyles = { color: '#0f172a', backgroundColor: '#f8fafc' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER MODAL */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#025A81] text-[#00B3B3] border border-[#00B3B3]/30">
              {userToEdit ? <BadgeCheck size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {userToEdit ? `Editar Parámetros de ${userToEdit.name}` : 'Registrar Nuevo Trabajador'}
              </h2>
              <p className="text-xs text-slate-300">
                {userToEdit ? 'Modificación de perfil laboral y cuotas' : 'Asignación de credenciales (Contraseña inicial: 123456)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 bg-white">
          
          {/* SECCIÓN 1: DATOS PERSONALES */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#025A81] uppercase tracking-wider flex items-center gap-2">
              <Shield size={15} /> Información Personal
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-extrabold text-slate-900 block mb-1">DNI (Identificación)</label>
                <input
                  type="text"
                  required
                  disabled={!!userToEdit}
                  placeholder="70000001"
                  className={`${inputStyle} font-mono`}
                  style={inputInlineStyles}
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="trabajador@hyperion.pe"
                  className={inputStyle}
                  style={inputInlineStyles}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 block mb-1">Nombres</label>
                <input
                  type="text"
                  required
                  placeholder="Miguel Martin"
                  className={inputStyle}
                  style={inputInlineStyles}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 block mb-1">Apellidos</label>
                <input
                  type="text"
                  required
                  placeholder="Conde Garcia"
                  className={inputStyle}
                  style={inputInlineStyles}
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* SECCIÓN 2: PARÁMETROS LABORALES */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#025A81] uppercase tracking-wider">
              Parámetros de Asistencia y Nómina
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-extrabold text-slate-900 block mb-1">Cargo / Puesto</label>
                <input
                  type="text"
                  required
                  placeholder="Desarrollador Full Stack / Ingeniero de Sistemas"
                  className={inputStyle}
                  style={inputInlineStyles}
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 block mb-1">Hora Entrada Esperada</label>
                <input
                  type="time"
                  required
                  className={inputStyle}
                  style={inputInlineStyles}
                  value={formData.workStartTime}
                  onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 block mb-1">Tolerancia Tardanza (Minutos)</label>
                <input
                  type="number"
                  required
                  className={inputStyle}
                  style={inputInlineStyles}
                  value={formData.toleranceMinutes}
                  onChange={(e) => setFormData({ ...formData, toleranceMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 block mb-1">Cuota Mensual Home Office (Días)</label>
                <input
                  type="number"
                  required
                  className={inputStyle}
                  style={inputInlineStyles}
                  value={formData.homeOfficeQuota}
                  onChange={(e) => setFormData({ ...formData, homeOfficeQuota: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 block mb-1">Factor Horas Extra</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  className={inputStyle}
                  style={inputInlineStyles}
                  value={formData.overtimeRate}
                  onChange={(e) => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) || 1.25 })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-extrabold text-slate-900 block mb-1">Sueldo Base (S/)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  className={inputStyle}
                  style={inputInlineStyles}
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#025A81] hover:bg-[#014361] text-xs font-bold text-white shadow-md transition disabled:opacity-50"
            >
              <Save size={16} />
              {isSubmitting ? 'Guardando...' : userToEdit ? 'Guardar Cambios' : 'Registrar Trabajador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}