// src/app/dashboard/digital-signature/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { FileSignature, Send, CheckCircle2, FileText, Clock } from 'lucide-react';

interface Paystub {
  id: string;
  period: string;
  fileUrl: string;
  isEmployerSigned: boolean;
  isEmployeeSigned: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    lastName: string;
    dni: string;
  };
}

export default function DigitalSignaturePage() {
  const [paystubs, setPaystubs] = useState<Paystub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/hr/digital-signature')
      .then((res) => res.json())
      .then((data) => {
        setPaystubs(data.paystubs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando boletas:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-[#00BFA5]" />
            Firma Digital de Boletas de Pago (Ley N° 27269)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Distribución y acuse de recibo de boletas firmadas digitalmente con valor probatorio ante SUNAFIL.
          </p>
        </div>
      </div>

      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
            <tr>
              <th className="px-5 py-3.5">Trabajador</th>
              <th className="px-5 py-3.5">Periodo</th>
              <th className="px-5 py-3.5">Firma Empleador</th>
              <th className="px-5 py-3.5">Conformidad Trabajador</th>
              <th className="px-5 py-3.5 text-right">Documento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">
                  Cargando boletas de pago...
                </td>
              </tr>
            ) : paystubs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">
                  No hay boletas de pago registradas en el periodo actual.
                </td>
              </tr>
            ) : (
              paystubs.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/50 transition">
                  <td className="px-5 py-3.5 font-semibold text-white">
                    {p.user ? `${p.user.name} ${p.user.lastName}` : 'Trabajador'}
                    <div className="text-[10px] text-slate-500">DNI: {p.user?.dni}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono">{p.period}</td>
                  <td className="px-5 py-3.5">
                    {p.isEmployerSigned ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/50 px-2.5 py-1 rounded border border-emerald-800/50 text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Firmado Digitalmente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-950/50 px-2.5 py-1 rounded border border-amber-800/50 text-[10px]">
                        <Clock className="w-3.5 h-3.5" /> Pendiente Firma
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {p.isEmployeeSigned ? (
                      <span className="inline-flex items-center gap-1 text-[#00BFA5] font-bold bg-slate-900 px-2.5 py-1 rounded border border-[#00BFA5]/30 text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Recepcionado en App
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-bold bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-[10px]">
                        <Clock className="w-3.5 h-3.5" /> Sin Recepcionar
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <a
                      href={p.fileUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-300 hover:text-[#00BFA5] font-bold underline inline-flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> PDF Boleta
                    </a>
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