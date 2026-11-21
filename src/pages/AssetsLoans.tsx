import React, { useState, useEffect, useMemo } from 'react';
import { GoshalaDB } from '../db/db';
import { Ledger, Loan, Voucher } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage, formatBilingual } from '../hooks/useLanguage';
import {
  Plus,
  Trash2,
  Edit3,
  Landmark,
  Hammer,
  BadgeInfo,
  Tractor,
  X,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  ShoppingCart,
  CreditCard,
  Building2,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';

export const AssetsLoans: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'assets' | 'loans' | 'repayments' | 'creditors' | 'advances'>('assets');

  const [fixedAssets, setFixedAssets] = useState<Ledger[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayVouchers, setRepayVouchers] = useState<Voucher[]>([]);
  const [sundryCreditors, setSundryCreditors] = useState<
    { id: string; name: string; phone: string; balance: number; billsCount: number }[]
  >([]);
  const [supplierAdvances, setSupplierAdvances] = useState<
    { id: string; name: string; phone: string; balance: number; billsCount: number }[]
  >([]);
  const [totalCreditorLiability, setTotalCreditorLiability] = useState<number>(0);
  const [totalSupplierAdvances, setTotalSupplierAdvances] = useState<number>(0);

  // Modals visibility
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);

  // Selected items for Edit/Repay
  const [editingAsset, setEditingAsset] = useState<Ledger | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [selectedRepayLoan, setSelectedRepayLoan] = useState<Loan | null>(null);

  // Form states
  const [assetForm, setAssetForm] = useState({
    name: '',
    cost: 50000,
  });

  const [loanForm, setLoanForm] = useState({
    partyName: '',
    principal: 100000,
    interestRate: 8,
    installments: 24,
    reason: '',
  });

  const [repayForm, setRepayForm] = useState({
    principalPaid: 5000,
    interestPaid: 500,
    paymentMode: 'BANK_UPI',
    payFromLedger: 'l-bank-boi',
    date: new Date().toISOString().split('T')[0],
    notes: 'Loan EMI repayment',
  });

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadData();

    const handleFyChanged = () => loadData();
    window.addEventListener('goshala_fy_changed', handleFyChanged);
    window.addEventListener('goshala_voucher_updated', handleFyChanged);
    return () => {
      window.removeEventListener('goshala_fy_changed', handleFyChanged);
      window.removeEventListener('goshala_voucher_updated', handleFyChanged);
    };
  }, []);

  const loadData = () => {
    const activeFyObj = GoshalaDB.getActiveFy();
    const activeFyId = activeFyObj.id;
    const fyBalances = GoshalaDB.getLedgerBalancesForFy(activeFyId);
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');

    setFixedAssets(
      ledgers
        .filter((l) => l.groupId === 'g-fixed-assets')
        .map((l) => ({
          ...l,
          currentBalance: fyBalances[l.id]?.currentBalance ?? l.currentBalance,
        }))
    );

    const allLoans = GoshalaDB.getTable<Loan>('loans');
    const fyLoans = allLoans.map((loan) => {
      let matchingLedger = ledgers.find(
        (l) => l.id === loan.id || l.id === `l-loan-${loan.id}` || l.name.toLowerCase() === loan.partyName.toLowerCase()
      );
      if (!matchingLedger) {
        matchingLedger = ledgers.find(
          (l) =>
            (l.name.toLowerCase().includes(loan.partyName.toLowerCase()) ||
              loan.partyName.toLowerCase().includes(l.name.toLowerCase())) &&
            !l.name.toLowerCase().includes('building')
        );
      }
      const outstanding =
        matchingLedger && fyBalances[matchingLedger.id] !== undefined
          ? Math.max(0, fyBalances[matchingLedger.id].currentBalance)
          : loan.outstandingAmount;
      return {
        ...loan,
        outstandingAmount: outstanding,
      };
    });
    setLoans(fyLoans);

    const allVouchers = GoshalaDB.getTable<Voucher>('vouchers');

    // ONLY repayment vouchers in the active FY for the log table!
    const loanRepaysInActiveFy = allVouchers.filter(
      (v) =>
        v.status === 'POSTED' &&
        (v.voucherType === 'LOAN_REPAYMENT' ||
          v.narration?.toLowerCase().includes('loan repayment') ||
          v.narration?.toLowerCase().includes('ऋण')) &&
        v.date >= activeFyObj.startDate &&
        v.date <= activeFyObj.endDate
    );
    setRepayVouchers(loanRepaysInActiveFy.reverse());

    // Calculate Sundry Creditors - 100% DYNAMICALLY FROM VOUCHERS AND CONTACTS
    const contacts = GoshalaDB.getTable<any>('contacts');
    const isPastOrActive2025 = activeFyId === 'fy-2025-26';

    const postedVouchersUpToFy = allVouchers.filter((v) => {
      if (v.status !== 'POSTED') return false;
      if (isPastOrActive2025) {
        return v.date <= activeFyObj.endDate && v.fyId !== 'fy-2026-27';
      }
      return v.date <= activeFyObj.endDate;
    });

    const partyMap: {
      [contactId: string]: {
        id: string;
        name: string;
        phone: string;
        opening: number;
        credits: number;
        debits: number;
        count: number;
      };
    } = {};

    contacts.forEach((c: any) => {
      partyMap[c.id] = {
        id: c.id,
        name: c.name.trim(),
        phone: c.phone || '—',
        opening: Number(c.outstandingBalance) || 0,
        credits: 0,
        debits: 0,
        count: 0,
      };
    });

    postedVouchersUpToFy.forEach((v) => {
      const creditorEntries = v.entries.filter(
        (e) => e.ledgerId === 'l-liab-creditors' || e.ledgerId.includes('vend') || e.ledgerId.includes('creditor')
      );

      creditorEntries.forEach((e) => {
        if (!e.subLedgerId) return;

        if (!partyMap[e.subLedgerId]) {
          partyMap[e.subLedgerId] = {
            id: e.subLedgerId,
            name: 'Unlinked / Deleted Supplier',
            phone: '—',
            opening: 0,
            credits: 0,
            debits: 0,
            count: 0,
          };
        }

        partyMap[e.subLedgerId].count += 1;

        if (!e.isDebit) {
          partyMap[e.subLedgerId].credits += e.amount;
        } else {
          partyMap[e.subLedgerId].debits += e.amount;
        }
      });
    });

    const creditorList = Object.values(partyMap).map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      balance: p.opening + p.credits - p.debits,
      billsCount: p.count,
    }));

    const outstandingCreditors = creditorList.filter((p) => p.balance > 0);
    const totalCreditorBal = outstandingCreditors.reduce((sum, p) => sum + p.balance, 0);

    const advancesList = creditorList
      .filter((p) => p.balance < 0)
      .map((p) => ({ ...p, balance: Math.abs(p.balance) }));
    const totalAdvances = advancesList.reduce((sum, p) => sum + p.balance, 0);

    setSundryCreditors(outstandingCreditors);
    setTotalCreditorLiability(totalCreditorBal);
    setSupplierAdvances(advancesList);
    setTotalSupplierAdvances(totalAdvances);
  };

  const handleOpenAssetCreate = () => {
    setEditingAsset(null);
    setAssetForm({ name: '', cost: 25000 });
    setShowAssetModal(true);
  };

  const handleOpenAssetEdit = (fa: Ledger) => {
    setEditingAsset(fa);
    setAssetForm({ name: fa.name, cost: fa.currentBalance });
    setShowAssetModal(true);
  };

  const handleOpenLoanCreate = () => {
    setEditingLoan(null);
    setLoanForm({ partyName: '', principal: 150000, interestRate: 9, installments: 24, reason: '' });
    setShowLoanModal(true);
  };

  const handleOpenLoanEdit = (loan: Loan) => {
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const ledger = ledgers.find((l) => l.name.startsWith(loan.partyName));
    let purpose = '';
    if (ledger) {
      const match = ledger.name.match(/\(([^)]+)\)/);
      if (match) purpose = match[1];
    }

    setEditingLoan(loan);
    setLoanForm({
      partyName: loan.partyName,
      principal: loan.principalAmount,
      interestRate: loan.interestRate,
      installments: loan.installments,
      reason: purpose || 'Cow Shed Construction',
    });
    setShowLoanModal(true);
  };

  const handleOpenRepayModal = (loan: Loan) => {
    setSelectedRepayLoan(loan);
    setRepayForm({
      principalPaid: Math.min(5000, loan.outstandingAmount),
      interestPaid: Math.round((loan.outstandingAmount * (loan.interestRate / 100)) / 12),
      paymentMode: 'BANK_UPI',
      payFromLedger: 'l-bank-boi',
      date: new Date().toISOString().split('T')[0],
      notes: `Monthly EMI repayment to ${loan.partyName}`,
    });
    setShowRepayModal(true);
  };

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name) return alert('Name is required');

    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');

    if (editingAsset) {
      const target = ledgers.find((l) => l.id === editingAsset.id);
      if (target) {
        target.name = assetForm.name;
        target.openingBalance = Number(assetForm.cost);
        target.currentBalance = Number(assetForm.cost);
      }
      GoshalaDB.saveTable('ledgers', ledgers);

      const vouchers = GoshalaDB.getTable<any>('vouchers');
      const vIdx = vouchers.findIndex((v: any) => v.entries.some((ent: any) => ent.ledgerId === editingAsset.id));
      if (vIdx >= 0) {
        vouchers[vIdx].narration = `Recorded Fixed Asset: ${assetForm.name}`;
        vouchers[vIdx].entries.forEach((ent: any) => {
          ent.amount = Number(assetForm.cost);
        });
        GoshalaDB.saveTable('vouchers', vouchers);
      }
      GoshalaDB.recalculateLedgers();
      alert(language === 'hi' ? 'अचल संपत्ति सफलतापूर्वक अपडेट की गई।' : 'Fixed Asset updated successfully.');
    } else {
      const codeCount = 1100 + ledgers.filter((l) => l.groupId === 'g-fixed-assets').length + 1;
      const newAssetLedger: Ledger = {
        id: `l-fa-${Date.now()}`,
        groupId: 'g-fixed-assets',
        name: assetForm.name,
        code: String(codeCount),
        type: 'ASSET',
        openingBalance: Number(assetForm.cost),
        currentBalance: Number(assetForm.cost),
        isSystem: false,
      };

      ledgers.push(newAssetLedger);
      GoshalaDB.saveTable('ledgers', ledgers);

      const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
      const voucher = {
        id: `v-fa-${Date.now()}`,
        fyId: config.activeFyId,
        voucherNumber: '',
        voucherType: 'JOURNAL' as const,
        date: new Date().toISOString().split('T')[0],
        status: 'POSTED' as const,
        costCenterId: 'cc-construction' as any,
        narration: `Recorded new Fixed Asset addition: ${assetForm.name}`,
        entries: [
          { ledgerId: newAssetLedger.id, amount: Number(assetForm.cost), isDebit: true },
          { ledgerId: 'l-fund-general', amount: Number(assetForm.cost), isDebit: false },
        ],
        attachments: [],
        auditTrail: [],
      };

      GoshalaDB.saveVoucher(voucher, { name: user.name, role: user.role });
      alert(language === 'hi' ? 'नई अचल संपत्ति सफलतापूर्वक पंजीकृत की गई।' : 'New Fixed Asset registered.');
    }

    setShowAssetModal(false);
    loadData();
  };

  const handleAssetDelete = (id: string) => {
    if (
      !window.confirm(
        language === 'hi' ? 'क्या आप सचमुच इस अचल संपत्ति को हटाना चाहते हैं?' : 'Are you sure you want to delete this asset?'
      )
    )
      return;

    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const filteredLedgers = ledgers.filter((l) => l.id !== id);
    GoshalaDB.saveTable('ledgers', filteredLedgers);

    const vouchers = GoshalaDB.getTable<any>('vouchers');
    const filteredVouchers = vouchers.filter((v: any) => !v.entries.some((ent: any) => ent.ledgerId === id));
    GoshalaDB.saveTable('vouchers', filteredVouchers);

    GoshalaDB.recalculateLedgers();
    alert(language === 'hi' ? 'संपत्ति सफलतापूर्वक हटाई गई।' : 'Asset deleted successfully.');
    loadData();
  };

  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.partyName || !loanForm.reason) return alert('Fill all fields');

    const allLoans = GoshalaDB.getTable<Loan>('loans');
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');

    if (editingLoan) {
      const targetLoan = allLoans.find((l) => l.id === editingLoan.id);
      if (targetLoan) {
        targetLoan.partyName = loanForm.partyName;
        targetLoan.principalAmount = Number(loanForm.principal);
        targetLoan.interestRate = Number(loanForm.interestRate);
        targetLoan.installments = Number(loanForm.installments);
        targetLoan.outstandingAmount = Number(loanForm.principal);
      }
      GoshalaDB.saveTable('loans', allLoans);

      const targetLedger = ledgers.find((l) => l.name.startsWith(editingLoan.partyName) || l.id.includes(editingLoan.id));
      if (targetLedger) {
        targetLedger.name = `${loanForm.partyName} Loan (${loanForm.reason})`;
        targetLedger.openingBalance = Number(loanForm.principal);
        targetLedger.currentBalance = Number(loanForm.principal);
      }
      GoshalaDB.saveTable('ledgers', ledgers);

      const vouchers = GoshalaDB.getTable<any>('vouchers');
      const vIdx = vouchers.findIndex((v: any) => v.entries.some((ent: any) => ent.ledgerId === targetLedger?.id));
      if (vIdx >= 0) {
        vouchers[vIdx].narration = `Disbursed loan from ${loanForm.partyName} for: ${loanForm.reason}`;
        vouchers[vIdx].entries.forEach((ent: any) => {
          ent.amount = Number(loanForm.principal);
        });
        GoshalaDB.saveTable('vouchers', vouchers);
      }

      GoshalaDB.recalculateLedgers();
      alert(language === 'hi' ? 'ऋण विवरण सफलतापूर्वक अपडेट हुआ।' : 'Loan details updated successfully.');
    } else {
      const newLoan: Loan = {
        id: `loan-${Date.now()}`,
        type: 'TAKEN',
        partyName: loanForm.partyName,
        principalAmount: Number(loanForm.principal),
        interestRate: Number(loanForm.interestRate),
        installments: Number(loanForm.installments),
        outstandingAmount: Number(loanForm.principal),
        dateDisbursed: new Date().toISOString().split('T')[0],
        history: [],
      };

      allLoans.push(newLoan);
      GoshalaDB.saveTable('loans', allLoans);

      const newLoanLedger: Ledger = {
        id: `l-loan-${newLoan.id}`,
        groupId: 'g-loans-liab',
        name: `${loanForm.partyName} Loan (${loanForm.reason})`,
        code: String(2100 + ledgers.filter((l) => l.groupId === 'g-loans-liab').length + 1),
        type: 'LIABILITY',
        openingBalance: Number(loanForm.principal),
        currentBalance: Number(loanForm.principal),
      };

      ledgers.push(newLoanLedger);
      GoshalaDB.saveTable('ledgers', ledgers);

      const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
      const voucher = {
        id: `v-loan-${Date.now()}`,
        fyId: config.activeFyId,
        voucherNumber: '',
        voucherType: 'RECEIPT' as const,
        date: new Date().toISOString().split('T')[0],
        status: 'POSTED' as const,
        narration: `Disbursed loan from ${loanForm.partyName} for: ${loanForm.reason}`,
        entries: [
          { ledgerId: 'l-bank-boi', amount: Number(loanForm.principal), isDebit: true },
          { ledgerId: newLoanLedger.id, amount: Number(loanForm.principal), isDebit: false },
        ],
        attachments: [],
        auditTrail: [],
      };

      GoshalaDB.saveVoucher(voucher, { name: user.name, role: user.role });
      alert(language === 'hi' ? 'नया ऋण दर्ज किया गया।' : 'New loan borrowing recorded.');
    }

    setShowLoanModal(false);
    loadData();
  };

  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepayLoan || repayForm.principalPaid <= 0) return alert('Invalid principal amount');

    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    let loanLedger = ledgers.find(
      (l) => l.name.startsWith(selectedRepayLoan.partyName) || l.id.includes(selectedRepayLoan.id)
    );
    if (!loanLedger) {
      loanLedger = ledgers.find((l) => l.groupId === 'g-loans-liabilities' || l.groupId === 'g-loans-liab' || l.type === 'LIABILITY');
    }
    if (!loanLedger) return alert('Loan liability ledger not found.');

    const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
    const totalPaid = Number(repayForm.principalPaid) + Number(repayForm.interestPaid);

    let interestLedger = ledgers.find(
      (l) => l.id === 'l-exp-interest' || l.name.includes('Interest') || l.name.includes('ब्याज')
    );
    if (!interestLedger && repayForm.interestPaid > 0) {
      interestLedger = {
        id: 'l-exp-interest',
        code: '5010',
        name: 'Loan Interest Expense (ऋण ब्याज व्यय)',
        groupId: 'g-indirect-expenses',
        type: 'EXPENSE',
        openingBalance: 0,
        currentBalance: 0,
      };
      ledgers.push(interestLedger);
      GoshalaDB.saveTable('ledgers', ledgers);
    }

    const entries = [
      { ledgerId: loanLedger.id, amount: Number(repayForm.principalPaid), isDebit: true },
      ...(repayForm.interestPaid > 0 && interestLedger
        ? [{ ledgerId: interestLedger.id, amount: Number(repayForm.interestPaid), isDebit: true }]
        : []),
      { ledgerId: repayForm.payFromLedger, amount: totalPaid, isDebit: false },
    ];

    const voucher: Voucher = {
      id: `v-repay-${Date.now()}`,
      fyId: config.activeFyId,
      voucherNumber: '',
      voucherType: 'LOAN_REPAYMENT',
      date: repayForm.date,
      status: 'POSTED',
      narration: `[${selectedRepayLoan.partyName}] Loan Repayment - Principal: ₹${repayForm.principalPaid}, Interest: ₹${repayForm.interestPaid}. ${repayForm.notes}`,
      entries,
      attachments: [],
      paymentMode: repayForm.paymentMode as any,
      referenceDetails: `${repayForm.paymentMode} • EMI Repayment`,
      auditTrail: [],
    };

    GoshalaDB.saveVoucher(voucher, { name: user.name, role: user.role });

    const allLoans = GoshalaDB.getTable<Loan>('loans');
    const targetLoan = allLoans.find((l) => l.id === selectedRepayLoan.id);
    if (targetLoan) {
      targetLoan.outstandingAmount = Math.max(0, targetLoan.outstandingAmount - Number(repayForm.principalPaid));
      targetLoan.history = targetLoan.history || [];
      targetLoan.history.push({
        date: repayForm.date,
        amount: `₹${totalPaid}`,
        principal: Number(repayForm.principalPaid),
        interest: Number(repayForm.interestPaid),
      });
      GoshalaDB.saveTable('loans', allLoans);
    }

    GoshalaDB.recalculateLedgers();
    alert(
      language === 'hi'
        ? 'ऋण किश्त सफलतापूर्वक दर्ज की गई।'
        : 'Loan Repayment posted successfully.'
    );
    setShowRepayModal(false);
    loadData();
  };

  const handleLoanDelete = (loanId: string) => {
    if (
      !window.confirm(
        language === 'hi' ? 'क्या आप सचमुच इस ऋण को हटाना चाहते हैं?' : 'Are you sure you want to delete this loan?'
      )
    )
      return;

    const allLoans = GoshalaDB.getTable<Loan>('loans');
    const filteredLoans = allLoans.filter((l) => l.id !== loanId);
    GoshalaDB.saveTable('loans', filteredLoans);

    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const filteredLedgers = ledgers.filter((l) => !l.id.includes(loanId));
    GoshalaDB.saveTable('ledgers', filteredLedgers);

    const vouchers = GoshalaDB.getTable<any>('vouchers');
    const filteredVouchers = vouchers.filter((v: any) => !v.entries.some((ent: any) => ent.ledgerId.includes(loanId)));
    GoshalaDB.saveTable('vouchers', filteredVouchers);

    GoshalaDB.recalculateLedgers();
    alert(language === 'hi' ? 'ऋण रिकॉर्ड हटा दिया गया।' : 'Loan record deleted.');
    loadData();
  };

  // Calculations for vitals overview
  const totalAssetsVal = fixedAssets.reduce((sum, fa) => sum + fa.currentBalance, 0);
  const totalPrincipalBorrowed = loans.reduce((sum, l) => sum + l.principalAmount, 0);
  const totalOutstandingLoan = loans.reduce((sum, l) => sum + l.outstandingAmount, 0);
  const totalPaidOff = Math.max(0, totalPrincipalBorrowed - totalOutstandingLoan);

  const getAssetIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('tractor') || n.includes('vehicle')) return <Tractor className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
    return <Hammer className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
  };

  const bankCashLedgers = GoshalaDB.getTable<Ledger>('ledgers').filter(
    (l) => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable'
  );

  const tabItems = [
    { id: 'assets', label: 'Fixed Assets', count: fixedAssets.length, icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'loans', label: 'Loans & Borrowings', count: loans.length, icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'repayments', label: 'EMI Repayments', count: repayVouchers.length, icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'creditors', label: 'Sundry Creditors', count: sundryCreditors.length, icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { id: 'advances', label: 'Supplier Advances', count: supplierAdvances.length, icon: <CreditCard className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Assets & Loans Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Fixed assets registry, loan liabilities, EMI amortizations, and creditor balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'assets' && (
            <button
              onClick={handleOpenAssetCreate}
              className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Fixed Asset</span>
            </button>
          )}

          {activeTab === 'loans' && (
            <button
              onClick={handleOpenLoanCreate}
              className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Loan Borrowing</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        <KpiCard
          title="Fixed Assets"
          value={`₹${totalAssetsVal.toLocaleString()}`}
          subtitle={`${fixedAssets.length} Assets Registered`}
          icon={<Building2 className="w-4 h-4" />}
          onClick={() => setActiveTab('assets')}
        />

        <KpiCard
          title="Total Borrowed"
          value={`₹${totalPrincipalBorrowed.toLocaleString()}`}
          subtitle={`${loans.length} Loan Accounts`}
          icon={<Landmark className="w-4 h-4" />}
          onClick={() => setActiveTab('loans')}
        />

        <KpiCard
          title="Outstanding Debt"
          value={`₹${totalOutstandingLoan.toLocaleString()}`}
          badge={{ text: 'Liability', variant: 'danger' }}
          icon={<CreditCard className="w-4 h-4 text-rose-600" />}
          onClick={() => setActiveTab('loans')}
        />

        <KpiCard
          title="Creditors Payable"
          value={`₹${totalCreditorLiability.toLocaleString()}`}
          badge={{ text: `${sundryCreditors.length} Vendors`, variant: 'warning' }}
          icon={<ShoppingCart className="w-4 h-4" />}
          onClick={() => setActiveTab('creditors')}
        />

        <KpiCard
          title="Supplier Advances"
          value={`₹${totalSupplierAdvances.toLocaleString()}`}
          badge={{ text: 'Debit Bal', variant: 'success' }}
          icon={<ArrowUpRight className="w-4 h-4 text-emerald-600" />}
          onClick={() => setActiveTab('advances')}
        />
      </div>

      {/* Navigation Tabs */}
      <Tabs items={tabItems} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} variant="underline" />

      {/* Tab 1: Fixed Assets */}
      {activeTab === 'assets' && (
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Fixed Assets Register
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Aggregate WDV: ₹{totalAssetsVal.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-2">Asset Details</th>
                  <th className="pb-3">Ledger Code</th>
                  <th className="pb-3 text-right">Valuation (₹)</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {fixedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                      No fixed assets recorded
                    </td>
                  </tr>
                ) : (
                  fixedAssets.map((fa) => (
                    <tr key={fa.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 pl-2 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {getAssetIcon(fa.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatBilingual(fa.name, language)}
                          </p>
                          <span className="text-[10px] text-slate-400">Capital Asset</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-slate-500">{fa.code}</td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{fa.currentBalance.toLocaleString()}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAssetEdit(fa)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Asset"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAssetDelete(fa.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Loans & Borrowings */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loans.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2">
                No borrowed loan accounts recorded
              </div>
            ) : (
              loans.map((loan) => {
                const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
                const ledger = ledgers.find((l) => l.name.startsWith(loan.partyName) || l.id.includes(loan.id));
                let purpose = '';
                if (ledger) {
                  const match = ledger.name.match(/\(([^)]+)\)/);
                  if (match) purpose = match[1];
                }

                return (
                  <div
                    key={loan.id}
                    className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/50 flex items-center justify-center text-rose-600 shrink-0">
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {loan.partyName}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Rate: {loan.interestRate}% p.a. • Original: ₹{loan.principalAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenLoanEdit(loan)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Loan"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoanDelete(loan.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Loan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Purpose of Loan:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {purpose || 'Infrastructure'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Remaining Balance:</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                          ₹{loan.outstandingAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenRepayModal(loan)}
                        className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Pay EMI Installment</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: EMI Repayment Log */}
      {activeTab === 'repayments' && (
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Loan EMI Repayment History
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-2">Voucher #</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Particulars / Remarks</th>
                  <th className="pb-3">Payment Mode</th>
                  <th className="pb-3 text-right pr-2">Total Paid (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {repayVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No loan repayment vouchers recorded in this period
                    </td>
                  </tr>
                ) : (
                  repayVouchers.map((v) => {
                    const totalAmt = v.entries
                      .filter((e) => e.isDebit)
                      .reduce((s, e) => s + e.amount, 0);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 pl-2 font-semibold text-slate-900 dark:text-slate-100">
                          {v.voucherNumber}
                        </td>
                        <td className="py-3 text-slate-500">{v.date}</td>
                        <td className="py-3 max-w-sm truncate text-slate-600 dark:text-slate-400">
                          {v.narration}
                        </td>
                        <td className="py-3">
                          <Badge variant="neutral" size="sm">
                            {v.paymentMode || 'BANK_UPI'}
                          </Badge>
                        </td>
                        <td className="py-3 text-right pr-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{totalAmt.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Sundry Creditors */}
      {activeTab === 'creditors' && (
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Outstanding Creditors for Purchase
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Suppliers with credit balances payable from previous bills and purchases
              </p>
            </div>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
              Total: ₹{totalCreditorLiability.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-2">Vendor / Party Name</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Transactions</th>
                  <th className="pb-3 text-right pr-2">Payable Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {sundryCreditors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-emerald-600 dark:text-emerald-400">
                      All vendor bills are fully settled. No outstanding creditors.
                    </td>
                  </tr>
                ) : (
                  sundryCreditors.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 pl-2 font-semibold text-slate-900 dark:text-slate-100">
                        {c.name}
                      </td>
                      <td className="py-3 font-mono text-slate-500">{c.phone || '—'}</td>
                      <td className="py-3 text-slate-500">{c.billsCount} entries</td>
                      <td className="py-3 text-right pr-2 font-mono font-bold text-amber-600 dark:text-amber-400">
                        ₹{c.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Supplier Advances */}
      {activeTab === 'advances' && (
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Supplier Advance Payments
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Debited advances to parties where goods or invoices are pending delivery
              </p>
            </div>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              Total: ₹{totalSupplierAdvances.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-2">Vendor / Party Name</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Transactions</th>
                  <th className="pb-3 text-right pr-2">Advance Amount (Dr ₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {supplierAdvances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                      No supplier advances recorded
                    </td>
                  </tr>
                ) : (
                  supplierAdvances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 pl-2 font-semibold text-slate-900 dark:text-slate-100">
                        {adv.name}
                      </td>
                      <td className="py-3 font-mono text-slate-500">{adv.phone || '—'}</td>
                      <td className="py-3 text-slate-500">{adv.billsCount} entries</td>
                      <td className="py-3 text-right pr-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{adv.balance.toLocaleString()} (Dr)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Asset Modal */}
      <Modal
        isOpen={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        title={editingAsset ? 'Edit Fixed Asset' : 'Register Fixed Asset'}
        description="Record capital infrastructure, machinery, borewells, or vehicles"
      >
        <form onSubmit={handleAssetSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Fixed Asset Name *
            </label>
            <input
              type="text"
              required
              value={assetForm.name}
              onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
              placeholder="e.g. Submersible pump motor, Tractor"
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Asset Cost Value (₹) *
            </label>
            <input
              type="number"
              required
              value={assetForm.cost}
              onChange={(e) => setAssetForm({ ...assetForm, cost: Number(e.target.value) })}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAssetModal(false)}
              className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-medium shadow-xs"
            >
              {editingAsset ? 'Save Changes' : 'Register Asset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Loan Modal */}
      <Modal
        isOpen={showLoanModal}
        onClose={() => setShowLoanModal(false)}
        title={editingLoan ? 'Edit Loan Borrowing' : 'Record Borrowed Loan'}
        description="Record institutional or private loan liability"
      >
        <form onSubmit={handleLoanSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Lender Institution / Bank Name *
            </label>
            <input
              type="text"
              required
              value={loanForm.partyName}
              onChange={(e) => setLoanForm({ ...loanForm, partyName: e.target.value })}
              placeholder="e.g. Bank of India, State Bank of India"
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Principal Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={loanForm.principal}
                onChange={(e) => setLoanForm({ ...loanForm, principal: Number(e.target.value) })}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Yearly Interest (%) *
              </label>
              <input
                type="number"
                required
                value={loanForm.interestRate}
                onChange={(e) => setLoanForm({ ...loanForm, interestRate: Number(e.target.value) })}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Purpose of Borrowing *
            </label>
            <input
              type="text"
              required
              value={loanForm.reason}
              onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })}
              placeholder="e.g. Cow shed construction or Tractor purchase"
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLoanModal(false)}
              className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-medium shadow-xs"
            >
              {editingLoan ? 'Save Changes' : 'Record Loan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EMI Repayment Modal */}
      {selectedRepayLoan && (
        <Modal
          isOpen={showRepayModal}
          onClose={() => setShowRepayModal(false)}
          title="Submit Loan EMI Repayment"
          description={`Account: ${selectedRepayLoan.partyName} • Remaining: ₹${selectedRepayLoan.outstandingAmount.toLocaleString()}`}
        >
          <form onSubmit={handleRepaySubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Principal Paid (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={repayForm.principalPaid}
                  onChange={(e) => setRepayForm({ ...repayForm, principalPaid: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Interest Paid (₹)
                </label>
                <input
                  type="number"
                  value={repayForm.interestPaid}
                  onChange={(e) => setRepayForm({ ...repayForm, interestPaid: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Pay From Account
                </label>
                <select
                  value={repayForm.payFromLedger}
                  onChange={(e) => setRepayForm({ ...repayForm, payFromLedger: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {bankCashLedgers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {formatBilingual(l.name, language)} [{l.code}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Mode
                </label>
                <select
                  value={repayForm.paymentMode}
                  onChange={(e) => setRepayForm({ ...repayForm, paymentMode: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="BANK_UPI">BANK_UPI</option>
                  <option value="CASH">CASH</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Repayment Date
              </label>
              <input
                type="date"
                required
                value={repayForm.date}
                onChange={(e) => setRepayForm({ ...repayForm, date: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Total Deducted:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                ₹{(Number(repayForm.principalPaid) + Number(repayForm.interestPaid)).toLocaleString()}
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRepayModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs"
              >
                Submit EMI Repayment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
