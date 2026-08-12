import React, { useState, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { GoshalaDB } from '../db/db';
import {
  LayoutDashboard,
  Receipt,
  BookOpen,
  Building2,
  FileText,
  Settings,
  X,
  LogOut,
  Users,
  FolderOpen,
  Briefcase,
  CreditCard,
  FileCheck2,
  LifeBuoy
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
  const { user } = useAuth();
  const [activeFy, setActiveFy] = useState<any>(null);

  useEffect(() => {
    const fyId = GoshalaDB.getActiveFyId();
    const fys = GoshalaDB.getTable<any>('fys');
    const fy = fys.find((f: any) => f.id === fyId);
    if (fy) setActiveFy(fy);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'vouchers', label: 'Vouchers & Entries', icon: Receipt },
    { id: 'contra', label: 'Bank & Cash Book', icon: BookOpen },
    { id: 'assets_loans', label: 'Assets & Loans', icon: Building2 },
    { id: 'reports', label: 'CA Reports', icon: FileText },
    { id: 'settings', label: 'Backup & Settings', icon: Settings }
  ];

  const masterItems = [
    { id: 'master-parties', label: 'Parties & Contacts', icon: Users },
    { id: 'master-coa', label: 'Chart of Accounts', icon: FolderOpen },
    { id: 'master-costcenters', label: 'Cost Centers', icon: Briefcase },
    { id: 'master-paymodes', label: 'Payment Modes', icon: CreditCard },
    { id: 'master-tax', label: 'Tax & Registrations', icon: FileCheck2 },
  ];

  const handleNavClick = (id: string) => {
    setActivePage(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  const renderItem = (item: { id: string, label: string, icon: any }) => {
    const Icon = item.icon;
    // Handle specific active states for settings tabs matching the active page
    const isActive = activePage === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-lg transition-all duration-150 text-left font-medium text-xs ${
          isActive
            ? 'bg-teal-600 text-white shadow shadow-teal-900/50'
            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
      >
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
        <span>{item.label}</span>
      </button>
    );
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
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-teal-400 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-base">G</span>
            </div>
            <div>
              <h1 className="text-white font-extrabold tracking-wider text-sm leading-tight">GOSHALA ERP</h1>
              <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-widest block">Simplified Financials</span>
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
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          
          <div className="space-y-1">
            {menuItems.map(renderItem)}
          </div>

          <div className="space-y-1">
            <div className="px-4 py-2">
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Master & Setup</p>
            </div>
            {masterItems.map(renderItem)}
          </div>

        </nav>

        {/* Footer Info & Logout Button */}
        <div className="border-t border-slate-800 bg-slate-900/50 shrink-0">
          <div className="px-5 py-4 space-y-3">
            
            {/* Financial Year Info */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-teal-400">{activeFy ? activeFy.name.replace('fy-', 'FY ') : 'FY 2026-27'}</p>
              <p className="text-[10px] text-slate-400 font-mono">
                {activeFy ? `${new Date(activeFy.startDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})} - ${new Date(activeFy.endDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}` : '01 Apr 2026 - 31 Mar 2027'}
              </p>
            </div>

            <div className="h-px bg-slate-800/50 w-full" />

            {/* Organization & User Info */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-200 leading-tight">Shree Krishna Balram Goushala</p>
                <p className="text-[10px] text-slate-500">Chakrod, Shajapur (M.P.)</p>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-slate-300">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-slate-500">{user?.role || 'Goshala Treasurer'}</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between space-x-2">
              <button className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold flex items-center justify-center space-x-1.5 transition">
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Support</span>
              </button>
              
              {onLogout && (
                <button
                  onClick={() => {
                    if (setMobileOpen) setMobileOpen(false);
                    onLogout();
                  }}
                  className="py-2 px-3 bg-red-950/30 hover:bg-red-900/50 text-red-400 rounded-lg text-[10px] font-semibold flex items-center justify-center transition"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
