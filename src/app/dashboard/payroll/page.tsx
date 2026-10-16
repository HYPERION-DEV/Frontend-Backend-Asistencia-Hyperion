// src/app/dashboard/payroll/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Briefcase, Download, AlertCircle } from 'lucide-react';

interface PayrollItem {
  userId: string;
  fullName: string;
  docType: string;
  dni: string;
  jobTitle: string;
  regimenName: string;
  baseSalary: number;
  hourlyRate: number;
  totalLateMinutes: number;
  totalOvertime25Minutes: number;
  totalOvertime35Minutes: number;
  lateDiscount: number;
  totalOvertimePay: number;
  netSalary: number;
}

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/hr/payroll')
      .then((res) => res.json())
      .then((data) => {
        setPayroll(data.payroll || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar nómina:', err);
        setLoading(false);
      });
  }, []);

  const handleExportExcel = () => {
    window.open('/api/v1/reports/payroll-excel', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* ENCABEZADO CORPORATIVO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#00BFA5]" />
            Cálculo de Planilla y Pre-Nómina Mensual
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hyperion Digital Security S.A.C. | RUC: 20608810987 — Liquidación con sobretasas (Ley N° 28999)
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md border border-emerald-500/30 transition"
        >
          <Download className="w-4 h-4" />
          Exportar Excel PLAME (.xlsx)
        </button>
      </div>

      {/* NOTA NORMATIVA LEGAL */}
      <div className="bg-[#005F87]/20 border border-[#00BFA5]/30 p-4 rounded-xl flex items-center gap-3 text-xs text-slate-300">
        <AlertCircle className="w-5 h-5 text-[#00BFA5] shrink-0" />
        <span>
          El cálculo aplica el recargo legal del <strong>25% para las primeras 2 horas extras</strong> y el <strong>35% para las horas subsecuentes</strong>. Los descuentos por tardanza se calculan en base al valor minuto del sueldo base configurado.
        </span>
      </div>

      {/* TABLA PRINCIPAL DE PLANILLA */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Trabajador</th>
              <th className="px-4 py-3">Régimen Aplicado</th>
              <th className="px-4 py-3">Sueldo Base</th>
              <th className="px-4 py-3">Tarifa / Hora</th>
              <th className="px-4 py-3">Tardanzas (S/)</th>
              <th className="px-4 py-3">Horas Extras (S/)</th>
              <th className="px-4 py-3 text-right">Neto a Pagar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  Calculando pre-nómina consolidada...
                </td>
              </tr>
            ) : payroll.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  No hay datos de planilla para mostrar.
                </td>
              </tr>
            ) : (
              payroll.map((item) => (
                <tr key={item.userId} className="hover:bg-slate-900/50 transition text-xs">
                  <td className="px-4 py-3 font-semibold text-white">
                    {item.fullName}
                    <div className="text-[10px] text-slate-500">{item.jobTitle}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-[#00BFA5] font-bold px-2 py-0.5 rounded">
                      {item.regimenName || 'Estándar General 728'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-200">
                    S/ {item.baseSalary?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    S/ {(item.hourlyRate || 0).toFixed(2)} /h
                  </td>
                  <td className="px-4 py-3 font-mono text-rose-400">
                    - S/ {item.lateDiscount?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-400">
                    + S/ {item.totalOvertimePay?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-white text-right">
                    S/ {item.netSalary?.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}