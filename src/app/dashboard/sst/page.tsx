// src/app/dashboard/sst/page.tsx
'use client';

import { HardHat, Award, ShieldAlert, CheckSquare } from 'lucide-react';

export default function SSTPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <HardHat className="w-6 h-6 text-[#00BFA5]" />
          Seguridad y Salud en el Trabajo (SST - Ley N° 29783)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cumplimiento de las 4 capacitaciones anuales obligatorias, entrega de EPPs y mapa de riesgos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-2">
          <Award className="w-6 h-6 text-[#00BFA5]" />
          <h3 className="text-sm font-bold text-white">Capacitaciones SST</h3>
          <p className="text-2xl font-extrabold text-white">3 / 4</p>
          <p className="text-[11px] text-slate-400">Ejecutadas en el año fiscal 2026</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-2">
          <CheckSquare className="w-6 h-6 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Entrega de EPPs</h3>
          <p className="text-2xl font-extrabold text-emerald-400">100%</p>
          <p className="text-[11px] text-slate-400">Con firma digital de conformidad</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-2">
          <ShieldAlert className="w-6 h-6 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Incidentes Registrados</h3>
          <p className="text-2xl font-extrabold text-amber-400">0</p>
          <p className="text-[11px] text-slate-400">Días sin accidentes laborales</p>
        </div>
      </div>
    </div>
  );
}