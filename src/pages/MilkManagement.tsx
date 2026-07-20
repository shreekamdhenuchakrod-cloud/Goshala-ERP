import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Cow, MilkYieldEntry, MilkSale, Employee, CRMContact } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Plus, Search, FileText, Printer, CheckCircle, Percent, Settings2 } from 'lucide-react';

export const MilkManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [yields, setYields] = useState<MilkYieldEntry[]>([]);
  const [sales, setSales] = useState<MilkSale[]>([]);
  const [cows, setCows] = useState<Cow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<CRMContact[]>([]);

  // Modals
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<MilkSale | null>(null);

  // Form states
  const [yieldForm, setYieldForm] = useState({
    cowId: '',
    shift: 'Morning' as 'Morning' | 'Evening',
    quantity: 5,
    employeeId: ''
  });

  const [saleForm, setSaleForm] = useState({
    customerName: '',
    phone: '',
    quantity: 10,
    ratePerLitre: 50,
    gstRate: 5,
    discount: 0,
    paymentMode: 'CASH' as 'CASH' | 'BANK' | 'UPI'
  });

  useEffect(() => {
    setYields(GoshalaDB.getTable<MilkYieldEntry>('milk_yields'));
    setSales(GoshalaDB.getTable<MilkSale>('milk_sales'));
    setCows(GoshalaDB.getTable<Cow>('cows'));
    setEmployees(GoshalaDB.getTable<Employee>('employees'));
    setCustomers(GoshalaDB.getTable<CRMContact>('contacts').filter(c => c.type === 'CUSTOMER'));
  }, []);

  const handleSaveYield = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yieldForm.employeeId) return alert('Select logging employee');

    const newEntry: MilkYieldEntry = {
      id: `my-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      shift: yieldForm.shift,
      cowId: yieldForm.cowId || undefined,
      employeeId: yieldForm.employeeId,
      quantity: Number(yieldForm.quantity)
    };

    const table = GoshalaDB.getTable<MilkYieldEntry>('milk_yields');
    table.push(newEntry);
    GoshalaDB.saveTable('milk_yields', table);
    setYields(table);
    setShowYieldModal(false);

    // If cowId was specified, update cow's average milk status
    if (yieldForm.cowId) {
      const cowTable = GoshalaDB.getTable<Cow>('cows');
      const cow = cowTable.find(c => c.id === yieldForm.cowId);
      if (cow) {
        cow.milkYieldQuantity = Number(yieldForm.quantity);
        cow.pregnancyStatus = 'Lactating';
        GoshalaDB.saveTable('cows', cowTable);
      }
    }

    GoshalaDB.logAction(user.name, user.role, 'ADD_MILK_YIELD', `Log ${yieldForm.quantity} litres for cow ID ${yieldForm.cowId}`);
  };

  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.customerName) return alert('Customer name is required');

    const qty = Number(saleForm.quantity);
    const rate = Number(saleForm.ratePerLitre);
    const subtotal = qty * rate;
    const gst = subtotal * (Number(saleForm.gstRate) / 100);
    const discount = Number(saleForm.discount);
    const totalAmount = subtotal + gst - discount;

    const count = sales.length + 1;
    const invoiceNum = `INV-MILK-${String(count).padStart(4, '0')}`;

    const newSale: MilkSale = {
      id: `ms-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      customerName: saleForm.customerName,
      phone: saleForm.phone,
      quantity: qty,
      ratePerLitre: rate,
      amount: totalAmount,
      gstAmount: gst,
      discount,
      paymentMode: saleForm.paymentMode,
      invoiceNumber: invoiceNum,
      isOutstanding: false // Default to fully paid cash/bank sales
    };

    // Save milk sale
    const table = GoshalaDB.getTable<MilkSale>('milk_sales');
    table.push(newSale);
    GoshalaDB.saveTable('milk_sales', table);
    setSales(table);
    setShowSaleModal(false);

    // double-entry integration: Create a Receipt Voucher for Milk Sales Revenue
    const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
    const bankOrCashLedger = saleForm.paymentMode === 'CASH' ? 'l-cash' : 'l-bank-sbi';
    
    const newVoucher = {
      id: `v-${Date.now()}`,
      fyId: config.activeFyId,
      voucherNumber: '',
      voucherType: 'RECEIPT' as const,
      date: new Date().toISOString().split('T')[0],
      status: 'POSTED' as const,
      costCenterId: 'cc-milk',
      narration: `Milk sales revenue received from ${saleForm.customerName}. Qty: ${qty}L at rate ₹${rate}/L. Invoice: ${invoiceNum}`,
      entries: [
        { ledgerId: bankOrCashLedger, amount: totalAmount, isDebit: true },
        { ledgerId: 'l-inc-milk-sales', amount: totalAmount, isDebit: false }
      ],
      attachments: [],
      auditTrail: []
    };

    GoshalaDB.saveVoucher(newVoucher, { name: user.name, role: user.role });
    GoshalaDB.logAction(user.name, user.role, 'MILK_SALE', `Logged milk sale invoice ${invoiceNum} total: ₹${totalAmount}`);
  };

  return (
    <div className="space-y-8">
      
      {/* Overview stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Milk Management Suite</h2>
          <p className="text-slate-500 text-xs dark:text-slate-400">Record daily cattle milking cycles and manage distribution sales bookkeeping</p>
        </div>

        <div className="flex space-x-3">
          {user.role !== 'AUDITOR' && user.role !== 'VOLUNTEER' && (
            <>
              <button
                onClick={() => {
                  setYieldForm({
                    cowId: cows[0]?.id || '',
                    shift: 'Morning',
                    quantity: 6,
                    employeeId: employees[0]?.id || ''
                  });
                  setShowYieldModal(true);
                }}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Log Daily Yield</span>
              </button>
              <button
                onClick={() => {
                  setSaleForm({
                    customerName: 'Krishna Gopal Organic Dairy',
                    phone: '9425011223',
                    quantity: 20,
                    ratePerLitre: 50,
                    gstRate: 5,
                    discount: 0,
                    paymentMode: 'UPI'
                  });
                  setShowSaleModal(true);
                }}
                className="flex items-center space-x-2 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>New Milk Invoice</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Yield Collection Log */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Daily Milk Yield Logs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Shift</th>
                  <th className="pb-3">Cow RFID</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Milker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                {yields.length === 0 ? (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-400 italic">No milk yield logs recorded yet.</td></tr>
                ) : (
                  yields.map(y => {
                    const cow = cows.find(c => c.id === y.cowId);
                    const emp = employees.find(e => e.id === y.employeeId);
                    return (
                      <tr key={y.id}>
                        <td className="py-3.5">{y.date}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            y.shift === 'Morning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-slate-100 text-slate-600 dark:bg-slate-700'
                          }`}>
                            {y.shift}
                          </span>
                        </td>
                        <td className="py-3.5 font-bold font-mono text-slate-800 dark:text-slate-200">{cow ? cow.rfidTag : 'Batch Total'}</td>
                        <td className="py-3.5 font-bold text-forest-600">{y.quantity} L</td>
                        <td className="py-3.5">{emp ? emp.name : 'Unknown Staff'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Milk Sales Logs */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Milk Distribution Invoices</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Invoice #</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Litres</th>
                  <th className="pb-3">Invoice Amt</th>
                  <th className="pb-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                {sales.length === 0 ? (
                  <tr><td colSpan={6} className="py-4 text-center text-slate-400 italic">No milk invoices generated yet.</td></tr>
                ) : (
                  sales.map(s => (
                    <tr key={s.id}>
                      <td className="py-3.5 font-bold font-mono">{s.invoiceNumber}</td>
                      <td className="py-3.5">{s.date}</td>
                      <td className="py-3.5 font-semibold">{s.customerName}</td>
                      <td className="py-3.5 font-bold">{s.quantity} L</td>
                      <td className="py-3.5 font-bold text-forest-600">₹{s.amount.toLocaleString()}</td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => setSelectedInvoice(s)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-forest-600 dark:text-forest-400 inline-block"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Yield Modal */}
      {showYieldModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 dark:text-white">Record Milking Entry</h3>
              <button onClick={() => setShowYieldModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Close</button>
            </div>
            
            <form onSubmit={handleSaveYield} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Cattle ID (RFID)</label>
                <select
                  value={yieldForm.cowId}
                  onChange={(e) => setYieldForm({ ...yieldForm, cowId: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                >
                  <option value="">Bulk Yield (Unidentified cattle)</option>
                  {cows.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.rfidTag} ({c.breed})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Milking Shift</label>
                  <select
                    value={yieldForm.shift}
                    onChange={(e) => setYieldForm({ ...yieldForm, shift: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Quantity (Litres)</label>
                  <input
                    type="number"
                    required
                    value={yieldForm.quantity}
                    onChange={(e) => setYieldForm({ ...yieldForm, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Logged By Staff</label>
                <select
                  value={yieldForm.employeeId}
                  onChange={(e) => setYieldForm({ ...yieldForm, employeeId: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                >
                  <option value="">Select Employee</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold text-sm rounded-xl">
                Submit Yield Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sales Invoice Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 dark:text-white">Raise Milk Invoice</h3>
              <button onClick={() => setShowSaleModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Close</button>
            </div>
            
            <form onSubmit={handleSaveSale} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Customer Name / Select</label>
                <input
                  type="text"
                  required
                  list="cust-suggestions"
                  placeholder="Enter or select customer name"
                  value={saleForm.customerName}
                  onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                />
                <datalist id="cust-suggestions">
                  {customers.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Contact Number</label>
                <input
                  type="text"
                  value={saleForm.phone}
                  onChange={(e) => setSaleForm({ ...saleForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Milk Qty (Litres)</label>
                  <input
                    type="number"
                    required
                    value={saleForm.quantity}
                    onChange={(e) => setSaleForm({ ...saleForm, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Rate / Litre (₹)</label>
                  <input
                    type="number"
                    required
                    value={saleForm.ratePerLitre}
                    onChange={(e) => setSaleForm({ ...saleForm, ratePerLitre: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">GST %</label>
                  <input
                    type="number"
                    value={saleForm.gstRate}
                    onChange={(e) => setSaleForm({ ...saleForm, gstRate: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Discount (₹)</label>
                  <input
                    type="number"
                    value={saleForm.discount}
                    onChange={(e) => setSaleForm({ ...saleForm, discount: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Payment</label>
                  <select
                    value={saleForm.paymentMode}
                    onChange={(e) => setSaleForm({ ...saleForm, paymentMode: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">BANK</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold text-sm rounded-xl mt-4">
                Generate Invoice & Post Voucher
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white">Tax Invoice</h4>
                <p className="text-[10px] font-mono text-slate-400">Invoice Ref: {selectedInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Close</button>
            </div>
            
            <div className="p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-700/60 pb-4">
                <div>
                  <h5 className="font-extrabold text-forest-700 dark:text-forest-400">Shree Krishna Gaushala</h5>
                  <p className="text-xs text-slate-400">Main Dairy Wing, Sector 5</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Billed To:</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedInvoice.customerName}</p>
                  <p className="text-xs text-slate-400">{selectedInvoice.phone || 'No phone supplied'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400 uppercase tracking-wider font-bold">
                  <span>Product description</span>
                  <div className="flex space-x-12">
                    <span>Qty</span>
                    <span>Rate</span>
                    <span>Total</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <span>Fresh Organic Milk</span>
                  <div className="flex space-x-12">
                    <span>{selectedInvoice.quantity} L</span>
                    <span>₹{selectedInvoice.ratePerLitre}</span>
                    <span>₹{(selectedInvoice.quantity * selectedInvoice.ratePerLitre).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-right max-w-xs ml-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal:</span>
                  <span>₹{(selectedInvoice.quantity * selectedInvoice.ratePerLitre).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">GST Tax:</span>
                  <span>₹{selectedInvoice.gstAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Discounts Applied:</span>
                  <span className="text-red-500">-₹{selectedInvoice.discount}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-slate-200 dark:border-slate-600 pt-2 text-slate-900 dark:text-white">
                  <span>Net Amount Paid:</span>
                  <span className="text-forest-600">₹{selectedInvoice.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl text-[10px] text-slate-400 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-forest-500" />
                <span>Paid fully via {selectedInvoice.paymentMode}. Real-time double-entry ledger is updated under code [4101].</span>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition duration-200"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Invoice Receipt</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
