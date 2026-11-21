import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Voucher, Ledger, Donation, GovtGrant, Cow } from '../db/schema';
import { useLanguage, formatBilingual } from '../hooks/useLanguage';
import {
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Scale,
  Calendar,
  BookOpen,
  PieChart,
  Landmark,
  Wallet,
  Building2,
  Receipt,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const AccountingReports: React.FC = () => {
  const { language, t } = useLanguage();
  const [selectedReport, setSelectedReport] = useState<string>('trial_balance');

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [grants, setGrants] = useState<GovtGrant[]>([]);
  const [cows, setCows] = useState<Cow[]>([]);
  const [config, setConfig] = useState<any>({
    letterheadText:
      'Shree Krishna Gaushala Samiti\nRegd. No. 410/2012, Sector 5, Town Area\n12A & 80G Certified Non-Profit Organization',
  });

  // Search & Filters inside reports
  const [targetLedgerId, setTargetLedgerId] = useState<string>('l-cash');
  const [fyBalances, setFyBalances] = useState<{
    [ledgerId: string]: { openingBalance: number; currentBalance: number };
  }>({});
  const [activeFyObj, setActiveFyObj] = useState<any>(null);

  const loadData = () => {
    const activeFy = GoshalaDB.getActiveFy();
    setActiveFyObj(activeFy);

    const postedVouchers = GoshalaDB.getTable<Voucher>('vouchers').filter(
      (v) => v.status === 'POSTED' && v.date >= activeFy.startDate && v.date <= activeFy.endDate
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

    const handleFyChanged = () => loadData();
    window.addEventListener('goshala_fy_changed', handleFyChanged);
    return () => window.removeEventListener('goshala_fy_changed', handleFyChanged);
  }, []);

  const getLedgerName = (id: string) => {
    return ledgers.find((l) => l.id === id)?.name || id;
  };

  // 1. TRIAL BALANCE CALCULATIONS
  const calculateTrialBalance = () => {
    const rows = ledgers
      .map((l) => {
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
          credit: creditVal,
        };
      })
      .filter((r) => r.debit !== 0 || r.credit !== 0);

    const debitTotal = rows.reduce((s, r) => s + r.debit, 0);
    const creditTotal = rows.reduce((s, r) => s + r.credit, 0);

    return { rows, debitTotal, creditTotal };
  };

  // 2. DAY BOOK & CASH BOOK REGISTERS
  const getDayBookVouchers = () => {
    return vouchers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getLedgerStatement = (ledgerId: string) => {
    let runningBalance =
      fyBalances[ledgerId]?.openingBalance ??
      (ledgers.find((l) => l.id === ledgerId)?.activeFyOpeningBalance || 0);
    const ledger = ledgers.find((l) => l.id === ledgerId);
    const isDebitType = ledger ? ledger.type === 'ASSET' || ledger.type === 'EXPENSE' : true;

    const statementEntries: any[] = [];

    statementEntries.push({
      date: 'Opening',
      voucherNo: 'OPE-BAL',
      particulars: 'Opening Balance',
      debit: isDebitType && runningBalance >= 0 ? runningBalance : 0,
      credit: !isDebitType && runningBalance >= 0 ? runningBalance : 0,
      balance: runningBalance,
    });

    vouchers.forEach((v) => {
      v.entries.forEach((entry) => {
        if (entry.ledgerId === ledgerId) {
          const deb = entry.isDebit ? entry.amount : 0;
          const cred = !entry.isDebit ? entry.amount : 0;

          if (isDebitType) {
            runningBalance += entry.isDebit ? entry.amount : -entry.amount;
          } else {
            runningBalance += entry.isDebit ? -entry.amount : entry.amount;
          }

          const oppositePart = v.entries
            .filter((e) => e.ledgerId !== ledgerId)
            .map((e) => getLedgerName(e.ledgerId))
            .join(', ');

          statementEntries.push({
            date: v.date,
            voucherNo: v.voucherNumber,
            particulars: oppositePart || v.narration,
            debit: deb,
            credit: cred,
            balance: runningBalance,
          });
        }
      });
    });

    return statementEntries;
  };

  const getCategoryWiseReport = () => {
    return ledgers.map((l) => {
      let entriesCount = 0;
      let totalDebits = 0;
      let totalCredits = 0;
      vouchers.forEach((v) => {
        v.entries.forEach((e) => {
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
        closingBalance: l.currentBalance,
      };
    });
  };

  const getCostCenterWiseReport = () => {
    const ccs = GoshalaDB.getTable<any>('cost_centers');
    return ccs.map((cc: any) => {
      const remainingBudget = cc.allocatedBudget - (cc.spentAmount || 0);
      const monthlySpent: Record<string, number> = {};
      vouchers.forEach((v) => {
        if (v.costCenterId === cc.id && v.voucherType === 'PAYMENT') {
          const monthKey = v.date.substring(0, 7);
          const debSum = v.entries.filter((e) => e.isDebit).reduce((s, e) => s + e.amount, 0);
          monthlySpent[monthKey] = (monthlySpent[monthKey] || 0) + debSum;
        }
      });
      return {
        id: cc.id,
        name: cc.name,
        allocatedBudget: cc.allocatedBudget || 0,
        spentAmount: cc.spentAmount || 0,
        remainingBudget,
        monthlySpent,
      };
    });
  };

  // 3. INCOME & EXPENDITURE ACCOUNT
  const getIncomeExpenditure = () => {
    const incomes = ledgers.filter((l) => l.type === 'INCOME' && l.currentBalance !== 0);
    const expenses = ledgers.filter((l) => l.type === 'EXPENSE' && l.currentBalance !== 0);

    const totalIncome = incomes.reduce((sum, l) => sum + l.currentBalance, 0);
    const totalExpense = expenses.reduce((sum, l) => sum + l.currentBalance, 0);
    const surplus = totalIncome - totalExpense;

    return { incomes, expenses, totalIncome, totalExpense, surplus };
  };

  // 4. BALANCE SHEET
  const getBalanceSheet = () => {
    const assets = ledgers.filter((l) => l.type === 'ASSET');
    const liabilities = ledgers.filter((l) => l.type === 'LIABILITY');
    const capital = ledgers.filter((l) => l.type === 'CAPITAL');

    const incExp = getIncomeExpenditure();

    const totalAssets = assets.reduce((sum, l) => sum + l.currentBalance, 0);
    const totalLiabCap =
      liabilities.reduce((sum, l) => sum + l.currentBalance, 0) +
      capital.reduce((sum, l) => sum + l.currentBalance, 0) +
      incExp.surplus;

    return { assets, liabilities, capital, surplus: incExp.surplus, totalAssets, totalLiabCap };
  };

  // 5. ASSETS & DEPRECIATION REGISTER
  const getFixedAssets = () => {
    const faLedgers = ledgers.filter((l) => l.groupId === 'g-fixed-assets' && l.openingBalance !== 0);

    return faLedgers.map((l) => {
      const depreciationRate = 0.1;
      const deprAmount = l.openingBalance * depreciationRate;

      return {
        id: l.id,
        name: l.name,
        cost: l.openingBalance,
        deprRate: '10% SLM',
        deprValue: deprAmount,
        currentValue: l.currentBalance,
      };
    });
  };

  const exportToCSV = () => {
    let headers: string[] = [];
    let rowsData: any[][] = [];
    const filename = `${selectedReport}_${activeFyObj?.name || 'fy'}.csv`;

    if (selectedReport === 'trial_balance') {
      const { rows, debitTotal, creditTotal } = calculateTrialBalance();
      headers = ['Account Code', 'Ledger Name', 'Account Group', 'Debit Balance (₹)', 'Credit Balance (₹)'];
      rowsData = rows.map((r) => [r.code, r.name, 'General Ledger', r.debit || 0, r.credit || 0]);
      rowsData.push(['Total', 'Trial Balance Total', '', debitTotal, creditTotal]);
    } else if (selectedReport === 'day_book') {
      const dbVouchers = getDayBookVouchers();
      headers = ['Voucher Number', 'Date', 'Type', 'Narration', 'Debit Accounts', 'Credit Accounts', 'Total Debit (₹)', 'Total Credit (₹)'];
      rowsData = dbVouchers.map((v) => {
        const debAmt = v.entries.filter((e) => e.isDebit).reduce((s, e) => s + e.amount, 0);
        const crAmt = v.entries.filter((e) => !e.isDebit).reduce((s, e) => s + e.amount, 0);
        const debAccs = v.entries.filter((e) => e.isDebit).map((e) => getLedgerName(e.ledgerId)).join('; ');
        const crAccs = v.entries.filter((e) => !e.isDebit).map((e) => getLedgerName(e.ledgerId)).join('; ');
        return [v.voucherNumber, v.date, v.voucherType, v.narration, debAccs, crAccs, debAmt, crAmt];
      });
    } else if (selectedReport === 'bank_book') {
      headers = ['Voucher Number', 'Date', 'Bank Account', 'Particulars / Narration', 'Inflow (Dr ₹)', 'Outflow (Cr ₹)'];
      const bankVouchers = vouchers.filter(
        (v) =>
          v.status === 'POSTED' &&
          v.entries.some(
            (e) =>
              e.ledgerId !== 'l-cash' &&
              ledgers.find((l) => l.id === e.ledgerId)?.groupId === 'g-current-assets'
          )
      );
      let totalDr = 0;
      let totalCr = 0;
      rowsData = bankVouchers.map((v) => {
        const bEntry = v.entries.find(
          (e) =>
            e.ledgerId !== 'l-cash' &&
            ledgers.find((l) => l.id === e.ledgerId)?.groupId === 'g-current-assets'
        );
        const bLedger = ledgers.find((l) => l.id === bEntry?.ledgerId);
        const dr = bEntry?.isDebit ? bEntry.amount : 0;
        const cr = !bEntry?.isDebit ? bEntry?.amount || 0 : 0;
        totalDr += dr;
        totalCr += cr;
        return [v.voucherNumber, v.date, bLedger?.name || '', v.narration, dr || 0, cr || 0];
      });
      rowsData.push(['Total', '', '', 'Bank Book Totals', totalDr, totalCr]);
    } else if (selectedReport === 'cash_book') {
      headers = ['Voucher Number', 'Date', 'Particulars / Narration', 'Cash In (Dr ₹)', 'Cash Out (Cr ₹)'];
      const cashVouchers = vouchers.filter((v) => v.status === 'POSTED' && v.entries.some((e) => e.ledgerId === 'l-cash'));
      let totalDr = 0;
      let totalCr = 0;
      rowsData = cashVouchers.map((v) => {
        const cEntry = v.entries.find((e) => e.ledgerId === 'l-cash');
        const dr = cEntry?.isDebit ? cEntry.amount : 0;
        const cr = !cEntry?.isDebit ? cEntry?.amount || 0 : 0;
        totalDr += dr;
        totalCr += cr;
        return [v.voucherNumber, v.date, v.narration, dr || 0, cr || 0];
      });
      rowsData.push(['Total', '', 'Cash Book Totals', totalDr, totalCr]);
    } else if (selectedReport === 'general_ledger') {
      const targetL = ledgers.find((l) => l.id === targetLedgerId) || ledgers[0];
      headers = ['Date', 'Voucher Number', 'Type', 'Particulars / Narration', 'Debit (₹)', 'Credit (₹)', 'Cumulative Balance (₹)'];
      let runBal = targetL?.activeFyOpeningBalance ?? targetL?.openingBalance ?? 0;
      rowsData.push(['Opening Balance', '', '', 'Opening Balance as on FY Start', '', '', runBal]);
      const lVouchers = vouchers.filter((v) => v.status === 'POSTED' && v.entries.some((e) => e.ledgerId === targetL.id));
      lVouchers.forEach((v) => {
        const entry = v.entries.find((e) => e.ledgerId === targetL.id);
        if (!entry) return;
        const dr = entry.isDebit ? entry.amount : 0;
        const cr = !entry.isDebit ? entry.amount : 0;
        if (targetL.type === 'ASSET' || targetL.type === 'EXPENSE') {
          runBal += dr - cr;
        } else {
          runBal += cr - dr;
        }
        rowsData.push([v.date, v.voucherNumber, v.voucherType, v.narration, dr || 0, cr || 0, runBal]);
      });
      rowsData.push(['Closing Balance', '', '', `Closing Balance for ${targetL.name}`, '', '', runBal]);
    } else if (selectedReport === 'income_expenditure') {
      const incExp = getIncomeExpenditure();
      headers = ['Type', 'Ledger Name', 'Expense (Dr ₹)', 'Income (Cr ₹)'];
      incExp.expenses.forEach((l) => rowsData.push(['EXPENSE', l.name, l.currentBalance, 0]));
      rowsData.push(['Total Expense', 'Total Operational Expenditures', incExp.totalExpense, 0]);
      incExp.incomes.forEach((l) => rowsData.push(['INCOME', l.name, 0, l.currentBalance]));
      rowsData.push(['Total Income', 'Total Operational Incomes', 0, incExp.totalIncome]);
      rowsData.push(['Surplus / Deficit', incExp.surplus >= 0 ? 'Net Surplus (Excess of Income over Expenditure)' : 'Net Deficit (Excess of Expenditure over Income)', 0, incExp.surplus]);
    } else if (selectedReport === 'balance_sheet') {
      const { surplus } = getIncomeExpenditure();
      const generalFund = ledgers.filter((l) => l.groupId === 'g-general-fund' && l.currentBalance !== 0);
      const capitalAid = ledgers.filter((l) => l.groupId === 'g-capital-aid' && l.currentBalance !== 0);
      const membersContrib = ledgers.filter((l) => l.groupId === 'g-members-contrib' && l.currentBalance !== 0);
      const loans = ledgers.filter((l) => l.groupId === 'g-loans-liab' && l.currentBalance !== 0);
      const currentLiabilities = ledgers.filter((l) => l.groupId === 'g-current-liab' && l.currentBalance !== 0);
      const fixedAssets = ledgers.filter((l) => l.groupId === 'g-fixed-assets' && l.currentBalance !== 0);
      const cashAndBank = ledgers.filter((l) => (l.id === 'l-cash' || l.id.startsWith('l-bank-')) && l.currentBalance !== 0);
      const otherAssets = ledgers.filter((l) => l.type === 'ASSET' && l.groupId !== 'g-fixed-assets' && l.id !== 'l-cash' && !l.id.startsWith('l-bank-') && l.currentBalance !== 0);

      headers = ['Classification', 'Account Group', 'Ledger Name', 'Liabilities & Funds (₹)', 'Assets (₹)'];
      rowsData.push(['LIABILITIES', 'General Fund', 'Reserves & Accumulated Funds', generalFund.reduce((s, l) => s + l.currentBalance, 0), '']);
      generalFund.forEach((l) => rowsData.push(['LIABILITIES', 'General Fund', l.name, l.currentBalance, '']));
      rowsData.push(['LIABILITIES', 'Current Surplus', 'Excess of Income over Expenditure', surplus, '']);
      if (capitalAid.length > 0) {
        capitalAid.forEach((l) => rowsData.push(['LIABILITIES', 'Capital Aid', l.name, l.currentBalance, '']));
      }
      if (membersContrib.length > 0) {
        membersContrib.forEach((l) => rowsData.push(['LIABILITIES', 'Members Contribution', l.name, l.currentBalance, '']));
      }
      if (loans.length > 0) {
        loans.forEach((l) => rowsData.push(['LIABILITIES', 'Outstanding Loans', l.name, l.currentBalance, '']));
      }
      if (currentLiabilities.length > 0) {
        currentLiabilities.forEach((l) => rowsData.push(['LIABILITIES', 'Current Liabilities', l.name, l.currentBalance, '']));
      }
      const totalLiab = generalFund.reduce((s, l) => s + l.currentBalance, 0) + capitalAid.reduce((s, l) => s + l.currentBalance, 0) + membersContrib.reduce((s, l) => s + l.currentBalance, 0) + loans.reduce((s, l) => s + l.currentBalance, 0) + currentLiabilities.reduce((s, l) => s + l.currentBalance, 0) + surplus;
      rowsData.push(['TOTAL LIABILITIES', '', 'Total Liabilities & Funds', totalLiab, '']);

      rowsData.push(['ASSETS', '', '', '', '']);
      fixedAssets.forEach((l) => rowsData.push(['ASSETS', 'Fixed Assets', l.name, '', l.currentBalance]));
      cashAndBank.forEach((l) => rowsData.push(['ASSETS', 'Cash & Bank Balances', l.name, '', l.currentBalance]));
      otherAssets.forEach((l) => rowsData.push(['ASSETS', 'Other Current Assets', l.name, '', l.currentBalance]));
      const totalAss = fixedAssets.reduce((s, l) => s + l.currentBalance, 0) + cashAndBank.reduce((s, l) => s + l.currentBalance, 0) + otherAssets.reduce((s, l) => s + l.currentBalance, 0);
      rowsData.push(['TOTAL ASSETS', '', 'Total Assets Balance', '', totalAss]);
    } else if (selectedReport === 'loan_report') {
      const loanList = GoshalaDB.getTable<any>('loans');
      headers = ['Lender Institution / Party', 'Interest Rate (% p.a.)', 'Principal Borrowed (₹)', 'Outstanding Balance (₹)', 'Date Disbursed'];
      let totalPrinc = 0;
      let totalOut = 0;
      rowsData = loanList.map((loan: any) => {
        totalPrinc += Number(loan.principalAmount || 0);
        totalOut += Number(loan.outstandingAmount || 0);
        return [loan.partyName, `${loan.interestRate}%`, loan.principalAmount, loan.outstandingAmount, loan.dateDisbursed || '—'];
      });
      rowsData.push(['Total', '', totalPrinc, totalOut, '']);
    } else if (selectedReport === 'depreciation') {
      const faList = getFixedAssets();
      headers = ['Fixed Asset Name', 'Purchase Cost (₹)', 'Depreciation Method / Rate', 'Annual Depreciation (₹)', 'Written Down Value (₹)'];
      let totalCost = 0;
      let totalDepr = 0;
      let totalWdv = 0;
      rowsData = faList.map((fa) => {
        totalCost += fa.cost;
        totalDepr += fa.deprValue;
        totalWdv += fa.currentValue;
        return [fa.name, fa.cost, fa.deprRate, fa.deprValue, fa.currentValue];
      });
      rowsData.push(['Total', totalCost, '', totalDepr, totalWdv]);
    } else if (selectedReport === 'donation_register') {
      headers = ['Receipt Number', 'Date', 'Payment Mode', 'Purpose Target', '80G Certified', 'Amount (₹)'];
      const donationVouchers = vouchers.filter((v) => v.entries.some((e) => e.ledgerId.startsWith('l-inc-donation')));
      let totalDon = 0;
      rowsData = donationVouchers.map((v) => {
        const amt = v.entries.filter((e) => e.isDebit).reduce((s, e) => s + e.amount, 0);
        const isFeed = v.entries.some((e) => e.ledgerId === 'l-inc-donation-feed');
        totalDon += amt;
        return [v.voucherNumber, v.date, v.paymentMode || 'BANK_UPI', isFeed ? 'Cow Feeding' : 'General Donation', 'Certified (12A/80G)', amt];
      });
      rowsData.push(['Total Donations', '', '', '', '', totalDon]);
    } else if (selectedReport === 'category_wise') {
      const catList = getCategoryWiseReport();
      headers = ['Code', 'Category / Ledger Name', 'Type', 'Opening Balance (₹)', 'Total Debits (₹)', 'Total Credits (₹)', 'Closing Balance (₹)'];
      rowsData = catList.map((cat) => [cat.code, cat.name, cat.type, cat.openingBalance, cat.totalDebits, cat.totalCredits, cat.closingBalance]);
    } else if (selectedReport === 'cost_center_wise') {
      const ccList = getCostCenterWiseReport();
      headers = ['Cost Center Name', 'Allocated Budget (₹)', 'Spent Amount (₹)', 'Remaining Budget (₹)', 'Utilization (%)'];
      rowsData = ccList.map((cc) => {
        const util = cc.allocatedBudget > 0 ? Math.round((cc.spentAmount / cc.allocatedBudget) * 100) : 0;
        return [cc.name, cc.allocatedBudget, cc.spentAmount, cc.remainingBudget, `${util}%`];
      });
    } else {
      headers = ['Particulars', 'Amount (₹)'];
      rowsData = ledgers.map((l) => [l.name, l.currentBalance]);
    }

    const csvContent = [
      headers.join(','),
      ...rowsData.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const menuOptions = [
    {
      id: 'trial_balance',
      label: language === 'hi' ? 'ट्रायल बैलेंस शीट (Trial Balance)' : 'Trial Balance Sheet',
      icon: Scale,
    },
    {
      id: 'day_book',
      label: language === 'hi' ? 'डे बुक लेजर (Day Book)' : 'Day Book Ledger',
      icon: Calendar,
    },
    {
      id: 'bank_book',
      label: language === 'hi' ? 'बैंक बुक रजिस्टर (Bank Book)' : 'Bank Book Register',
      icon: Landmark,
    },
    {
      id: 'cash_book',
      label: language === 'hi' ? 'कैश बुक रजिस्टर (Cash Book)' : 'Cash Book Register',
      icon: Wallet,
    },
    {
      id: 'general_ledger',
      label: language === 'hi' ? 'खाता बही (General Ledger)' : 'General Ledger Search',
      icon: BookOpen,
    },
    {
      id: 'income_expenditure',
      label: language === 'hi' ? 'आय-व्यय विवरण (Income & Expenditure)' : 'Income & Expenditure',
      icon: PieChart,
    },
    {
      id: 'balance_sheet',
      label: language === 'hi' ? 'बैलेंस शीट (Balance Sheet)' : 'Balance Sheet Statements',
      icon: Layers,
    },
    {
      id: 'loan_report',
      label: language === 'hi' ? 'बकाया ऋण रिपोर्ट (Outstanding Loans)' : 'Outstanding Loan Report',
      icon: Landmark,
    },
    {
      id: 'depreciation',
      label: language === 'hi' ? 'अचल संपत्ति व ह्रास (Depreciation)' : 'Asset Depreciation',
      icon: Building2,
    },
    ...(config.enable80G !== false
      ? [
          {
            id: 'donation_register',
            label: language === 'hi' ? 'दान रसीद रजिस्टर (80G Log)' : 'Donation Receipt Log (80G)',
            icon: Receipt,
          },
        ]
      : []),
    {
      id: 'category_wise',
      label: language === 'hi' ? 'श्रेणीवार रिपोर्ट (Category Wise)' : 'Category Wise Report',
      icon: FileText,
    },
    {
      id: 'cost_center_wise',
      label: language === 'hi' ? 'लागत केंद्र रिपोर्ट (Cost Center)' : 'Cost Center Report',
      icon: Layers,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800 no-print">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Financial Statements & CA Audit Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Double-entry balanced accounting books, balance sheets, and statutory 12A/80G schedules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Report Selector */}
        <div className="w-full lg:w-72 shrink-0 space-y-1.5 no-print">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
            Available Statements
          </div>
          <div className="space-y-1 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2 shadow-xs">
            {menuOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = selectedReport === opt.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedReport(opt.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`} />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Main Report Viewer */}
        <div className="flex-1 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs min-h-[600px] space-y-6">
          {/* Printable Letterhead Header */}
          <div className="hidden print:block text-center border-b border-slate-800 pb-3 mb-4 leading-normal">
            <h2 className="text-base font-bold uppercase text-slate-900 tracking-wider">
              {(config?.letterheadText || 'SHREE KRISHNA BALRAM GOUSHALA').split('\n')[0]}
            </h2>
            <p className="text-[11px] text-slate-600 whitespace-pre-line mt-1">
              {(config?.letterheadText || '').split('\n').slice(1).join(' • ')}
            </p>
          </div>

          {/* Report Title Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {menuOptions.find((o) => o.id === selectedReport)?.label}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Financial Year: {activeFyObj?.name || 'Current'} • Double-Entry Real-time Verification
              </p>
            </div>
          </div>

          {/* REPORT 1: TRIAL BALANCE SHEET */}
          {selectedReport === 'trial_balance' &&
            (() => {
              const { rows, debitTotal, creditTotal } = calculateTrialBalance();
              return (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="pb-3 pl-2">Account Code</th>
                          <th className="pb-3">Ledger Name</th>
                          <th className="pb-3">Group Category</th>
                          <th className="pb-3 text-right">Debit Bal (Dr ₹)</th>
                          <th className="pb-3 text-right pr-2">Credit Bal (Cr ₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {rows.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                            <td className="py-2.5 pl-2 font-mono text-slate-500">{r.code}</td>
                            <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                              {formatBilingual(r.name, language)}
                            </td>
                            <td className="py-2.5 text-slate-400">General Ledger</td>
                            <td className="py-2.5 text-right font-mono font-medium">
                              {r.debit > 0 ? `₹${r.debit.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2.5 text-right pr-2 font-mono font-medium">
                              {r.credit > 0 ? `₹${r.credit.toLocaleString()}` : '—'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-slate-100">
                          <td colSpan={3} className="py-3 pl-2">
                            Trial Balance Totals
                          </td>
                          <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            ₹{debitTotal.toLocaleString()}
                          </td>
                          <td className="py-3 text-right pr-2 font-mono text-emerald-600 dark:text-emerald-400">
                            ₹{creditTotal.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {debitTotal === creditTotal && (
                    <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Trial Balance is balanced. Total debits match total credits with zero variance.
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* REPORT 2: DAY BOOK */}
          {selectedReport === 'day_book' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-2">Voucher #</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Ledger Entries</th>
                    <th className="pb-3">Narration Remarks</th>
                    <th className="pb-3 text-right">Debit (₹)</th>
                    <th className="pb-3 text-right pr-2">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {getDayBookVouchers().map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 pl-2 font-semibold text-slate-900 dark:text-slate-100">
                        {v.voucherNumber}
                      </td>
                      <td className="py-3 text-slate-500">{v.date}</td>
                      <td className="py-3 space-y-1 max-w-xs">
                        {v.entries.map((e, idx) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {formatBilingual(getLedgerName(e.ledgerId), language)}
                            </span>
                            <span className="text-slate-400 font-mono ml-2">({e.isDebit ? 'Dr' : 'Cr'})</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 text-slate-500 max-w-xs truncate" title={v.narration}>
                        {v.narration}
                      </td>
                      <td className="py-3 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                        ₹{v.entries.filter((e) => e.isDebit).reduce((s, e) => s + e.amount, 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-right pr-2 font-mono font-medium text-slate-900 dark:text-slate-100">
                        ₹{v.entries.filter((e) => !e.isDebit).reduce((s, e) => s + e.amount, 0).toLocaleString()}
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
              <div className="flex items-center gap-3 text-xs">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Select Ledger Account:
                </label>
                <select
                  value={targetLedgerId}
                  onChange={(e) => setTargetLedgerId(e.target.value)}
                  className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {ledgers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {formatBilingual(l.name, language)} [{l.code}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="pb-3 pl-2">Date</th>
                      <th className="pb-3">Voucher #</th>
                      <th className="pb-3">Particulars (Contra Accounts)</th>
                      <th className="pb-3 text-right">Debit (Dr ₹)</th>
                      <th className="pb-3 text-right">Credit (Cr ₹)</th>
                      <th className="pb-3 text-right pr-2">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {getLedgerStatement(targetLedgerId).map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 pl-2 text-slate-500">{entry.date}</td>
                        <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                          {entry.voucherNo}
                        </td>
                        <td className="py-2.5 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {formatBilingual(entry.particulars, language)}
                        </td>
                        <td className="py-2.5 text-right font-mono font-medium">
                          {entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-2.5 text-right font-mono font-medium">
                          {entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-2.5 text-right pr-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{entry.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 4: INCOME & EXPENDITURE */}
          {selectedReport === 'income_expenditure' &&
            (() => {
              const { incomes, expenses, totalIncome, totalExpense, surplus } = getIncomeExpenditure();
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
                  {/* Expenditures Left */}
                  <div className="space-y-4 border-r border-slate-100 dark:border-slate-800 pr-6">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Expenditures & Operating Costs
                    </h3>
                    <div className="space-y-2">
                      {expenses.map((exp) => (
                        <div key={exp.id} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-700 dark:text-slate-300">{exp.name}</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                            ₹{exp.currentBalance.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span>Total Expenditures:</span>
                        <span className="font-mono">₹{totalExpense.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Incomes Right */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Incomes & Revenues
                    </h3>
                    <div className="space-y-2">
                      {incomes.map((inc) => (
                        <div key={inc.id} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-700 dark:text-slate-300">{inc.name}</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                            ₹{inc.currentBalance.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span>Total Income:</span>
                        <span className="font-mono">₹{totalIncome.toLocaleString()}</span>
                      </div>

                      {/* Net Surplus */}
                      <div className="flex justify-between font-bold text-sm text-emerald-600 dark:text-emerald-400 pt-4 border-t-2 border-slate-300 dark:border-slate-700">
                        <span>Net Surplus (Carried to General Fund):</span>
                        <span className="font-mono">₹{surplus.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* REPORT 5: BALANCE SHEET */}
          {selectedReport === 'balance_sheet' &&
            (() => {
              const { surplus } = getIncomeExpenditure();

              const generalFund = ledgers.filter((l) => l.groupId === 'g-general-fund' && l.currentBalance !== 0);
              const capitalAid = ledgers.filter((l) => l.groupId === 'g-capital-aid' && l.currentBalance !== 0);
              const membersContrib = ledgers.filter((l) => l.groupId === 'g-members-contrib' && l.currentBalance !== 0);
              const loans = ledgers.filter((l) => l.groupId === 'g-loans-liab' && l.currentBalance !== 0);
              const currentLiabilities = ledgers.filter((l) => l.groupId === 'g-current-liab' && l.currentBalance !== 0);

              const fixedAssets = ledgers.filter((l) => l.groupId === 'g-fixed-assets' && l.currentBalance !== 0);
              const cashAndBank = ledgers.filter(
                (l) => (l.id === 'l-cash' || l.id.startsWith('l-bank-')) && l.currentBalance !== 0
              );
              const otherAssets = ledgers.filter(
                (l) =>
                  l.type === 'ASSET' &&
                  l.groupId !== 'g-fixed-assets' &&
                  l.id !== 'l-cash' &&
                  !l.id.startsWith('l-bank-') &&
                  l.currentBalance !== 0
              );

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
                  <div className="space-y-4 border-r border-slate-100 dark:border-slate-800 pr-6">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Liabilities & Capital Funds
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          General Fund Reserves
                        </h4>
                        {generalFund.map((c) => (
                          <div key={c.id} className="flex justify-between py-1">
                            <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                            <span className="font-mono font-medium">₹{c.currentBalance.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span>Current Period Surplus</span>
                          <span className="font-mono font-bold">₹{surplus.toLocaleString()}</span>
                        </div>
                      </div>

                      {capitalAid.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Capital Grants & Aid
                          </h4>
                          {capitalAid.map((c) => (
                            <div key={c.id} className="flex justify-between py-1">
                              <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                              <span className="font-mono font-medium">₹{c.currentBalance.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {membersContrib.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Members Contribution & Capital
                          </h4>
                          {membersContrib.map((c) => (
                            <div key={c.id} className="flex justify-between py-1">
                              <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                              <span className="font-mono font-medium">₹{c.currentBalance.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {loans.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Outstanding Loans & Borrowings
                          </h4>
                          {loans.map((l) => (
                            <div key={l.id} className="flex justify-between py-1">
                              <span className="text-slate-700 dark:text-slate-300">{l.name}</span>
                              <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                                ₹{l.currentBalance.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {currentLiabilities.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Current Liabilities & Payables
                          </h4>
                          {currentLiabilities.map((l) => (
                            <div key={l.id} className="flex justify-between py-1">
                              <span className="text-slate-700 dark:text-slate-300">{l.name}</span>
                              <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                                ₹{l.currentBalance.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-4 text-xs border-t border-slate-200 dark:border-slate-700">
                        <span>Total Liabilities & Funds:</span>
                        <span className="font-mono text-sm text-slate-900 dark:text-slate-100">
                          ₹{totalLiabCap.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ASSETS */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      Assets & Holdings
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Fixed Capital Assets
                        </h4>
                        {fixedAssets.map((a) => (
                          <div key={a.id} className="flex justify-between py-1">
                            <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
                            <span className="font-mono font-medium">₹{a.currentBalance.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Cash & Bank Balances
                        </h4>
                        {cashAndBank.map((a) => (
                          <div key={a.id} className="flex justify-between py-1">
                            <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
                            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                              ₹{a.currentBalance.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {otherAssets.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Other Current Assets & Receivables
                          </h4>
                          {otherAssets.map((a) => (
                            <div key={a.id} className="flex justify-between py-1">
                              <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
                              <span className="font-mono font-medium">₹{a.currentBalance.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-4 text-xs border-t border-slate-200 dark:border-slate-700">
                        <span>Total Assets Balance:</span>
                        <span className="font-mono text-sm text-slate-900 dark:text-slate-100">
                          ₹{totalAssets.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {totalLiabCap === totalAssets && (
                    <div className="lg:col-span-2 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Balance Sheet is fully balanced. Total Assets exactly match Total Liabilities & Funds with zero variance.</span>
                      </div>
                      <span className="font-mono font-bold">₹{totalAssets.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* REPORT 6: DEPRECIATION REGISTER */}
          {selectedReport === 'depreciation' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-2">Fixed Asset Name</th>
                    <th className="pb-3">Purchase Cost (₹)</th>
                    <th className="pb-3">Useful Life / Rate</th>
                    <th className="pb-3">Annual Depreciation (₹)</th>
                    <th className="pb-3 text-right pr-2">Written Down Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {getFixedAssets().map((fa) => (
                    <tr key={fa.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-2.5 pl-2 font-medium text-slate-900 dark:text-slate-100">
                        {fa.name}
                      </td>
                      <td className="py-2.5 font-mono">₹{fa.cost.toLocaleString()}</td>
                      <td className="py-2.5 text-slate-500">{fa.deprRate}</td>
                      <td className="py-2.5 font-mono text-rose-600">
                        -₹{fa.deprValue.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right pr-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{fa.currentValue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 7: DONATION REGISTER */}
          {selectedReport === 'donation_register' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-2">Receipt Number</th>
                    <th className="pb-3">Donor Name</th>
                    <th className="pb-3">Payment Mode</th>
                    <th className="pb-3">Purpose Target</th>
                    <th className="pb-3">Exemption (80G)</th>
                    <th className="pb-3 text-right pr-2">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {vouchers
                    .filter((v) => v.entries.some((e) => e.ledgerId.startsWith('l-inc-donation')))
                    .map((v) => {
                      const amt = v.entries
                        .filter((e) => e.isDebit)
                        .reduce((s, e) => s + e.amount, 0);
                      const isFeed = v.entries.some((e) => e.ledgerId === 'l-inc-donation-feed');

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                          <td className="py-2.5 pl-2 font-semibold text-slate-900 dark:text-slate-100">
                            {v.voucherNumber}
                          </td>
                          <td className="py-2.5 text-slate-700 dark:text-slate-300">
                            General Donor
                          </td>
                          <td className="py-2.5">
                            <Badge variant="neutral" size="sm">
                              {v.paymentMode || 'BANK_UPI'}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-slate-500">
                            {isFeed ? 'Cow Feeding' : 'General Donation'}
                          </td>
                          <td className="py-2.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                              Certified
                            </span>
                          </td>
                          <td className="py-2.5 text-right pr-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                            ₹{amt.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 8: CATEGORY WISE REPORT */}
          {selectedReport === 'category_wise' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-2">Code</th>
                    <th className="pb-3">Category / Ledger Name</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3 text-right">Opening (₹)</th>
                    <th className="pb-3 text-right">Debits (₹)</th>
                    <th className="pb-3 text-right">Credits (₹)</th>
                    <th className="pb-3 text-right pr-2">Closing Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {getCategoryWiseReport().map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-2.5 pl-2 font-mono text-slate-500">{cat.code}</td>
                      <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {cat.name}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant={cat.type === 'EXPENSE' ? 'danger' : cat.type === 'INCOME' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {cat.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right font-mono">₹{cat.openingBalance.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-mono">₹{cat.totalDebits.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-mono">₹{cat.totalCredits.toLocaleString()}</td>
                      <td className="py-2.5 text-right pr-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{cat.closingBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 9: COST CENTER REPORT */}
          {selectedReport === 'cost_center_wise' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getCostCenterWiseReport().map((cc) => {
                const spentPct =
                  cc.allocatedBudget > 0
                    ? Math.min(100, Math.round((cc.spentAmount / cc.allocatedBudget) * 100))
                    : 0;

                return (
                  <div
                    key={cc.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                          {cc.name}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Remaining: ₹{cc.remainingBudget.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={spentPct > 90 ? 'danger' : 'neutral'} size="sm">
                        {spentPct}% Spent
                      </Badge>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${spentPct > 90 ? 'bg-rose-500' : 'bg-slate-900 dark:bg-white'}`}
                        style={{ width: `${spentPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Allocated: ₹{cc.allocatedBudget.toLocaleString()}</span>
                      <span>Spent: ₹{cc.spentAmount.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* REPORT 10: BANK BOOK */}
          {selectedReport === 'bank_book' &&
            (() => {
              const bankVouchers = vouchers
                .filter(
                  (v) =>
                    v.status === 'POSTED' &&
                    v.entries.some(
                      (e) =>
                        e.ledgerId !== 'l-cash' &&
                        ledgers.find((l) => l.id === e.ledgerId)?.groupId === 'g-current-assets'
                    )
                );
              const totalDr = bankVouchers.reduce((sum, v) => {
                const bEntry = v.entries.find((e) => e.ledgerId !== 'l-cash' && ledgers.find((l) => l.id === e.ledgerId)?.groupId === 'g-current-assets');
                return sum + (bEntry?.isDebit ? bEntry.amount : 0);
              }, 0);
              const totalCr = bankVouchers.reduce((sum, v) => {
                const bEntry = v.entries.find((e) => e.ledgerId !== 'l-cash' && ledgers.find((l) => l.id === e.ledgerId)?.groupId === 'g-current-assets');
                return sum + (!bEntry?.isDebit ? bEntry?.amount || 0 : 0);
              }, 0);

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Total Bank Receipts:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{totalDr.toLocaleString()}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Total Bank Payments:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">₹{totalCr.toLocaleString()}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Net Movement:</span>
                      <span className={`font-mono font-bold ${totalDr >= totalCr ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {totalDr >= totalCr ? '+' : ''}₹{(totalDr - totalCr).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="pb-3 pl-2">Voucher #</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Bank Account</th>
                          <th className="pb-3">Particulars</th>
                          <th className="pb-3 text-right">Inflow (Dr ₹)</th>
                          <th className="pb-3 text-right pr-2">Outflow (Cr ₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {bankVouchers.map((v) => {
                          const bankEntry = v.entries.find(
                            (e) =>
                              e.ledgerId !== 'l-cash' &&
                              ledgers.find((l) => l.id === e.ledgerId)?.groupId === 'g-current-assets'
                          );
                          if (!bankEntry) return null;
                          const bankL = ledgers.find((l) => l.id === bankEntry.ledgerId);

                          return (
                            <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                              <td className="py-2.5 pl-2 font-semibold text-slate-900 dark:text-slate-100">
                                {v.voucherNumber}
                              </td>
                              <td className="py-2.5 text-slate-500">{v.date}</td>
                              <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                                {formatBilingual(bankL?.name || '', language)}
                              </td>
                              <td className="py-2.5 text-slate-500 max-w-xs truncate">{v.narration}</td>
                              <td className="py-2.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                {bankEntry.isDebit ? `₹${bankEntry.amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 text-right pr-2 font-mono font-medium text-slate-700 dark:text-slate-300">
                                {!bankEntry.isDebit ? `₹${bankEntry.amount.toLocaleString()}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-slate-100">
                          <td colSpan={4} className="py-3 pl-2">Bank Register Totals</td>
                          <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">₹{totalDr.toLocaleString()}</td>
                          <td className="py-3 text-right pr-2 font-mono">₹{totalCr.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

          {/* REPORT 11: CASH BOOK */}
          {selectedReport === 'cash_book' &&
            (() => {
              const cashL = ledgers.find((l) => l.id === 'l-cash');
              const opBal = cashL?.activeFyOpeningBalance ?? cashL?.openingBalance ?? 0;
              const cashVouchers = vouchers.filter((v) => v.status === 'POSTED' && v.entries.some((e) => e.ledgerId === 'l-cash'));
              const totalDr = cashVouchers.reduce((sum, v) => {
                const c = v.entries.find((e) => e.ledgerId === 'l-cash');
                return sum + (c?.isDebit ? c.amount : 0);
              }, 0);
              const totalCr = cashVouchers.reduce((sum, v) => {
                const c = v.entries.find((e) => e.ledgerId === 'l-cash');
                return sum + (!c?.isDebit ? c?.amount || 0 : 0);
              }, 0);
              let running = opBal;

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Opening Cash:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">₹{opBal.toLocaleString()}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Total Inflow:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{totalDr.toLocaleString()}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Total Outflow:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">₹{totalCr.toLocaleString()}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Closing Cash in Hand:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{(opBal + totalDr - totalCr).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="pb-3 pl-2">Voucher #</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Particulars / Narration</th>
                          <th className="pb-3 text-right">Cash In (Dr ₹)</th>
                          <th className="pb-3 text-right">Cash Out (Cr ₹)</th>
                          <th className="pb-3 text-right pr-2">Cash Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        <tr className="bg-slate-50/50 dark:bg-slate-800/20 font-medium">
                          <td className="py-2.5 pl-2 text-slate-500">—</td>
                          <td className="py-2.5 text-slate-500">FY Start</td>
                          <td className="py-2.5 text-slate-700 dark:text-slate-300">Opening Cash Balance</td>
                          <td className="py-2.5 text-right font-mono">—</td>
                          <td className="py-2.5 text-right font-mono">—</td>
                          <td className="py-2.5 text-right pr-2 font-mono font-bold text-slate-900 dark:text-slate-100">₹{opBal.toLocaleString()}</td>
                        </tr>
                        {cashVouchers.map((v) => {
                          const cashEntry = v.entries.find((e) => e.ledgerId === 'l-cash');
                          if (!cashEntry) return null;
                          if (cashEntry.isDebit) {
                            running += cashEntry.amount;
                          } else {
                            running -= cashEntry.amount;
                          }

                          return (
                            <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                              <td className="py-2.5 pl-2 font-semibold text-slate-900 dark:text-slate-100">
                                {v.voucherNumber}
                              </td>
                              <td className="py-2.5 text-slate-500">{v.date}</td>
                              <td className="py-2.5 text-slate-500 max-w-xs truncate">{v.narration}</td>
                              <td className="py-2.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                {cashEntry.isDebit ? `₹${cashEntry.amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                {!cashEntry.isDebit ? `₹${cashEntry.amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 text-right pr-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                                ₹{running.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-slate-100">
                          <td colSpan={3} className="py-3 pl-2">Cash Book Totals & Closing</td>
                          <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">₹{totalDr.toLocaleString()}</td>
                          <td className="py-3 text-right font-mono">₹{totalCr.toLocaleString()}</td>
                          <td className="py-3 text-right pr-2 font-mono text-emerald-600 dark:text-emerald-400">₹{running.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

          {/* REPORT 12: OUTSTANDING LOANS */}
          {selectedReport === 'loan_report' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-2">Lender Institution</th>
                    <th className="pb-3">Interest Rate</th>
                    <th className="pb-3 text-right">Principal Amount</th>
                    <th className="pb-3 text-right pr-2">Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {GoshalaDB.getTable<any>('loans').map((loan: any) => (
                    <tr key={loan.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-2.5 pl-2 font-semibold text-slate-900 dark:text-slate-100">
                        {loan.partyName}
                      </td>
                      <td className="py-2.5 text-slate-500">{loan.interestRate}% p.a.</td>
                      <td className="py-2.5 text-right font-mono">
                        ₹{loan.principalAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right pr-2 font-mono font-bold text-rose-600 dark:text-rose-400">
                        ₹{loan.outstandingAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
