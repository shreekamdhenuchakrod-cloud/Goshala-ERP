import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { InventoryItem, InventoryBatch, CRMContact, StockTransaction } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Plus, Search, Calendar, AlertTriangle, UserCheck, MessageSquare, Clipboard, Gift, Trash2, ArrowUpDown } from 'lucide-react';

export const InventoryCRM: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'inventory' | 'crm'>('inventory');

  // Inventory states
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  
  // CRM states
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [crmFilter, setCrmFilter] = useState<'ALL' | 'DONOR' | 'CUSTOMER' | 'VENDOR' | 'VOLUNTEER'>('ALL');
  const [crmSearch, setCrmSearch] = useState('');

  // Modals & Forms
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showCRMModal, setShowCRMModal] = useState(false);

  const [receiveForm, setReceiveForm] = useState({
    itemId: '',
    supplierId: '',
    batchNumber: '',
    qty: 100,
    rate: 10,
    slipNumber: '',
    expiryDate: ''
  });

  const [issueForm, setIssueForm] = useState({
    itemId: '',
    qty: 50,
    type: 'OUT' as 'OUT' | 'ADJUSTMENT' | 'DAMAGE' | 'WASTE',
    slipNumber: '',
    reference: ''
  });

  const [crmForm, setCrmForm] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'DONOR' as 'DONOR' | 'CUSTOMER' | 'VENDOR' | 'VOLUNTEER',
    pan: '',
    aadhar: '',
    birthday: ''
  });

  useEffect(() => {
    setItems(GoshalaDB.getTable<InventoryItem>('inventory'));
    setBatches(GoshalaDB.getTable<InventoryBatch>('batches'));
    setTransactions(GoshalaDB.getTable<StockTransaction>('stock_tx'));
    setContacts(GoshalaDB.getTable<CRMContact>('contacts'));
  }, []);

  const reloadData = () => {
    setItems(GoshalaDB.getTable<InventoryItem>('inventory'));
    setBatches(GoshalaDB.getTable<InventoryBatch>('batches'));
    setTransactions(GoshalaDB.getTable<StockTransaction>('stock_tx'));
    setContacts(GoshalaDB.getTable<CRMContact>('contacts'));
  };

  // Save new stock IN batch
  const handleReceiveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveForm.itemId || !receiveForm.supplierId) return alert('Fill all fields');

    GoshalaDB.receiveStock(
      receiveForm.itemId,
      receiveForm.supplierId,
      receiveForm.batchNumber || `B-${Math.floor(1000 + Math.random() * 9000)}`,
      Number(receiveForm.qty),
      Number(receiveForm.rate),
      new Date().toISOString().split('T')[0],
      receiveForm.slipNumber || `RCV-${Date.now().toString().slice(-4)}`,
      receiveForm.expiryDate || undefined
    );

    // Double Entry Integration: Create a Payment/Outstanding Voucher for Fodder Purchase
    const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
    const supplier = contacts.find(c => c.id === receiveForm.supplierId);
    const amount = Number(receiveForm.qty) * Number(receiveForm.rate);

    // Debit Fodder Stock / Credit cash or supplier ledger
    const newVoucher = {
      id: `v-${Date.now()}`,
      fyId: config.activeFyId,
      voucherNumber: '',
      voucherType: 'PAYMENT' as const,
      date: new Date().toISOString().split('T')[0],
      status: 'POSTED' as const,
      costCenterId: 'cc-feed' as any,
      narration: `Inventory Purchase batch: ${receiveForm.batchNumber}. Qty: ${receiveForm.qty}. Supplier: ${supplier ? supplier.name : 'Vendor'}`,
      entries: [
        { ledgerId: 'l-inventory-fodder', amount: amount, isDebit: true },
        { ledgerId: 'l-cash', amount: amount, isDebit: false }
      ],
      attachments: [],
      auditTrail: []
    };

    GoshalaDB.saveVoucher(newVoucher, { name: user.name, role: user.role });

    reloadData();
    setShowReceiveModal(false);
  };

  // Consume stock using FIFO
  const handleIssueStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.itemId) return alert('Select inventory item');

    const qty = Number(issueForm.qty);
    GoshalaDB.issueStockFIFO(
      issueForm.itemId,
      qty,
      new Date().toISOString().split('T')[0],
      issueForm.slipNumber || `ISS-${Date.now().toString().slice(-4)}`,
      issueForm.reference || 'Daily Feeding'
    );

    // Dynamic double entry: Update inventory assets to feeding expense
    const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
    const item = items.find(i => i.id === issueForm.itemId);
    
    // Estimate cost based on active FIFO rate (approximate for voucher posting)
    const activeBatch = batches.find(b => b.itemId === issueForm.itemId && b.qtyRemaining > 0);
    const rate = activeBatch ? activeBatch.purchaseRate : 10;
    const value = qty * rate;

    const expenseVoucher = {
      id: `v-issue-${Date.now()}`,
      fyId: config.activeFyId,
      voucherNumber: '',
      voucherType: 'JOURNAL' as const,
      date: new Date().toISOString().split('T')[0],
      status: 'POSTED' as const,
      costCenterId: 'cc-feed' as any,
      narration: `Issued fodder stock for feeding: ${qty} kg ${item ? item.name : ''}. Valued at FIFO cost: ₹${value}`,
      entries: [
        { ledgerId: 'l-exp-fodder-dry', amount: value, isDebit: true },
        { ledgerId: 'l-inventory-fodder', amount: value, isDebit: false }
      ],
      attachments: [],
      auditTrail: []
    };

    GoshalaDB.saveVoucher(expenseVoucher, { name: user.name, role: user.role });

    reloadData();
    setShowIssueModal(false);
  };

  // Save CRM Contact
  const handleSaveCRM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmForm.name || !crmForm.phone) return alert('Name and phone are required');

    const table = GoshalaDB.getTable<CRMContact>('contacts');
    const newContact: CRMContact = {
      id: `c-${Date.now()}`,
      name: crmForm.name,
      phone: crmForm.phone,
      email: crmForm.email || undefined,
      type: crmForm.type,
      pan: crmForm.pan || undefined,
      aadhar: crmForm.aadhar || undefined,
      birthday: crmForm.birthday || undefined,
      outstandingBalance: 0,
      communicationHistory: []
    };

    table.push(newContact);
    GoshalaDB.saveTable('contacts', table);
    setContacts(table);
    setShowCRMModal(false);
    GoshalaDB.logAction(user.name, user.role, 'ADD_CRM_CONTACT', `Added CRM profile for ${newContact.name} (${newContact.type})`);
  };

  // Check if contact has birthday today
  const isBirthdayToday = (dob?: string) => {
    if (!dob) return false;
    const today = new Date();
    const dobDate = new Date(dob);
    return today.getDate() === dobDate.getDate() && today.getMonth() === dobDate.getMonth();
  };

  // Filtered CRM List
  const filteredCRM = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(crmSearch.toLowerCase()) || 
                          c.phone.includes(crmSearch);
    const matchesType = crmFilter === 'ALL' || c.type === crmFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'inventory' ? 'border-forest-600 text-forest-600 dark:text-forest-400' : 'border-transparent text-slate-400'
          }`}
        >
          Inventory Stock Manager
        </button>
        <button
          onClick={() => setActiveTab('crm')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'crm' ? 'border-forest-600 text-forest-600 dark:text-forest-400' : 'border-transparent text-slate-400'
          }`}
        >
          CRM Contact Directories
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <div className="space-y-6">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Fodder & Medicine Inventories</h3>
              <p className="text-slate-500 text-xs dark:text-slate-400">Track purchase rates and active batches utilizing FIFO valuation</p>
            </div>
            
            {user.role !== 'AUDITOR' && user.role !== 'VOLUNTEER' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setIssueForm({ itemId: items[0]?.id || '', qty: 50, type: 'OUT', slipNumber: '', reference: '' });
                    setShowIssueModal(true);
                  }}
                  className="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-800 shadow"
                >
                  Issue Stock / Fodder Feed
                </button>
                <button
                  onClick={() => {
                    setReceiveForm({ itemId: items[0]?.id || '', supplierId: contacts.find(c => c.type === 'VENDOR')?.id || '', batchNumber: '', qty: 500, rate: 8, slipNumber: '', expiryDate: '' });
                    setShowReceiveModal(true);
                  }}
                  className="bg-forest-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-forest-700 shadow"
                >
                  Receive Stock (New Batch)
                </button>
              </div>
            )}
          </div>

          {/* Roster of Stocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => {
              const itemBatches = batches.filter(b => b.itemId === item.id);
              const totalStock = itemBatches.reduce((acc, curr) => acc + curr.qtyRemaining, 0);
              const nearExpiry = itemBatches.filter(b => b.expiryDate && new Date(b.expiryDate).getTime() < new Date().getTime() + 60 * 24 * 60 * 60 * 1000);
              
              return (
                <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{item.category}</span>
                      <h4 className="font-extrabold text-slate-800 dark:text-white text-base mt-0.5">{item.name}</h4>
                    </div>
                    {totalStock <= item.minimumStock && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Low Stock</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-slate-400 text-xs font-semibold block mb-0.5">Current Stock Balance</span>
                      <span className="text-2xl font-black text-slate-800 dark:text-white">{totalStock} <span className="text-xs text-slate-500 font-bold">{item.unit}</span></span>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 leading-normal">
                      <p>Min Limit: {item.minimumStock} {item.unit}</p>
                      <p>{itemBatches.filter(b => b.qtyRemaining > 0).length} Active Batches</p>
                    </div>
                  </div>

                  {nearExpiry.length > 0 && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/20 rounded-xl text-[10px] text-red-600 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{nearExpiry.length} batches near expiry date!</span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Active Batches List */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-800 dark:text-white text-base">Active FIFO Batches</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase">
                    <th className="pb-3">Batch Number</th>
                    <th className="pb-3">Item Name</th>
                    <th className="pb-3">Purchase Rate</th>
                    <th className="pb-3">Qty Received</th>
                    <th className="pb-3">Qty Remaining</th>
                    <th className="pb-3">Date Received</th>
                    <th className="pb-3">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                  {batches.filter(b => b.qtyRemaining > 0).map(b => {
                    const item = items.find(i => i.id === b.itemId);
                    return (
                      <tr key={b.id}>
                        <td className="py-3 font-bold font-mono text-slate-800 dark:text-slate-100">{b.batchNumber}</td>
                        <td className="py-3 font-semibold">{item ? item.name : 'Unknown Item'}</td>
                        <td className="py-3 font-bold">₹{b.purchaseRate} / {item?.unit}</td>
                        <td className="py-3">{b.qtyReceived}</td>
                        <td className="py-3 font-bold text-forest-600">{b.qtyRemaining} {item?.unit}</td>
                        <td className="py-3">{b.dateReceived}</td>
                        <td className="py-3 font-bold text-red-500">{b.expiryDate || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        // CRM Directory Tab
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">CRM Directories</h3>
              <p className="text-slate-500 text-xs dark:text-slate-400">Manage Donors, Milk Customers, Feed Vendors, and Volunteers</p>
            </div>
            
            <button
              onClick={() => {
                setCrmForm({ name: '', phone: '', email: '', type: 'DONOR', pan: '', aadhar: '', birthday: '' });
                setShowCRMModal(true);
              }}
              className="bg-forest-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-forest-700 shadow"
            >
              Add New Profile
            </button>
          </div>

          {/* CRM Search & filter tools */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, phone..."
                value={crmSearch}
                onChange={(e) => setCrmSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-900"
              />
            </div>
            <div className="flex gap-2.5">
              {['ALL', 'DONOR', 'CUSTOMER', 'VENDOR', 'VOLUNTEER'].map(t => (
                <button
                  key={t}
                  onClick={() => setCrmFilter(t as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    crmFilter === t
                      ? 'bg-forest-600 text-white'
                      : 'bg-slate-50 text-slate-500 dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Contacts Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCRM.map(c => {
              const bdayCheck = isBirthdayToday(c.birthday);
              return (
                <div key={c.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wide uppercase ${
                        c.type === 'DONOR' ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/20' :
                        c.type === 'CUSTOMER' ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/20' :
                        c.type === 'VENDOR' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-700'
                      }`}>
                        {c.type}
                      </span>
                      {bdayCheck && (
                        <span className="text-[10px] font-bold text-pink-600 bg-pink-50 dark:bg-pink-950/20 px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                          <Gift className="w-3.5 h-3.5" />
                          <span>Birthday Today!</span>
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">{c.name}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{c.phone}</p>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 font-sans">
                      {c.email && <p>Email: {c.email}</p>}
                      {c.pan && <p>PAN: {c.pan} • Aadhaar: {c.aadhar}</p>}
                      {c.birthday && <p>DOB: {c.birthday}</p>}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-750 pt-3 flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-400">Balance: <strong className={c.outstandingBalance >= 0 ? 'text-forest-600' : 'text-red-500'}>₹{c.outstandingBalance}</strong></span>
                    <button className="text-forest-600 dark:text-forest-400 hover:underline flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Log Note</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Receive Stock Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 dark:text-white">Receive Stock (Goods Receipt Note)</h3>
              <button onClick={() => setShowReceiveModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Close</button>
            </div>
            
            <form onSubmit={handleReceiveStock} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Inventory Item</label>
                <select
                  value={receiveForm.itemId}
                  onChange={(e) => setReceiveForm({ ...receiveForm, itemId: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-sm bg-slate-50 dark:bg-slate-900"
                >
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Vendor / Supplier</label>
                <select
                  value={receiveForm.supplierId}
                  onChange={(e) => setReceiveForm({ ...receiveForm, supplierId: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-sm bg-slate-50 dark:bg-slate-900"
                >
                  <option value="">Select Vendor</option>
                  {contacts.filter(c => c.type === 'VENDOR').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Batch Number</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={receiveForm.batchNumber}
                    onChange={(e) => setReceiveForm({ ...receiveForm, batchNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Slip / GRN Number</label>
                  <input
                    type="text"
                    placeholder="e.g. GRN-102"
                    value={receiveForm.slipNumber}
                    onChange={(e) => setReceiveForm({ ...receiveForm, slipNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Quantity</label>
                  <input
                    type="number"
                    required
                    value={receiveForm.qty}
                    onChange={(e) => setReceiveForm({ ...receiveForm, qty: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    required
                    value={receiveForm.rate}
                    onChange={(e) => setReceiveForm({ ...receiveForm, rate: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Expiry Date (For Medicines)</label>
                <input
                  type="date"
                  value={receiveForm.expiryDate}
                  onChange={(e) => setReceiveForm({ ...receiveForm, expiryDate: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold text-sm rounded-xl">
                Generate GRN & Record Batch Stock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Issue Stock Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 dark:text-white">Issue Inventory Fodder</h3>
              <button onClick={() => setShowIssueModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Close</button>
            </div>
            
            <form onSubmit={handleIssueStock} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Inventory Item</label>
                <select
                  value={issueForm.itemId}
                  onChange={(e) => setIssueForm({ ...issueForm, itemId: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-sm bg-slate-50 dark:bg-slate-900"
                >
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Quantity to Issue</label>
                  <input
                    type="number"
                    required
                    value={issueForm.qty}
                    onChange={(e) => setIssueForm({ ...issueForm, qty: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Issue Slip Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. SLP-12"
                    value={issueForm.slipNumber}
                    onChange={(e) => setIssueForm({ ...issueForm, slipNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Issue Reason / Target Cow ID</label>
                <input
                  type="text"
                  placeholder="e.g. Feeding Shed 1"
                  value={issueForm.reference}
                  onChange={(e) => setIssueForm({ ...issueForm, reference: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold text-sm rounded-xl">
                Perform FIFO Stock Deduct
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add CRM Contact Modal */}
      {showCRMModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 dark:text-white">Add Contact Profile</h3>
              <button onClick={() => setShowCRMModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Close</button>
            </div>
            
            <form onSubmit={handleSaveCRM} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Contact Type</label>
                <select
                  value={crmForm.type}
                  onChange={(e) => setCrmForm({ ...crmForm, type: e.target.value as any })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-sm bg-slate-50 dark:bg-slate-900"
                >
                  <option value="DONOR">Donor</option>
                  <option value="CUSTOMER">Milk Customer</option>
                  <option value="VENDOR">Feed Vendor</option>
                  <option value="VOLUNTEER">Volunteer</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={crmForm.name}
                    onChange={(e) => setCrmForm({ ...crmForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={crmForm.phone}
                    onChange={(e) => setCrmForm({ ...crmForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Email Address</label>
                <input
                  type="email"
                  value={crmForm.email}
                  onChange={(e) => setCrmForm({ ...crmForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">PAN Card No</label>
                  <input
                    type="text"
                    value={crmForm.pan}
                    onChange={(e) => setCrmForm({ ...crmForm, pan: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Aadhaar Card No</label>
                  <input
                    type="text"
                    value={crmForm.aadhar}
                    onChange={(e) => setCrmForm({ ...crmForm, aadhar: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Birthday (For reminders)</label>
                <input
                  type="date"
                  value={crmForm.birthday}
                  onChange={(e) => setCrmForm({ ...crmForm, birthday: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold text-sm rounded-xl">
                Add Profile to Directory
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
