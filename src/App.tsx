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
import { doc, getDoc } from 'firebase/firestore';
import { db } from './db/firebase';
import { ShieldCheck, Delete, ArrowRight, Lock, KeyRound } from 'lucide-react';

const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(false);
  const [existingPin, setExistingPin] = useState<string>('');
  const [isFirstTime, setIsFirstTime] = useState<boolean>(false);

  useEffect(() => {
    GoshalaDB.init();
    checkPin();
    const handlePinUpdated = () => checkPin();
    window.addEventListener('goshala_pin_updated', handlePinUpdated);
    return () => window.removeEventListener('goshala_pin_updated', handlePinUpdated);
  }, []);

  const checkPin = async () => {
    let p = GoshalaDB.getAppPin();
    try {
      const pinSnap = await getDoc(doc(db, 'goshala_erp', 'security_pin'));
      if (pinSnap.exists() && pinSnap.data()?.pin) {
        p = pinSnap.data()!.pin;
        localStorage.setItem('goshala_erp_app_pin', p);
      }
    } catch {
      // Fallback
    }

    if (!p) {
      setIsFirstTime(true);
      setExistingPin('');
    } else {
      setIsFirstTime(false);
      setExistingPin(p);
    }
  };

  const handleCreatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || isNaN(Number(pin))) {
      alert('PIN must be exactly 4 digits. (सुरक्षा पिन केवल 4 अंकों का होना चाहिए)');
      return;
    }
    if (pin !== confirmPin) {
      alert('PINs do not match. (दोनों स्थान पर समान पिन दर्ज करें)');
      return;
    }
    GoshalaDB.setAppPin(pin);
    alert('Security PIN created successfully. (सुरक्षा पिन सफलतापूर्वक सहेजा गया)');
    onUnlock();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin === existingPin) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  const handleKeypadPress = (digit: string) => {
    setError(false);
    if (isFirstTime) {
      if (pin.length < 4) setPin((prev) => prev + digit);
      else if (confirmPin.length < 4) setConfirmPin((prev) => prev + digit);
    } else {
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        if (nextPin.length === 4) {
          if (nextPin === existingPin) {
            onUnlock();
          } else {
            setError(true);
            setTimeout(() => setPin(''), 300);
          }
        }
      }
    }
  };

  const handleKeypadBackspace = () => {
    setError(false);
    if (isFirstTime) {
      if (confirmPin.length > 0) setConfirmPin((prev) => prev.slice(0, -1));
      else setPin((prev) => prev.slice(0, -1));
    } else {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 z-50 font-sans transition-colors duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-6 text-center">
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
              Shree Krishna Balram Goushala
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enterprise Accounting & Financial ERP
            </p>
          </div>
        </div>

        {isFirstTime ? (
          <form onSubmit={handleCreatePin} className="space-y-4 text-left">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Initial Security Setup
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Create a 4-digit security PIN to protect accounting ledgers and audit records.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                New 4-Digit Security PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-11 text-center tracking-[0.8em] text-xl font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Confirm Security PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-11 text-center tracking-[0.8em] text-xl font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 font-medium text-xs rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Save PIN & Access System</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your 4-digit PIN to authenticate
            </p>

            {/* PIN Indicator Dots */}
            <div className="flex justify-center items-center gap-3 py-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-150 ${
                    i < pin.length
                      ? 'bg-slate-900 dark:bg-white scale-110'
                      : 'border-2 border-slate-300 dark:border-slate-700 bg-transparent'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-medium">
                Incorrect security PIN. Please try again.
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1 max-w-[260px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="h-11 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-base transition-colors active:scale-95 cursor-pointer shadow-2xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="h-11 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-2xs"
                title="Backspace"
              >
                <Delete className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-11 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-base transition-colors active:scale-95 cursor-pointer shadow-2xs"
              >
                0
              </button>
              <button
                type="submit"
                className="h-11 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-xs"
                title="Unlock"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('goshala_erp_sidebar_collapsed') === 'true';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('goshala_erp_dark') === 'true';
  });

  useEffect(() => {
    GoshalaDB.init();

    const handleNav = (e: any) => {
      if (e.detail?.page) {
        setActivePage(e.detail.page);
      }
    };
    window.addEventListener('goshala_nav', handleNav);
    return () => window.removeEventListener('goshala_nav', handleNav);
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

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('goshala_erp_sidebar_collapsed', String(next));
      return next;
    });
  };

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
    return (
      <LockScreen
        onUnlock={() => {
          setIsUnlocked(true);
          sessionStorage.setItem('goshala_erp_unlocked', 'true');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-slate-900">
      {/* Sidebar navigation with collapsible desktop rail & mobile drawer */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-[padding] duration-200 ${
          sidebarCollapsed ? 'pl-0 md:pl-16' : 'pl-0 md:pl-64'
        }`}
      >
        {/* Header tools */}
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          sidebarCollapsed={sidebarCollapsed}
          onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
          onLogout={handleLogout}
        />

        {/* Dynamic page content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pt-20 sm:pt-22">
          <div className="max-w-7xl mx-auto">
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
