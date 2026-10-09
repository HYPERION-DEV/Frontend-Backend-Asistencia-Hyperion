// src/app/dashboard/layout.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Clock, 
  FileSpreadsheet, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  Building2
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: 'Gestión de Usuarios', href: '/dashboard/users', icon: Users },
    { name: 'Control de Asistencia', href: '/dashboard', icon: Clock },
    { name: 'Reportes y Planilla', href: '/dashboard/reports', icon: FileSpreadsheet },
    { name: 'Auditoría ISO 27001', href: '/dashboard/audit', icon: ShieldCheck },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* SIDEBAR COLAPSABLE */}
      <aside
        className={`bg-slate-950 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div>
          {/* BRANDING / LOGO */}
          <div className="h-20 flex items-center justify-between px-4 border-b border-slate-800">
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#025A81] to-[#00B3B3] flex items-center justify-center font-bold text-white shadow-lg shadow-[#00B3B3]/20">
                  H
                </div>
                <div>
                  <h1 className="font-bold text-base text-white tracking-wide leading-tight">
                    HYPERION
                  </h1>
                  <p className="text-[10px] text-[#00B3B3] font-semibold tracking-wider uppercase">
                    Digital Security
                  </p>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-[#025A81] to-[#00B3B3] flex items-center justify-center font-bold text-white shadow-lg">
                H
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* MENÚ DE NAVEGACIÓN */}
          <nav className="p-3 space-y-1.5 mt-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition font-medium text-sm ${
                    isActive
                      ? 'bg-gradient-to-r from-[#025A81] to-[#00B3B3] text-white shadow-md shadow-[#00B3B3]/20'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* PIE DE SIDEBAR / PERFIL Y SALIDA */}
        <div className="p-3 border-t border-slate-800">
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-[#025A81] flex items-center justify-center text-white font-bold text-xs ring-2 ring-[#00B3B3]/30">
              RRHH
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">Administrador RRHH</p>
                <p className="text-[10px] text-slate-400 truncate">rrhh@hyperion.pe</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
        {/* HEADER SUPERIOR */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Building2 size={14} className="text-[#00B3B3]" />
            <span>Hyperion Digital Security S.A.C.</span>
            <span>/</span>
            <span className="text-slate-200 font-medium">Panel de Gestión RRHH</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00B3B3]/10 text-[#00B3B3] border border-[#00B3B3]/20">
              <span className="w-2 h-2 rounded-full bg-[#00B3B3] animate-pulse"></span>
              Sistema Operativo
            </span>
          </div>
        </header>

        {/* VIEWPORT DINÁMICO */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}