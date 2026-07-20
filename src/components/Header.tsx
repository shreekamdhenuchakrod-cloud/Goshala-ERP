import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { GoshalaDB } from '../db/db';
import { FinancialYear } from '../db/schema';
import { Sun, Moon, Bell, Globe, Menu, LogOut, CloudCheck, CloudOff, RefreshCw } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onToggleMobileMenu?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, setDarkMode, onToggleMobileMenu, onLogout }) => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [fys, setFys] = useState<FinancialYear[]>([]);
  const [activeFy, setActiveFy] = useState<string>('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>(() => {
    return (window as any)._goshala_sync_status || 'synced';
  });

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

    const cashL = ledgers.find((l: any) => l.id === 'l-cash');
    if (cashL && cashL.currentBalance < 0) {
      alerts.push(`Audit Warning: Negative Cash balance (₹${cashL.currentBalance.toLocaleString()})`);
    }

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

    // Listen to Firebase Cloud Sync status
    const handleSyncStatus = (e: any) => {
      if (e.detail?.status) setSyncStatus(e.detail.status);
    };
    window.addEventListener('goshala_sync_status', handleSyncStatus);
    return () => window.removeEventListener('goshala_sync_status', handleSyncStatus);
  }, []);

  const handleFyChange = (fyId: string) => {
    setActiveFy(fyId);
    const config = GoshalaDB.getTable<any>('config');
    const erpConfig = config[0] || { activeFyId: fyId };
    erpConfig.activeFyId = fyId;
    GoshalaDB.saveTable('config', [erpConfig]);
    window.location.reload();
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-3 md:px-6 fixed top-0 right-0 left-0 md:left-64 z-20 shadow-xs">
      
      {/* Left side: Mobile Menu Button & Financial Year Selector */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center space-x-1.5">
          <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{t('active_financial_year')}:</span>
          <select
            value={activeFy}
            onChange={(e) => handleFyChange(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-forest-500 max-w-[130px] sm:max-w-none"
          >
            {fys.map(fy => (
              <option key={fy.id} value={fy.id}>
                FY {fy.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right side Toolbar Controls */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        
        {/* Firebase Cloud Sync Indicator Badge */}
        <div className="flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs"
          title={
            syncStatus === 'synced' ? 'Real-time Firebase Cloud Sync Active (डेटाबेस ऑनलाइन सिंक है)' :
            syncStatus === 'syncing' ? 'Syncing with Firebase Cloud... (डेटा सिंक हो रहा है)' :
            'Offline mode - Changes saved locally (ऑफलाइन मोड)'
          }
        >
          {syncStatus === 'synced' && (
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 space-x-1">
              <CloudCheck className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[10px]">Firebase Synced</span>
            </span>
          )}
          {syncStatus === 'syncing' && (
            <span className="flex items-center text-amber-600 dark:text-amber-400 space-x-1 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden lg:inline text-[10px]">Syncing...</span>
            </span>
          )}
          {syncStatus === 'offline' && (
            <span className="flex items-center text-red-500 dark:text-red-400 space-x-1">
              <CloudOff className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[10px]">Offline</span>
            </span>
          )}
        </div>

        {/* Language switch */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
          className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-1"
          title="Change Language"
        >
          <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[11px] font-bold font-mono">{language.toUpperCase()}</span>
        </button>

        {/* Dark Mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          title="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 relative"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-30">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
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

        {/* Profile & Logout */}
        <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-saffron-500 to-forest-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
            {user.name.charAt(0)}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-none">{user.name}</p>
            <span className="text-[9px] text-forest-600 dark:text-forest-400 font-semibold uppercase tracking-wider block mt-0.5">Goshala Manager</span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition font-bold flex items-center text-xs space-x-1"
              title="Logout / Terminal Lock (लॉगआउट)"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-bold">Logout</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
