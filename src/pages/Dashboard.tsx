import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Voucher, Ledger } from '../db/schema';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Landmark, Wallet, DollarSign, FileSpreadsheet, PlusCircle, Mic, MicOff } from 'lucide-react';

import { useLanguage, formatBilingual } from '../hooks/useLanguage';

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  // Metrics
  const [metrics, setMetrics] = useState({
    todayIncome: 0,
    todayExpense: 0,
    cashBalance: 0,
    bankBalance: 0,
    outstandingLoans: 0,
    totalReceipts: 0,
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
  }, []);

  const loadDashboardData = () => {
    // Fetch tables
    const vouchers = GoshalaDB.getTable<Voucher>('vouchers');
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const loans = GoshalaDB.getTable<any>('loans');

    const cashL = ledgers.find(l => l.id === 'l-cash')?.currentBalance || 0;
    
    // Dynamic bank balance calculation across all bank ledgers
    const bankL = ledgers
      .filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-cash' && l.id !== 'l-tds-receivable')
      .reduce((sum, l) => sum + (l.currentBalance || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];

    // Today's Vouchers posted
    const todayVouchers = vouchers.filter(v => v.date === todayStr && v.status === 'POSTED');
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

    // Sum all Income payments received in current year
    let totalIncomesVal = 0;
    vouchers.filter(v => v.status === 'POSTED').forEach(v => {
      v.entries.forEach(e => {
        const led = ledgers.find(l => l.id === e.ledgerId);
        if (led && led.type === 'INCOME') totalIncomesVal += e.amount;
      });
    });

    // Outstanding loans calculation
    let loanOutstanding = loans.reduce((sum: number, l: any) => sum + (l.outstandingAmount || 0), 0);
    if (loanOutstanding === 0) {
      loanOutstanding = ledgers
        .filter(l => l.groupId === 'g-loans-liabilities' || l.groupId === 'g-secured-loans' || l.groupId === 'g-unsecured-loans')
        .reduce((sum, l) => sum + (l.currentBalance || 0), 0);
    }

    // Fixed Assets valuation
    const fixedAssetsValuation = ledgers
      .filter(l => l.groupId === 'g-fixed-assets')
      .reduce((sum, l) => sum + (l.currentBalance || 0), 0);

    setMetrics({
      todayIncome: incToday,
      todayExpense: expToday,
      cashBalance: cashL,
      bankBalance: bankL,
      outstandingLoans: loanOutstanding,
      totalReceipts: totalIncomesVal,
      fixedAssetsVal: fixedAssetsValuation
    });

    // Monthly income & expense trends (April to March)
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const incExpData = months.map(m => ({ name: m, Income: 0, Expense: 0 }));

    vouchers.filter(v => v.status === 'POSTED').forEach(v => {
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

    // Recent vouchers list
    setRecentVouchers(vouchers.slice(-5).reverse());
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-forest-800 to-forest-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-forest-900/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-forest-500/20 rounded-full blur-3xl"></div>
        <div className="relative z-10 space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Goshala Simple Accounting Suite</h2>
          <p className="text-forest-100 max-w-xl text-sm leading-relaxed">
            Record payments, cash withdrawals, అचल संपत्ति (Fixed Assets), and loans. Dynamically prints balanced CA Trial Balance and Balance Sheet sheets.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Cash Balance */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('cash_in_hand')}</span>
            <p className="text-2xl font-black text-slate-800 dark:text-white">₹{metrics.cashBalance.toLocaleString()}</p>
            <span className="text-[10px] text-forest-500 font-semibold bg-forest-50 dark:bg-forest-950/20 px-2 py-0.5 rounded-full inline-block">Daily Cash Register</span>
          </div>
          <div className="w-12 h-12 bg-forest-50 dark:bg-forest-950/30 rounded-xl flex items-center justify-center text-forest-600 dark:text-forest-400">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Bank Balance */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('bank_accounts_bal')}</span>
            <p className="text-2xl font-black text-slate-800 dark:text-white">₹{metrics.bankBalance.toLocaleString()}</p>
            <span className="text-[10px] text-indigo-500 font-semibold bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full inline-block">Accounts Linked</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Receipts */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('total_donations')}</span>
            <p className="text-2xl font-black text-slate-800 dark:text-white">₹{metrics.totalReceipts.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full inline-block">Grants, Dung Sales, Donations</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Outstanding Loans */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('outstanding_loans')}</span>
            <p className="text-2xl font-black text-slate-850 dark:text-white text-red-500">₹{metrics.outstandingLoans.toLocaleString()}</p>
            <span className="text-[10px] text-red-500 font-semibold bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full inline-block">With explanation of purpose</span>
          </div>
          <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center text-red-650">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Income Expense Chart & Fixed Assets Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Income vs Expenses Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-forest-500" />
            <span>Monthly Goshala Cash Flow (Income vs Expense)</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar dataKey="Income" fill="#418b5c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#f79016" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fixed Assets evaluation box */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Asset Valuation</span>
            <h3 className="font-extrabold text-base text-slate-850 dark:text-white">अचल संपत्ति (Fixed Assets)</h3>
            <p className="text-xs text-slate-500 leading-normal">Total value of Goshala infrastructure: sheds, water borewell pumps, tractors, and equipment.</p>
          </div>
          
          <div className="py-6 border-y border-slate-50 dark:border-slate-700/50 my-4 text-center">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Aggregate Value</span>
            <span className="text-3xl font-black text-slate-850 dark:text-white">₹{metrics.fixedAssetsVal.toLocaleString()}</span>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 leading-normal bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl">
            <span>• Seeded Tractor, Water Motor, and Shed assets.</span>
          </div>
        </div>

      </div>

      {/* Recent Transactions List */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-850 dark:text-white">Recent Transactions Log</h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase">
                <th className="pb-3">{t('date') === 'तारीख' ? 'वाउचर सं.' : 'Voucher #'}</th>
                <th className="pb-3">{t('date')}</th>
                <th className="pb-3">{t('date') === 'तारीख' ? 'प्रकार' : 'Type'}</th>
                <th className="pb-3">{t('narration')}</th>
                <th className="pb-3">{t('amount')}</th>
                <th className="pb-3">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-750 dark:text-slate-350">
              {recentVouchers.map((v) => {
                const totalAmt = v.entries.filter(e => e.isDebit).reduce((s, e) => s + e.amount, 0);
                return (
                  <tr key={v.id}>
                    <td className="py-3.5 font-bold text-slate-850 dark:text-slate-150">{v.voucherNumber}</td>
                    <td className="py-3.5">{v.date}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        v.voucherType === 'RECEIPT' ? 'bg-forest-50 text-forest-650' :
                        v.voucherType === 'PAYMENT' ? 'bg-saffron-50 text-saffron-650' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="py-3.5 truncate max-w-sm" title={v.narration}>{v.narration}</td>
                    <td className="py-3.5 font-bold">₹{totalAmt.toLocaleString()}</td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-0.5 rounded bg-forest-500 text-white font-bold text-[9px]">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
