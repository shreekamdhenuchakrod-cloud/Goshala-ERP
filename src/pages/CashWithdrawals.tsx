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
  }, []);

  const loadData = () => {
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
    
    // Get all vouchers that affect Cash or Bank Ledgers
    const cashBankIds = ledgers.filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable').map(l => l.id);
    const vouchers = GoshalaDB.getTable<Voucher>('vouchers').filter(v => 
      v.status === 'POSTED' && v.entries.some(e => cashBankIds.includes(e.ledgerId))
    );
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
    <div className="space-y-6">
      
      {/* Vitals overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cash Balance */}
        <div className="bg-gradient-to-r from-forest-800 to-forest-650 p-6 rounded-3xl text-white flex items-center justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs text-forest-100 font-bold uppercase tracking-wider">
              {language === 'hi' ? 'कैश इन हैंड (नकद शेष)' : 'Cash in Hand'}
            </span>
            <p className="text-3xl font-black">₹{cashBalance.toLocaleString()}</p>
            <span className="text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full inline-block font-semibold">
              {language === 'hi' ? 'नकद बही शेष' : 'Available cash book balance'}
            </span>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Bank accounts balance */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">
            {language === 'hi' ? 'सक्रिय बैंक खाते' : 'Active Bank Accounts'}
          </h4>
          <div className="space-y-2 text-xs">
            {bankAccounts.length === 0 ? (
              <p className="text-slate-400 italic">{language === 'hi' ? 'कोई बैंक खाता नहीं है।' : 'No bank accounts added yet.'}</p>
            ) : bankAccounts.map(ba => (
              <div key={ba.id} className="flex justify-between items-center py-1.5 border-b last:border-none border-slate-50 dark:border-slate-750">
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{formatBilingual(ba.bankName, language)}</p>
                  <p className="text-[10px] text-slate-400">A/c Code: {ba.accountNumber}</p>
                </div>
                <span className="font-extrabold text-slate-850 dark:text-white">₹{ba.currentBalance.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Cash and Bank Flow log table */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4 w-full">
        <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">
          {language === 'hi' ? 'नकद एवं बैंक बही खाता' : 'Bank & Cash Book Log'}
        </h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-750 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">{language === 'hi' ? 'वाउचर सं.' : 'Voucher #'}</th>
                <th className="pb-3">{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                <th className="pb-3">{language === 'hi' ? 'संबंधित खाता' : 'Affected Ledger'}</th>
                <th className="pb-3">{language === 'hi' ? 'विवरण / टिप्पणी' : 'Particulars / Remarks'}</th>
                <th className="pb-3">{language === 'hi' ? 'प्रकार' : 'Type'}</th>
                <th className="pb-3 text-right">{language === 'hi' ? 'डेबिट / नकद आवक (₹)' : 'Debit / Cash In (₹)'}</th>
                <th className="pb-3 text-right">{language === 'hi' ? 'क्रेडिट / नकद जावक (₹)' : 'Credit / Cash Out (₹)'}</th>
                <th className="pb-3 text-right pr-2">{language === 'hi' ? 'कार्रवाई' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-750 dark:text-slate-350">
              {cashVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 italic">{language === 'hi' ? 'कोई लेन-देन नहीं मिला।' : 'No cash or bank transactions recorded yet.'}</td>
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
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-3 pl-2 font-bold text-slate-850 dark:text-slate-150">{v.voucherNumber}</td>
                    <td className="py-3">{v.date}</td>
                    <td className="py-3 font-bold text-slate-800 dark:text-white">{formatBilingual(ledgers.find(l => l.id === cashBankEntry.ledgerId)?.name || '', language)}</td>
                    <td className="py-3 font-semibold text-slate-450">{v.voucherType === 'CONTRA' ? (language === 'hi' ? 'अंतरण: ' : 'Transfer to ') + oppositePart : oppositePart || v.narration}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold ${
                        v.voucherType === 'RECEIPT' ? 'bg-forest-550/10 text-forest-650' :
                        v.voucherType === 'PAYMENT' ? 'bg-saffron-550/10 text-saffron-650' :
                        'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650'
                      }`}>
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-forest-650">
                      {isCashIn ? `₹${cashBankEntry.amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 text-right font-bold text-red-500">
                      {!isCashIn ? `-₹${cashBankEntry.amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteVoucher(v.id)}
                        className="px-2 py-1 bg-red-50 dark:bg-red-950/20 text-red-550 hover:bg-red-100 rounded font-bold text-[10px] cursor-pointer"
                      >
                        {language === 'hi' ? 'हटाएं' : 'Delete'}
                      </button>
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
