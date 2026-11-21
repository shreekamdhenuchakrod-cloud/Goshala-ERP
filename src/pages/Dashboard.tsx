import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Voucher, Ledger } from '../db/schema';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Landmark,
  Wallet,
  Receipt,
  FileText,
  Building2,
  BookOpen,
  Plus,
  Mic,
  MicOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Search,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { KpiCard } from '../components/ui/KpiCard';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

interface ExpenseCategorySlice {
  name: string;
  value: number;
  color: string;
}

export const Dashboard: React.FC = () => {
  const { t, language } = useLanguage();

  // Metrics
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTransactions: 0,
    cashBalance: 0,
    bankBalance: 0,
    outstandingLoans: 0,
    fixedAssetsVal: 0,
    pendingTasksCount: 0,
  });

  const [chartsData, setChartsData] = useState<any[]>([]);
  const [expenseDistribution, setExpenseDistribution] = useState<ExpenseCategorySlice[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<Voucher[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<
    { id: string; title: string; desc: string; type: 'warning' | 'info' | 'success' }[]
  >([]);

  // AI Natural Language input states
  const [aiText, setAiText] = useState('');
  const [parsedVoucher, setParsedVoucher] = useState<any | null>(null);
  const [isListening, setIsListening] = useState(false);

  const handleStartVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      alert(
        "Could not detect transaction amount. Please type something like: 'Paid wages ₹2000' or 'Received ₹5000 donation'"
      );
      return;
    }

    let type: 'PAYMENT' | 'RECEIPT' | 'CONTRA' = 'PAYMENT';
    let debitLedgerId = 'l-exp-chara'; // default expense
    let creditLedgerId = 'l-cash'; // default cash asset
    const narration = aiText;
    let mode = 'CASH';

    // Check payment vs receipt
    if (
      text.includes('received') ||
      text.includes('donation') ||
      text.includes('daan') ||
      text.includes('mila') ||
      text.includes('income') ||
      text.includes('aaya') ||
      text.includes('deposit')
    ) {
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
    const debName = allLedgers.find((l) => l.id === debitLedgerId)?.name || debitLedgerId;
    const credName = allLedgers.find((l) => l.id === creditLedgerId)?.name || creditLedgerId;

    setParsedVoucher({
      voucherType: type,
      debitLedgerId,
      debitLedgerName: debName,
      creditLedgerId,
      creditLedgerName: credName,
      amount,
      narration,
      paymentMode: mode,
    });
  };

  const handlePostAiVoucher = () => {
    if (!parsedVoucher) return;

    const configTable = GoshalaDB.getTable<any>('config')[0];
    const activeFy = GoshalaDB.getTable<any>('fys').find((f) => f.id === configTable?.activeFyId);
    if (activeFy && activeFy.status !== 'ACTIVE') {
      alert(`ERROR: Financial Year (${activeFy.name}) is CLOSED. Unlock it in Settings first.`);
      return;
    }

    const entries = [
      { ledgerId: parsedVoucher.debitLedgerId, amount: parsedVoucher.amount, isDebit: true },
      { ledgerId: parsedVoucher.creditLedgerId, amount: parsedVoucher.amount, isDebit: false },
    ];

    const userTable = localStorage.getItem('goshala_erp_role') || 'SUPER_ADMIN';
    const activeUser = {
      id: 'active-u',
      username: 'active_user',
      name: 'Aditya Vardhan',
      role: userTable as any,
    };

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
      auditTrail: [],
    };

    try {
      GoshalaDB.saveVoucher(newVoucher, activeUser);
      alert('Voucher posted successfully.');
      setParsedVoucher(null);
      setAiText('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Error saving voucher.');
    }
  };

  const loadDashboardData = () => {
    GoshalaDB.recalculateLedgers();

    const configTable = GoshalaDB.getTable<any>('config')[0];
    const activeFyId = configTable?.activeFyId || GoshalaDB.getActiveFyId();
    const fys = GoshalaDB.getTable<any>('fys');
    const activeFyObj = fys.find((f) => f.id === activeFyId);
    const fyBalances = GoshalaDB.getLedgerBalancesForFy(activeFyId);

    // Fetch tables
    const vouchers = GoshalaDB.getTable<Voucher>('vouchers');
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const loans = GoshalaDB.getTable<any>('loans');

    const cashL = fyBalances['l-cash']?.currentBalance ?? 0;

    // Dynamic bank balance calculation across all bank ledgers for active FY
    const bankL = ledgers
      .filter((l) => l.groupId === 'g-current-assets' && l.id !== 'l-cash' && l.id !== 'l-tds-receivable')
      .reduce((sum, l) => sum + (fyBalances[l.id]?.currentBalance ?? 0), 0);

    const isMatchFy = (v: Voucher) => {
      if (v.fyId && v.fyId === activeFyId) return true;
      if (activeFyObj && v.date >= activeFyObj.startDate && v.date <= activeFyObj.endDate) return true;
      if (!v.fyId && activeFyId === 'fy-2025-26' && (v.date <= '2026-03-31' || !v.date)) return true;
      return false;
    };

    const currentFyVouchers = vouchers.filter((v) => v.status === 'POSTED' && isMatchFy(v));

    // Calculate Total Revenue (Income) & Total Expenses
    let totalRev = 0;
    let totalExp = 0;
    const expenseByLedger: { [ledgerName: string]: number } = {};

    currentFyVouchers.forEach((v) => {
      v.entries.forEach((e) => {
        const led = ledgers.find((l) => l.id === e.ledgerId);
        if (led) {
          if (led.type === 'INCOME') {
            totalRev += e.amount;
          }
          if (led.type === 'EXPENSE') {
            totalExp += e.amount;
            const key = led.name.replace(/\s*\(.*?\)/, ''); // Clean bilingual label
            expenseByLedger[key] = (expenseByLedger[key] || 0) + e.amount;
          }
        }
      });
    });

    const netSurplus = totalRev - totalExp;

    // Outstanding loans calculation
    let loanOutstanding = loans.reduce((sum: number, l: any) => sum + (l.outstandingAmount || 0), 0);
    if (loanOutstanding === 0) {
      loanOutstanding = ledgers
        .filter(
          (l) =>
            l.groupId === 'g-loans-liab' ||
            l.groupId === 'g-loans-liabilities' ||
            l.groupId === 'g-secured-loans' ||
            l.groupId === 'g-unsecured-loans'
        )
        .reduce((sum, l) => sum + (fyBalances[l.id]?.currentBalance ?? 0), 0);
    }

    // Fixed Assets valuation
    const fixedAssetsValuation = ledgers
      .filter((l) => l.groupId === 'g-fixed-assets')
      .reduce((sum, l) => sum + (fyBalances[l.id]?.currentBalance ?? 0), 0);

    // Monthly income & expense trends (April to March)
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const incExpData = months.map((m) => ({ name: m, Income: 0, Expense: 0 }));

    currentFyVouchers.forEach((v) => {
      const date = new Date(v.date);
      const mIdx = (date.getMonth() + 9) % 12; // Start FY from April

      v.entries.forEach((e) => {
        const led = ledgers.find((l) => l.id === e.ledgerId);
        if (led) {
          if (led.type === 'INCOME') incExpData[mIdx].Income += e.amount;
          if (led.type === 'EXPENSE') incExpData[mIdx].Expense += e.amount;
        }
      });
    });

    setChartsData(incExpData);

    // Prepare Expense Distribution slice
    const palette = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
    const expenseEntries = Object.entries(expenseByLedger)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const expenseSlices: ExpenseCategorySlice[] = expenseEntries.map(([name, value], idx) => ({
      name,
      value,
      color: palette[idx % palette.length],
    }));

    if (expenseSlices.length === 0) {
      expenseSlices.push({ name: 'General Operations', value: 1, color: '#94a3b8' });
    }
    setExpenseDistribution(expenseSlices);

    // Audit alerts / notifications
    const suggestions: { id: string; title: string; desc: string; type: 'warning' | 'info' | 'success' }[] = [];

    if (cashL < 0) {
      suggestions.push({
        id: 'neg-cash',
        title: 'Negative Cash Balance Warning',
        desc: `Cash ledger is overdrawn (₹${cashL.toLocaleString()}). Verify receipt postings.`,
        type: 'warning',
      });
    } else if (cashL > 25000) {
      suggestions.push({
        id: 'excess-cash',
        title: 'Cash In Hand Advisory',
        desc: `High cash in hand (₹${cashL.toLocaleString()}). Deposit surplus cash to bank to stay within audit limits.`,
        type: 'info',
      });
    }

    const largeCashVouchers = currentFyVouchers.filter((v) => {
      const usesCash = v.entries.some((e) => e.ledgerId === 'l-cash');
      const amt = v.entries.filter((e) => e.isDebit).reduce((s, e) => s + e.amount, 0);
      return v.voucherType === 'PAYMENT' && usesCash && amt > 2000;
    });

    if (largeCashVouchers.length > 0) {
      suggestions.push({
        id: 'cash-limit',
        title: 'Section 40A(3) Compliance Alert',
        desc: `${largeCashVouchers.length} voucher(s) exceed the ₹2,000 cash payment guideline.`,
        type: 'warning',
      });
    }

    // Budget check
    const costCenters = GoshalaDB.getTable<any>('cost_centers');
    costCenters.forEach((cc: any) => {
      const limit = cc.allocatedBudget || cc.budgetLimit || 0;
      const spent = cc.spentAmount || 0;
      if (limit > 0 && spent > limit * 0.9) {
        suggestions.push({
          id: `cc-${cc.id}`,
          title: 'Budget Threshold Warning',
          desc: `Cost center "${cc.name}" has reached ${Math.round((spent / limit) * 100)}% of its allocation.`,
          type: 'warning',
        });
      }
    });

    if (suggestions.length === 0) {
      suggestions.push({
        id: 'healthy',
        title: 'Audit System Verification',
        desc: 'All ledger books and cash entries are balanced and conform to compliance standards.',
        type: 'success',
      });
    }

    setAiSuggestions(suggestions);

    setMetrics({
      totalRevenue: totalRev,
      totalExpenses: totalExp,
      netProfit: netSurplus,
      totalTransactions: currentFyVouchers.length,
      cashBalance: cashL,
      bankBalance: bankL,
      outstandingLoans: loanOutstanding,
      fixedAssetsVal: fixedAssetsValuation,
      pendingTasksCount: suggestions.filter((s) => s.type === 'warning').length,
    });

    // Recent vouchers
    setRecentVouchers(currentFyVouchers.slice(-6).reverse());
  };

  useEffect(() => {
    loadDashboardData();

    const handleFyChanged = () => loadDashboardData();
    window.addEventListener('goshala_fy_changed', handleFyChanged);
    window.addEventListener('goshala_voucher_updated', handleFyChanged);
    return () => {
      window.removeEventListener('goshala_fy_changed', handleFyChanged);
      window.removeEventListener('goshala_voucher_updated', handleFyChanged);
    };
  }, []);

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-lg text-xs space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-[11px]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-slate-500 dark:text-slate-400">{item.name}:</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                ₹{Number(item.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Accounting Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time financial performance overview and compliance monitoring
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('ai-command-input');
              if (el) el.focus();
            }}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            <span>AI Assistant</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('goshala_nav', { detail: { page: 'contra' } }));
            }}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Cash & Bank Book</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('goshala_nav', { detail: { page: 'reports' } }));
            }}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>CA Reports</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('goshala_nav', { detail: { page: 'vouchers', openCreate: true } }));
            }}
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Voucher</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Total Revenue, Total Expenses, Net Profit, Total Orders / Vouchers, Cash & Bank, Pending Tasks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <KpiCard
          title="Total Revenue"
          value={`₹${metrics.totalRevenue.toLocaleString()}`}
          trend={{ value: 'FY Receipts', isPositive: true }}
          icon={<Receipt className="w-4 h-4" />}
        />

        <KpiCard
          title="Total Expenses"
          value={`₹${metrics.totalExpenses.toLocaleString()}`}
          trend={{ value: 'Operating Costs', isPositive: false }}
          icon={<TrendingUp className="w-4 h-4" />}
        />

        <KpiCard
          title="Net Surplus"
          value={`₹${metrics.netProfit.toLocaleString()}`}
          badge={{
            text: metrics.netProfit >= 0 ? 'Surplus' : 'Deficit',
            variant: metrics.netProfit >= 0 ? 'success' : 'danger',
          }}
          icon={
            metrics.netProfit >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
            )
          }
        />

        <KpiCard
          title="Total Vouchers"
          value={metrics.totalTransactions}
          subtitle="Posted Entries"
          icon={<FileText className="w-4 h-4" />}
        />

        <KpiCard
          title="Cash & Bank Bal"
          value={`₹${(metrics.cashBalance + metrics.bankBalance).toLocaleString()}`}
          subtitle={`Cash: ₹${metrics.cashBalance.toLocaleString()}`}
          icon={<Wallet className="w-4 h-4" />}
        />

        <KpiCard
          title="Pending Tasks"
          value={metrics.pendingTasksCount}
          badge={{
            text: metrics.pendingTasksCount === 0 ? 'Optimal' : 'Action Req',
            variant: metrics.pendingTasksCount === 0 ? 'success' : 'warning',
          }}
          icon={<AlertCircle className="w-4 h-4" />}
        />
      </div>

      {/* Charts Section: Cash Flow Overview (Income vs Expense) & Expense Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Bar Chart */}
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Business Performance Overview
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monthly income and expense cash flow distribution
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-slate-100 inline-block" />
                Income
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 inline-block" />
                Expense
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                <Bar dataKey="Income" fill="#0f172a" className="dark:fill-slate-100" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Expense" fill="#94a3b8" className="dark:fill-slate-500" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Minimal Donut Chart: Expense Breakdown */}
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Expenditure Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cost allocation by operational category
            </p>
          </div>

          <div className="h-44 relative my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {expenseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Total
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                ₹{metrics.totalExpenses >= 100000 ? `${(metrics.totalExpenses / 100000).toFixed(1)}L` : metrics.totalExpenses.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs">
            {expenseDistribution.slice(0, 4).map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="truncate">{entry.name}</span>
                </span>
                <span className="font-mono text-slate-900 dark:text-slate-200 font-medium">
                  ₹{entry.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Activities Table & Important Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities (2 Columns) */}
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Recent Activities
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Latest transaction vouchers posted to the general ledger
              </p>
            </div>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('goshala_nav', { detail: { page: 'vouchers' } }));
              }}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-2.5">Voucher #</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Type</th>
                  <th className="pb-2.5">Narration</th>
                  <th className="pb-2.5 text-right">Amount</th>
                  <th className="pb-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {recentVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No vouchers posted in this period
                    </td>
                  </tr>
                ) : (
                  recentVouchers.map((v) => {
                    const totalAmt = v.entries
                      .filter((e) => e.isDebit)
                      .reduce((s, e) => s + e.amount, 0);

                    return (
                      <tr
                        key={v.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
                      >
                        <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {v.voucherNumber}
                        </td>
                        <td className="py-3 text-slate-500">{v.date}</td>
                        <td className="py-3">
                          <Badge
                            variant={
                              v.voucherType === 'RECEIPT'
                                ? 'success'
                                : v.voucherType === 'PAYMENT'
                                ? 'danger'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {v.voucherType}
                          </Badge>
                        </td>
                        <td className="py-3 max-w-xs truncate" title={v.narration}>
                          {v.narration}
                        </td>
                        <td className="py-3 text-right font-semibold font-mono text-slate-900 dark:text-slate-100">
                          ₹{totalAmt.toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Important Notifications Card */}
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Important Notifications
            </h2>
            <Badge variant="neutral" size="sm">
              Live Audits
            </Badge>
          </div>

          <div className="space-y-3">
            {aiSuggestions.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                  item.type === 'warning'
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                    : item.type === 'success'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {item.type === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  {item.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {item.type === 'info' && <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                  <span>{item.title}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Quick Balance Summary */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Fixed Assets Value</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                ₹{metrics.fixedAssetsVal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Outstanding Debt</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                ₹{metrics.outstandingLoans.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Command Bar (Linear / Stripe inspired clean bar) */}
      <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                AI Accounting Assistant
              </h2>
              <p className="text-[11px] text-slate-500">
                Type natural language commands or speak to draft journal double-entries
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
            Smart Entry
          </span>
        </div>

        <form onSubmit={handleParseAiCommand} className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="ai-command-input"
              type="text"
              required
              placeholder="e.g. Paid Manohar Rs 4500 for Bhusa, or Received donation Rs 5000 online from Aditya"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              className="w-full h-9 pl-3 pr-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300"
            />
            <button
              type="button"
              onClick={handleStartVoice}
              title="Voice Input (बोलकर एंट्री करें)"
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${
                isListening ? 'text-rose-600 animate-pulse' : ''
              }`}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="submit"
            className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Analyze Command
          </button>
        </form>

        {/* Parsed Preview Card */}
        {parsedVoucher && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Parsed Voucher Preview
              </span>
              <Badge variant="neutral" size="sm">
                Ready to post
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Type</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {parsedVoucher.voucherType}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Debit Account</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                  {parsedVoucher.debitLedgerName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Credit Account</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                  {parsedVoucher.creditLedgerName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Amount</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
                  ₹{parsedVoucher.amount.toLocaleString()}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={handlePostAiVoucher}
                  className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Post to Books
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
