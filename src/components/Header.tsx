import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { GoshalaDB } from '../db/db';
import { FinancialYear } from '../db/schema';
import {
  Sun,
  Moon,
  Bell,
  Globe,
  Menu,
  LogOut,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  sidebarCollapsed?: boolean;
  onToggleMobileMenu?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  sidebarCollapsed = false,
  onToggleMobileMenu,
  onLogout,
}) => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [fys, setFys] = useState<FinancialYear[]>([]);
  const [activeFy, setActiveFy] = useState<string>('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>(() => {
    return (window as any)._goshala_sync_status || 'synced';
  });

  useEffect(() => {
    // Load Fys
    const allFys = GoshalaDB.getTable<FinancialYear>('fys');
    setFys(allFys);

    const currentFyId = GoshalaDB.getActiveFyId();
    setActiveFy(currentFyId);

    // Build notifications from DB accounting alerts
    const alerts: string[] = [];
    const ledgers = GoshalaDB.getTable<any>('ledgers');
    const vouchers = GoshalaDB.getTable<any>('vouchers');

    const cashL = ledgers.find((l: any) => l.id === 'l-cash');
    if (cashL && cashL.currentBalance < 0) {
      alerts.push(`Negative cash balance: ₹${Math.abs(cashL.currentBalance).toLocaleString()}`);
    }

    vouchers.forEach((v: any) => {
      if (v.status === 'POSTED') {
        const usesCash = v.entries.some((e: any) => e.ledgerId === 'l-cash');
        const debAmt = v.entries
          .filter((e: any) => e.isDebit)
          .reduce((s: number, e: any) => s + e.amount, 0);
        if (usesCash && debAmt > 2000 && v.voucherType === 'PAYMENT') {
          alerts.push(`Cash limit alert: Voucher ${v.voucherNumber} pays ₹${debAmt.toLocaleString()} (exceeds ₹2,000 limit)`);
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

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleFyChange = (fyId: string) => {
    const targetFy = fys.find((f) => f.id === fyId);
    if (targetFy && (targetFy.status === 'LOCKED' || targetFy.status === 'CLOSED')) {
      alert(
        language === 'hi'
          ? `सूचना: वित्तीय वर्ष (${targetFy.name}) अभी लॉक/बंद है।`
          : `Notice: Financial Year (${targetFy.name}) is locked/closed.`
      );
    }
    GoshalaDB.setActiveFyId(fyId);
    setActiveFy(fyId);
    window.location.reload();
  };

  return (
    <header
      className={`h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 fixed top-0 right-0 z-30 transition-[left] duration-200 ${
        sidebarCollapsed ? 'left-0 md:left-16' : 'left-0 md:left-64'
      }`}
    >
      {/* Left side: Mobile Menu Toggle & Financial Year Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Financial Year Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              FY:
            </span>
            <select
              value={activeFy}
              onChange={(e) => handleFyChange(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer pr-1"
            >
              {fys.map((fy) => (
                <option key={fy.id} value={fy.id} className="bg-white dark:bg-slate-900">
                  {fy.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Right side Toolbar Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Cloud Sync Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          {syncStatus === 'synced' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">Synced</span>
            </>
          )}
          {syncStatus === 'syncing' && (
            <>
              <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
              <span className="text-slate-600 dark:text-slate-400">Syncing</span>
            </>
          )}
          {syncStatus === 'offline' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-400">Offline</span>
            </>
          )}
        </div>

        {/* Language switch */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
          className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-[11px] uppercase">{language}</span>
        </button>

        {/* Dark Mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center relative cursor-pointer transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  System Alerts
                </span>
                <span className="text-[10px] text-slate-400">
                  {notifications.length} {notifications.length === 1 ? 'alert' : 'alerts'}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No active audit alerts
                  </div>
                ) : (
                  notifications.map((note, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5 transition-colors"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{note}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold text-xs">
            {user.name.charAt(0)}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none">
              {user.name}
            </p>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">
              {language === 'hi' ? 'कोषाध्यक्ष' : 'Treasurer'}
            </span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Lock Terminal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
