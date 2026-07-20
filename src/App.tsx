import React, { useState, useEffect } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { LanguageProvider } from './hooks/useLanguage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { VoucherSystem } from './pages/VoucherSystem';
import { CashWithdrawals } from './pages/CashWithdrawals';
import { AssetsLoans } from './pages/AssetsLoans';
import { AccountingReports } from './pages/AccountingReports';
import { Settings } from './pages/Settings';
import { GoshalaDB } from './db/db';

const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterInput, setShowMasterInput] = useState(false);

  useEffect(() => {
    GoshalaDB.init();
    const handlePinUpdated = () => setError(false);
    window.addEventListener('goshala_pin_updated', handlePinUpdated);
    return () => window.removeEventListener('goshala_pin_updated', handlePinUpdated);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = GoshalaDB.getAppPin();
    if (pin === correctPin) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 10) {
        setShowMasterInput(true);
      }
    }
  };

  const handleMasterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPassword === 'Pp1855141@') {
      GoshalaDB.setAppPin('1234');
      alert('PIN has been reset to default "1234" and synced to all devices. Unlocked!');
      onUnlock();
    } else {
      alert('Incorrect master password!');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-50 font-sans text-slate-100">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-750 max-w-md w-full text-center space-y-6 shadow-2xl">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-forest-600/25 rounded-2xl flex items-center justify-center border border-forest-500/50">
            <span className="text-2xl font-black text-forest-400">🐂</span>
          </div>
          <h2 className="text-sm sm:text-base font-black tracking-wide text-forest-400">SHREE KRISHNA BALRAM GOUSHALA</h2>
          <p className="text-slate-400 text-xs">Enterprise ERP & Accounting Terminal</p>
        </div>

        {showMasterInput ? (
          <form onSubmit={handleMasterSubmit} className="space-y-4">
            <p className="text-xs text-red-400 font-bold">10 failed PIN attempts. Account Locked!</p>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase block text-left">Enter Master Password</label>
              <input
                type="password"
                required
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-center px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white font-normal text-xs"
              />
            </div>
            <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold text-xs rounded-xl transition shadow">
              Verify Master Password
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-400 font-semibold">Enter your 4-digit security PIN to unlock</p>
            <input
              type="password"
              required
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full text-center tracking-[1em] text-2xl font-bold px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white"
            />
            {error && (
              <p className="text-red-400 text-xs font-bold">
                Incorrect PIN! (Attempts remaining: {10 - attempts})
              </p>
            )}
            <button type="submit" className="w-full py-2.5 bg-forest-650 hover:bg-forest-750 text-white font-bold text-xs rounded-xl transition shadow">
              Unlock Terminal
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const MainAppContent: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('goshala_erp_unlocked') === 'true';
  });
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('goshala_erp_dark') === 'true';
  });

  useEffect(() => {
    GoshalaDB.init();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('goshala_erp_dark', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('goshala_erp_dark', 'false');
    }
  }, [darkMode]);

  const handleLogout = () => {
    sessionStorage.removeItem('goshala_erp_unlocked');
    setIsUnlocked(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'vouchers':
        return <VoucherSystem />;
      case 'contra':
        return <CashWithdrawals />;
      case 'assets_loans':
        return <AssetsLoans />;
      case 'reports':
        return <AccountingReports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (!isUnlocked) {
    return <LockScreen onUnlock={() => {
      setIsUnlocked(true);
      sessionStorage.setItem('goshala_erp_unlocked', 'true');
    }} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      
      {/* Sidebar navigation with mobile drawer support */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden pl-0 md:pl-64">
        
        {/* Header tools */}
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
          onLogout={handleLogout}
        />

        {/* Dynamic page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pt-20 sm:pt-24">
          <div className="max-w-6xl mx-auto">
            {renderPage()}
          </div>
        </main>

      </div>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
