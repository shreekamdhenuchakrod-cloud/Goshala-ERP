import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import {
  LayoutDashboard,
  Receipt,
  ArrowDownUp,
  Building2,
  FileText,
  Settings,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'vouchers', label: t('vouchers'), icon: Receipt },
    { id: 'contra', label: t('contra'), icon: BookOpen },
    { id: 'assets_loans', label: t('assets_loans'), icon: Building2 },
    { id: 'reports', label: t('reports'), icon: FileText },
    { id: 'settings', label: t('settings'), icon: Settings }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 h-screen fixed left-0 top-0 z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-forest-500 to-saffron-500 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        <div>
          <h1 className="text-white font-bold tracking-wide text-sm leading-tight">GOSHALA ERP</h1>
          <span className="text-xs text-forest-400 font-semibold uppercase tracking-wider">Simple Financials</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-left font-semibold text-xs ${
                isActive
                  ? 'bg-gradient-to-r from-forest-700 to-forest-600 text-white shadow-md shadow-forest-900/30'
                  : 'hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-saffron-400' : 'text-slate-400 group-hover:text-slate-100'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
        <p className="text-[10px] text-slate-500 font-mono">v2.0 • Simplified Accounting</p>
      </div>
    </aside>
  );
};
