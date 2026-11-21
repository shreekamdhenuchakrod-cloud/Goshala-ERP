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
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  mobileOpen = false,
  setMobileOpen,
  collapsed = false,
  onToggleCollapse,
  onLogout,
}) => {
  const { t } = useLanguage();

  const financialItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'vouchers', label: t('vouchers'), icon: Receipt },
    { id: 'contra', label: t('contra'), icon: BookOpen },
    { id: 'assets_loans', label: t('assets_loans'), icon: Building2 },
    { id: 'reports', label: t('reports'), icon: FileText },
  ];

  const systemItems = [
    { id: 'settings', label: t('settings'), icon: Settings },
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
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 h-screen z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-all duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-64 md:w-16' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className={`transition-opacity duration-150 ${collapsed ? 'md:hidden' : 'block'}`}>
              <h2 className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase truncate">
                Goshala ERP
              </h2>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-medium">
                Enterprise Ledger
              </span>
            </div>
          </div>

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6">
          {/* Financials Section */}
          <div className="space-y-1">
            <div
              className={`px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider ${
                collapsed ? 'md:hidden' : 'block'
              }`}
            >
              Accounting
            </div>

            {financialItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 select-none cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  } ${collapsed ? 'md:justify-center md:px-0' : ''}`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span className={`truncate ${collapsed ? 'md:hidden' : 'block'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* System Section */}
          <div className="space-y-1">
            <div
              className={`px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider ${
                collapsed ? 'md:hidden' : 'block'
              }`}
            >
              Administration
            </div>

            {systemItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 select-none cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  } ${collapsed ? 'md:justify-center md:px-0' : ''}`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span className={`truncate ${collapsed ? 'md:hidden' : 'block'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer Section */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          {onLogout && (
            <button
              onClick={() => {
                if (setMobileOpen) setMobileOpen(false);
                onLogout();
              }}
              title="Logout / Lock Screen"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer ${
                collapsed ? 'md:justify-center md:px-0' : ''
              }`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className={`truncate ${collapsed ? 'md:hidden' : 'block'}`}>
                Lock Terminal
              </span>
            </button>
          )}

          <div
            className={`px-3 pt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono text-center ${
              collapsed ? 'md:hidden' : 'block'
            }`}
          >
            v2.4 Enterprise
          </div>
        </div>
      </aside>
    </>
  );
};
