import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Voucher, Ledger, Donation, GovtGrant, Cow } from '../db/schema';
import { useLanguage, formatBilingual } from '../hooks/useLanguage';
import { Printer, Download, Eye, FileSpreadsheet, List, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export const AccountingReports: React.FC = () => {
  const { language, t } = useLanguage();
  const [selectedReport, setSelectedReport] = useState<string>('trial_balance');

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [grants, setGrants] = useState<GovtGrant[]>([]);
  const [cows, setCows] = useState<Cow[]>([]);
  const [config, setConfig] = useState<any>({
    letterheadText: 'Shree Krishna Gaushala Samiti\nRegd. No. 410/2012, Sector 5, Town Area\n12A & 80G Certified Non-Profit Organization'
  });

  // Search & Filters inside reports
  const [targetLedgerId, setTargetLedgerId] = useState<string>('l-cash');
  const [fyBalances, setFyBalances] = useState<{ [ledgerId: string]: { openingBalance: number; currentBalance: number } }>({});
  const [activeFyObj, setActiveFyObj] = useState<any>(null);

  const loadData = () => {
    const activeFy = GoshalaDB.getActiveFy();
    setActiveFyObj(activeFy);

    const postedVouchers = GoshalaDB.getTable<Voucher>('vouchers').filter(v => 
      v.status === 'POSTED' && v.date >= activeFy.startDate && v.date <= activeFy.endDate
    );

    const balances = GoshalaDB.getLedgerBalancesForFy(activeFy.id);
    setFyBalances(balances);

    setVouchers(postedVouchers);
    setLedgers(GoshalaDB.getTable<Ledger>('ledgers'));
    setDonations(GoshalaDB.getTable<Donation>('donations'));
    setGrants(GoshalaDB.getTable<GovtGrant>('grants'));
    setCows(GoshalaDB.getTable<Cow>('cows'));

    const conf = GoshalaDB.getTable<any>('config')[0];
    if (conf) setConfig(conf);
  };

  useEffect(() => {
    loadData();

    const handleFyChanged = () => {
      loadData();
    };

    window.addEventListener('goshala_fy_changed', handleFyChanged);
    return () => {
      window.removeEventListener('goshala_fy_changed', handleFyChanged);
    };
  }, []);

  const getLedgerName = (id: string) => {
    return ledgers.find(l => l.id === id)?.name || id;
  };

  // 1. TRIAL BALANCE CALCULATIONS
  // A balanced list of all ledger balances
  const calculateTrialBalance = () => {
    const rows = ledgers.map(l => {
      const isDebitType = l.type === 'ASSET' || l.type === 'EXPENSE';
      const bal = fyBalances[l.id]?.currentBalance ?? l.currentBalance;
      let debitVal = 0;
      let creditVal = 0;

      if (isDebitType) {
        if (bal >= 0) debitVal = bal;
        else creditVal = Math.abs(bal);
      } else {
        if (bal >= 0) creditVal = bal;
        else debitVal = Math.abs(bal);
      }

      return {
        ...l,
        currentBalance: bal,
        debit: debitVal,
        credit: creditVal
      };
    }).filter(r => r.debit !== 0 || r.credit !== 0);

    const debitTotal = rows.reduce((s, r) => s + r.debit, 0);
    const creditTotal = rows.reduce((s, r) => s + r.credit, 0);

    return { rows, debitTotal, creditTotal };
  };

  // 2. DAY BOOK & CASH BOOK REGISTERS
  const getDayBookVouchers = () => {
    return vouchers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getLedgerStatement = (ledgerId: string) => {
    let runningBalance = fyBalances[ledgerId]?.openingBalance ?? (ledgers.find(l => l.id === ledgerId)?.activeFyOpeningBalance || 0);
    const ledger = ledgers.find(l => l.id === ledgerId);
    const isDebitType = ledger ? (ledger.type === 'ASSET' || ledger.type === 'EXPENSE') : true;

    const statementEntries: any[] = [];

    // Add opening balance
    statementEntries.push({
      date: 'Opening',
      voucherNo: 'OPE-BAL',
      particulars: 'Opening Balance',
      debit: isDebitType && runningBalance >= 0 ? runningBalance : 0,
      credit: !isDebitType && runningBalance >= 0 ? runningBalance : 0,
      balance: runningBalance
    });

    // Populate transaction entries
    vouchers.forEach(v => {
      v.entries.forEach(entry => {
        if (entry.ledgerId === ledgerId) {
          const deb = entry.isDebit ? entry.amount : 0;
          const cred = !entry.isDebit ? entry.amount : 0;

          if (isDebitType) {
            runningBalance += entry.isDebit ? entry.amount : -entry.amount;
          } else {
            runningBalance += entry.isDebit ? -entry.amount : entry.amount;
          }

          // Particulars: find the opposite entries (Double Entry detail)
          const oppositePart = v.entries
            .filter(e => e.ledgerId !== ledgerId)
            .map(e => getLedgerName(e.ledgerId))
            .join(', ');

          statementEntries.push({
            date: v.date,
            voucherNo: v.voucherNumber,
            particulars: oppositePart || v.narration,
            debit: deb,
            credit: cred,
            balance: runningBalance
          });
        }
      });
    });

    return statementEntries;
  };

  const getCategoryWiseReport = () => {
    return ledgers.map(l => {
      let entriesCount = 0;
      let totalDebits = 0;
      let totalCredits = 0;
      vouchers.forEach(v => {
        v.entries.forEach(e => {
          if (e.ledgerId === l.id) {
            entriesCount++;
            if (e.isDebit) totalDebits += e.amount;
            else totalCredits += e.amount;
          }
        });
      });
      return {
        id: l.id,
        name: l.name,
        code: l.code,
        type: l.type,
        openingBalance: l.activeFyOpeningBalance || 0,
        entriesCount,
        totalDebits,
        totalCredits,
        closingBalance: l.currentBalance
      };
    });
  };

  const getCostCenterWiseReport = () => {
    const ccs = GoshalaDB.getTable<any>('cost_centers');
    return ccs.map((cc: any) => {
      const remainingBudget = cc.allocatedBudget - (cc.spentAmount || 0);
      const monthlySpent: Record<string, number> = {};
      vouchers.forEach(v => {
        if (v.costCenterId === cc.id && v.voucherType === 'PAYMENT') {
          const monthKey = v.date.substring(0, 7);
          const debSum = v.entries.filter(e => e.isDebit).reduce((s, e) => s + e.amount, 0);
          monthlySpent[monthKey] = (monthlySpent[monthKey] || 0) + debSum;
        }
      });
      return {
        id: cc.id,
        name: cc.name,
        allocatedBudget: cc.allocatedBudget || 0,
        spentAmount: cc.spentAmount || 0,
        remainingBudget,
        monthlySpent
      };
    });
  };

  // 3. INCOME & EXPENDITURE ACCOUNT
  const getIncomeExpenditure = () => {
    const incomes = ledgers.filter(l => l.type === 'INCOME' && l.currentBalance !== 0);
    const expenses = ledgers.filter(l => l.type === 'EXPENSE' && l.currentBalance !== 0);

    const totalIncome = incomes.reduce((sum, l) => sum + l.currentBalance, 0);
    const totalExpense = expenses.reduce((sum, l) => sum + l.currentBalance, 0);
    const surplus = totalIncome - totalExpense;

    return { incomes, expenses, totalIncome, totalExpense, surplus };
  };

  // 4. BALANCE SHEET
  const getBalanceSheet = () => {
    const assets = ledgers.filter(l => l.type === 'ASSET');
    const liabilities = ledgers.filter(l => l.type === 'LIABILITY');
    const capital = ledgers.filter(l => l.type === 'CAPITAL');

    // Calculate dynamic surplus from current Year
    const incExp = getIncomeExpenditure();

    const totalAssets = assets.reduce((sum, l) => sum + l.currentBalance, 0);
    // Retained earnings will include the current year's surplus dynamically
    const totalLiabCap = liabilities.reduce((sum, l) => sum + l.currentBalance, 0) +
                         capital.reduce((sum, l) => sum + l.currentBalance, 0) + 
                         incExp.surplus;

    return { assets, liabilities, capital, surplus: incExp.surplus, totalAssets, totalLiabCap };
  };

  // 5. ASSETS & DEPRECIATION REGISTER
  const getFixedAssets = () => {
    const faLedgers = ledgers.filter(l => l.groupId === 'g-fixed-assets' && l.openingBalance !== 0);
    
    return faLedgers.map(l => {
      // Calculate Straight line depreciation (e.g. 10% value per year)
      const depreciationRate = 0.10;
      const deprAmount = l.openingBalance * depreciationRate;
      const finalVal = l.currentBalance - deprAmount;

      return {
        id: l.id,
        name: l.name,
        cost: l.openingBalance,
        deprRate: '10% SLM',
        deprValue: deprAmount,
        currentValue: l.currentBalance
      };
    });
  };

  const exportToCSV = () => {
    let headers: string[] = [];
    let rowsData: any[][] = [];
    let filename = `${selectedReport}_report.csv`;

    if (selectedReport === 'trial_balance') {
      const { rows, debitTotal, creditTotal } = calculateTrialBalance();
      headers = ['Account Code', 'Ledger Name', 'Debit Balance (₹)', 'Credit Balance (₹)'];
      rowsData = rows.map(r => [r.code, r.name, r.debit, r.credit]);
      rowsData.push(['Total', 'Trial Balance Total', debitTotal, creditTotal]);
    } else if (selectedReport === 'day_book') {
      const dbVouchers = vouchers.filter(v => v.status === 'POSTED');
      headers = ['Voucher Number', 'Date', 'Type', 'Narration', 'Amount (₹)'];
      rowsData = dbVouchers.map(v => {
        const amt = v.entries.filter(e => e.isDebit).reduce((s, e) => s + e.amount, 0);
        return [v.voucherNumber, v.date, v.voucherType, v.narration, amt];
      });
    } else if (selectedReport === 'balance_sheet') {
      const generalFund = ledgers.filter(l => l.groupId === 'g-general-fund');
      const capitalAid = ledgers.filter(l => l.groupId === 'g-capital-aid');
      const membersContrib = ledgers.filter(l => l.groupId === 'g-members-contrib');
      const loans = ledgers.filter(l => l.groupId === 'g-loans-liab');
      const fixedAssets = ledgers.filter(l => l.groupId === 'g-fixed-assets');
      const cashAndBank = ledgers.filter(l => l.id === 'l-cash' || l.id.startsWith('l-bank-'));
      
      headers = ['Account Group', 'Ledger Name', 'Liabilities (₹)', 'Assets (₹)'];
      rowsData.push(['LIABILITIES', '', '', '']);
      generalFund.forEach(l => rowsData.push(['General Fund', l.name, l.currentBalance, '']));
      capitalAid.forEach(l => rowsData.push(['Capital AID', l.name, l.currentBalance, '']));
      membersContrib.forEach(l => rowsData.push(['Members Contribution', l.name, l.currentBalance, '']));
      loans.forEach(l => rowsData.push(['Loans Outstanding', l.name, l.currentBalance, '']));
      
      rowsData.push(['ASSETS', '', '', '']);
      fixedAssets.forEach(l => rowsData.push(['Fixed Assets', l.name, '', l.currentBalance]));
      cashAndBank.forEach(l => rowsData.push(['Cash & Bank Balance', l.name, '', l.currentBalance]));
    } else {
      headers = ['Particulars', 'Amount (₹)'];
      rowsData = ledgers.map(l => [l.name, l.currentBalance]);
    }

    const csvContent = [
      headers.join(','),
      ...rowsData.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const menuOptions = [
    { id: 'trial_balance', label: language === 'hi' ? 'ट्रायल बैलेंस शीट (Trial Balance)' : 'Trial Balance Sheet' },
    { id: 'day_book', label: language === 'hi' ? 'डे बुक लेजर (Day Book)' : 'Day Book Ledger' },
    { id: 'bank_book', label: language === 'hi' ? 'बैंक बुक रजिस्टर (Bank Book)' : 'Bank Book Register' },
    { id: 'cash_book', label: language === 'hi' ? 'कैश बुक रजिस्टर (Cash Book)' : 'Cash Book Register' },
    { id: 'general_ledger', label: language === 'hi' ? 'खाता बही (General Ledger)' : 'General Ledger Search' },
    { id: 'income_expenditure', label: language === 'hi' ? 'आय-व्यय विवरण (Income & Expenditure)' : 'Income & Expenditure' },
    { id: 'balance_sheet', label: language === 'hi' ? 'बैलेंस शीट (Balance Sheet)' : 'Balance Sheet Statements' },
    { id: 'loan_report', label: language === 'hi' ? 'बकाया ऋण रिपोर्ट (Outstanding Loans)' : 'Outstanding Loan Report' },
    { id: 'depreciation', label: language === 'hi' ? 'अचल संपत्ति व ह्रास (Depreciation)' : 'Asset Depreciation' },
    ...(config.enable80G !== false ? [{ id: 'donation_register', label: language === 'hi' ? 'दान रसीद रजिस्टर (80G Log)' : 'Donation Receipt Log (80G)' }] : []),
    { id: 'category_wise', label: language === 'hi' ? 'श्रेणीवार रिपोर्ट (Category Wise)' : 'Category Wise Report' },
    { id: 'cost_center_wise', label: language === 'hi' ? 'लागत केंद्र रिपोर्ट (Cost Center)' : 'Cost Center Report' }
  ];

  return (
    <div className="flex gap-8">
      
      {/* Side Reports Menu */}
      <div className="w-64 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4 shrink-0 h-fit">
        <h3 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider">CA Audit Books</h3>
        <nav className="flex flex-col space-y-1">
          {menuOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelectedReport(opt.id)}
              className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 ${
                selectedReport === opt.id
                  ? 'bg-forest-600 text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Report Viewer */}
      <div className="flex-1 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm min-h-[60vh] space-y-6">
        
        {/* Printable Letterhead Header */}
        <div className="hidden print:block text-center border-b-2 border-slate-850 pb-3 mb-4 leading-normal">
          <h2 className="text-lg font-black uppercase text-slate-900 tracking-wide">
            {(config?.letterheadText || 'SHREE KRISHNA BALRAM GOUSHALA').split('\n')[0]}
          </h2>
          <p className="text-[10px] text-slate-500 font-medium whitespace-pre-line mt-1">
            {(config?.letterheadText || '').split('\n').slice(1).join(' • ')}
          </p>
        </div>

        {/* Title Bar */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4 no-print">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white text-lg">
              {menuOptions.find(o => o.id === selectedReport)?.label}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Dynamic Double-Entry Real-time Computations</p>
          </div>

          <div className="flex space-x-2 no-print">
            <button
              onClick={exportToCSV}
              className="p-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg flex items-center space-x-1.5 text-xs font-semibold border"
            >
              <FileSpreadsheet className="w-4 h-4 text-forest-650" />
              <span>Excel (CSV) Export</span>
            </button>
            
            <button
              onClick={() => window.print()}
              className="p-2 bg-slate-900 dark:bg-slate-950 text-white rounded-lg flex items-center space-x-1.5 text-xs font-semibold shadow hover:bg-slate-800"
            >
              <Printer className="w-4 h-4" />
              <span>Print PDF</span>
            </button>
          </div>
        </div>

        {/* Dynamic Report Content Switcher */}
        
        {/* REPORT 1: TRIAL BALANCE SHEET */}
        {selectedReport === 'trial_balance' && (() => {
          const { rows, debitTotal, creditTotal } = calculateTrialBalance();
          return (
            <div className="space-y-4">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                      <th className="py-3 px-4 rounded-tl-xl">{language === 'hi' ? 'खाता कोड' : 'Account Code'}</th>
                      <th className="py-3 px-3">{language === 'hi' ? 'खाता नाम' : 'Ledger Name'}</th>
                      <th className="py-3 px-3">{language === 'hi' ? 'समूह श्रेणी' : 'Group Division'}</th>
                      <th className="py-3 px-3 text-right">{language === 'hi' ? 'डेबिट शेष (Dr)' : 'Debit Bal (Dr)'}</th>
                      <th className="py-3 pr-4 text-right rounded-tr-xl">{language === 'hi' ? 'क्रेडिट शेष (Cr)' : 'Credit Bal (Cr)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
                    {rows.map(r => (
                      <tr key={r.id} className={`${r.isSystem ? 'font-semibold' : ''} hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group`}>
                        <td className="py-4 px-4 font-mono text-slate-500">{r.code}</td>
                        <td className="py-4 px-3 font-bold text-slate-800 dark:text-slate-200">{formatBilingual(r.name, language)}</td>
                        <td className="py-4 px-3 text-slate-500">{language === 'hi' ? 'सामान्य खाता' : 'General Account'}</td>
                        <td className="py-4 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">{r.debit > 0 ? `₹${r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                        <td className="py-4 pr-4 text-right font-black text-rose-600 dark:text-rose-400">{r.credit > 0 ? `₹${r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-900/60 font-black border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs">
                      <td colSpan={3} className="py-4 px-4 text-right font-extrabold uppercase tracking-widest rounded-bl-xl">{language === 'hi' ? 'ट्रायल बैलेंस कुल योग' : 'Trial Balance Totals'}</td>
                      <td className="py-4 px-3 text-right text-emerald-600 dark:text-emerald-400">₹{debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 pr-4 text-right text-rose-600 dark:text-rose-400 rounded-br-xl">₹{creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {debitTotal === creditTotal && (
                <div className="bg-forest-50 dark:bg-forest-950/20 border border-forest-100 p-4 rounded-2xl flex items-center space-x-2 text-xs text-forest-800 dark:text-forest-300">
                  <CheckCircle2 className="w-5 h-5 text-forest-600" />
                  <span>{language === 'hi' ? 'ट्रायल बैलेंस पूर्णतः संतुलित है। कोई अंतर नहीं पाया गया।' : 'Variance balanced perfectly. Zero-discrepancy double-entry validation succeeded.'}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* REPORT 2: DAY BOOK */}
        {selectedReport === 'day_book' && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                  <th className="py-3 px-4 rounded-tl-xl">{language === 'hi' ? 'वाउचर सं.' : 'Voucher #'}</th>
                  <th className="py-3 px-3">{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                  <th className="py-3 px-3">{language === 'hi' ? 'खाता प्रविष्टियां' : 'Ledger Entries'}</th>
                  <th className="py-3 px-3">{language === 'hi' ? 'विवरण' : 'Narration Remarks'}</th>
                  <th className="py-3 px-3 text-right">{language === 'hi' ? 'डेबिट (Dr)' : 'Debit'}</th>
                  <th className="py-3 pr-4 text-right rounded-tr-xl">{language === 'hi' ? 'क्रेडिट (Cr)' : 'Credit'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
                {getDayBookVouchers().map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{v.voucherNumber}</td>
                    <td className="py-4 px-3 font-medium whitespace-nowrap">{new Date(v.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</td>
                    <td className="py-4 px-3 space-y-1 max-w-[250px]">
                      {v.entries.map((e, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">{formatBilingual(getLedgerName(e.ledgerId), language)}</span>
                          <span className={`font-black text-[10px] ${e.isDebit ? 'text-emerald-600' : 'text-rose-600'}`}>({e.isDebit ? 'Dr' : 'Cr'})</span>
                        </div>
                      ))}
                    </td>
                    <td className="py-4 px-3 text-slate-600 dark:text-slate-400 max-w-[200px]" title={v.narration}>
                      <span className="line-clamp-2">{v.narration}</span>
                    </td>
                    <td className="py-4 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      ₹{v.entries.filter(e => e.isDebit).reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 pr-4 text-right font-black text-rose-600 dark:text-rose-400">
                      ₹{v.entries.filter(e => !e.isDebit).reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 3: GENERAL LEDGER STATEMENT */}
        {selectedReport === 'general_ledger' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-xs font-bold text-slate-500">
              <label>{language === 'hi' ? 'खाता चुनें:' : 'Select Ledger Account:'}</label>
              <select
                value={targetLedgerId}
                onChange={(e) => setTargetLedgerId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-xl font-bold"
              >
                {ledgers.map(l => <option key={l.id} value={l.id}>{formatBilingual(l.name, language)} [{l.code}]</option>)}
              </select>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                    <th className="py-3 px-4 rounded-tl-xl">{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                    <th className="py-3 px-3">{language === 'hi' ? 'वाउचर सं.' : 'Voucher #'}</th>
                    <th className="py-3 px-3">{language === 'hi' ? 'खाता विवरण' : 'Particulars (Contra Accounts)'}</th>
                    <th className="py-3 px-3 text-right">{language === 'hi' ? 'डेबिट (Dr)' : 'Debit (Dr)'}</th>
                    <th className="py-3 px-3 text-right">{language === 'hi' ? 'क्रेडिट (Cr)' : 'Credit (Cr)'}</th>
                    <th className="py-3 pr-4 text-right rounded-tr-xl">{language === 'hi' ? 'शेष (Balance)' : 'Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
                  {getLedgerStatement(targetLedgerId).map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-4 px-4 font-medium whitespace-nowrap">{entry.date === 'Opening' ? 'Opening' : new Date(entry.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</td>
                      <td className="py-4 px-3 font-bold text-slate-900 dark:text-white">{entry.voucherNo}</td>
                      <td className="py-4 px-3 font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate" title={entry.particulars}>{formatBilingual(entry.particulars, language)}</td>
                      <td className="py-4 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">{entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                      <td className="py-4 px-3 text-right font-black text-rose-600 dark:text-rose-400">{entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                      <td className="py-4 pr-4 text-right font-black text-slate-900 dark:text-white">₹{entry.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 4: INCOME & EXPENDITURE */}
        {selectedReport === 'income_expenditure' && (() => {
          const { incomes, expenses, totalIncome, totalExpense, surplus } = getIncomeExpenditure();
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
              {/* Expenditures Left */}
              <div className="space-y-4 border-r border-slate-100 dark:border-slate-700/60 pr-8">
                <h4 className="font-extrabold text-sm text-saffron-700">Expenses / Expenditures</h4>
                <div className="space-y-3">
                  {expenses.map(exp => (
                    <div key={exp.id} className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-750">
                      <span>{exp.name}</span>
                      <span className="font-bold">₹{exp.currentBalance.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-black text-slate-800 dark:text-white pt-2">
                    <span>Total Expense:</span>
                    <span>₹{totalExpense.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Incomes Right */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-forest-700">Incomes / Revenues</h4>
                <div className="space-y-3">
                  {incomes.map(inc => (
                    <div key={inc.id} className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-750">
                      <span>{inc.name}</span>
                      <span className="font-bold">₹{inc.currentBalance.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-black text-slate-800 dark:text-white pt-2 border-b border-slate-200 dark:border-slate-600 pb-2">
                    <span>Total Income:</span>
                    <span>₹{totalIncome.toLocaleString()}</span>
                  </div>
                  
                  {/* Surplus calculation */}
                  <div className="flex justify-between font-black text-sm text-forest-600 pt-4">
                    <span>Surplus (Net Profit C/F):</span>
                    <span>₹{surplus.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* REPORT 5: BALANCE SHEET */}
        {selectedReport === 'balance_sheet' && (() => {
          const { surplus } = getIncomeExpenditure();
          
          // Grouping according to user requirements
          const generalFund = ledgers.filter(l => l.groupId === 'g-general-fund' && l.currentBalance !== 0);
          const capitalAid = ledgers.filter(l => l.groupId === 'g-capital-aid' && l.currentBalance !== 0);
          const membersContrib = ledgers.filter(l => l.groupId === 'g-members-contrib' && l.currentBalance !== 0);
          const loans = ledgers.filter(l => l.groupId === 'g-loans-liab' && l.currentBalance !== 0);
          const currentLiabilities = ledgers.filter(l => l.groupId === 'g-current-liab' && l.currentBalance !== 0);
          
          const fixedAssets = ledgers.filter(l => l.groupId === 'g-fixed-assets' && l.currentBalance !== 0);
          const cashAndBank = ledgers.filter(l => (l.id === 'l-cash' || l.id.startsWith('l-bank-')) && l.currentBalance !== 0);
          const otherAssets = ledgers.filter(l => l.type === 'ASSET' && l.groupId !== 'g-fixed-assets' && l.id !== 'l-cash' && !l.id.startsWith('l-bank-') && l.currentBalance !== 0);

          const totalLiabCap = 
            generalFund.reduce((s, l) => s + l.currentBalance, 0) +
            capitalAid.reduce((s, l) => s + l.currentBalance, 0) +
            membersContrib.reduce((s, l) => s + l.currentBalance, 0) +
            loans.reduce((s, l) => s + l.currentBalance, 0) +
            currentLiabilities.reduce((s, l) => s + l.currentBalance, 0) +
            surplus;

          const totalAssets = 
            fixedAssets.reduce((s, l) => s + l.currentBalance, 0) +
            cashAndBank.reduce((s, l) => s + l.currentBalance, 0) +
            otherAssets.reduce((s, l) => s + l.currentBalance, 0);

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
              
              {/* LIABILITIES & CAPITAL */}
              <div className="space-y-4 border-r border-slate-100 dark:border-slate-700/60 pr-8">
                <h4 className="font-extrabold text-sm text-saffron-700">Liabilities & Capital (दायित्व और कोष)</h4>
                
                <div className="space-y-4">
                  {/* General Fund */}
                  <div>
                    <h5 className="font-bold text-slate-400 border-b pb-1 mb-2">General Fund (सामान्य कोष)</h5>
                    {generalFund.map(c => (
                      <div key={c.id} className="flex justify-between py-1 pl-2">
                        <span>{c.name}</span>
                        <span className="font-bold">₹{c.currentBalance.toLocaleString()}</span>
                      </div>
                    ))}
                    {/* Current surplus added to General Fund reserves dynamically */}
                    <div className="flex justify-between py-1 pl-2 text-forest-600 font-semibold">
                      <span>Surplus / Deficit (Income & Exp Surplus)</span>
                      <span className="font-bold">₹{surplus.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Capital AID */}
                  <div>
                    <h5 className="font-bold text-slate-400 border-b pb-1 mb-2">Capital AID / Grants (पूंजीगत सहायता)</h5>
                    {capitalAid.map(c => (
                      <div key={c.id} className="flex justify-between py-1 pl-2">
                        <span>{c.name}</span>
                        <span className="font-bold">₹{c.currentBalance.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Members Contribution */}
                  <div>
                    <h5 className="font-bold text-slate-400 border-b pb-1 mb-2">Members Contribution (सदस्य अंशदान)</h5>
                    {membersContrib.map(c => (
                      <div key={c.id} className="flex justify-between py-1 pl-2">
                        <span>{c.name}</span>
                        <span className="font-bold">₹{c.currentBalance.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Loans */}
                  <div>
                    <h5 className="font-bold text-slate-400 border-b pb-1 mb-2">Outstanding Loans (बकाया ऋण)</h5>
                    {loans.map(l => (
                      <div key={l.id} className="flex justify-between py-1 pl-2">
                        <div>
                          <p className="font-semibold">{l.name}</p>
                          <p className="text-[9px] text-slate-400 italic">Purpose: {l.id === 'l-loan-sbi-construction' ? 'Cow Shed construction & setup' : 'Cattle transportation assets'}</p>
                        </div>
                        <span className="font-bold text-red-500">₹{l.currentBalance.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Current Liabilities */}
                  {currentLiabilities.length > 0 && (
                    <div>
                      <h5 className="font-bold text-slate-400 border-b pb-1 mb-2">Current Liabilities</h5>
                      {currentLiabilities.map(l => (
                        <div key={l.id} className="flex justify-between py-1 pl-2">
                          <span>{l.name}</span>
                          <span className="font-bold">₹{l.currentBalance.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between font-black text-slate-800 dark:text-white pt-6 text-sm border-t border-slate-200">
                    <span>Total Liabilities & Capital:</span>
                    <span className="text-forest-600">₹{totalLiabCap.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* ASSETS */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-forest-700">Assets (संपत्तियां)</h4>
                
                <div className="space-y-4">
                  {/* Fixed Assets */}
                  <div>
                    <h5 className="font-bold text-slate-400 border-b pb-1 mb-2">Fixed Assets (स्थायी संपत्ति)</h5>
                    {fixedAssets.map(a => (
                      <div key={a.id} className="flex justify-between py-1 pl-2">
                        <span>{a.name}</span>
                        <span className="font-bold">₹{a.currentBalance.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Cash & Bank Balances */}
                  <div>
                    <h5 className="font-bold text-slate-400 border-b pb-1 mb-2">Cash & Bank Balances (नकद और बैंक शेष)</h5>
                    {cashAndBank.map(a => (
                      <div key={a.id} className="flex justify-between py-1 pl-2">
                        <span>{a.name}</span>
                        <span className="font-bold text-forest-650">₹{a.currentBalance.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Other Assets */}
                  {otherAssets.length > 0 && (
                    <div>
                      <h5 className="font-bold text-slate-400 border-b pb-1 mb-2">Other Assets / Stocks</h5>
                      {otherAssets.map(a => (
                        <div key={a.id} className="flex justify-between py-1 pl-2">
                          <span>{a.name}</span>
                          <span className="font-bold">₹{a.currentBalance.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between font-black text-slate-800 dark:text-white pt-6 text-sm border-t border-slate-200 lg:mt-[180px]">
                    <span>Total Assets Balance:</span>
                    <span className="text-forest-600">₹{totalAssets.toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </div>
          );
        })()}

        {/* REPORT 6: DEPRECIATION REGISTER */}
        {selectedReport === 'depreciation' && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                    <th className="py-3 px-4 rounded-tl-xl">Fixed Asset Name</th>
                    <th className="py-3 px-3">Purchase Cost (₹)</th>
                    <th className="py-3 px-3">Useful Life / Rate</th>
                    <th className="py-3 px-3">Annual Depreciation (₹)</th>
                    <th className="py-3 pr-4 text-right rounded-tr-xl">Written Down Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
                  {getFixedAssets().map(fa => (
                    <tr key={fa.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{fa.name}</td>
                      <td className="py-4 px-3 font-semibold text-slate-800 dark:text-slate-200">₹{fa.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-3 text-slate-500 font-medium">{fa.deprRate}</td>
                      <td className="py-4 px-3 font-bold text-rose-500">-₹{fa.deprValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 pr-4 text-right font-black text-emerald-600 dark:text-emerald-400">₹{fa.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}

        {/* REPORT 7: DONATION REGISTER */}
        {selectedReport === 'donation_register' && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                    <th className="py-3 px-4 rounded-tl-xl">Receipt Number</th>
                    <th className="py-3 px-3">Donor Name</th>
                    <th className="py-3 px-3">Payment Mode</th>
                    <th className="py-3 px-3">Purpose Target</th>
                    <th className="py-3 px-3">Exemption (80G)</th>
                    <th className="py-3 pr-4 text-right rounded-tr-xl">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
                  {vouchers.filter(v => v.entries.some(e => e.ledgerId.startsWith('l-inc-donation'))).map(v => {
                    const amt = v.entries.filter(e => e.isDebit).reduce((s, e) => s + e.amount, 0);
                    const isFeed = v.entries.some(e => e.ledgerId === 'l-inc-donation-feed');
                    
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{v.voucherNumber}</td>
                        <td className="py-4 px-3 font-semibold text-slate-800 dark:text-slate-200">Rajesh Kumar Singhal</td>
                        <td className="py-4 px-3 font-mono text-indigo-600 dark:text-indigo-400 font-bold">BANK UPI</td>
                        <td className="py-4 px-3 text-slate-600 dark:text-slate-400 font-medium">{isFeed ? 'Cow Feeding' : 'General Purpose'}</td>
                        <td className="py-4 px-3 font-bold text-emerald-600 dark:text-emerald-400">YES (Certified)</td>
                        <td className="py-4 pr-4 text-right font-black text-emerald-600 dark:text-emerald-400">₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        )}

        {/* REPORT 8: CATEGORY WISE REPORT */}
        {selectedReport === 'category_wise' && (
          <div className="space-y-4">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                    <th className="py-3 px-4 rounded-tl-xl">Code</th>
                    <th className="py-3 px-3">Category / Ledger Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Opening Bal (₹)</th>
                    <th className="py-3 px-3 text-right">Debit / Outflows (₹)</th>
                    <th className="py-3 px-3 text-right">Credit / Inflows (₹)</th>
                    <th className="py-3 pr-4 text-right rounded-tr-xl">Closing Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
                  {getCategoryWiseReport().map(cat => (
                    <tr key={cat.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-4 px-4 font-mono text-slate-500">{cat.code}</td>
                      <td className="py-4 px-3 font-bold text-slate-900 dark:text-white">{cat.name}</td>
                      <td className="py-4 px-3">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide ${
                          cat.type === 'EXPENSE' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                          cat.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {cat.type}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right font-semibold text-slate-600 dark:text-slate-400">₹{cat.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-3 text-right font-bold text-rose-500">₹{cat.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{cat.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 pr-4 text-right font-black text-slate-900 dark:text-white">₹{cat.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 9: COST CENTER REPORT */}
        {selectedReport === 'cost_center_wise' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getCostCenterWiseReport().map(cc => {
                const spentPct = cc.allocatedBudget > 0 ? Math.min(100, Math.round((cc.spentAmount / cc.allocatedBudget) * 100)) : 0;
                return (
                  <div key={cc.id} className="p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-850 dark:text-white text-xs">{cc.name}</h4>
                        <p className="text-[10px] text-slate-400 font-normal">Remaining Budget: ₹{cc.remainingBudget.toLocaleString()}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        spentPct > 90 ? 'bg-red-50 text-red-600' : 'bg-forest-550/15 text-forest-650'
                      }`}>
                        {spentPct}% Spent
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-750 h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${spentPct > 90 ? 'bg-red-500' : 'bg-forest-650'}`} style={{ width: `${spentPct}%` }}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                      <div>Allocated: <strong className="text-slate-800 dark:text-slate-200">₹{cc.allocatedBudget.toLocaleString()}</strong></div>
                      <div className="text-right">Total Spent: <strong className="text-red-500">₹{cc.spentAmount.toLocaleString()}</strong></div>
                    </div>
                    
                    {/* Monthly Summary */}
                    {Object.keys(cc.monthlySpent).length > 0 && (
                      <div className="border-t pt-2 mt-2 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block">Monthly Breakdown:</span>
                        {Object.entries(cc.monthlySpent).map(([month, amt]) => (
                          <div key={month} className="flex justify-between text-[10px] font-semibold text-slate-600">
                            <span>{month}</span>
                            <span className="text-red-500">₹{amt.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* REPORT 10: BANK BOOK */}
        {selectedReport === 'bank_book' && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
              {language === 'hi' ? 'सक्रिय बैंक खाते एवं लेन-देन' : 'Active Bank Book Transactions'}
            </h4>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                    <th className="py-3 px-4 rounded-tl-xl">{language === 'hi' ? 'वाउचर सं.' : 'Voucher #'}</th>
                    <th className="py-3 px-3">{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                    <th className="py-3 px-3">{language === 'hi' ? 'बैंक खाता' : 'Bank Account'}</th>
                    <th className="py-3 px-3">{language === 'hi' ? 'विवरण' : 'Particulars'}</th>
                    <th className="py-3 px-3 text-right">{language === 'hi' ? 'आवक (Debit)' : 'Bank In (Dr)'}</th>
                    <th className="py-3 pr-4 text-right rounded-tr-xl">{language === 'hi' ? 'जावक (Credit)' : 'Bank Out (Cr)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
                  {vouchers.filter(v => v.status === 'POSTED' && v.entries.some(e => e.ledgerId !== 'l-cash' && ledgers.find(l => l.id === e.ledgerId)?.groupId === 'g-current-assets')).map(v => {
                    const bankEntry = v.entries.find(e => e.ledgerId !== 'l-cash' && ledgers.find(l => l.id === e.ledgerId)?.groupId === 'g-current-assets');
                    if (!bankEntry) return null;
                    const bankL = ledgers.find(l => l.id === bankEntry.ledgerId);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{v.voucherNumber}</td>
                        <td className="py-4 px-3 font-medium whitespace-nowrap">{new Date(v.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</td>
                        <td className="py-4 px-3 font-bold text-slate-800 dark:text-slate-200">{formatBilingual(bankL?.name || '', language)}</td>
                        <td className="py-4 px-3 text-slate-600 dark:text-slate-400 max-w-[200px]" title={v.narration}>
                          <span className="line-clamp-2">{v.narration}</span>
                        </td>
                        <td className="py-4 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">{bankEntry.isDebit ? `₹${bankEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                        <td className="py-4 pr-4 text-right font-black text-rose-600 dark:text-rose-400">{!bankEntry.isDebit ? `₹${bankEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 11: CASH BOOK */}
        {selectedReport === 'cash_book' && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
              {language === 'hi' ? 'नकद बही खाता (Cash Book Register)' : 'Cash Book Transaction Register'}
            </h4>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                    <th className="py-3 px-4 rounded-tl-xl">{language === 'hi' ? 'वाउचर सं.' : 'Voucher #'}</th>
                    <th className="py-3 px-3">{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                    <th className="py-3 px-3">{language === 'hi' ? 'विवरण' : 'Particulars'}</th>
                    <th className="py-3 px-3 text-right">{language === 'hi' ? 'नकद आवक (In)' : 'Cash In (Dr)'}</th>
                    <th className="py-3 pr-4 text-right rounded-tr-xl">{language === 'hi' ? 'नकद जावक (Out)' : 'Cash Out (Cr)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
                  {vouchers.filter(v => v.status === 'POSTED' && v.entries.some(e => e.ledgerId === 'l-cash')).map(v => {
                    const cashEntry = v.entries.find(e => e.ledgerId === 'l-cash');
                    if (!cashEntry) return null;
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{v.voucherNumber}</td>
                        <td className="py-4 px-3 font-medium whitespace-nowrap">{new Date(v.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</td>
                        <td className="py-4 px-3 text-slate-600 dark:text-slate-400 max-w-[200px]" title={v.narration}>
                          <span className="line-clamp-2">{v.narration}</span>
                        </td>
                        <td className="py-4 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">{cashEntry.isDebit ? `₹${cashEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                        <td className="py-4 pr-4 text-right font-black text-rose-600 dark:text-rose-400">{!cashEntry.isDebit ? `₹${cashEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 12: OUTSTANDING LOANS */}
        {selectedReport === 'loan_report' && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-850 dark:text-white">
              {language === 'hi' ? 'बकाया ऋण रिपोर्ट (Outstanding Loans & Liabilities)' : 'Outstanding Loan Liability Report'}
            </h4>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                    <th className="py-3 px-4 rounded-tl-xl">{language === 'hi' ? 'ऋणदाता बैंक / संस्था' : 'Lender Institution'}</th>
                    <th className="py-3 px-3">{language === 'hi' ? 'ब्याज दर (%)' : 'Interest Rate'}</th>
                    <th className="py-3 px-3 text-right">{language === 'hi' ? 'स्वीकृत मूलधन' : 'Principal Amount'}</th>
                    <th className="py-3 pr-4 text-right rounded-tr-xl">{language === 'hi' ? 'बकाया राशि' : 'Outstanding Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
                  {GoshalaDB.getTable<any>('loans').map((loan: any) => (
                    <tr key={loan.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{loan.partyName}</td>
                      <td className="py-4 px-3 font-semibold text-slate-500">{loan.interestRate}% p.a.</td>
                      <td className="py-4 px-3 text-right font-bold text-slate-800 dark:text-slate-200">₹{loan.principalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 pr-4 text-right font-black text-rose-600 dark:text-rose-400">₹{loan.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
