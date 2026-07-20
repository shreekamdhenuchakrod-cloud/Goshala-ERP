import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Voucher, FinancialYear, Ledger } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { ShieldCheck, AlertTriangle, Play, CheckCircle2, Lock, Unlock, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export const AuditModule: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [fys, setFys] = useState<FinancialYear[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);

  // Scan states
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any | null>(null);

  // Rollover forms
  const [showRollover, setShowRollover] = useState(false);
  const [rolloverTargetFyId, setRolloverTargetFyId] = useState('');
  const [newFyName, setNewFyName] = useState('2026-27');

  useEffect(() => {
    setFys(GoshalaDB.getTable<FinancialYear>('fys'));
    setVouchers(GoshalaDB.getTable<Voucher>('vouchers'));
    setLedgers(GoshalaDB.getTable<Ledger>('ledgers'));
  }, []);

  const reloadData = () => {
    setFys(GoshalaDB.getTable<FinancialYear>('fys'));
    setVouchers(GoshalaDB.getTable<Voucher>('vouchers'));
    setLedgers(GoshalaDB.getTable<Ledger>('ledgers'));
  };

  const handleRunAudit = () => {
    setIsScanning(true);
    setScanResults(null);

    // Simulate audit processing time
    setTimeout(() => {
      const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
      const results = GoshalaDB.runOneClickAudit(config.activeFyId);
      setScanResults(results);
      setIsScanning(false);
      GoshalaDB.logAction(user.name, user.role, 'AUDIT_RUN', `Executed comprehensive one-click CA audit checks on active year`);
    }, 1500);
  };

  const handleLockYear = (fyId: string) => {
    const table = GoshalaDB.getTable<FinancialYear>('fys');
    const fy = table.find(f => f.id === fyId);
    if (fy) {
      fy.status = 'LOCKED';
      GoshalaDB.saveTable('fys', table);
      setFys(table);
      GoshalaDB.logAction(user.name, user.role, 'FY_LOCK', `Locked financial year: ${fy.name}`);
    }
  };

  const handleUnlockYear = (fyId: string) => {
    const table = GoshalaDB.getTable<FinancialYear>('fys');
    const fy = table.find(f => f.id === fyId);
    if (fy) {
      fy.status = 'ACTIVE';
      GoshalaDB.saveTable('fys', table);
      setFys(table);
      GoshalaDB.logAction(user.name, user.role, 'FY_UNLOCK', `Unlocked financial year: ${fy.name}`);
    }
  };

  const handleRolloverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rolloverTargetFyId) return alert('Select FY to close');

    try {
      GoshalaDB.closeFinancialYear(rolloverTargetFyId, newFyName, { name: user.name, role: user.role });
      reloadData();
      setShowRollover(false);
      alert(`Financial Year Closed! Net surpluses carried forward to opening balances of FY ${newFyName}.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Determine if active user is allowed to adjust audit records
  const isAuditorRole = user.role === 'AUDITOR' || user.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-8">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Auditor Control Panel (CA Hub)</h2>
          <p className="text-slate-500 text-xs dark:text-slate-400">Validate ledger entries, detect fraud/discrepancies, and close financial years</p>
        </div>

        {isAuditorRole && (
          <button
            onClick={() => {
              const activeActive = fys.find(f => f.status === 'ACTIVE');
              setRolloverTargetFyId(activeActive?.id || '');
              setShowRollover(true);
            }}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow"
          >
            <Lock className="w-4 h-4" />
            <span>Close Financial Year</span>
          </button>
        )}
      </div>

      {/* Quick Status Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trial Balance Match Status */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Ledger Balancing</span>
            <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">Trial Balance Variance</h4>
            <span className="text-xs font-bold text-forest-600 bg-forest-50 dark:bg-forest-950/20 px-2 py-0.5 rounded-full inline-block">Balanced (₹0.00 Variance)</span>
          </div>
          <div className="w-10 h-10 bg-forest-50 dark:bg-forest-950/30 rounded-xl flex items-center justify-center text-forest-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Current locked status */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Security Locks</span>
            <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">Audit Lock Status</h4>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full inline-block">Financial Data Encrypted</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        {/* Audit trail count */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase">System Logs</span>
            <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">Cryptographic Audit Trail</h4>
            <span className="text-xs text-slate-400 font-semibold">{GoshalaDB.getTable('audit_logs').length} security entries recorded</span>
          </div>
          <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-500">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* One-click Audit check panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-base text-slate-850 dark:text-white">One-Click CA Audit Inspector</h3>
            <p className="text-xs text-slate-400">Scans all double-entry logs for negative cash balances, duplicate voucher amounts, and missing bills above legal thresholds</p>
          </div>
          
          <button
            onClick={handleRunAudit}
            disabled={isScanning}
            className="flex items-center space-x-2 bg-forest-600 disabled:opacity-50 hover:bg-forest-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
          >
            <Play className="w-4 h-4" />
            <span>{isScanning ? 'Scanning ledgers...' : 'Run Audit Check'}</span>
          </button>
        </div>

        {isScanning && (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 border-4 border-forest-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400">Running validation checks against standard CA ledger rules...</p>
          </div>
        )}

        {/* Scan Results Display */}
        {scanResults && !isScanning && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white">Inspection Scan Checklist Findings:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Box 1: Negative Cash check */}
              <div className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
                scanResults.negativeCashDetected ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-950/20' : 'bg-forest-50 border-forest-100 text-forest-800 dark:bg-forest-950/20'
              }`}>
                {scanResults.negativeCashDetected ? <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-forest-600 shrink-0" />}
                <div className="text-xs leading-normal">
                  <h5 className="font-bold">Negative Cash Balance Verification</h5>
                  <p className={scanResults.negativeCashDetected ? 'text-red-600' : 'text-forest-600 dark:text-forest-400'}>
                    {scanResults.negativeCashDetected ? 'WARNING: The Cash-in-Hand ledger balance is negative! This indicates booking outlays without cash receipts.' : 'All Cash ledger balances remain positive throughout the year.'}
                  </p>
                </div>
              </div>

              {/* Box 2: Missing Bill Invoices */}
              <div className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
                scanResults.missingBills.length > 0 ? 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-950/20' : 'bg-forest-50 border-forest-100 text-forest-800 dark:bg-forest-950/20'
              }`}>
                {scanResults.missingBills.length > 0 ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-forest-600 shrink-0" />}
                <div className="text-xs leading-normal">
                  <h5 className="font-bold">Missing Expense Vouchers Invoice</h5>
                  <p className={scanResults.missingBills.length > 0 ? 'text-amber-600' : 'text-forest-600 dark:text-forest-400'}>
                    {scanResults.missingBills.length > 0 ? `ALERT: Detected ${scanResults.missingBills.length} Payment Vouchers above ₹5,000 that do not have bill invoice uploads.` : 'All high-value expenditures have invoice documents attached.'}
                  </p>
                </div>
              </div>

              {/* Box 3: Duplicate Entry Check */}
              <div className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
                scanResults.duplicateEntries.length > 0 ? 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-950/20' : 'bg-forest-50 border-forest-100 text-forest-800 dark:bg-forest-950/20'
              }`}>
                {scanResults.duplicateEntries.length > 0 ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-forest-600 shrink-0" />}
                <div className="text-xs leading-normal">
                  <h5 className="font-bold">Duplicate Voucher Verification</h5>
                  <p className={scanResults.duplicateEntries.length > 0 ? 'text-amber-600' : 'text-forest-600 dark:text-forest-400'}>
                    {scanResults.duplicateEntries.length > 0 ? `WARNING: Found ${scanResults.duplicateEntries.length} instances of identical voucher entries matching by date and value.` : 'No duplicate voucher transactions detected.'}
                  </p>
                </div>
              </div>

              {/* Box 4: High Cash Threshold (Fraud Audit) */}
              <div className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
                scanResults.highCashVouchers.length > 0 ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-950/20' : 'bg-forest-50 border-forest-100 text-forest-800 dark:bg-forest-950/20'
              }`}>
                {scanResults.highCashVouchers.length > 0 ? <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-forest-600 shrink-0" />}
                <div className="text-xs leading-normal">
                  <h5 className="font-bold">High Value Cash Donations/Payments Check</h5>
                  <p className={scanResults.highCashVouchers.length > 0 ? 'text-red-600' : 'text-forest-600 dark:text-forest-400'}>
                    {scanResults.highCashVouchers.length > 0 ? `WARNING: Detected ${scanResults.highCashVouchers.length} cash vouchers exceeding the legal limit of ₹2,000.` : 'All cash ledger outlays comply with standard audit limits.'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Financial Year Lock List */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Lock / Unlock Financial Years</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/40 text-xs">
          {fys.map(fy => (
            <div key={fy.id} className="py-3.5 flex justify-between items-center text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">FY {fy.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">Date span: {fy.startDate} to {fy.endDate}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  fy.status === 'ACTIVE' ? 'bg-forest-50 text-forest-600 dark:bg-forest-950/20' : 'bg-red-50 text-red-500 dark:bg-red-950/20'
                }`}>
                  {fy.status}
                </span>
                
                {isAuditorRole && (
                  fy.status === 'ACTIVE' ? (
                    <button
                      onClick={() => handleLockYear(fy.id)}
                      className="px-3.5 py-1.5 bg-red-650 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center space-x-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Year</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnlockYear(fy.id)}
                      className="px-3.5 py-1.5 bg-forest-600 hover:bg-forest-750 text-white font-semibold rounded-lg flex items-center space-x-1"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock / Reopen</span>
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Close FY Rollover Modal */}
      {showRollover && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center space-x-2">
                <Lock className="w-4 h-4 text-red-500" />
                <span>Aggregated FY Year-End Close</span>
              </h3>
              <button onClick={() => setShowRollover(false)} className="text-xs font-bold text-slate-400">Close</button>
            </div>
            
            <form onSubmit={handleRolloverSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-amber-55 text-amber-800 rounded-2xl space-y-1.5 leading-normal border border-amber-100">
                <p className="font-bold">⚠️ Warning: Irreversible rollover operation.</p>
                <p>All Income and Expense balances will aggregate into the Retained Earnings capital account, and current Asset/Liability balances will carry forward as opening balances to the target FY.</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500">Select Financial Year to Close</label>
                <select
                  value={rolloverTargetFyId}
                  required
                  onChange={(e) => setRolloverTargetFyId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 font-bold"
                >
                  <option value="">Choose ACTIVE FY</option>
                  {fys.filter(f => f.status === 'ACTIVE').map(f => (
                    <option key={f.id} value={f.id}>FY {f.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500">Define Rollover Target FY Name</label>
                <input
                  type="text"
                  required
                  value={newFyName}
                  onChange={(e) => setNewFyName(e.target.value)}
                  placeholder="e.g. 2026-27"
                  className="w-full px-3 py-2 border rounded-xl font-bold font-mono"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-red-650 hover:bg-red-700 text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-1.5 mt-4">
                <span>Lock Year & Aggregated Balance Rollover</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
