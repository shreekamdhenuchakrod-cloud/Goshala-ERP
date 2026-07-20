import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { GoshalaDB } from '../db/db';
import { FinancialYear, Role } from '../db/schema';
import { Sun, Moon, Bell, Globe, UserCheck, Check } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, setDarkMode }) => {
  const { user, setRole } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [fys, setFys] = useState<FinancialYear[]>([]);
  const [activeFy, setActiveFy] = useState<string>('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Load Fys
    const allFys = GoshalaDB.getTable<FinancialYear>('fys');
    setFys(allFys);
    
    const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
    const currentFy = allFys.find(f => f.id === config.activeFyId || f.status === 'ACTIVE');
    if (currentFy) {
      setActiveFy(currentFy.id);
    }

    // Build notifications from DB accounting alerts
    const alerts: string[] = [];
    const ledgers = GoshalaDB.getTable<any>('ledgers');
    const vouchers = GoshalaDB.getTable<any>('vouchers');

    // 1. Negative Cash Check
    const cashL = ledgers.find((l: any) => l.id === 'l-cash');
    if (cashL && cashL.currentBalance < 0) {
      alerts.push(`Audit Warning: Negative Cash balance (₹${cashL.currentBalance.toLocaleString()})`);
    }

    // 2. Cash transaction above limit (₹2,000)
    vouchers.forEach((v: any) => {
      if (v.status === 'POSTED') {
        const usesCash = v.entries.some((e: any) => e.ledgerId === 'l-cash');
        const debAmt = v.entries.filter((e: any) => e.isDebit).reduce((s: number, e: any) => s + e.amount, 0);
        if (usesCash && debAmt > 2000 && v.voucherType === 'PAYMENT') {
          alerts.push(`Cash Limit Alert: Voucher ${v.voucherNumber} pays ₹${debAmt.toLocaleString()} in cash (exceeds ₹2,000 limit)`);
        }
      }
    });

    setNotifications(alerts.slice(0, 5));
  }, []);

  const handleFyChange = (fyId: string) => {
    setActiveFy(fyId);
    const config = GoshalaDB.getTable<any>('config');
    const erpConfig = config[0] || { activeFyId: fyId };
    erpConfig.activeFyId = fyId;
    GoshalaDB.saveTable('config', [erpConfig]);
    window.location.reload(); // Reload to apply FY filters
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(e.target.value as Role);
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-10">
      
      {/* Financial Year Selector */}
      <div className="flex items-center space-x-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{t('active_financial_year')}:</span>
        <select
          value={activeFy}
          onChange={(e) => handleFyChange(e.target.value)}
          className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-forest-500"
        >
          {fys.map(fy => (
            <option key={fy.id} value={fy.id}>
              FY {fy.name} ({fy.status})
            </option>
          ))}
        </select>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center space-x-6">
        
        {/* Language switch */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-1.5"
          title="Change Language"
        >
          <Globe className="w-5 h-5" />
          <span className="text-xs font-bold font-mono">{language.toUpperCase()}</span>
        </button>

        {/* Dark Mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          title="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 relative"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-slate-100">
                Alerts & Notifications
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">No pending alerts</p>
                ) : (
                  notifications.map((note, index) => (
                    <div key={index} className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 last:border-none text-xs text-slate-600 dark:text-slate-300 leading-normal">
                      • {note}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="flex items-center space-x-3 pl-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-saffron-500 to-forest-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow">
            {user.name.charAt(0)}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-none">{user.name}</p>
            <span className="text-[9px] text-forest-600 dark:text-forest-400 font-semibold uppercase tracking-wider block mt-0.5">Goshala Manager</span>
          </div>
        </div>

      </div>
    </header>
  );
};
