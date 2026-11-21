import React, { useState, useEffect, useMemo } from 'react';
import { GoshalaDB } from '../db/db';
import { Voucher, Ledger, BankAccount } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage, formatBilingual } from '../hooks/useLanguage';
import { Wallet, Landmark, Search, Trash2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus, X } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';

export const CashWithdrawals: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [cashBalance, setCashBalance] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashVouchers, setCashVouchers] = useState<Voucher[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Quick Contra Modal State
  const [showContraModal, setShowContraModal] = useState(false);
  const [contraType, setContraType] = useState<'WITHDRAWAL' | 'DEPOSIT'>('WITHDRAWAL');
  const [contraBankId, setContraBankId] = useState('');
  const [contraAmount, setContraAmount] = useState<number>(0);
  const [contraDate, setContraDate] = useState(new Date().toISOString().split('T')[0]);
  const [contraNarration, setContraNarration] = useState('');
  const [contraChequeOrRef, setContraChequeOrRef] = useState('');

  // PIN security for delete
  const [pinPromptAction, setPinPromptAction] = useState<(() => void) | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const requirePin = (action: () => void) => {
    setPinPromptAction(() => action);
    setPinInput('');
    setPinError(false);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('goshala_fy_changed', handleUpdate);
    window.addEventListener('goshala_voucher_updated', handleUpdate);
    window.addEventListener('goshala_db_updated', handleUpdate);
    return () => {
      window.removeEventListener('goshala_fy_changed', handleUpdate);
      window.removeEventListener('goshala_voucher_updated', handleUpdate);
      window.removeEventListener('goshala_db_updated', handleUpdate);
    };
  }, []);

  const loadData = () => {
    GoshalaDB.recalculateLedgers();
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');

    // Set cash in hand balance
    const cashL = ledgers.find((l) => l.id === 'l-cash')?.currentBalance || 0;
    setCashBalance(cashL);

    // Get dynamic list of bank accounts
    const bankLedgers = ledgers.filter(
      (l) => l.groupId === 'g-current-assets' && l.id !== 'l-cash' && l.id !== 'l-tds-receivable'
    );
    const mappedBanks: BankAccount[] = bankLedgers.map((l) => ({
      id: l.id,
      bankName: l.name,
      accountNumber: l.code,
      ifsc: '—',
      branch: '—',
      openingBalance: l.openingBalance,
      currentBalance: l.currentBalance,
    }));
    setBankAccounts(mappedBanks);

    if (mappedBanks.length > 0 && !contraBankId) {
      setContraBankId(mappedBanks[0].id);
    }

    // Get all vouchers that affect Cash or Bank Ledgers for the active Financial Year
    const cashBankIds = ledgers
      .filter((l) => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable')
      .map((l) => l.id);
    const activeFyObj = GoshalaDB.getActiveFy();

    const vouchers = GoshalaDB.getTable<Voucher>('vouchers').filter((v) => {
      if (v.status !== 'POSTED') return false;
      if (!v.entries.some((e) => cashBankIds.includes(e.ledgerId))) return false;

      // Strict Date-Based Boundary Match
      if (activeFyObj && v.date) {
        return v.date >= activeFyObj.startDate && v.date <= activeFyObj.endDate;
      }
      return true;
    });
    setCashVouchers(vouchers.reverse());
  };

  const handleDeleteVoucher = (id: string) => {
    if (
      !window.confirm(
        language === 'hi'
          ? 'क्या आप सचमुच इस प्रविष्टि को हटाना चाहते हैं?'
          : 'Are you sure you want to delete this cash/bank transaction?'
      )
    )
      return;
    const table = GoshalaDB.getTable<Voucher>('vouchers');
    const filtered = table.filter((v) => v.id !== id);
    GoshalaDB.saveTable('vouchers', filtered);
    GoshalaDB.recalculateLedgers();
    loadData();
    alert(language === 'hi' ? 'प्रविष्टि सफलतापूर्वक हटा दी गई।' : 'Entry deleted successfully.');
  };

  const handleContraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contraBankId || contraAmount <= 0) {
      alert('Please select a bank account and enter a valid amount.');
      return;
    }

    const activeFy = GoshalaDB.getActiveFy();
    if (activeFy && activeFy.status !== 'ACTIVE') {
      alert(`ERROR: Financial Year (${activeFy.name}) is CLOSED or LOCKED. Unlock it in Settings first.`);
      return;
    }
    if (activeFy && (contraDate < activeFy.startDate || contraDate > activeFy.endDate)) {
      alert(`Date Error: Contra date (${contraDate}) must be within active Financial Year (${activeFy.name}) bounds.`);
      return;
    }

    const selectedBank = bankAccounts.find((b) => b.id === contraBankId);
    const bankName = selectedBank?.bankName || 'Bank';

    const entries = [];
    let defaultNarr = '';
    if (contraType === 'WITHDRAWAL') {
      entries.push({ ledgerId: 'l-cash', amount: contraAmount, isDebit: true });
      entries.push({ ledgerId: contraBankId, amount: contraAmount, isDebit: false });
      defaultNarr = `Cash withdrawal from ${bankName} to Cash-in-hand`;
    } else {
      entries.push({ ledgerId: contraBankId, amount: contraAmount, isDebit: true });
      entries.push({ ledgerId: 'l-cash', amount: contraAmount, isDebit: false });
      defaultNarr = `Cash deposit into ${bankName} from Cash-in-hand`;
    }

    const newVoucher: Voucher = {
      id: `v-contra-${Date.now()}`,
      fyId: GoshalaDB.getActiveFyId(),
      voucherNumber: '',
      voucherType: 'CONTRA',
      date: contraDate,
      status: 'POSTED',
      costCenterId: 'cc-general',
      narration: contraNarration.trim() || defaultNarr,
      entries,
      attachments: [],
      paymentMode: contraType === 'WITHDRAWAL' ? 'CASH' : 'BANK_TRANSFER',
      referenceDetails: contraChequeOrRef ? `Contra Ref: ${contraChequeOrRef}` : `Contra Transfer • ${contraType}`,
      auditTrail: [],
    };

    try {
      GoshalaDB.saveVoucher(newVoucher, user);
      alert('Contra transfer posted successfully.');
      setShowContraModal(false);
      setContraAmount(0);
      setContraNarration('');
      setContraChequeOrRef('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error recording contra entry.');
    }
  };

  // Filtered entries
  const filteredVouchers = useMemo(() => {
    return cashVouchers.filter((v) => {
      if (filterType !== 'ALL' && v.voucherType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = v.voucherNumber.toLowerCase().includes(q);
        const matchNarr = (v.narration || '').toLowerCase().includes(q);
        if (!matchNum && !matchNarr) return false;
      }
      return true;
    });
  }, [cashVouchers, filterType, searchQuery]);

  const paginatedVouchers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVouchers.slice(start, start + pageSize);
  }, [filteredVouchers, currentPage]);

  const totalBankBal = bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Bank & Cash Book
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Contra entries, daily cash book registers, and bank account reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowContraModal(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Record Contra Transfer
          </Button>
        </div>
      </div>

      {/* Vitals overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Cash In Hand Card */}
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === 'hi' ? 'कैश इन हैंड (नकद शेष)' : 'Cash in Hand'}
            </span>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
              ₹{cashBalance.toLocaleString()}
            </div>
            <span className="inline-flex items-center text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Available cash register balance
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Bank Accounts Total Card */}
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === 'hi' ? 'बैंक खाते कुल शेष' : 'Total Bank Accounts Balance'}
            </span>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
              ₹{totalBankBal.toLocaleString()}
            </div>
            <span className="inline-flex items-center text-[10px] font-medium text-slate-500">
              {bankAccounts.length} active institutional accounts linked
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <Landmark className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Bank Account List Pill Row */}
      {bankAccounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bankAccounts.map((ba) => (
            <div
              key={ba.id}
              className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex justify-between items-center text-xs"
            >
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatBilingual(ba.bankName, language)}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Code: {ba.accountNumber}
                </p>
              </div>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                ₹{ba.currentBalance.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Cash and Bank Flow log table */}
      <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {language === 'hi' ? 'नकद एवं बैंक बही खाता' : 'Bank & Cash Book Entries'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified double-entry cash movements and contra transactions
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search voucher or remarks..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 w-48 sm:w-60"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="RECEIPT">Receipt (Cash/Bank In)</option>
              <option value="PAYMENT">Payment (Cash/Bank Out)</option>
              <option value="CONTRA">Contra Transfer</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="pb-3 pl-2">Voucher #</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Affected Ledger</th>
                <th className="pb-3">Particulars / Remarks</th>
                <th className="pb-3">Type</th>
                <th className="pb-3 text-right">Debit / In (₹)</th>
                <th className="pb-3 text-right">Credit / Out (₹)</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {paginatedVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    {language === 'hi'
                      ? 'कोई लेन-देन नहीं मिला।'
                      : 'No cash or bank transactions found.'}
                  </td>
                </tr>
              ) : (
                paginatedVouchers.map((v) => {
                  const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
                  const cashBankIds = ledgers
                    .filter(
                      (l) => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable'
                    )
                    .map((l) => l.id);

                  // Find entry that is Cash or Bank
                  const cashBankEntry = v.entries.find((e) => cashBankIds.includes(e.ledgerId));
                  if (!cashBankEntry) return null;

                  const isCashIn = cashBankEntry.isDebit; // Debit is cash/bank increase
                  const oppositeEntries = v.entries.filter(
                    (e) => e.ledgerId !== cashBankEntry.ledgerId
                  );
                  const oppositePart = oppositeEntries
                    .map((e) =>
                      formatBilingual(
                        ledgers.find((l) => l.id === e.ledgerId)?.name || e.ledgerId,
                        language
                      )
                    )
                    .join(', ');

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
                    >
                      <td className="py-3 pl-2 font-semibold text-slate-900 dark:text-slate-100">
                        {v.voucherNumber}
                      </td>
                      <td className="py-3 text-slate-500">{v.date}</td>
                      <td className="py-3 font-medium text-slate-800 dark:text-slate-200">
                        {formatBilingual(
                          ledgers.find((l) => l.id === cashBankEntry.ledgerId)?.name || '',
                          language
                        )}
                      </td>
                      <td className="py-3 max-w-xs truncate text-slate-600 dark:text-slate-400">
                        {v.voucherType === 'CONTRA'
                          ? (language === 'hi' ? 'अंतरण: ' : 'Transfer to ') + oppositePart
                          : oppositePart || v.narration}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            v.voucherType === 'RECEIPT'
                              ? 'success'
                              : v.voucherType === 'PAYMENT'
                              ? 'danger'
                              : 'info'
                          }
                          size="sm"
                        >
                          {v.voucherType}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {isCashIn ? `₹${cashBankEntry.amount.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        {!isCashIn ? `₹${cashBankEntry.amount.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteVoucher(v.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredVouchers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
