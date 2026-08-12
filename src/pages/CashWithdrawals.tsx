import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Voucher, Ledger, BankAccount } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage, formatBilingual } from '../hooks/useLanguage';
import { Wallet } from 'lucide-react';

export const CashWithdrawals: React.FC = () => {
  const { language, t } = useLanguage();
  const [cashBalance, setCashBalance] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashVouchers, setCashVouchers] = useState<Voucher[]>([]);

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

  const loadData = () => {
    GoshalaDB.recalculateLedgers();
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    
    // Set cash in hand balance
    const cashL = ledgers.find(l => l.id === 'l-cash')?.currentBalance || 0;
    setCashBalance(cashL);

    // Get dynamic list of bank accounts
    const bankLedgers = ledgers.filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-cash' && l.id !== 'l-tds-receivable');
    const mappedBanks: BankAccount[] = bankLedgers.map(l => ({
      id: l.id,
      bankName: l.name,
      accountNumber: l.code,
      ifsc: '—',
      branch: '—',
      openingBalance: l.openingBalance,
      currentBalance: l.currentBalance
    }));
    setBankAccounts(mappedBanks);
    
    // Get all vouchers that affect Cash or Bank Ledgers for the active Financial Year
    const cashBankIds = ledgers.filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable').map(l => l.id);
    const activeFyObj = GoshalaDB.getActiveFy();

    const vouchers = GoshalaDB.getTable<Voucher>('vouchers').filter(v => {
      if (v.status !== 'POSTED') return false;
      if (!v.entries.some(e => cashBankIds.includes(e.ledgerId))) return false;

      // Strict Date-Based Boundary Match
      if (activeFyObj && v.date) {
        return v.date >= activeFyObj.startDate && v.date <= activeFyObj.endDate;
      }
      return true;
    });
    setCashVouchers(vouchers.reverse());
  };

  const handleDeleteVoucher = (id: string) => {
    if (!window.confirm(language === 'hi' ? 'क्या आप सचमुच इस प्रविष्टि को हटाना चाहते हैं?' : 'Are you sure you want to delete this entry?')) return;
    const table = GoshalaDB.getTable<Voucher>('vouchers');
    const filtered = table.filter(v => v.id !== id);
    GoshalaDB.saveTable('vouchers', filtered);
    GoshalaDB.recalculateLedgers();
    loadData();
    alert(language === 'hi' ? 'प्रविष्टि सफलतापूर्वक हटा दी गई!' : 'Entry deleted successfully!');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Cash & Bank Book</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage liquid assets and bank transactions.</p>
        </div>
      </div>

      {/* Vitals overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cash Balance */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Wallet className="w-32 h-32" />
          </div>
          <div className="flex items-center justify-between mb-4 z-10">
            <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">
              {language === 'hi' ? 'कैश इन हैंड (नकद शेष)' : 'Cash in Hand'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="z-10 mt-4">
            <p className="text-4xl font-black text-slate-900 dark:text-white">₹{cashBalance.toLocaleString()}</p>
            <span className="text-xs text-slate-400 mt-2 block font-medium">
              {language === 'hi' ? 'नकद बही शेष' : 'Available cash book balance'}
            </span>
          </div>
        </div>

        {/* Bank accounts balance */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col max-h-64">
          <h4 className="font-extrabold text-sm text-slate-500 uppercase tracking-wider mb-4 sticky top-0 bg-white dark:bg-slate-800">
            {language === 'hi' ? 'सक्रिय बैंक खाते' : 'Active Bank Accounts'}
          </h4>
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {bankAccounts.length === 0 ? (
              <p className="text-slate-400 italic text-sm">{language === 'hi' ? 'कोई बैंक खाता नहीं है।' : 'No bank accounts added yet.'}</p>
            ) : bankAccounts.map(ba => (
              <div key={ba.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 hover:border-teal-200 dark:hover:border-teal-800 transition-colors group">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    {formatBilingual(ba.bankName, language).substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{formatBilingual(ba.bankName, language)}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">A/c: {ba.accountNumber}</p>
                  </div>
                </div>
                <span className="font-black text-slate-900 dark:text-white">₹{ba.currentBalance.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Cash and Bank Flow log table */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 w-full">
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
          {language === 'hi' ? 'नकद एवं बैंक बही खाता' : 'Bank & Cash Book Log'}
        </h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                <th className="py-3 px-4 rounded-tl-xl">{language === 'hi' ? 'वाउचर सं.' : 'Voucher #'}</th>
                <th className="py-3 px-3">{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                <th className="py-3 px-3">{language === 'hi' ? 'संबंधित खाता' : 'Affected Ledger'}</th>
                <th className="py-3 px-3">{language === 'hi' ? 'विवरण / टिप्पणी' : 'Particulars / Remarks'}</th>
                <th className="py-3 px-3">{language === 'hi' ? 'प्रकार' : 'Type'}</th>
                <th className="py-3 px-3 text-right">{language === 'hi' ? 'डेबिट / नकद आवक (₹)' : 'Cash In (₹)'}</th>
                <th className="py-3 px-3 text-right">{language === 'hi' ? 'क्रेडिट / नकद जावक (₹)' : 'Cash Out (₹)'}</th>
                <th className="py-3 pr-4 text-right rounded-tr-xl">{language === 'hi' ? 'कार्रवाई' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
              {cashVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic font-semibold">{language === 'hi' ? 'कोई लेन-देन नहीं मिला।' : 'No cash or bank transactions recorded yet.'}</td>
                </tr>
              ) : cashVouchers.map(v => {
                const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
                const cashBankIds = ledgers.filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable').map(l => l.id);

                // Find entry that is Cash or Bank
                const cashBankEntry = v.entries.find(e => cashBankIds.includes(e.ledgerId));
                if (!cashBankEntry) return null;

                const isCashIn = cashBankEntry.isDebit; // Debit is cash/bank increase
                const oppositeEntries = v.entries.filter(e => e.ledgerId !== cashBankEntry.ledgerId);
                const oppositePart = oppositeEntries
                  .map(e => formatBilingual(ledgers.find(l => l.id === e.ledgerId)?.name || e.ledgerId, language))
                  .join(', ');

                return (
                  <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{v.voucherNumber}</td>
                    <td className="py-4 px-3 font-medium whitespace-nowrap">{new Date(v.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</td>
                    <td className="py-4 px-3 font-bold text-slate-800 dark:text-slate-200">{formatBilingual(ledgers.find(l => l.id === cashBankEntry.ledgerId)?.name || '', language)}</td>
                    <td className="py-4 px-3 font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={oppositePart || v.narration}>
                      {v.voucherType === 'CONTRA' ? (language === 'hi' ? 'अंतरण: ' : 'Transfer to ') + oppositePart : oppositePart || v.narration}
                    </td>
                    <td className="py-4 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-widest uppercase ${
                        v.voucherType === 'RECEIPT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        v.voucherType === 'PAYMENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      }`}>
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {isCashIn ? `₹${cashBankEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-4 px-3 text-right font-black text-rose-600 dark:text-rose-400">
                      {!isCashIn ? `-₹${cashBankEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleDeleteVoucher(v.id)}
                          className="px-2 py-1 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded font-semibold text-[10px] cursor-pointer transition"
                        >
                          {language === 'hi' ? 'हटाएं' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
