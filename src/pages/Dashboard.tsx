import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Voucher, Ledger } from '../db/schema';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Landmark, Wallet, DollarSign, FileSpreadsheet, PlusCircle, Mic, MicOff, HeartHandshake, TrendingDown, ArrowUpRight, ArrowDownRight, ArrowRight, Building2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // Metrics
  const [metrics, setMetrics] = useState({
    todayIncome: 0,
    todayExpense: 0,
    cashBalance: 0,
    bankBalance: 0,
    outstandingLoans: 0,
    totalDonations: 0,
    totalIncome: 0,
    totalExpense: 0,
    fixedAssetsVal: 0
  });

  const [chartsData, setChartsData] = useState<any[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<Voucher[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiText, setAiText] = useState('');
  const [parsedVoucher, setParsedVoucher] = useState<any | null>(null);
  const [isListening, setIsListening] = useState(false);

  const handleStartVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice Recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAiText(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      alert('Voice input error: ' + (event.error || 'Unknown error'));
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const handleParseAiCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText) return;

    const text = aiText.toLowerCase();
    
    // Extract amount using regex
    const amountMatch = text.match(/(?:rs\.?|₹|inr)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    
    if (amount <= 0) {
      alert("Could not detect amount. Please type something like 'Paid wages ₹2000' or 'Received ₹5000 donation'");
      return;
    }

    let type: 'PAYMENT' | 'RECEIPT' | 'CONTRA' = 'PAYMENT';
    let debitLedgerId = 'l-exp-chara'; // default expense
    let creditLedgerId = 'l-cash'; // default cash asset
    let narration = aiText;
    let mode = 'CASH';

    // Check payment vs receipt
    if (text.includes('received') || text.includes('donation') || text.includes('daan') || text.includes('mila') || text.includes('income') || text.includes('aaya') || text.includes('deposit')) {
      type = 'RECEIPT';
      debitLedgerId = 'l-cash';
      creditLedgerId = 'l-inc-donations';
    }

    // Check payment modes
    if (text.includes('bank') || text.includes('online') || text.includes('upi') || text.includes('transfer')) {
      mode = 'BANK_UPI';
      if (type === 'RECEIPT') {
        debitLedgerId = 'l-bank-boi';
      } else {
        creditLedgerId = 'l-bank-boi';
      }
    } else if (text.includes('cheque')) {
      mode = 'CHEQUE';
      if (type === 'RECEIPT') {
        debitLedgerId = 'l-bank-boi';
      } else {
        creditLedgerId = 'l-bank-boi';
      }
    }

    // Check expense ledgers
    if (text.includes('majduri') || text.includes('wages') || text.includes('salary') || text.includes('labor')) {
      debitLedgerId = 'l-exp-majduri';
    } else if (text.includes('bhusa') || text.includes('chara') || text.includes('feed') || text.includes('straw')) {
      debitLedgerId = 'l-exp-chara';
    } else if (text.includes('dana')) {
      debitLedgerId = 'l-exp-dana';
    } else if (text.includes('electric') || text.includes('light') || text.includes('bijli')) {
      debitLedgerId = 'l-exp-elect';
    } else if (text.includes('repair') || text.includes('marammat') || text.includes('maintenance')) {
      debitLedgerId = 'l-exp-marammat';
    }

    const allLedgers = GoshalaDB.getTable<Ledger>('ledgers');
    const debName = allLedgers.find(l => l.id === debitLedgerId)?.name || debitLedgerId;
    const credName = allLedgers.find(l => l.id === creditLedgerId)?.name || creditLedgerId;

    setParsedVoucher({
      voucherType: type,
      debitLedgerId,
      debitLedgerName: debName,
      creditLedgerId,
      creditLedgerName: credName,
      amount,
      narration,
      paymentMode: mode
    });
  };

  const handlePostAiVoucher = () => {
    if (!parsedVoucher) return;

    const configTable = GoshalaDB.getTable<any>('config')[0];
    const activeFy = GoshalaDB.getTable<any>('fys').find(f => f.id === configTable?.activeFyId);
    if (activeFy && activeFy.status !== 'ACTIVE') {
      alert(`ERROR: Financial Year (${activeFy.name}) is CLOSED. Unlock it in Settings first!`);
      return;
    }

    const entries = [
      { ledgerId: parsedVoucher.debitLedgerId, amount: parsedVoucher.amount, isDebit: true },
      { ledgerId: parsedVoucher.creditLedgerId, amount: parsedVoucher.amount, isDebit: false }
    ];

    const userTable = localStorage.getItem('goshala_erp_role') || 'SUPER_ADMIN';
    const activeUser = { id: 'active-u', username: 'active_user', name: 'Aditya Vardhan', role: userTable as any };

    const newVoucher: Voucher = {
      id: `v-${Date.now()}`,
      fyId: configTable?.activeFyId || 'fy-2025-26',
      voucherNumber: '',
      voucherType: parsedVoucher.voucherType,
      date: new Date().toISOString().split('T')[0],
      status: 'POSTED',
      costCenterId: 'cc-general',
      narration: parsedVoucher.narration,
      entries,
      attachments: [],
      paymentMode: parsedVoucher.paymentMode,
      referenceDetails: `${parsedVoucher.paymentMode} • AI Auto-Post`,
      auditTrail: []
    };

    try {
      GoshalaDB.saveVoucher(newVoucher, activeUser);
      alert('Voucher posted successfully using AI Assistant!');
      setParsedVoucher(null);
      setAiText('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Error saving voucher.');
    }
  };


  useEffect(() => {
    // Generate AI Suggestions dynamically
    const suggestions = [];
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const cash = ledgers.find(l => l.id === 'l-cash')?.currentBalance || 0;
    
    // Check cash balance
    if (cash > 25000) {
      suggestions.push("💡 Cash Excess: You have high cash in hand (₹" + cash.toLocaleString() + "). Consider depositing it in a bank account to maintain audit safety.");
    }
    if (cash < 0) {
      suggestions.push("⚠️ Cash Overdraw: Cash in hand balance is negative (₹" + cash.toLocaleString() + "). Please verify receipt double-entries to clear audit warnings.");
    }
    
    // Check cost center budgets
    const costCenters = GoshalaDB.getTable<any>('cost_centers');
    costCenters.forEach((cc: any) => {
      const limit = cc.allocatedBudget || cc.budgetLimit || 0;
      const spent = cc.spentAmount || 0;
      if (limit > 0 && spent > limit * 0.9) {
        suggestions.push("⚠️ Budget Warning: Cost center \"" + cc.name + "\" has spent " + Math.round((spent/limit)*100) + "% of its budget limit.");
      }
    });

    // Check donation 80G configuration
    const configTable = GoshalaDB.getTable<any>('config')[0];
    if (configTable && configTable.enable80G === false) {
      suggestions.push("💡 System Exemption Tip: 12A/80G donor certifications are disabled. Remember to turn them on in Settings once approvals are processed.");
    }

    if (suggestions.length === 0) {
      suggestions.push("✨ Health Check: Goshala double-entry ledgers are balanced. Cash flows are within safety limits.");
    }

    setAiSuggestions(suggestions);
    loadDashboardData();

    const handleFyChanged = () => {
      loadDashboardData();
    };

    window.addEventListener('goshala_fy_changed', handleFyChanged);
    window.addEventListener('goshala_voucher_updated', handleFyChanged);
    return () => {
      window.removeEventListener('goshala_fy_changed', handleFyChanged);
      window.removeEventListener('goshala_voucher_updated', handleFyChanged);
    };
  }, []);

  const loadDashboardData = () => {
    GoshalaDB.recalculateLedgers();

    const configTable = GoshalaDB.getTable<any>('config')[0];
    const activeFyId = configTable?.activeFyId || GoshalaDB.getActiveFyId();
    const fys = GoshalaDB.getTable<any>('fys');
    const activeFyObj = fys.find(f => f.id === activeFyId);
    const fyBalances = GoshalaDB.getLedgerBalancesForFy(activeFyId);

    // Fetch tables
    const vouchers = GoshalaDB.getTable<Voucher>('vouchers');
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const loans = GoshalaDB.getTable<any>('loans');

    const cashL = fyBalances['l-cash']?.currentBalance ?? 0;
    
    // Dynamic bank balance calculation across all bank ledgers for active FY
    const bankL = ledgers
      .filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-cash' && l.id !== 'l-tds-receivable')
      .reduce((sum, l) => sum + (fyBalances[l.id]?.currentBalance ?? 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];

    const isMatchFy = (v: Voucher) => {
      if (v.fyId && v.fyId === activeFyId) return true;
      if (activeFyObj && v.date >= activeFyObj.startDate && v.date <= activeFyObj.endDate) return true;
      if (!v.fyId && activeFyId === 'fy-2025-26' && (v.date <= '2026-03-31' || !v.date)) return true;
      return false;
    };

    // Today's Vouchers posted
    const todayVouchers = vouchers.filter(v => v.date === todayStr && v.status === 'POSTED' && isMatchFy(v));
    let incToday = 0;
    let expToday = 0;

    todayVouchers.forEach(v => {
      v.entries.forEach(e => {
        const ledger = ledgers.find(l => l.id === e.ledgerId);
        if (ledger) {
          if (ledger.type === 'INCOME') incToday += e.amount;
          if (ledger.type === 'EXPENSE') expToday += e.amount;
        }
      });
    });

    // Sum all Income and Expense payments for current year
    let totalIncomeVal = 0;
    let totalExpenseVal = 0;
    let totalDonationsVal = 0;

    vouchers.filter(v => v.status === 'POSTED' && isMatchFy(v)).forEach(v => {
      v.entries.forEach(e => {
        const led = ledgers.find(l => l.id === e.ledgerId);
        if (led) {
          if (led.type === 'INCOME') totalIncomeVal += e.amount;
          if (led.type === 'EXPENSE') totalExpenseVal += e.amount;
          if (led.id === 'l-inc-donations' || led.id === 'l-inc-grants') totalDonationsVal += e.amount;
        }
      });
    });

    // Outstanding loans calculation
    let loanOutstanding = loans.reduce((sum: number, l: any) => sum + (l.outstandingAmount || 0), 0);
    if (loanOutstanding === 0) {
      loanOutstanding = ledgers
        .filter(l => l.groupId === 'g-loans-liab' || l.groupId === 'g-loans-liabilities' || l.groupId === 'g-secured-loans' || l.groupId === 'g-unsecured-loans')
        .reduce((sum, l) => sum + (fyBalances[l.id]?.currentBalance ?? 0), 0);
    }

    // Fixed Assets valuation
    const fixedAssetsValuation = ledgers
      .filter(l => l.groupId === 'g-fixed-assets')
      .reduce((sum, l) => sum + (fyBalances[l.id]?.currentBalance ?? 0), 0);

    setMetrics({
      todayIncome: incToday,
      todayExpense: expToday,
      cashBalance: cashL,
      bankBalance: bankL,
      outstandingLoans: loanOutstanding,
      totalDonations: totalDonationsVal,
      totalIncome: totalIncomeVal,
      totalExpense: totalExpenseVal,
      fixedAssetsVal: fixedAssetsValuation
    });

    // Monthly income & expense trends (April to March)
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const incExpData = months.map(m => ({ name: m, Income: 0, Expense: 0 }));

    vouchers.filter(v => v.status === 'POSTED' && isMatchFy(v)).forEach(v => {
      const date = new Date(v.date);
      const mIdx = (date.getMonth() + 9) % 12; // Start FY from April
      
      v.entries.forEach(e => {
        const led = ledgers.find(l => l.id === e.ledgerId);
        if (led) {
          if (led.type === 'INCOME') incExpData[mIdx].Income += e.amount;
          if (led.type === 'EXPENSE') incExpData[mIdx].Expense += e.amount;
        }
      });
    });

    setChartsData(incExpData);

    // Recent vouchers list (only for active FY)
    const currentFyVouchers = vouchers.filter(v => isMatchFy(v));
    setRecentVouchers(currentFyVouchers.slice(-5).reverse());
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Welcome back, {user.name} 👋</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Here's an overview of your organization's financial health.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-sm transition shadow-xs">
            Quick Entry
          </button>
          <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-sm shadow-md shadow-teal-900/20 transition flex items-center space-x-1.5">
            <PlusCircle className="w-4 h-4" />
            <span>Create Voucher</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - 6 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Cash in Hand</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-800 dark:text-white">₹{metrics.cashBalance.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Available Balance</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Bank Balance</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-800 dark:text-white">₹{metrics.bankBalance.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">In Bank Accounts</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Donations</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-800 dark:text-white">₹{metrics.totalDonations.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">This Financial Year</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Outst. Loans</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400">₹{metrics.outstandingLoans.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Total Outstanding</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-800 dark:text-white">₹{metrics.totalExpense.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">This Financial Year</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Income</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-800 dark:text-white">₹{metrics.totalIncome.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">This Financial Year</p>
          </div>
        </div>

      </div>

      {/* Main Analytics & Asset Valuation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Analytics Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Income vs Expense Overview</h2>
            <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-md px-2 py-1 text-slate-600 dark:text-slate-300">
              <option>This Financial Year</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartsData}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="Income" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                <Area type="monotone" dataKey="Expense" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Income</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">₹{metrics.totalIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Expense</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">₹{metrics.totalExpense.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Net Saving</p>
              <p className={`text-lg font-black ${metrics.totalIncome >= metrics.totalExpense ? 'text-teal-600' : 'text-rose-600'}`}>
                ₹{(metrics.totalIncome - metrics.totalExpense).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Asset Valuation */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Building2 className="w-32 h-32" />
          </div>
          <div className="flex items-center justify-between mb-4 z-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Asset Valuation</h2>
            <button className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center">
              View Report <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>
          
          <div className="space-y-1 mb-8 z-10">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Fixed Assets (कुल संपत्ति)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Total value of Goshala infrastructure, sheds, water pumps, tractors, and equipment.</p>
          </div>
          
          <div className="mt-auto bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 z-10 border border-slate-100 dark:border-slate-700/50">
            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">Aggregate Value</span>
            <span className="text-3xl font-black text-teal-700 dark:text-teal-400">₹{metrics.fixedAssetsVal.toLocaleString()}</span>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">As per current ledger balances</p>
          </div>
        </div>
      </div>

      {/* Recent Vouchers */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Vouchers</h2>
          <button className="text-xs font-bold text-teal-600 hover:text-teal-700">View All</button>
        </div>
        
        <div className="overflow-x-auto w-full">
          {/* Strictly aligned semantic HTML table */}
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Voucher #</th>
                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Date</th>
                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Particulars / Ledger</th>
                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Party</th>
                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Type</th>
                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {recentVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <p className="text-sm font-semibold">No recent vouchers found</p>
                    <p className="text-[10px] mt-1">Try creating a new voucher.</p>
                  </td>
                </tr>
              ) : (
                recentVouchers.map((v) => {
                  const totalAmt = v.entries.filter(e => e.isDebit).reduce((s, e) => s + e.amount, 0);
                  // Resolve Party Name
                  let partyName = '-';
                  const partyEntry = v.entries.find(e => e.subLedgerId);
                  if (partyEntry) {
                    const contacts = GoshalaDB.getTable<any>('contacts');
                    const party = contacts.find((c: any) => c.id === partyEntry.subLedgerId);
                    if (party) partyName = party.name;
                  }

                  // Main Ledger (particulars)
                  const mainLedgerEntry = v.entries.find(e => e.isDebit) || v.entries[0];
                  let mainLedgerName = '-';
                  if (mainLedgerEntry) {
                    const ledgers = GoshalaDB.getTable<any>('ledgers');
                    const led = ledgers.find((l: any) => l.id === mainLedgerEntry.ledgerId);
                    if (led) mainLedgerName = led.name;
                  }

                  return (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/30 transition-colors group">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{v.voucherNumber}</td>
                      <td className="py-3 px-4 font-medium">{new Date(v.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</td>
                      <td className="py-3 px-4 font-medium max-w-[200px] truncate" title={mainLedgerName}>{mainLedgerName}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{partyName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest ${
                          v.voucherType === 'RECEIPT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          v.voucherType === 'PAYMENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                          'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        }`}>
                          {v.voucherType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white text-right">
                        ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Suggestion & Transaction Command Parser */}
      <div className="bg-gradient-to-r from-violet-900 to-indigo-950 rounded-3xl p-6 text-white space-y-4 shadow-xl">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="text-xs font-black tracking-wider uppercase text-violet-300 flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 bg-violet-400 rounded-full animate-ping inline-block"></span>
              <span>{t('ai_assistant_title')}</span>
            </h4>
            <p className="text-slate-350 text-[10px]">{t('ai_assistant_desc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: AI Suggestions list */}
          <div className="lg:col-span-1 bg-violet-950/40 p-4 rounded-2xl border border-violet-800/35 space-y-2">
            <span className="text-[10px] text-violet-300 font-extrabold uppercase tracking-wider block mb-1">{t('ai_notifications_title')}</span>
            <div className="space-y-2">
              {aiSuggestions.map((sug, i) => (
                <div key={i} className="text-xs text-indigo-100 font-semibold leading-relaxed">
                  {sug}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Natural Language Input form */}
          <div className="lg:col-span-2 space-y-3">
            <form onSubmit={handleParseAiCommand} className="space-y-2">
              <label className="text-[10px] font-extrabold text-violet-300 uppercase tracking-wider block">{t('ai_instruction_label')}</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Paid Manohar Rs 4500 for Bhusa, or Received donation Rs 5000 online from Aditya"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  className="flex-1 px-4 py-2 bg-violet-950/60 border border-violet-850 text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 font-normal"
                />
                <button
                  type="button"
                  onClick={handleStartVoice}
                  title="Voice Input (बोलकर एंट्री करें)"
                  className={`p-2.5 rounded-xl border transition flex items-center justify-center ${
                    isListening
                      ? 'bg-red-600 text-white animate-pulse border-red-500'
                      : 'bg-violet-900/60 hover:bg-violet-800 text-violet-200 border-violet-700'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-saffron-400" />}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-650 hover:bg-violet-750 text-white font-bold rounded-xl text-xs transition"
                >
                  {t('analyze_instructions_btn')}
                </button>
              </div>
            </form>

            {/* AI Parsed Transaction Preview card */}
            {parsedVoucher && (
              <div className="p-4 bg-violet-950/60 rounded-2xl border border-violet-800/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 text-xs">
                <span className="text-[10px] font-black text-violet-300 uppercase tracking-wider block">{t('ai_parsed_preview')}</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[9px] text-violet-400 block font-black uppercase">Voucher Type</span>
                    <span className="font-bold text-white bg-violet-700/60 px-2 py-0.5 rounded text-[10px] inline-block mt-0.5">{parsedVoucher.voucherType}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-violet-400 block font-black uppercase">Debit Account</span>
                    <span className="font-bold text-white block mt-0.5">{parsedVoucher.debitLedgerName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-violet-400 block font-black uppercase">Credit Account</span>
                    <span className="font-bold text-white block mt-0.5">{parsedVoucher.creditLedgerName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-violet-400 block font-black uppercase">Amount</span>
                    <span className="font-bold text-saffron-400 block text-sm mt-0.5">₹{parsedVoucher.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-violet-400 block font-black uppercase">Payment Mode</span>
                    <span className="font-bold text-white block mt-0.5">{parsedVoucher.paymentMode}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-violet-400 block font-black uppercase">Action</span>
                    <button
                      type="button"
                      onClick={handlePostAiVoucher}
                      className="mt-1 px-3 py-1 bg-forest-600 hover:bg-forest-750 text-white font-bold rounded text-[10px] shadow"
                    >
                      {t('post_entry_btn')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
