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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    setFixedAssets(ledgers.filter(l => l.groupId === 'g-fixed-assets'));
    
    const allLoans = GoshalaDB.getTable<Loan>('loans');
    setLoans(allLoans);

    const allVouchers = GoshalaDB.getTable<Voucher>('vouchers');
    const loanRepays = allVouchers.filter(v => v.voucherType === 'LOAN_REPAYMENT' || v.narration.toLowerCase().includes('loan repayment') || v.narration.toLowerCase().includes('ऋण'));
    setRepayVouchers(loanRepays.reverse());
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-2">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            {language === 'hi' ? 'कुल अचल संपत्ति (Fixed Assets)' : 'Total Fixed Assets'}
          </span>
          <p className="text-2xl font-black text-forest-650">₹{totalAssetsVal.toLocaleString()}</p>
          <span className="text-[9px] text-forest-600 font-bold bg-forest-50 dark:bg-forest-950/20 px-2 py-0.5 rounded-full inline-block">
            {fixedAssets.length} {language === 'hi' ? 'पंजीकृत संपत्तियां' : 'Registered Assets'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-2">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            {language === 'hi' ? 'कुल स्वीकृत ऋण (Total Borrowed)' : 'Total Principal Borrowed'}
          </span>
          <p className="text-2xl font-black text-slate-800 dark:text-white">₹{totalPrincipalBorrowed.toLocaleString()}</p>
          <span className="text-[9px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full inline-block">
            {loans.length} {language === 'hi' ? 'सक्रिय ऋण खाते' : 'Active Loan Accounts'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-2">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            {language === 'hi' ? 'बकाया ऋण मूलधन (Outstanding)' : 'Outstanding Principal'}
          </span>
          <p className="text-2xl font-black text-red-550">₹{totalOutstandingLoan.toLocaleString()}</p>
          <span className="text-[9px] text-red-600 font-bold bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full inline-block">
            {language === 'hi' ? 'सक्रिय देनदारी' : 'Remaining Liability'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-2">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            {language === 'hi' ? 'चुकाया गया मूलधन (Principal Repaid)' : 'Principal Repaid'}
          </span>
          <p className="text-2xl font-black text-emerald-600">₹{totalPaidOff.toLocaleString()}</p>
          <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full inline-block">
            {language === 'hi' ? 'सफलतापूर्वक चुकता' : 'Successfully Paid Off'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Fixed Assets Registry */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
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
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
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
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4 w-full">
        <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">
          {language === 'hi' ? 'ऋण भुगतान इतिहास रजिस्टर (Loan Repayment Log)' : 'Loan EMI Repayment History'}
        </h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-750 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">{language === 'hi' ? 'वाउचर सं.' : 'Voucher #'}</th>
                <th className="pb-3">{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                <th className="pb-3">{language === 'hi' ? 'ऋण विवरण / टिप्पणी' : 'Loan Particulars / Remarks'}</th>
                <th className="pb-3">{language === 'hi' ? 'भुगतान मोड' : 'Payment Mode'}</th>
                <th className="pb-3 text-right">{language === 'hi' ? 'भुगतान राशि (₹)' : 'Total Paid (₹)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-750 dark:text-slate-350">
              {repayVouchers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                    {language === 'hi' ? 'कोई ऋण भुगतान प्रविष्टि नहीं पाई गई।' : 'No loan repayment entries recorded yet.'}
                  </td>
                </tr>
              ) : repayVouchers.map(v => {
                const totalAmt = v.entries.filter(e => e.isDebit).reduce((s, e) => s + e.amount, 0);
                return (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-3 pl-2 font-bold text-slate-850 dark:text-slate-150">{v.voucherNumber}</td>
                    <td className="py-3">{v.date}</td>
                    <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">{v.narration}</td>
                    <td className="py-3 font-mono font-bold text-indigo-650">{v.paymentMode || 'BANK_UPI'}</td>
                    <td className="py-3 text-right font-black text-forest-650">₹{totalAmt.toLocaleString()}</td>
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

    </div>
  );
};

