import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import {
  LayoutDashboard,
  Receipt,
  BookOpen,
  Building2,
  FileText,
  Settings,
  X,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  mobileOpen = false,
  setMobileOpen,
  onLogout
}) => {
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'vouchers', label: t('vouchers'), icon: Receipt },
    { id: 'contra', label: t('contra'), icon: BookOpen },
    { id: 'assets_loans', label: t('assets_loans'), icon: Building2 },
    { id: 'reports', label: t('reports'), icon: FileText },
    { id: 'settings', label: t('settings'), icon: Settings }
  ];

  const handleNavClick = (id: string) => {
    setActivePage(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen && setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 h-screen fixed left-0 top-0 z-40 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-forest-500 to-saffron-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-base">G</span>
            </div>
            <div>
              <h1 className="text-white font-bold tracking-wide text-xs leading-tight">GOSHALA ERP</h1>
              <span className="text-[10px] text-forest-400 font-semibold uppercase tracking-wider block">Simplified Financials</span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-left font-semibold text-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-forest-700 to-forest-600 text-white shadow-md shadow-forest-900/30'
                    : 'hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-saffron-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Info & Logout Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2">
          {onLogout && (
            <button
              onClick={() => {
                if (setMobileOpen) setMobileOpen(false);
                onLogout();
              }}
              className="w-full py-2 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout (लॉगआउट)</span>
            </button>
          )}
          <p className="text-[10px] text-slate-500 font-mono text-center">v2.0 • Firebase Cloud Sync</p>
        </div>
      </aside>
    </>
  );
};
