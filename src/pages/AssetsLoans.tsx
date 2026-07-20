import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Ledger, Loan } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { Plus, Trash, Edit3, Landmark, Hammer, BadgeInfo, Tractor, X } from 'lucide-react';

export const AssetsLoans: React.FC = () => {
  const { user } = useAuth();
  
  const [fixedAssets, setFixedAssets] = useState<Ledger[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  // Modals visibility
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  
  // Selected items for Edit
  const [editingAsset, setEditingAsset] = useState<Ledger | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    setFixedAssets(ledgers.filter(l => l.groupId === 'g-fixed-assets'));
    setLoans(GoshalaDB.getTable<Loan>('loans'));
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
    // Try to find the purpose from liability ledger if reason is empty
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
      reason: purpose || (loan.id === 'loan-1' || loan.id === 'l-loan-sbi-construction' ? 'Cow Shed Construction' : 'Tractor Purchase')
    });
    setShowLoanModal(true);
  };

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name) return alert('Name is required');

    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');

    if (editingAsset) {
      // Edit mode
      const target = ledgers.find(l => l.id === editingAsset.id);
      if (target) {
        target.name = assetForm.name;
        target.openingBalance = Number(assetForm.cost);
        target.currentBalance = Number(assetForm.cost);
      }
      GoshalaDB.saveTable('ledgers', ledgers);
      
      // Update its journal voucher if exists
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
      alert('Fixed Asset updated successfully!');
    } else {
      // Create mode
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
      
      // Auto balance
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
      alert('New Fixed Asset registered!');
    }

    setShowAssetModal(false);
    loadData();
  };

  const handleAssetDelete = (id: string) => {
    if (!window.confirm('क्या आप सचमुच इस अचल संपत्ति को हटाना चाहते हैं?')) return;
    
    // Remove ledger
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const filteredLedgers = ledgers.filter(l => l.id !== id);
    GoshalaDB.saveTable('ledgers', filteredLedgers);

    // Remove matching journal voucher
    const vouchers = GoshalaDB.getTable<any>('vouchers');
    const filteredVouchers = vouchers.filter((v: any) => !v.entries.some((ent: any) => ent.ledgerId === id));
    GoshalaDB.saveTable('vouchers', filteredVouchers);

    GoshalaDB.recalculateLedgers();
    alert('Asset deleted successfully!');
    loadData();
  };

  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.partyName || !loanForm.reason) return alert('Fill all fields');

    const allLoans = GoshalaDB.getTable<Loan>('loans');
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');

    if (editingLoan) {
      // Edit Mode
      const targetLoan = allLoans.find(l => l.id === editingLoan.id);
      if (targetLoan) {
        targetLoan.partyName = loanForm.partyName;
        targetLoan.principalAmount = Number(loanForm.principal);
        targetLoan.interestRate = Number(loanForm.interestRate);
        targetLoan.installments = Number(loanForm.installments);
        targetLoan.outstandingAmount = Number(loanForm.principal);
      }
      GoshalaDB.saveTable('loans', allLoans);

      // Find and update liability ledger
      // It is named after the bank name or matches its code / ID
      const targetLedger = ledgers.find(l => l.name.startsWith(editingLoan.partyName) || l.id.includes(editingLoan.id));
      if (targetLedger) {
        targetLedger.name = `${loanForm.partyName} Loan (${loanForm.reason})`;
        targetLedger.openingBalance = Number(loanForm.principal);
        targetLedger.currentBalance = Number(loanForm.principal);
      }
      GoshalaDB.saveTable('ledgers', ledgers);

      // Update cash/bank receipt voucher
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
      alert('Loan details updated successfully!');
    } else {
      // Create Mode
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

      // Create Ledger
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

      // Save voucher
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
          { ledgerId: 'l-bank-sbi', amount: Number(loanForm.principal), isDebit: true },
          { ledgerId: newLoanLedger.id, amount: Number(loanForm.principal), isDebit: false }
        ],
        attachments: [],
        auditTrail: []
      };

      GoshalaDB.saveVoucher(voucher, { name: user.name, role: user.role });
      alert('New borrowing recorded and SBI Bank ledger updated!');
    }

    setShowLoanModal(false);
    loadData();
  };

  const handleLoanDelete = (loanId: string) => {
    if (!window.confirm('क्या आप सचमुच इस ऋण (Loan) को हटाना चाहते हैं?')) return;

    // Delete loan record
    const allLoans = GoshalaDB.getTable<Loan>('loans');
    const filteredLoans = allLoans.filter(l => l.id !== loanId);
    GoshalaDB.saveTable('loans', filteredLoans);

    // Delete ledger
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const filteredLedgers = ledgers.filter(l => !l.id.includes(loanId));
    GoshalaDB.saveTable('ledgers', filteredLedgers);

    // Delete voucher
    const vouchers = GoshalaDB.getTable<any>('vouchers');
    const filteredVouchers = vouchers.filter((v: any) => !v.entries.some((ent: any) => ent.ledgerId.includes(loanId)));
    GoshalaDB.saveTable('vouchers', filteredVouchers);

    GoshalaDB.recalculateLedgers();
    alert('Loan record deleted!');
    loadData();
  };

  const getAssetIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('tractor') || n.includes(' vehicle')) return <Tractor className="w-5 h-5 text-saffron-650" />;
    return <Hammer className="w-5 h-5 text-forest-600" />;
  };

  return (
    <div className="space-y-8">
      
      {/* Overview header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center space-x-2">
            <span className="w-2.5 h-6 bg-saffron-550 rounded-full inline-block"></span>
            <span>अचल संपत्ति और बकाया ऋण (Assets & Loans)</span>
          </h2>
          <p className="text-slate-500 text-xs dark:text-slate-400 mt-1">Manage Fixed Assets and track loans taken with purpose details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Fixed Assets Registry */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">अचल संपत्ति (Fixed Assets)</h3>
            <button
              onClick={handleOpenAssetCreate}
              className="text-xs font-bold text-forest-600 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Fixed Asset</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {fixedAssets.map(fa => (
              <div key={fa.id} className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-750 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-850 rounded-xl flex items-center justify-center">
                    {getAssetIcon(fa.name)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">{fa.name}</h4>
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
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">बकाया ऋण (Outstanding Loans)</h3>
            <button
              onClick={handleOpenLoanCreate}
              className="text-xs font-bold text-saffron-650 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Borrowing Loan</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {loans.map(loan => {
              // Extract purpose text
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
                        <p className="text-[10px] text-slate-400">Interest Rate: {loan.interestRate}% • Bal: ₹{loan.outstandingAmount.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1.5">
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

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-750 text-[10px] flex items-center space-x-2 text-slate-600 dark:text-slate-350">
                    <BadgeInfo className="w-4 h-4 text-saffron-550 shrink-0" />
                    <span><strong>Reason / Purpose (उद्देश्य):</strong> {purpose || 'Cattle Shed Construction'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Asset Create/Edit Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-850 dark:text-white text-xs">
                {editingAsset ? 'Edit अचल संपत्ति details' : 'Register Fixed Asset Addition'}
              </h3>
              <button onClick={() => setShowAssetModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-655"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleAssetSubmit} className="p-6 space-y-4 text-xs font-bold text-slate-500">
              <div className="space-y-1.5">
                <label>Fixed Asset Name / Description (अचल संपत्ति का नाम)</label>
                <input
                  type="text"
                  required
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="e.g. Submersible pump motor"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                />
              </div>
              <div className="space-y-1.5">
                <label>Asset Cost Value (लागत मूल्य - ₹)</label>
                <input
                  type="number"
                  required
                  value={assetForm.cost}
                  onChange={(e) => setAssetForm({ ...assetForm, cost: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold text-xs rounded-xl mt-4">
                {editingAsset ? 'Save Changes' : 'Register Asset'}
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
                {editingLoan ? 'Edit ऋण Details' : 'Record Borrowed Loan'}
              </h3>
              <button onClick={() => setShowLoanModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-655"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleLoanSubmit} className="p-6 space-y-4 text-xs font-bold text-slate-500">
              <div className="space-y-1.5">
                <label>Lender Institution / Bank Name (ऋणदाता बैंक)</label>
                <input
                  type="text"
                  required
                  value={loanForm.partyName}
                  onChange={(e) => setLoanForm({ ...loanForm, partyName: e.target.value })}
                  placeholder="e.g. State Bank of India"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>Principal Loan Amount (ऋण मूल्य - ₹)</label>
                  <input
                    type="number"
                    required
                    value={loanForm.principal}
                    onChange={(e) => setLoanForm({ ...loanForm, principal: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                  />
                </div>
                <div className="space-y-1.5">
                  <label>Yearly Interest Rate (%)</label>
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
                <label>Purpose of Borrowing (ऋण का कारण - e.g. शेड निर्माण)</label>
                <input
                  type="text"
                  required
                  value={loanForm.reason}
                  onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })}
                  placeholder="e.g. Borewell motor setup or Cow purchasing"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold text-xs rounded-xl mt-4">
                {editingLoan ? 'Save Loan Changes' : 'Register Borrowing'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
