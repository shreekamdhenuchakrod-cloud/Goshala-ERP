import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { GovtGrant } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Plus, Search, Globe, UploadCloud, Bell, CheckCircle, FileSpreadsheet } from 'lucide-react';

export const GrantsManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [grants, setGrants] = useState<GovtGrant[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    name: 'National Cattle Breeding Subsidy',
    department: 'Department of Animal Husbandry, GoI',
    sanctionLetterNo: 'SAN-AH-2026-091',
    amount: 150000,
    purpose: 'Infrastructure expansion and shed waterproofing'
  });

  useEffect(() => {
    // Seed initial grants if table empty
    let table = GoshalaDB.getTable<GovtGrant>('grants');
    if (table.length === 0) {
      table = [
        {
          id: 'grant-1',
          name: 'Rashtriya Gokul Mission Feed Grant',
          department: 'Ministry of Fisheries, Animal Husbandry & Dairying',
          sanctionLetterNo: 'RGM-FEED-2025-A',
          amount: 250000,
          receivedAmount: 200000,
          pendingAmount: 50000,
          purpose: 'High nutrition green grass fodder distribution',
          utilizationCertificates: [
            { name: 'UC_RGM_Phase1.pdf', uploadDate: '2025-12-10', url: '#' }
          ],
          reminders: ['2026-08-15']
        }
      ];
      GoshalaDB.saveTable('grants', table);
    }
    setGrants(table);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount) return alert('Name and Amount are required');

    const newGrant: GovtGrant = {
      id: `grant-${Date.now()}`,
      name: form.name,
      department: form.department,
      sanctionLetterNo: form.sanctionLetterNo,
      amount: Number(form.amount),
      receivedAmount: 0,
      pendingAmount: Number(form.amount),
      purpose: form.purpose,
      utilizationCertificates: [],
      reminders: []
    };

    const table = GoshalaDB.getTable<GovtGrant>('grants');
    table.push(newGrant);
    GoshalaDB.saveTable('grants', table);
    setGrants(table);
    setShowAddModal(false);
    GoshalaDB.logAction(user.name, user.role, 'ADD_GRANT', `Logged government grant sanction: ${newGrant.name}`);
  };

  const handleSimulateDisbursement = (id: string, amount: number) => {
    const table = GoshalaDB.getTable<GovtGrant>('grants');
    const grant = table.find(g => g.id === id);
    if (grant) {
      if (grant.pendingAmount < amount) return alert('Disbursement cannot exceed pending balance!');
      grant.receivedAmount += amount;
      grant.pendingAmount -= amount;
      GoshalaDB.saveTable('grants', table);
      setGrants(table);

      // Double-entry integration: Create a Receipt Voucher for Grant Income
      const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
      const voucher = {
        id: `v-grant-${Date.now()}`,
        fyId: config.activeFyId,
        voucherNumber: '',
        voucherType: 'RECEIPT' as const,
        date: new Date().toISOString().split('T')[0],
        status: 'POSTED' as const,
        costCenterId: 'cc-construction' as any,
        narration: `Received Government Grant instalment: ${grant.name}. Department: ${grant.department}`,
        entries: [
          { ledgerId: 'l-bank-sbi', amount, isDebit: true },
          { ledgerId: 'l-inc-gov-grant', amount, isDebit: false }
        ],
        attachments: [],
        auditTrail: []
      };

      GoshalaDB.saveVoucher(voucher, { name: user.name, role: user.role });
      GoshalaDB.logAction(user.name, user.role, 'RECEIVE_GRANT_INSTALMENT', `Received ₹${amount} for grant ${grant.name}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Government Grants Dashboard</h2>
          <p className="text-slate-500 text-xs dark:text-slate-400">Track state and national cattle subsidies, sanction records, and Utilization Certificates (UC)</p>
        </div>

        {user.role !== 'AUDITOR' && user.role !== 'VOLUNTEER' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-forest-600 hover:bg-forest-750 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Grant Sanction</span>
          </button>
        )}
      </div>

      {/* Grants Cards */}
      <div className="grid grid-cols-1 gap-6">
        {grants.map(grant => {
          const percentUsed = Math.round((grant.receivedAmount / grant.amount) * 100);
          return (
            <div key={grant.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6 flex flex-col md:flex-row justify-between gap-6">
              
              {/* Left Column: Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <span className="text-[10px] text-indigo-500 font-extrabold bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-full uppercase tracking-wider">{grant.department}</span>
                  <h4 className="font-extrabold text-slate-800 dark:text-white text-base mt-2">{grant.name}</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Letter No: {grant.sanctionLetterNo}</p>
                </div>

                <div className="text-xs text-slate-550 dark:text-slate-400">
                  <p><strong>Sanction Purpose:</strong> {grant.purpose}</p>
                  <p className="mt-1"><strong>Active Reminders:</strong> August 15, 2026 (UC Submission due)</p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-400">
                    <span>Disbursed Ratio: {percentUsed}%</span>
                    <span>₹{grant.receivedAmount.toLocaleString()} / ₹{grant.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-forest-650 h-full rounded-full transition-all" style={{ width: `${percentUsed}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Right Column: Actions & UCs */}
              <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-750 pt-4 md:pt-0 md:pl-6 space-y-4 flex flex-col justify-between text-xs">
                
                {/* UCs checklist */}
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-400">Utilization Certificates (UC)</h5>
                  {grant.utilizationCertificates.length === 0 ? (
                    <p className="italic text-slate-400 text-[11px]">No utilization logs uploaded</p>
                  ) : (
                    grant.utilizationCertificates.map((uc, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-[10px]">
                        <span className="font-semibold truncate max-w-[120px]">{uc.name}</span>
                        <span className="text-slate-400 font-mono">{uc.uploadDate}</span>
                      </div>
                    ))
                  )}
                  <button className="w-full py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-bold flex items-center justify-center space-x-1 hover:bg-slate-50">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload UC Exemption</span>
                  </button>
                </div>

                {/* Sim disbursement */}
                {grant.pendingAmount > 0 && user.role !== 'AUDITOR' && user.role !== 'VOLUNTEER' && (
                  <button
                    onClick={() => handleSimulateDisbursement(grant.id, Math.min(50000, grant.pendingAmount))}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                  >
                    Receive ₹{Math.min(50000, grant.pendingAmount).toLocaleString()} Instalment
                  </button>
                )}

              </div>

            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800">Record Grant Sanction Letter</h3>
              <button onClick={() => setShowAddModal(false)} className="text-xs font-bold text-slate-400">Close</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs font-bold text-slate-500">
              <div className="space-y-1">
                <label>Grant Name / Scheme</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-normal bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label>Government Department</label>
                <input
                  type="text"
                  required
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-normal bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Sanction Order Number</label>
                  <input
                    type="text"
                    required
                    value={form.sanctionLetterNo}
                    onChange={(e) => setForm({ ...form, sanctionLetterNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-normal bg-slate-50 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label>Sanctioned Value (₹)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-normal bg-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label>Sanction Purpose details</label>
                <textarea
                  rows={2}
                  required
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-normal bg-slate-50 leading-relaxed"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold text-sm rounded-xl mt-4">
                Record Sanction Details
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
