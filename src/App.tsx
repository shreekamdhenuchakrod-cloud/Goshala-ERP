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
    } catch (err) {
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
      alert('PIN must be exactly 4 digits! (सुरक्षा पिन केवल 4 अंकों का होना चाहिए)');
      return;
    }
    if (pin !== confirmPin) {
      alert('PINs do not match! (दोनों स्थान पर समान पिन दर्ज करें)');
      return;
    }
    GoshalaDB.setAppPin(pin);
    alert('Security PIN created successfully! Keep this PIN safe. (सुरक्षा पिन सफलतापूर्वक सहेजा गया!)');
    onUnlock();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === existingPin) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
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

        {isFirstTime ? (
          <form onSubmit={handleCreatePin} className="space-y-4">
            <div className="p-3 bg-forest-950/40 border border-forest-700/50 rounded-2xl text-left space-y-1">
              <p className="text-xs font-bold text-forest-400">First-Time Setup (प्रथम पंजीकरण)</p>
              <p className="text-[10px] text-slate-300">No PIN exists. Please create your own 4-digit security PIN.</p>
            </div>
            
            <div className="space-y-2 text-left">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">Create 4-Digit Security PIN</label>
              <input
                type="password"
                required
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-[1em] text-2xl font-bold px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white"
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">Confirm Security PIN</label>
              <input
                type="password"
                required
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-[1em] text-2xl font-bold px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white"
              />
            </div>

            <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold text-xs rounded-xl transition shadow">
              Create PIN & Enter ERP
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
                Incorrect PIN! Please try again.
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
