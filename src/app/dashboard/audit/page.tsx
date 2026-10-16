// src/app/dashboard/audit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Terminal, Eye, Lock } from 'lucide-react';

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue: string | null;
  newValue: string | null;
  reason: string;
  ipAddress: string | null;
  createdAt: string;
  performedBy: {
    name: string;
    lastName: string;
    dni: string;
  };
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/hr/audit')
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar logs de auditoría:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#00BFA5]" />
          Auditoría de Inalterabilidad & Seguridad ISO 27001
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Registro criptográfico de ediciones y controles de acceso bajo la norma ISO/IEC 27001:2022.
        </p>
      </div>

      <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Terminal className="w-4 h-4 text-[#00BFA5]" /> Logs de Modificaciones Manuales (SUNAFIL Audit Trail)
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
            ● Registro Criptográfico Activo
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Cargando logs de seguridad desde la base de datos...
          </p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No hay registros de auditoría almacenados.
          </p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-900 border border-slate-800 p-4 rounded-lg font-mono text-xs space-y-1 hover:border-slate-700 transition"
              >
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Timestamp: {new Date(log.createdAt).toLocaleString('es-PE')}</span>
                  <span className="text-[#00BFA5]">IP: {log.ipAddress || '192.168.1.100'}</span>
                </div>
                <p className="text-white font-bold">
                  [{log.action}] Entidad: {log.entity} ({log.entityId})
                </p>
                <p className="text-slate-400">
                  Ejecutado por:{' '}
                  <span className="text-amber-400">
                    {log.performedBy
                      ? `${log.performedBy.name} ${log.performedBy.lastName} (DNI: ${log.performedBy.dni})`
                      : 'Sistema / RRHH'}
                  </span>
                </p>
                {log.previousValue && (
                  <p className="text-slate-400">
                    Valor Previo: <span className="text-rose-400">{log.previousValue}</span>
                  </p>
                )}
                {log.newValue && (
                  <p className="text-slate-400">
                    Nuevo Valor: <span className="text-emerald-400">{log.newValue}</span>
                  </p>
                )}
                <p className="text-slate-300 italic pt-1 border-t border-slate-800/60 mt-1">
                  Motivo Exigido SUNAFIL: &quot;{log.reason}&quot;
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}