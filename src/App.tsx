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

  const handleKeypadPress = (digit: string) => {
    if (isFirstTime) {
      if (pin.length < 4) setPin(prev => prev + digit);
      else if (confirmPin.length < 4) setConfirmPin(prev => prev + digit);
    } else {
      if (pin.length < 4) setPin(prev => prev + digit);
    }
  };

  const handleKeypadBackspace = () => {
    if (isFirstTime) {
      if (confirmPin.length > 0) setConfirmPin(prev => prev.slice(0, -1));
      else setPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-forest-950 flex items-center justify-center p-4 z-50 font-sans text-slate-100 selection:bg-forest-500 selection:text-white">
      {/* Background glowing orb */}
      <div className="absolute w-96 h-96 bg-forest-500/10 rounded-full blur-3xl -top-20 -left-20 pointer-events-none"></div>
      <div className="absolute w-96 h-96 bg-saffron-500/10 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none"></div>

      <div className="bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-slate-750/80 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
        
        {/* Security Badge Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 bg-gradient-to-tr from-forest-700 to-forest-500 rounded-2xl flex items-center justify-center border border-forest-400/30 shadow-lg shadow-forest-900/40 transform hover:scale-105 transition">
            <span className="text-3xl">🐂</span>
          </div>
          <div>
            <h2 className="text-base font-black tracking-wider text-white">SHREE KRISHNA BALRAM GOUSHALA</h2>
            <p className="text-forest-400 text-xs font-semibold tracking-wide uppercase mt-0.5">Secured ERP & Financial Vault</p>
          </div>
        </div>

        {isFirstTime ? (
          <form onSubmit={handleCreatePin} className="space-y-5">
            <div className="p-3.5 bg-forest-950/60 border border-forest-500/30 rounded-2xl text-left space-y-1">
              <p className="text-xs font-extrabold text-forest-400">First-Time Setup (प्रथम पंजीकरण)</p>
              <p className="text-[11px] text-slate-300">Create a 4-digit security PIN to protect accounting logs.</p>
            </div>
            
            <div className="space-y-3 text-left">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Create 4-Digit Security PIN</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-[1em] text-2xl font-bold px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-emerald-400 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/40"
              />
            </div>

            <div className="space-y-3 text-left">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Confirm Security PIN</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-[1em] text-2xl font-bold px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-emerald-400 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/40"
              />
            </div>

            <button type="submit" className="w-full py-3 bg-gradient-to-r from-forest-600 to-forest-500 hover:from-forest-550 hover:to-forest-450 active:scale-95 text-white font-extrabold text-xs rounded-2xl transition shadow-lg shadow-forest-950">
              Create PIN & Enter ERP
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-xs text-slate-300 font-medium">Enter 4-digit security PIN to unlock vault</p>
            
            {/* Glowing Dot Indicators */}
            <div className="flex justify-center space-x-3 py-2">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    i < pin.length
                      ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 scale-110'
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                />
              ))}
            </div>

            <input
              type="password"
              autoComplete="new-password"
              required
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full text-center tracking-[1.2em] text-3xl font-extrabold px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-emerald-400 focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/40"
            />

            {error && (
              <p className="text-red-400 text-xs font-bold animate-bounce">
                Incorrect PIN! Please try again.
              </p>
            )}

            {/* On-screen Keypad */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:bg-forest-600 text-slate-100 font-extrabold text-lg border border-slate-700/60 shadow-sm transition active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-750 active:bg-slate-700 text-slate-400 font-bold text-xs border border-slate-700/60 transition active:scale-95"
              >
                ⌫ Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:bg-forest-600 text-slate-100 font-extrabold text-lg border border-slate-700/60 shadow-sm transition active:scale-95"
              >
                0
              </button>
              <button
                type="submit"
                className="h-12 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-extrabold text-xs shadow-md shadow-forest-950 transition active:scale-95"
              >
                ➔ Unlock
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
        return <Settings defaultTab="org" />;
      case 'master-parties':
        return <Settings defaultTab="parties" />;
      case 'master-coa':
        return <Settings defaultTab="ledgers" />;
      case 'master-costcenters':
        return <Settings defaultTab="cost_centers" />;
      case 'master-paymodes':
        return <Settings defaultTab="pay_modes" />;
      case 'master-tax':
        return <Settings defaultTab="tax" />;
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
