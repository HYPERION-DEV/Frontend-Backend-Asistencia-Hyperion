// src/app/(dashboard)/layout.tsx
import Sidebar from '../components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Menú Lateral Fijo */}
      <Sidebar />

      {/* Área Principal de Contenido */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-slate-900">
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}