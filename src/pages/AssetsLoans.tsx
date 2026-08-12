import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Ledger, Loan, Voucher } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage, formatBilingual } from '../hooks/useLanguage';
import { Plus, Trash, Edit3, Landmark, Hammer, BadgeInfo, Tractor, X, DollarSign, Calendar, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export const AssetsLoans: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  
  const [fixedAssets, setFixedAssets] = useState<Ledger[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayVouchers, setRepayVouchers] = useState<Voucher[]>([]);
  const [sundryCreditors, setSundryCreditors] = useState<{ id: string; name: string; phone: string; balance: number; billsCount: number }[]>([]);
  const [supplierAdvances, setSupplierAdvances] = useState<{ id: string; name: string; phone: string; balance: number; billsCount: number }[]>([]);
  const [totalCreditorLiability, setTotalCreditorLiability] = useState<number>(0);
  const [totalSupplierAdvances, setTotalSupplierAdvances] = useState<number>(0);

  // Modals visibility
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [showAdvancesModal, setShowAdvancesModal] = useState(false);
  
  // Selected items for Edit/Repay
  const [editingAsset, setEditingAsset] = useState<Ledger | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [selectedRepayLoan, setSelectedRepayLoan] = useState<Loan | null>(null);

  // Form states
  const [assetForm, setAssetForm] = useState({
    name: '',
    cost: 50000
  });

  const [loanForm, setLoanForm] = useState({
    partyName: '',
    principal: 100000,
    interestRate: 8,
    installments: 24,
    reason: ''
  });

  const [repayForm, setRepayForm] = useState({
    principalPaid: 5000,
    interestPaid: 500,
    paymentMode: 'BANK_UPI',
    payFromLedger: 'l-bank-boi',
    date: new Date().toISOString().split('T')[0],
    notes: 'Loan EMI repayment'
  });

  const [showCreditorsModal, setShowCreditorsModal] = useState(false);

  useEffect(() => {
    loadData();

    const handleFyChanged = () => {
      loadData();
    };

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
    
    setFixedAssets(ledgers.filter(l => l.groupId === 'g-fixed-assets').map(l => ({
      ...l,
      currentBalance: fyBalances[l.id]?.currentBalance ?? l.currentBalance
    })));

    const allLoans = GoshalaDB.getTable<Loan>('loans');
    const fyLoans = allLoans.map(loan => {
      let matchingLedger = ledgers.find(l => l.id === loan.id || l.id === `l-loan-${loan.id}` || l.name.toLowerCase() === loan.partyName.toLowerCase());
      if (!matchingLedger) {
        matchingLedger = ledgers.find(l => (l.name.toLowerCase().includes(loan.partyName.toLowerCase()) || loan.partyName.toLowerCase().includes(l.name.toLowerCase())) && !l.name.toLowerCase().includes('building'));
      }
      const outstanding = matchingLedger && fyBalances[matchingLedger.id] !== undefined
        ? Math.max(0, fyBalances[matchingLedger.id].currentBalance)
        : loan.outstandingAmount;
      return {
        ...loan,
        outstandingAmount: outstanding
      };
    });
    setLoans(fyLoans);

    const allVouchers = GoshalaDB.getTable<Voucher>('vouchers');

    // ONLY repayment vouchers in the active FY for the log table!
    const loanRepaysInActiveFy = allVouchers.filter(v => 
      v.status === 'POSTED' &&
      (v.voucherType === 'LOAN_REPAYMENT' || v.narration?.toLowerCase().includes('loan repayment') || v.narration?.toLowerCase().includes('ऋण')) &&
      v.date >= activeFyObj.startDate && v.date <= activeFyObj.endDate
    );
    setRepayVouchers(loanRepaysInActiveFy.reverse());

    // Calculate Sundry Creditors - 100% DYNAMICALLY FROM VOUCHERS AND CONTACTS
    const contacts = GoshalaDB.getTable<any>('contacts');
    const isPastOrActive2025 = activeFyId === 'fy-2025-26';

    // Exclude future FY 2026-27 payments when viewing FY 2025-26
    const postedVouchersUpToFy = allVouchers.filter(v => {
      if (v.status !== 'POSTED') return false;
      if (isPastOrActive2025) {
        return v.date <= activeFyObj.endDate && v.fyId !== 'fy-2026-27';
      }
      return v.date <= activeFyObj.endDate;
    });

    const partyMap: { [contactId: string]: { id: string; name: string; phone: string; opening: number; credits: number; debits: number; count: number } } = {};

    // 1. Seed ALL contacts into partyMap
    contacts.forEach(c => {
      partyMap[c.id] = {
        id: c.id,
        name: c.name.trim(),
        phone: c.phone || '—',
        opening: Number(c.outstandingBalance) || 0,
        credits: 0,
        debits: 0,
        count: 0
      };
    });

    // 2. Scan all vouchers up to active FY end for explicit subLedgerId entries
    postedVouchersUpToFy.forEach(v => {
      // Find entries that hit liability ledgers (creditors)
      const creditorEntries = v.entries.filter(e => e.ledgerId === 'l-liab-creditors' || e.ledgerId.includes('vend') || e.ledgerId.includes('creditor'));
      
      creditorEntries.forEach(e => {
        if (!e.subLedgerId) return; // Ignore unlinked entries
        
        if (!partyMap[e.subLedgerId]) {
            // Unlikely to happen if the contact was deleted, but let's handle it safely
            partyMap[e.subLedgerId] = {
              id: e.subLedgerId,
              name: 'Unlinked / Deleted Supplier',
              phone: '—',
              opening: 0,
              credits: 0,
              debits: 0,
              count: 0
            };
        }
        
        partyMap[e.subLedgerId].count += 1;
        
        if (!e.isDebit) {
          // CREDIT to l-liab-creditors = Purchase / Vendor Liability Addition
          partyMap[e.subLedgerId].credits += e.amount;
        } else {
          // DEBIT to l-liab-creditors = Payment / Vendor Liability Reduction
          partyMap[e.subLedgerId].debits += e.amount;
        }
      });
    });

    // 3. Compute net balance for each vendor/party
    const creditorList = Object.values(partyMap).map(p => {
      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        balance: p.opening + p.credits - p.debits,
        billsCount: p.count
      };
    });

    // Outstanding Creditors (Credit Balances > 0)
    const outstandingCreditors = creditorList.filter(p => p.balance > 0);
    const totalCreditorBal = outstandingCreditors.reduce((sum, p) => sum + p.balance, 0);

    // Supplier Advances (Debit Balances < 0)
    const advancesList = creditorList
        .filter(p => p.balance < 0)
        .map(p => ({ ...p, balance: Math.abs(p.balance) })); // Show positive number in UI for advance
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
    const ledger = ledgers.find(l => l.name.startsWith(loan.partyName));
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
      reason: purpose || 'Cow Shed Construction'
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
      notes: `Monthly EMI repayment to ${loan.partyName}`
    });
    setShowRepayModal(true);
  };

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name) return alert('Name is required');

    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');

    if (editingAsset) {
      const target = ledgers.find(l => l.id === editingAsset.id);
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
      alert(language === 'hi' ? 'अचल संपत्ति सफलतापूर्वक अपडेट की गई!' : 'Fixed Asset updated successfully!');
    } else {
      const codeCount = 1100 + ledgers.filter(l => l.groupId === 'g-fixed-assets').length + 1;
      const newAssetLedger: Ledger = {
        id: `l-fa-${Date.now()}`,
        groupId: 'g-fixed-assets',
        name: assetForm.name,
        code: String(codeCount),
        type: 'ASSET',
        openingBalance: Number(assetForm.cost),
        currentBalance: Number(assetForm.cost),
        isSystem: false
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
          { ledgerId: 'l-fund-general', amount: Number(assetForm.cost), isDebit: false }
        ],
        attachments: [],
        auditTrail: []
      };

      GoshalaDB.saveVoucher(voucher, { name: user.name, role: user.role });
      alert(language === 'hi' ? 'नई अचल संपत्ति सफलतापूर्वक पंजीकृत!' : 'New Fixed Asset registered!');
    }

    setShowAssetModal(false);
    loadData();
  };

  const handleAssetDelete = (id: string) => {
    if (!window.confirm(language === 'hi' ? 'क्या आप सचमुच इस अचल संपत्ति को हटाना चाहते हैं?' : 'Are you sure you want to delete this asset?')) return;
    
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const filteredLedgers = ledgers.filter(l => l.id !== id);
    GoshalaDB.saveTable('ledgers', filteredLedgers);

    const vouchers = GoshalaDB.getTable<any>('vouchers');
    const filteredVouchers = vouchers.filter((v: any) => !v.entries.some((ent: any) => ent.ledgerId === id));
    GoshalaDB.saveTable('vouchers', filteredVouchers);

    GoshalaDB.recalculateLedgers();
    alert(language === 'hi' ? 'संपत्ति सफलतापूर्वक हटाई गई!' : 'Asset deleted successfully!');
    loadData();
  };

  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.partyName || !loanForm.reason) return alert('Fill all fields');

    const allLoans = GoshalaDB.getTable<Loan>('loans');
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');

    if (editingLoan) {
      const targetLoan = allLoans.find(l => l.id === editingLoan.id);
      if (targetLoan) {
        targetLoan.partyName = loanForm.partyName;
        targetLoan.principalAmount = Number(loanForm.principal);
        targetLoan.interestRate = Number(loanForm.interestRate);
        targetLoan.installments = Number(loanForm.installments);
        targetLoan.outstandingAmount = Number(loanForm.principal);
      }
      GoshalaDB.saveTable('loans', allLoans);

      const targetLedger = ledgers.find(l => l.name.startsWith(editingLoan.partyName) || l.id.includes(editingLoan.id));
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
      alert(language === 'hi' ? 'ऋण विवरण सफलतापूर्वक अपडेट हुआ!' : 'Loan details updated successfully!');
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
        history: []
      };

      allLoans.push(newLoan);
      GoshalaDB.saveTable('loans', allLoans);

      const newLoanLedger: Ledger = {
        id: `l-loan-${newLoan.id}`,
        groupId: 'g-loans-liab',
        name: `${loanForm.partyName} Loan (${loanForm.reason})`,
        code: String(2100 + ledgers.filter(l => l.groupId === 'g-loans-liab').length + 1),
        type: 'LIABILITY',
        openingBalance: Number(loanForm.principal),
        currentBalance: Number(loanForm.principal)
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
          { ledgerId: newLoanLedger.id, amount: Number(loanForm.principal), isDebit: false }
        ],
        attachments: [],
        auditTrail: []
      };

      GoshalaDB.saveVoucher(voucher, { name: user.name, role: user.role });
      alert(language === 'hi' ? 'नया ऋण दर्ज किया गया एवं बैंक खाता अपडेट हुआ!' : 'New loan borrowing recorded!');
    }

    setShowLoanModal(false);
    loadData();
  };

  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepayLoan || repayForm.principalPaid <= 0) return alert('Invalid principal amount');

    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    let loanLedger = ledgers.find(l => l.name.startsWith(selectedRepayLoan.partyName) || l.id.includes(selectedRepayLoan.id));
    if (!loanLedger) {
      loanLedger = ledgers.find(l => l.groupId === 'g-loans-liabilities' || l.groupId === 'g-loans-liab' || l.type === 'LIABILITY');
    }
    if (!loanLedger) return alert('Loan liability ledger not found.');

    const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
    const totalPaid = Number(repayForm.principalPaid) + Number(repayForm.interestPaid);

    let interestLedger = ledgers.find(l => l.id === 'l-exp-interest' || l.name.includes('Interest') || l.name.includes('ब्याज'));
    if (!interestLedger && repayForm.interestPaid > 0) {
      interestLedger = {
        id: 'l-exp-interest',
        code: '5010',
        name: 'Loan Interest Expense (ऋण ब्याज व्यय)',
        groupId: 'g-indirect-expenses',
        type: 'EXPENSE',
        openingBalance: 0,
        currentBalance: 0
      };
      ledgers.push(interestLedger);
      GoshalaDB.saveTable('ledgers', ledgers);
    }

    const entries = [
      { ledgerId: loanLedger.id, amount: Number(repayForm.principalPaid), isDebit: true },
      ...(repayForm.interestPaid > 0 && interestLedger ? [{ ledgerId: interestLedger.id, amount: Number(repayForm.interestPaid), isDebit: true }] : []),
      { ledgerId: repayForm.payFromLedger, amount: totalPaid, isDebit: false }
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
      auditTrail: []
    };

    GoshalaDB.saveVoucher(voucher, { name: user.name, role: user.role });

    // Update loan outstanding amount in loans table
    const allLoans = GoshalaDB.getTable<Loan>('loans');
    const targetLoan = allLoans.find(l => l.id === selectedRepayLoan.id);
    if (targetLoan) {
      targetLoan.outstandingAmount = Math.max(0, targetLoan.outstandingAmount - Number(repayForm.principalPaid));
      targetLoan.history = targetLoan.history || [];
      targetLoan.history.push({
        date: repayForm.date,
        amount: `₹${totalPaid}`,
        principal: Number(repayForm.principalPaid),
        interest: Number(repayForm.interestPaid)
      });
      GoshalaDB.saveTable('loans', allLoans);
    }

    GoshalaDB.recalculateLedgers();
    alert(language === 'hi' ? 'ऋण किश्त सफलतापूर्वक दर्ज की गई! बकाया ऋण राशि कम कर दी गई है।' : 'Loan Repayment posted successfully! Outstanding loan reduced.');
    setShowRepayModal(false);
    loadData();
  };

  const handleLoanDelete = (loanId: string) => {
    if (!window.confirm(language === 'hi' ? 'क्या आप सचमुच इस ऋण (Loan) को हटाना चाहते हैं?' : 'Are you sure you want to delete this loan?')) return;

    const allLoans = GoshalaDB.getTable<Loan>('loans');
    const filteredLoans = allLoans.filter(l => l.id !== loanId);
    GoshalaDB.saveTable('loans', filteredLoans);

    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const filteredLedgers = ledgers.filter(l => !l.id.includes(loanId));
    GoshalaDB.saveTable('ledgers', filteredLedgers);

    const vouchers = GoshalaDB.getTable<any>('vouchers');
    const filteredVouchers = vouchers.filter((v: any) => !v.entries.some((ent: any) => ent.ledgerId.includes(loanId)));
    GoshalaDB.saveTable('vouchers', filteredVouchers);

    GoshalaDB.recalculateLedgers();
    alert(language === 'hi' ? 'ऋण रिकॉर्ड हटा दिया गया!' : 'Loan record deleted!');
    loadData();
  };

  // Calculations for vitals overview
  const totalAssetsVal = fixedAssets.reduce((sum, fa) => sum + fa.currentBalance, 0);
  const totalPrincipalBorrowed = loans.reduce((sum, l) => sum + l.principalAmount, 0);
  const totalOutstandingLoan = loans.reduce((sum, l) => sum + l.outstandingAmount, 0);
  const totalPaidOff = Math.max(0, totalPrincipalBorrowed - totalOutstandingLoan);

  const getAssetIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('tractor') || n.includes(' vehicle')) return <Tractor className="w-5 h-5 text-saffron-650" />;
    return <Hammer className="w-5 h-5 text-forest-600" />;
  };

  const bankCashLedgers = GoshalaDB.getTable<Ledger>('ledgers').filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable');

  return (
    <div className="space-y-8">
      
      {/* Overview header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center space-x-2">
            <span className="w-2.5 h-6 bg-saffron-550 rounded-full inline-block"></span>
            <span>{language === 'hi' ? 'अचल संपत्ति एवं बकाया ऋण (Assets & Loans)' : 'Fixed Assets & Loans Management'}</span>
          </h2>
          <p className="text-slate-500 text-xs dark:text-slate-400 mt-1">
            {language === 'hi' ? 'अचल संपत्तियों का प्रबंधन, बकाया ऋण ट्रैक करें एवं किश्त (EMI Repayment) जमा करें' : 'Manage Fixed Assets, track borrowed loans, and post EMI repayments'}
          </p>
        </div>
      </div>

      {/* Vitals Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div 
          onClick={() => document.getElementById('fixed-assets-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-2 cursor-pointer hover:border-forest-400 hover:shadow-md transition"
        >
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            {language === 'hi' ? 'कुल अचल संपत्ति (Fixed Assets)' : 'Total Fixed Assets'}
          </span>
          <p className="text-2xl font-black text-forest-650">₹{totalAssetsVal.toLocaleString()}</p>
          <span className="text-[9px] text-forest-600 font-bold bg-forest-50 dark:bg-forest-950/20 px-2 py-0.5 rounded-full inline-block">
            {fixedAssets.length} {language === 'hi' ? 'पंजीकृत संपत्तियां' : 'Registered Assets'} ➔
          </span>
        </div>

        <div 
          onClick={() => document.getElementById('loans-register-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-2 cursor-pointer hover:border-slate-400 hover:shadow-md transition"
        >
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            {language === 'hi' ? 'कुल स्वीकृत ऋण (Total Borrowed)' : 'Total Principal Borrowed'}
          </span>
          <p className="text-2xl font-black text-slate-800 dark:text-white">₹{totalPrincipalBorrowed.toLocaleString()}</p>
          <span className="text-[9px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full inline-block">
            {loans.length} {language === 'hi' ? 'सक्रिय ऋण खाते' : 'Active Loan Accounts'} ➔
          </span>
        </div>

        <div 
          onClick={() => document.getElementById('loans-register-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-2 cursor-pointer hover:border-red-400 hover:shadow-md transition"
        >
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            {language === 'hi' ? 'बकाया ऋण मूलधन (Outstanding)' : 'Outstanding Principal'}
          </span>
          <p className="text-2xl font-black text-red-550">₹{totalOutstandingLoan.toLocaleString()}</p>
          <span className="text-[9px] text-red-600 font-bold bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full inline-block">
            {language === 'hi' ? 'सक्रिय देनदारी' : 'Remaining Liability'} ➔
          </span>
        </div>

        <div 
          onClick={() => document.getElementById('repay-vouchers-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-2 cursor-pointer hover:border-emerald-400 hover:shadow-md transition"
        >
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            {language === 'hi' ? 'चुकाया गया मूलधन (Principal Repaid)' : 'Principal Repaid'}
          </span>
          <p className="text-2xl font-black text-emerald-600">₹{totalPaidOff.toLocaleString()}</p>
          <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full inline-block">
            {language === 'hi' ? 'सफलतापूर्वक चुकता' : 'Successfully Paid Off'} ➔
          </span>
        </div>

        <div 
          onClick={() => setShowCreditorsModal(true)}
          className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-amber-200/60 dark:border-amber-700/50 shadow-sm space-y-2 bg-gradient-to-br from-amber-50/30 to-transparent cursor-pointer hover:border-amber-400 hover:shadow-md transition"
        >
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-wider block">
            {language === 'hi' ? 'कुल लेनदार उधारी (Creditors)' : 'Outstanding Creditors'}
          </span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">₹{totalCreditorLiability.toLocaleString()}</p>
          <span className="text-[9px] text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full inline-block">
            {sundryCreditors.length} {language === 'hi' ? 'बकाया वेंडर्स' : 'Pending Vendors'} ➔
          </span>
        </div>
      </div>

      {/* 🛒 OUTSTANDING CREDITORS & ADVANCES SUMMARY CARDS (CLICKABLE FOR DETAILS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div 
          onClick={() => setShowCreditorsModal(true)}
          className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent bg-white dark:bg-slate-800 p-6 rounded-3xl border border-amber-200/80 dark:border-amber-700/60 shadow-sm flex flex-col justify-between items-start gap-4 cursor-pointer hover:border-amber-400 hover:shadow-md transition group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black flex items-center justify-center text-xl group-hover:scale-110 transition">
              🛒
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900 dark:text-amber-100 text-sm">{language === 'hi' ? 'लेनदार बकाया (Outstanding Creditors)' : 'Outstanding Creditors'}</h3>
              <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-bold uppercase tracking-widest">{sundryCreditors.length} {language === 'hi' ? 'बकाया वेंडर्स' : 'Pending Vendors'}</p>
            </div>
          </div>
          <div className="flex items-end justify-between w-full">
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">₹{totalCreditorLiability.toLocaleString()}</p>
            <ArrowUpRight className="text-amber-400 group-hover:text-amber-600 w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
          </div>
        </div>

        <div 
          onClick={() => setShowAdvancesModal(true)}
          className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent bg-white dark:bg-slate-800 p-6 rounded-3xl border border-emerald-200/80 dark:border-emerald-700/60 shadow-sm flex flex-col justify-between items-start gap-4 cursor-pointer hover:border-emerald-400 hover:shadow-md transition group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center text-xl group-hover:scale-110 transition">
              💸
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 dark:text-emerald-100 text-sm">{language === 'hi' ? 'सप्लायर एडवांस (Supplier Advances)' : 'Supplier Advances (Dr)'}</h3>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-bold uppercase tracking-widest">{supplierAdvances.length} {language === 'hi' ? 'एडवांस भुगतान' : 'Advance Payments'}</p>
            </div>
          </div>
          <div className="flex items-end justify-between w-full">
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">₹{totalSupplierAdvances.toLocaleString()}</p>
            <ArrowUpRight className="text-emerald-400 group-hover:text-emerald-600 w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Fixed Assets Registry */}
        <div id="fixed-assets-section" className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">
              {language === 'hi' ? 'अचल संपत्ति रजिस्टर (Fixed Assets)' : 'Fixed Assets Register'}
            </h3>
            <button
              onClick={handleOpenAssetCreate}
              className="text-xs font-bold text-forest-600 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? '+ नई संपत्ति जोड़ें' : 'Add Fixed Asset'}</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {fixedAssets.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">{language === 'hi' ? 'कोई अचल संपत्ति दर्ज नहीं है।' : 'No fixed assets recorded.'}</p>
            ) : fixedAssets.map(fa => (
              <div key={fa.id} className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-750 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-850 rounded-xl flex items-center justify-center">
                    {getAssetIcon(fa.name)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">{formatBilingual(fa.name, language)}</h4>
                    <p className="text-[10px] text-slate-450">Code: {fa.code} • ₹{fa.currentBalance.toLocaleString()} WDV</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenAssetEdit(fa)}
                    className="p-1.5 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-650 rounded-lg border border-transparent hover:border-indigo-100"
                    title="Edit asset"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAssetDelete(fa.id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-slate-700 text-red-500 rounded-lg border border-transparent hover:border-red-100"
                    title="Delete asset"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outstanding Loans Registry */}
        <div id="loans-register-section" className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">
              {language === 'hi' ? 'बकाया ऋण खाते (Outstanding Loans)' : 'Outstanding Loan Accounts'}
            </h3>
            <button
              onClick={handleOpenLoanCreate}
              className="text-xs font-bold text-saffron-650 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? '+ नया ऋण जोड़ें' : 'Add Loan Borrowing'}</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {loans.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">{language === 'hi' ? 'कोई बकाया ऋण खाता नहीं है।' : 'No outstanding loans recorded.'}</p>
            ) : loans.map(loan => {
              const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
              const ledger = ledgers.find(l => l.name.startsWith(loan.partyName) || l.id.includes(loan.id));
              let purpose = '';
              if (ledger) {
                const match = ledger.name.match(/\(([^)]+)\)/);
                if (match) purpose = match[1];
              }

              return (
                <div key={loan.id} className="p-4 bg-red-50/20 dark:bg-red-950/10 rounded-2xl border border-red-100/50 flex flex-col space-y-3 justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 bg-red-50 dark:bg-red-950/20 rounded-xl flex items-center justify-center text-red-600">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-xs">{loan.partyName}</h4>
                        <p className="text-[10px] text-slate-400">Interest: {loan.interestRate}% p.a. • Original: ₹{loan.principalAmount.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenRepayModal(loan)}
                        className="px-2.5 py-1 bg-forest-600 hover:bg-forest-750 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer"
                      >
                        {language === 'hi' ? 'किश्त चुकाएं (EMI)' : 'Pay EMI'}
                      </button>
                      <button
                        onClick={() => handleOpenLoanEdit(loan)}
                        className="p-1.5 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-650 rounded-lg border border-transparent hover:border-indigo-100"
                        title="Edit loan"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleLoanDelete(loan.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-slate-700 text-red-500 rounded-lg border border-transparent hover:border-red-100"
                        title="Delete loan"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-750 text-[10px]">
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-350">
                      <BadgeInfo className="w-4 h-4 text-saffron-550 shrink-0" />
                      <span><strong>{language === 'hi' ? 'उद्देश्य:' : 'Purpose:'}</strong> {purpose || 'Cattle Shed Construction'}</span>
                    </div>
                    <div className="font-extrabold text-red-600">
                      {language === 'hi' ? 'बकाया:' : 'Outstanding:'} ₹{loan.outstandingAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Loan Repayment Log Table */}
      <div id="repay-vouchers-section" className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4 w-full">
        <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">
          {language === 'hi' ? 'ऋण भुगतान इतिहास रजिस्टर (Loan Repayment Log)' : 'Loan EMI Repayment History'}
        </h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                <th className="py-3 px-4 rounded-tl-xl">{language === 'hi' ? 'वाउचर सं.' : 'Voucher #'}</th>
                <th className="py-3 px-3">{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                <th className="py-3 px-3">{language === 'hi' ? 'ऋण विवरण / टिप्पणी' : 'Loan Particulars / Remarks'}</th>
                <th className="py-3 px-3">{language === 'hi' ? 'भुगतान मोड' : 'Payment Mode'}</th>
                <th className="py-3 pr-4 text-right rounded-tr-xl">{language === 'hi' ? 'भुगतान राशि (₹)' : 'Total Paid (₹)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
              {repayVouchers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic font-semibold">
                    {language === 'hi' ? 'कोई ऋण भुगतान प्रविष्टि नहीं पाई गई।' : 'No loan repayment entries recorded yet.'}
                  </td>
                </tr>
              ) : repayVouchers.map(v => {
                const totalAmt = v.entries.filter(e => e.isDebit).reduce((s, e) => s + e.amount, 0);
                return (
                  <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{v.voucherNumber}</td>
                    <td className="py-4 px-3 font-medium whitespace-nowrap">{new Date(v.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</td>
                    <td className="py-4 px-3 font-semibold text-slate-700 dark:text-slate-300">{v.narration}</td>
                    <td className="py-4 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{v.paymentMode || 'BANK_UPI'}</td>
                    <td className="py-4 pr-4 text-right font-black text-emerald-600 dark:text-emerald-400">₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Create/Edit Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-850 dark:text-white text-xs">
                {editingAsset ? (language === 'hi' ? 'अचल संपत्ति विवरण सुधारें' : 'Edit Fixed Asset') : (language === 'hi' ? 'नई अचल संपत्ति जोड़ें' : 'Register Fixed Asset')}
              </h3>
              <button onClick={() => setShowAssetModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-655"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleAssetSubmit} className="p-6 space-y-4 text-xs font-bold text-slate-500">
              <div className="space-y-1.5">
                <label>{language === 'hi' ? 'अचल संपत्ति का नाम *' : 'Fixed Asset Name *'}</label>
                <input
                  type="text"
                  required
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="e.g. Submersible pump motor, Tractor"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                />
              </div>
              <div className="space-y-1.5">
                <label>{language === 'hi' ? 'लागत मूल्य (₹) *' : 'Asset Cost Value (₹) *'}</label>
                <input
                  type="number"
                  required
                  value={assetForm.cost}
                  onChange={(e) => setAssetForm({ ...assetForm, cost: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold text-xs rounded-xl mt-4">
                {editingAsset ? (language === 'hi' ? 'सहेजें' : 'Save Changes') : (language === 'hi' ? 'पंजीकृत करें' : 'Register Asset')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loan Create/Edit Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-850 dark:text-white text-xs">
                {editingLoan ? (language === 'hi' ? 'ऋण विवरण सुधारें' : 'Edit Loan Borrowing') : (language === 'hi' ? 'नया ऋण दर्ज करें' : 'Record Borrowed Loan')}
              </h3>
              <button onClick={() => setShowLoanModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-655"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleLoanSubmit} className="p-6 space-y-4 text-xs font-bold text-slate-500">
              <div className="space-y-1.5">
                <label>{language === 'hi' ? 'ऋणदाता बैंक / संस्था का नाम *' : 'Lender Institution / Bank Name *'}</label>
                <input
                  type="text"
                  required
                  value={loanForm.partyName}
                  onChange={(e) => setLoanForm({ ...loanForm, partyName: e.target.value })}
                  placeholder="e.g. Bank of India, State Bank of India"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>{language === 'hi' ? 'मूलधन (Principal ₹) *' : 'Principal Loan Amount (₹) *'}</label>
                  <input
                    type="number"
                    required
                    value={loanForm.principal}
                    onChange={(e) => setLoanForm({ ...loanForm, principal: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                  />
                </div>
                <div className="space-y-1.5">
                  <label>{language === 'hi' ? 'वार्षिक ब्याज दर (%) *' : 'Yearly Interest Rate (%) *'}</label>
                  <input
                    type="number"
                    required
                    value={loanForm.interestRate}
                    onChange={(e) => setLoanForm({ ...loanForm, interestRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label>{language === 'hi' ? 'ऋण का उद्देश्य (Purpose) *' : 'Purpose of Borrowing *'}</label>
                <input
                  type="text"
                  required
                  value={loanForm.reason}
                  onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })}
                  placeholder="e.g. Cow shed construction or Tractor purchase"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold text-xs rounded-xl mt-4">
                {editingLoan ? (language === 'hi' ? 'सहेजें' : 'Save Changes') : (language === 'hi' ? 'ऋण दर्ज करें' : 'Register Borrowing')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loan Repayment EMI Modal */}
      {showRepayModal && selectedRepayLoan && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-850 dark:text-white text-xs">
                  {language === 'hi' ? 'ऋण किश्त भुगतान (Loan EMI Repayment)' : 'Pay Loan EMI / Repayment'}
                </h3>
                <p className="text-[10px] text-slate-400">Account: {selectedRepayLoan.partyName} • Bal: ₹{selectedRepayLoan.outstandingAmount.toLocaleString()}</p>
              </div>
              <button onClick={() => setShowRepayModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-655"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleRepaySubmit} className="p-6 space-y-4 text-xs font-bold text-slate-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>{language === 'hi' ? 'मूलधन किश्त (Principal ₹) *' : 'Principal Paid (₹) *'}</label>
                  <input
                    type="number"
                    required
                    value={repayForm.principalPaid}
                    onChange={(e) => setRepayForm({ ...repayForm, principalPaid: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                  />
                </div>
                <div className="space-y-1.5">
                  <label>{language === 'hi' ? 'ब्याज राशि (Interest ₹)' : 'Interest Paid (₹)'}</label>
                  <input
                    type="number"
                    value={repayForm.interestPaid}
                    onChange={(e) => setRepayForm({ ...repayForm, interestPaid: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>{language === 'hi' ? 'भुगतान खाता (Pay From)' : 'Pay From Account'}</label>
                  <select
                    value={repayForm.payFromLedger}
                    onChange={(e) => setRepayForm({ ...repayForm, payFromLedger: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                  >
                    {bankCashLedgers.map(l => (
                      <option key={l.id} value={l.id}>{formatBilingual(l.name, language)} [{l.code}]</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label>{language === 'hi' ? 'भुगतान मोड' : 'Payment Mode'}</label>
                  <select
                    value={repayForm.paymentMode}
                    onChange={(e) => setRepayForm({ ...repayForm, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                  >
                    <option value="BANK_UPI">BANK_UPI</option>
                    <option value="CASH">CASH</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label>{language === 'hi' ? 'दिनांक' : 'Date'}</label>
                <input
                  type="date"
                  required
                  value={repayForm.date}
                  onChange={(e) => setRepayForm({ ...repayForm, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">{language === 'hi' ? 'कुल भुगतान राशि:' : 'Total Deducted Amount:'}</span>
                <span className="font-black text-forest-650 text-sm">₹{(Number(repayForm.principalPaid) + Number(repayForm.interestPaid)).toLocaleString()}</span>
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold text-xs rounded-xl mt-2">
                {language === 'hi' ? 'किश्त जमा करें (Submit Repayment)' : 'Submit EMI Repayment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🛒 OUTSTANDING CREDITORS DETAILS MODAL (ONLY BALANCE > 0) */}
      {showCreditorsModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreditorsModal(false)}>
          <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-3xl w-full p-6 space-y-5 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl font-black text-lg">🛒</span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-850 dark:text-white">
                    {language === 'hi' ? 'Outstanding Creditor for Purchase (लेनदार उधारी विवरण)' : 'Outstanding Creditors Details'}
                  </h3>
                  <p className="text-xs text-slate-400">केवल बकाया उधारी (देना बाकी) वाले सप्लायरों की सूची</p>
                </div>
              </div>
              <button onClick={() => setShowCreditorsModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 rounded-2xl flex justify-between items-center text-amber-900 dark:text-amber-200">
              <span className="text-xs font-bold">कुल बकाया लेनदार (Total Creditors Payable)</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">₹{totalCreditorLiability.toLocaleString()}</span>
            </div>

            {sundryCreditors.length === 0 ? (
              <div className="p-8 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center">
                ✅ कोई उधारी बकाया नहीं है! सभी वेंडर्स का भुगतान पूर्ण है।
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Party / Vendor Name (विक्रेता का नाम)</th>
                      <th className="py-2.5 px-3">Mobile (मोबाइल)</th>
                      <th className="py-2.5 px-3">Records (लेनदेन)</th>
                      <th className="py-2.5 px-3 text-right">Outstanding (बाकी उधारी राशि)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                    {sundryCreditors.map((creditor, idx) => (
                      <tr key={creditor.id || idx} className="hover:bg-amber-50/30 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-3 font-extrabold text-slate-850 dark:text-white flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-black flex items-center justify-center text-xs">
                            {creditor.name.charAt(0).toUpperCase()}
                          </span>
                          <span>{creditor.name}</span>
                        </td>
                        <td className="py-3 px-3 font-mono">{creditor.phone || '—'}</td>
                        <td className="py-3 px-3 font-bold">{creditor.billsCount} रिकॉर्ड्स</td>
                        <td className="py-3 px-3 font-black text-amber-600 dark:text-amber-400 text-sm text-right">
                          ₹{creditor.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 💸 SUPPLIER ADVANCES DETAILS MODAL (ONLY BALANCE < 0) */}
      {showAdvancesModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAdvancesModal(false)}>
          <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-3xl w-full p-6 space-y-5 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl font-black text-lg">💸</span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-850 dark:text-white">
                    {language === 'hi' ? 'Supplier Advances (सप्लायर एडवांस विवरण)' : 'Supplier Advances Details'}
                  </h3>
                  <p className="text-xs text-slate-400">केवल वे सप्लायर जिन्हें एडवांस या अतिरिक्त भुगतान किया गया है</p>
                </div>
              </div>
              <button onClick={() => setShowAdvancesModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl flex justify-between items-center text-emerald-900 dark:text-emerald-200">
              <span className="text-xs font-bold">कुल एडवांस भुगतान (Total Supplier Advances)</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">₹{totalSupplierAdvances.toLocaleString()}</span>
            </div>

            {supplierAdvances.length === 0 ? (
              <div className="p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/40 rounded-2xl text-slate-500 dark:text-slate-400 text-xs font-bold text-center">
                ✅ कोई सप्लायर एडवांस नहीं है।
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Party / Vendor Name (विक्रेता का नाम)</th>
                      <th className="py-2.5 px-3">Mobile (मोबाइल)</th>
                      <th className="py-2.5 px-3">Records (लेनदेन)</th>
                      <th className="py-2.5 px-3 text-right">Advance Amount (एडवांस राशि)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                    {supplierAdvances.map((adv, idx) => (
                      <tr key={adv.id || idx} className="hover:bg-emerald-50/30 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-3 font-extrabold text-slate-850 dark:text-white flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-black flex items-center justify-center text-xs">
                            {adv.name.charAt(0).toUpperCase()}
                          </span>
                          <span>{adv.name}</span>
                        </td>
                        <td className="py-3 px-3 font-mono">{adv.phone || '—'}</td>
                        <td className="py-3 px-3 font-bold">{adv.billsCount} रिकॉर्ड्स</td>
                        <td className="py-3 px-3 font-black text-emerald-600 dark:text-emerald-400 text-sm text-right">
                          ₹{adv.balance.toLocaleString()} (Dr)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

