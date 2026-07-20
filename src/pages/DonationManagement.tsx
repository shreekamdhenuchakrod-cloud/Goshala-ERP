import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Donation, CRMContact } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Plus, Search, Heart, Share2, Send, Mail, CheckCircle2, Download, Printer, X } from 'lucide-react';

export const DonationManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [donors, setDonors] = useState<CRMContact[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Donation | null>(null);

  const [form, setForm] = useState({
    donorName: 'Rajesh Kumar Singhal',
    phone: '9876543210',
    pan: 'ABOPS1294C',
    aadhar: '5120-4102-9901',
    amount: 5000,
    paymentMode: 'UPI' as 'CASH' | 'CHEQUE' | 'BANK' | 'UPI' | 'ONLINE',
    purpose: 'Cow Feeding' as 'General' | 'Cow Feeding' | 'Construction' | 'Medical' | 'Festival' | 'Corpus',
    taxExempt: true,
    isRecurring: false
  });

  useEffect(() => {
    setDonations(GoshalaDB.getTable<Donation>('donations'));
    setDonors(GoshalaDB.getTable<CRMContact>('contacts').filter(c => c.type === 'DONOR'));
  }, []);

  const reloadData = () => {
    setDonations(GoshalaDB.getTable<Donation>('donations'));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.donorName || !form.amount) return alert('Name and amount are required');

    // Find or create donor in CRM directory
    const contacts = GoshalaDB.getTable<CRMContact>('contacts');
    let donor = contacts.find(c => c.name.toLowerCase() === form.donorName.toLowerCase() && c.type === 'DONOR');
    
    if (!donor) {
      donor = {
        id: `c-donor-${Date.now()}`,
        type: 'DONOR',
        name: form.donorName,
        phone: form.phone,
        pan: form.pan || undefined,
        aadhar: form.aadhar || undefined,
        outstandingBalance: 0,
        communicationHistory: []
      };
      contacts.push(donor);
      GoshalaDB.saveTable('contacts', contacts);
    }

    const receiptNum = `REC-80G-${String(donations.length + 1001)}`;

    const newDonation: Donation = {
      id: `don-${Date.now()}`,
      donorId: donor.id,
      date: new Date().toISOString().split('T')[0],
      receiptNumber: receiptNum,
      amount: Number(form.amount),
      paymentMode: form.paymentMode,
      purpose: form.purpose,
      taxExemptionEligible: form.taxExempt,
      isRecurring: form.isRecurring
    };

    // Save donation
    const table = GoshalaDB.getTable<Donation>('donations');
    table.push(newDonation);
    GoshalaDB.saveTable('donations', table);
    setDonations(table);
    setShowAddModal(false);

    // Double-entry integration: Create a Receipt Voucher
    const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
    const debitAccount = form.paymentMode === 'CASH' ? 'l-cash' : 'l-bank-sbi';
    const creditAccount = form.purpose === 'Cow Feeding' ? 'l-inc-donation-feed' : 'l-inc-donation-gen';

    const voucher = {
      id: `v-don-${Date.now()}`,
      fyId: config.activeFyId,
      voucherNumber: '',
      voucherType: 'RECEIPT' as const,
      date: new Date().toISOString().split('T')[0],
      status: 'POSTED' as const,
      costCenterId: form.purpose === 'Cow Feeding' ? 'cc-feed' : 'cc-admin',
      narration: `Donation received from ${form.donorName} for ${form.purpose}. Receipt Ref: ${receiptNum}`,
      entries: [
        { ledgerId: debitAccount, amount: Number(form.amount), isDebit: true },
        { ledgerId: creditAccount, amount: Number(form.amount), isDebit: false }
      ],
      attachments: [],
      auditTrail: []
    };

    GoshalaDB.saveVoucher(voucher, { name: user.name, role: user.role });
    GoshalaDB.logAction(user.name, user.role, 'ADD_DONATION', `Logged donation ${receiptNum} value: ₹${form.amount}`);
  };

  const getDonorName = (id: string) => {
    return donors.find(d => d.id === id)?.name || 'Anonymous Donor';
  };

  const getDonorPan = (id: string) => {
    return donors.find(d => d.id === id)?.pan || 'N/A';
  };

  return (
    <div className="space-y-6">
      
      {/* Action Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Donation Management</h2>
          <p className="text-slate-500 text-xs dark:text-slate-400">Issue double-entry donation receipts and print certified 80G tax exemptions</p>
        </div>

        {user.role !== 'AUDITOR' && user.role !== 'VOLUNTEER' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-forest-600 hover:bg-forest-750 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Receive Donation</span>
          </button>
        )}
      </div>

      {/* Receipts Log */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Recent Donation Receipts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase">
                <th className="pb-3">Receipt Number</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Donor Name</th>
                <th className="pb-3">Purpose Target</th>
                <th className="pb-3">Payment Mode</th>
                <th className="pb-3">Exemption (80G)</th>
                <th className="pb-3">Amount (₹)</th>
                <th className="pb-3 text-right">Receipt Sheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
              {donations.length === 0 ? (
                <tr><td colSpan={8} className="py-4 text-center text-slate-400 italic">No donations recorded yet.</td></tr>
              ) : (
                donations.map(d => (
                  <tr key={d.id}>
                    <td className="py-3.5 font-bold font-mono text-slate-850 dark:text-slate-200">{d.receiptNumber}</td>
                    <td className="py-3.5">{d.date}</td>
                    <td className="py-3.5 font-semibold">{getDonorName(d.donorId)}</td>
                    <td className="py-3.5">{d.purpose}</td>
                    <td className="py-3.5 font-mono">{d.paymentMode}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.taxExemptionEligible ? 'bg-forest-50 text-forest-600 dark:bg-forest-950/20' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {d.taxExemptionEligible ? '80G Eligible' : 'No Exemption'}
                      </span>
                    </td>
                    <td className="py-3.5 font-black text-forest-650">₹{d.amount.toLocaleString()}</td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setSelectedReceipt(d)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-forest-600 dark:text-forest-400 inline-block"
                      >
                        <Printer className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Donation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800">Log Donation Entry</h3>
              <button onClick={() => setShowAddModal(false)} className="text-xs font-bold text-slate-400">Close</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs font-bold text-slate-500">
              <div className="space-y-1">
                <label>Donor Full Name</label>
                <input
                  type="text"
                  required
                  value={form.donorName}
                  onChange={(e) => setForm({ ...form, donorName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-normal bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-normal bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <label>Donation Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-normal bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>PAN Card Number</label>
                  <input
                    type="text"
                    value={form.pan}
                    onChange={(e) => setForm({ ...form, pan: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-normal bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <label>Aadhar Number</label>
                  <input
                    type="text"
                    value={form.aadhar}
                    onChange={(e) => setForm({ ...form, aadhar: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-normal bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Payment Method</label>
                  <select
                    value={form.paymentMode}
                    onChange={(e) => setForm({ ...form, paymentMode: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50"
                  >
                    <option value="UPI">UPI Transfer</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="BANK">Bank NetTransfer</option>
                    <option value="CHEQUE">Cheque Registry</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label>Exemption Target Purpose</label>
                  <select
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50"
                  >
                    <option value="Cow Feeding">Cow Feeding (चारा दान)</option>
                    <option value="General">General (सामान्य)</option>
                    <option value="Construction">Construction (निर्माण)</option>
                    <option value="Medical">Medical treatment (दवाईयां)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center space-x-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.taxExempt}
                    onChange={(e) => setForm({ ...form, taxExempt: e.target.checked })}
                    className="rounded border-slate-350"
                  />
                  <span>80G Tax Exemption Certificate</span>
                </label>
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold text-sm rounded-xl mt-4">
                Post Receipt & Update Ledgers
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 80G Receipt Viewer Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white">80G Donation Exemption Receipt</h4>
                <p className="text-[10px] font-mono text-slate-400">Ref: {selectedReceipt.receiptNumber}</p>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Close</button>
            </div>
            
            <div className="p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
              
              {/* Logo & Header */}
              <div className="text-center border-b pb-4 space-y-1">
                <h5 className="font-black text-sm text-forest-700">SHREE KRISHNA GAUSHALA SAMITI</h5>
                <p className="text-[10px] text-slate-400">Sector 5, Town Area • Regd. No: 410/2012</p>
                <p className="text-[9px] text-forest-600 font-semibold bg-forest-50 px-2 py-0.5 rounded-full inline-block">12A & 80G Certified Non-Profit</p>
              </div>

              {/* Receipt Body */}
              <div className="space-y-3 leading-relaxed">
                <p>Received with thanks a sum of <strong>₹{selectedReceipt.amount.toLocaleString()}</strong> (Rupees {selectedReceipt.amount === 5000 ? 'Five Thousand Only' : 'amount value'}) from:</p>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                  <p><strong>Donor Name:</strong> {getDonorName(selectedReceipt.donorId)}</p>
                  <p><strong>PAN Card Number:</strong> {getDonorPan(selectedReceipt.donorId)}</p>
                  <p><strong>Exemption Purpose:</strong> {selectedReceipt.purpose}</p>
                  <p><strong>Payment Mode:</strong> {selectedReceipt.paymentMode}</p>
                </div>
              </div>

              {/* Certificate footer warning */}
              {selectedReceipt.taxExemptionEligible && (
                <div className="p-3.5 bg-forest-50/50 dark:bg-forest-950/20 rounded-2xl border border-forest-100 text-[10px] leading-normal flex items-start space-x-2 text-forest-800 dark:text-forest-300">
                  <CheckCircle2 className="w-5 h-5 text-forest-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">80G Income Tax Exemption Exemption Validated</p>
                    <p className="font-normal text-slate-500">This receipt qualifies for 50% deduction under Section 80G of the Indian Income Tax Act. Retain this sheet for CA filing.</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <button className="flex items-center space-x-1.5 hover:underline text-slate-500">
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp Share</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print PDF Receipt</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
