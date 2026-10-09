// src/app/dashboard/qr-print/page.tsx
'use client';

import { QRCodeSVG } from 'qrcode.react';

export default function QRPrintPage() {
  const qrSecret = 'HYPERION_QR_SECRET_KEY_2026';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-8 text-center">
      <div className="rounded-2xl border-4 border-indigo-600 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-800">Hyperion Digital Security S.A.C.</h1>
        <p className="mb-6 text-sm text-slate-500">Punto Oficial de Marcación de Asistencia</p>
        
        <div className="flex justify-center p-4 bg-slate-50 rounded-xl">
          <QRCodeSVG value={qrSecret} size={250} />
        </div>

        <p className="mt-6 text-xs text-slate-400">Escanee este código desde la app móvil para registrar su ingreso</p>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-8 rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-md hover:bg-indigo-700"
      >
        🖨️ Imprimir Cartel QR
      </button>
    </div>
  );
}