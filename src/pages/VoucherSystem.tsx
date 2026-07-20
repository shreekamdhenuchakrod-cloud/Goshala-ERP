import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Ledger, Voucher, CostCenter, CRMContact as Contact, VoucherType, ERPConfig } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Plus, Search, X, Printer, Image, Trash2, Calendar, Eye, CreditCard, ChevronRight, FileText, CheckCircle } from 'lucide-react';

export const VoucherSystem: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  // App Configuration
  const [config, setConfig] = useState<ERPConfig>({
    activeFyId: 'fy-2025-26',
    voucherNumberFormat: 'V-{TYPE}-{NUM}',
    receiptFormat: 'R-{NUM}',
    taxRate: 5,
    letterheadText: 'Shree Krishna Balram Goushala\nChakrod, Shajapur (M.P.)\n12A & 80G Certified Non-Profit Organisation',
    enable80G: true
  });

  // UI state toggles
  const [isCreating, setIsCreating] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [printReceiptVoucher, setPrintReceiptVoucher] = useState<Voucher | null>(null);
  const [printPaymentVoucher, setPrintPaymentVoucher] = useState<Voucher | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Registries state
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Form states
  const [vType, setVType] = useState<VoucherType>('PAYMENT');
  const [vDate, setVDate] = useState(new Date().toISOString().split('T')[0]);
  const [vCostCenter, setVCostCenter] = useState('cc-general');
  const [selectedParticular, setSelectedParticular] = useState('');
  const [selectedCashBank, setSelectedCashBank] = useState('');
  const [singleAmount, setSingleAmount] = useState<number>(0);
  const [vNarration, setVNarration] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('CASH');
  const [upiReference, setUpiReference] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billFile, setBillFile] = useState(''); // Stores Base64 compressed image

  // Dynamic Contact quick creation
  const [showQuickContact, setShowQuickContact] = useState(false);
  const [quickContactName, setQuickContactName] = useState('');
  const [quickContactPhone, setQuickContactPhone] = useState('');
  const [quickContactAddress, setQuickContactAddress] = useState('');
  const [quickContactType, setQuickContactType] = useState<'VENDOR' | 'VOLUNTEER' | 'DONOR' | 'CUSTOMER'>('VENDOR');

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedLedgerFilter, setSelectedLedgerFilter] = useState('');
  const [selectedCcFilter, setSelectedCcFilter] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState('');
  const [dateFilterRange, setDateFilterRange] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'fy' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Donation modal printing states
  const [donorName, setDonorName] = useState('');
  const [donorPan, setDonorPan] = useState('');

  // PIN states for secure edits/deletes
  const [pinPromptAction, setPinPromptAction] = useState<(() => void) | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const requirePin = (action: () => void) => {
    setPinPromptAction(() => action);
    setPinInput('');
    setPinError(false);
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = () => {
    const table = GoshalaDB.getTable<ERPConfig>('config');
    if (table.length > 0) {
      setConfig({
        enable80G: true, // Default
        samitiName: 'Shree Krishna Balram Goushala',
        address: 'Chakrod, Shajapur (M.P.)',
        mobileNumber: '9876543210',
        registrationNo: '410/2012',
        ...table[0]
      });
    }

    setVouchers(GoshalaDB.getTable<Voucher>('vouchers').sort((a,b) => b.voucherNumber.localeCompare(a.voucherNumber)));
    setLedgers(GoshalaDB.getTable<Ledger>('ledgers'));
    setCostCenters(GoshalaDB.getTable<CostCenter>('cost_centers'));
    setContacts(GoshalaDB.getTable<Contact>('contacts'));
  };

  // Image compressor utility
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WebP) only.');
      return;
    }

    try {
      const base64 = await compressImage(file);
      setBillFile(base64);
    } catch (err) {
      alert('Error compressing attachment image.');
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Downsize threshold
          const MAX_WIDTH = 900;
          const MAX_HEIGHT = 900;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress iteratively to target 100-150 KB
          let quality = 0.75;
          let resultBase64 = canvas.toDataURL('image/jpeg', quality);
          let sizeInBytes = Math.round((resultBase64.length - 22) * 3 / 4);
          
          while (sizeInBytes > 150 * 1024 && quality > 0.2) {
            quality -= 0.1;
            resultBase64 = canvas.toDataURL('image/jpeg', quality);
            sizeInBytes = Math.round((resultBase64.length - 22) * 3 / 4);
          }
          
          resolve(resultBase64);
        };
        img.onerror = () => reject(new Error('Image loading failed.'));
      };
      reader.onerror = () => reject(new Error('File reading failed.'));
    });
  };

  // Contacts helper quick creator
  const handleAddNewContact = () => {
    setShowQuickContact(true);
    setQuickContactName('');
    setQuickContactPhone('');
    setQuickContactAddress('');
  };

  const handleSaveQuickContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickContactName) return;
    const conList = GoshalaDB.getTable<Contact>('contacts');
    const newId = `c-${Date.now()}`;
    const newContact: Contact = {
      id: newId,
      name: quickContactName,
      phone: quickContactPhone,
      address: quickContactAddress,
      type: quickContactType,
      outstandingBalance: 0,
      communicationHistory: []
    };
    conList.push(newContact);
    GoshalaDB.saveTable('contacts', conList);
    setContacts(conList);
    setSelectedContactId(newId);
    setShowQuickContact(false);
    alert(`Party "${quickContactName}" created successfully!`);
  };

  // Vouchers form submit
  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();

    const activeFy = GoshalaDB.getTable<any>('fys').find(f => f.id === (config as any).activeFyId);
    if (activeFy && activeFy.status !== 'ACTIVE') {
      alert(`ERROR: Financial Year (${activeFy.name}) is currently CLOSED or LOCKED. You must unlock this financial year in Settings before entering or modifying any vouchers!`);
      return;
    }

    if (!selectedParticular || !selectedCashBank || singleAmount <= 0) {
      alert('Voucher contains invalid amounts or unassigned ledgers. Please verify fields.');
      return;
    }

    // Double entry listings
    const entries = [];
    
    if (vType === 'PAYMENT') {
      // Debit particular (expense ledger), Credit cash/bank
      entries.push({ ledgerId: selectedParticular, amount: singleAmount, isDebit: true });
      entries.push({ ledgerId: selectedCashBank, amount: singleAmount, isDebit: false });
    } else if (vType === 'RECEIPT') {
      // Debit cash/bank, Credit particular (income ledger)
      entries.push({ ledgerId: selectedCashBank, amount: singleAmount, isDebit: true });
      entries.push({ ledgerId: selectedParticular, amount: singleAmount, isDebit: false });
    } else if (vType === 'CONTRA') {
      // Transfer to particular (debit), from cashBank (credit)
      entries.push({ ledgerId: selectedParticular, amount: singleAmount, isDebit: true });
      entries.push({ ledgerId: selectedCashBank, amount: singleAmount, isDebit: false });
    } else if (vType === 'JOURNAL') {
      entries.push({ ledgerId: selectedParticular, amount: singleAmount, isDebit: true });
      entries.push({ ledgerId: selectedCashBank, amount: singleAmount, isDebit: false });
    }

    const party = contacts.find(c => c.id === selectedContactId);
    let finalNarration = vNarration;
    if (party) {
      finalNarration = `[${party.name}] ${vNarration}`;
    }

    if (editingVoucher) {
      const vToSave: Voucher = {
        ...editingVoucher,
        fyId: editingVoucher.fyId || 'fy-2025-26',
        date: vDate,
        voucherType: vType,
        costCenterId: vCostCenter,
        entries,
        narration: finalNarration,
        paymentMode: selectedPaymentMode as any,
        attachments: billFile ? [billFile] : [],
        referenceDetails: `${selectedPaymentMode} • Ref: ${upiReference || chequeNumber || '—'}`,
        status: editingVoucher.status || 'POSTED'
      };
      GoshalaDB.saveVoucher(vToSave, user);
    } else {
      const vToSave: Voucher = {
        id: `v-${Date.now()}`,
        fyId: 'fy-2025-26',
        voucherNumber: '', // auto generated
        voucherType: vType,
        date: vDate,
        status: 'POSTED',
        costCenterId: vCostCenter,
        narration: finalNarration,
        entries,
        attachments: billFile ? [billFile] : [],
        paymentMode: selectedPaymentMode as any,
        referenceDetails: `${selectedPaymentMode} • Ref: ${upiReference || chequeNumber || '—'}`,
        auditTrail: []
      };
      GoshalaDB.saveVoucher(vToSave, user);
    }
    
    // Update Cost center budget spends dynamically
    if (vType === 'PAYMENT' && vCostCenter) {
      const ccs = GoshalaDB.getTable<CostCenter>('cost_centers');
      const targetCc = ccs.find(c => c.id === vCostCenter);
      if (targetCc) {
        targetCc.spentAmount = (targetCc.spentAmount || 0) + singleAmount;
        GoshalaDB.saveTable('cost_centers', ccs);
      }
    }

    alert(editingVoucher ? 'Voucher updated successfully!' : 'Voucher posted successfully!');
    handleDiscard();
    loadDatabase();
  };

  const handleDiscard = () => {
    setIsCreating(false);
    setEditingVoucher(null);
    setSelectedCashBank('');
    setSelectedParticular('');
    setSingleAmount(0);
    setVNarration('');
    setSelectedContactId('');
    setUpiReference('');
    setChequeNumber('');
    setBillNumber('');
    setBillFile('');
  };

  const handleEditVoucher = (v: Voucher) => {
    requirePin(() => {
      setEditingVoucher(v);
      setIsCreating(true);
      setVType(v.voucherType);
      setVDate(v.date);
      setVCostCenter(v.costCenterId || 'cc-general');
      setSelectedPaymentMode(v.paymentMode || 'CASH');

      const deb = v.entries.find(e => e.isDebit);
      const cred = v.entries.find(e => !e.isDebit);

      if (v.voucherType === 'PAYMENT') {
        setSelectedParticular(deb?.ledgerId || '');
        setSelectedCashBank(cred?.ledgerId || '');
        setSingleAmount(deb?.amount || 0);
      } else if (v.voucherType === 'RECEIPT') {
        setSelectedParticular(cred?.ledgerId || '');
        setSelectedCashBank(deb?.ledgerId || '');
        setSingleAmount(deb?.amount || 0);
      } else {
        setSelectedParticular(deb?.ledgerId || '');
        setSelectedCashBank(cred?.ledgerId || '');
        setSingleAmount(deb?.amount || 0);
      }

      // Strip bracketed contact name from narration if present
      const match = v.narration.match(/^\[([^\]]+)\]\s*(.*)/);
      if (match) {
        setVNarration(match[2]);
        const party = contacts.find(c => c.name === match[1]);
        if (party) setSelectedContactId(party.id);
      } else {
        setVNarration(v.narration);
      }

      setBillFile(v.attachments && v.attachments.length > 0 ? v.attachments[0] : '');
    });
  };

  const handleDeleteVoucher = (id: string) => {
    if (!window.confirm('WARNING: Are you sure you want to permanently delete this transaction voucher? This updates day books and balances immediately.')) return;
    requirePin(() => {
      const dbVouchers = GoshalaDB.getTable<Voucher>('vouchers');
      const filtered = dbVouchers.filter(v => v.id !== id);
      GoshalaDB.saveTable('vouchers', filtered);
      GoshalaDB.recalculateLedgers();
      alert('Voucher deleted successfully!');
      loadDatabase();
    });
  };

  const triggerPrintReceipt = (v: Voucher) => {
    setDonorName('');
    setDonorPan('');
    
    // Extract contact details
    const match = v.narration.match(/^\[([^\]]+)\]/);
    if (match) {
      setDonorName(match[1]);
      const party = contacts.find(c => c.name === match[1]);
      if (party) setDonorPan(party.phone || '—');
    }
    setPrintReceiptVoucher(v);
  };

  const triggerPrintPaymentSlip = (v: Voucher) => {
    setPrintPaymentVoucher(v);
  };

  // Helper selectors
  const expenseLedgers = ledgers.filter(l => l.type === 'EXPENSE');
  const incomeLedgers = ledgers.filter(l => l.type === 'INCOME');
  const cashBankLedgers = ledgers.filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable');

  const getLedgerName = (id: string) => ledgers.find(l => l.id === id)?.name || id;
  const getCostCenterName = (id?: string) => costCenters.find(c => c.id === id)?.name || 'General';

  // Amount in Words Hindi/English
  const amountToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + amountToWords(Math.abs(num));
    let str = '';
    if (Math.floor(num / 100000) > 0) {
      str += amountToWords(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }
    if (Math.floor(num / 1000) > 0) {
      str += amountToWords(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    if (Math.floor(num / 100) > 0) {
      str += amountToWords(Math.floor(num / 100)) + ' Hundred ';
      num %= 100;
    }
    if (num > 0) {
      if (num < 20) str += a[num];
      else str += b[Math.floor(num / 10)] + ' ' + a[num % 10];
    }
    return str + 'Rupees Only';
  };

  // Multi-filter transaction records
  const filteredVouchers = vouchers.filter(v => {
    // 1. Search Query
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      v.voucherNumber.toLowerCase().includes(query) ||
      v.narration.toLowerCase().includes(query) ||
      v.date.includes(query) ||
      v.entries.some(e => getLedgerName(e.ledgerId).toLowerCase().includes(query) || String(e.amount).includes(query));

    // 2. Category filter
    const matchesCategory = !selectedCategoryFilter || v.entries.some(e => e.ledgerId === selectedCategoryFilter);

    // 3. Ledger filter
    const matchesLedger = !selectedLedgerFilter || v.entries.some(e => e.ledgerId === selectedLedgerFilter);

    // 4. Cost Center filter
    const matchesCc = !selectedCcFilter || v.costCenterId === selectedCcFilter;

    // 5. Payment Mode filter
    const matchesMode = !selectedModeFilter || v.paymentMode === selectedModeFilter;

    // 6. Date Range filter
    let matchesDate = true;
    const now = new Date();
    const vTime = new Date(v.date);
    if (dateFilterRange === 'today') {
      matchesDate = v.date === now.toISOString().split('T')[0];
    } else if (dateFilterRange === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      matchesDate = v.date === yesterday.toISOString().split('T')[0];
    } else if (dateFilterRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      matchesDate = vTime >= weekAgo;
    } else if (dateFilterRange === 'month') {
      matchesDate = v.date.substring(0, 7) === now.toISOString().substring(0, 7);
    } else if (dateFilterRange === 'custom') {
      if (customStartDate && customEndDate) {
        matchesDate = v.date >= customStartDate && v.date <= customEndDate;
      }
    }

    return matchesSearch && matchesCategory && matchesLedger && matchesCc && matchesMode && matchesDate;
  });

  return (
    <div className="space-y-6">
      
      {/* Lightbox attachment modal */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-3xl w-full max-h-[85vh] overflow-hidden rounded-2xl bg-black flex items-center justify-center">
            <button className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full"><X className="w-6 h-6" /></button>
            <img src={lightboxImage} alt="Receipt Attachment" className="max-w-full max-h-[80vh] object-contain" />
          </div>
        </div>
      )}

      {/* printable Donation slip receipt */}
      {printReceiptVoucher && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl border shadow-2xl overflow-hidden text-xs">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-850 dark:text-white">Print Donation Slip (80G Exemption)</h3>
              <button onClick={() => setPrintReceiptVoucher(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              
              <div id="printable-receipt-card" className="p-6 border-2 border-double border-forest-650 bg-white text-slate-850 rounded-2xl space-y-4 font-sans">
                <div className="flex items-center pb-2 border-b border-forest-100 space-x-3">
                  {config.logoUrl && (
                    <img src={config.logoUrl} alt="Logo" className="w-14 h-14 object-contain flex-shrink-0" />
                  )}
                  <div className="flex-1 text-center space-y-1">
                    <h2 className="text-base font-black text-forest-750">{config.samitiName}</h2>
                    <p className="text-[9px] text-slate-500">{config.address} • Regd. No: {config.registrationNo}</p>
                    {config.enable80G && (
                      <p className="text-[8px] text-forest-650 font-bold bg-forest-550/10 px-3 py-0.5 rounded-full inline-block">12A & 80G Certified Income Tax Exempted Organisation</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 text-[9px] pb-2 border-b border-slate-100">
                  <div>Voucher No: <strong>{printReceiptVoucher.voucherNumber}</strong></div>
                  <div className="text-right">Date: <strong>{printReceiptVoucher.date}</strong></div>
                  <div>Received From: <strong>{donorName || 'Rajesh Kumar Singhal'}</strong></div>
                  <div className="text-right">PAN Number: <strong>{donorPan || '—'}</strong></div>
                </div>

                <div className="py-2 text-[10px] leading-relaxed">
                  Received with thanks a sum of <strong>₹{printReceiptVoucher.entries[0]?.amount.toLocaleString()}</strong> (in words: <strong>{amountToWords(printReceiptVoucher.entries[0]?.amount)}</strong>) as charity donation for fodder and Goshala welfare.
                </div>

                <div className="pt-6 border-t border-dashed border-slate-200">
                  <div className="text-center text-[9px] font-bold text-slate-500 mb-4 uppercase tracking-wider">
                    For {config.samitiName} (समिति हस्ताक्षर)
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center text-[8px] font-bold text-slate-650">
                    <div className="space-y-6">
                      <div className="h-8 border-b border-dashed border-slate-300"></div>
                      <div>President (अध्यक्ष)</div>
                    </div>
                    <div className="space-y-6">
                      <div className="h-8 border-b border-dashed border-slate-300"></div>
                      <div>Secretary (सचिव)</div>
                    </div>
                    <div className="space-y-6">
                      <div className="h-8 border-b border-dashed border-slate-300"></div>
                      <div>Treasurer (कोषाध्यक्ष)</div>
                    </div>
                  </div>
                  <div className="text-center text-[8px] text-slate-400 italic mt-3 pt-1">
                    {config.printFooter || 'Thank you for your generous support!'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => window.print()} className="px-5 py-2.5 bg-forest-600 text-white font-bold rounded-xl flex items-center space-x-1 hover:bg-forest-750">
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* printable Expense slip receipt */}
      {printPaymentVoucher && (() => {
        const deb = printPaymentVoucher.entries.find(e => e.isDebit);
        const categoryId = deb?.ledgerId || '';
        const customNote = config.receiptTemplates?.[categoryId] || config.receiptTemplates?.['default'] || 'Received cash/bank payment for Goshala expenses.';
        
        let recipientName = 'Ramesh Kumar Waged';
        const match = printPaymentVoucher.narration.match(/^\[([^\]]+)\]/);
        if (match) recipientName = match[1];

        return (
          <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl border shadow-2xl overflow-hidden text-xs">
              <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-850 dark:text-white">Print Payment Voucher Slip</h3>
                <button onClick={() => setPrintPaymentVoucher(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                
                <div id="printable-payment-card" className="p-6 border-2 border-double border-saffron-600 bg-white text-slate-850 rounded-2xl space-y-4 font-sans">
                  <div className="flex items-center pb-2 border-b border-saffron-100 space-x-3">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt="Logo" className="w-14 h-14 object-contain flex-shrink-0" />
                    )}
                    <div className="flex-1 text-center space-y-1">
                      <h2 className="text-base font-black text-saffron-750">{config.samitiName}</h2>
                      <p className="text-[9px] text-slate-500">{config.address} • Mobile: {config.mobileNumber}</p>
                      <p className="text-[8px] text-saffron-650 font-bold bg-saffron-550/10 px-3 py-0.5 rounded-full inline-block">PAYMENT VOUCHER (भुगतान रसीद)</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 text-[9px] pb-2 border-b border-slate-100">
                    <div>Voucher No: <strong>{printPaymentVoucher.voucherNumber}</strong></div>
                    <div className="text-right">Date: <strong>{printPaymentVoucher.date}</strong></div>
                    <div>Paid To (प्राप्तकर्ता): <strong>{recipientName}</strong></div>
                    <div className="text-right">Account Head: <strong>{getLedgerName(categoryId)}</strong></div>
                  </div>

                  <div className="py-2 text-[10px] leading-relaxed">
                    Paid a sum of <strong>₹{deb?.amount.toLocaleString()}</strong> (in words: <strong>{amountToWords(deb?.amount || 0)}</strong>) in favor of the recipient.
                    <p className="mt-2 font-semibold text-slate-600 italic">Note: {customNote}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-center text-[8px] font-bold text-slate-850 pt-6 border-t border-dashed border-slate-200">
                    <div className="space-y-6">
                      <div className="h-8 border-b border-dashed border-slate-300"></div>
                      <div>Receiver (प्राप्तकर्ता)</div>
                    </div>
                    <div className="space-y-6">
                      <div className="h-8 border-b border-dashed border-slate-300"></div>
                      <div>President (अध्यक्ष)</div>
                    </div>
                    <div className="space-y-6">
                      <div className="h-8 border-b border-dashed border-slate-300"></div>
                      <div>Secretary (सचिव)</div>
                    </div>
                    <div className="space-y-6">
                      <div className="h-8 border-b border-dashed border-slate-300"></div>
                      <div>Treasurer (कोषाध्यक्ष)</div>
                    </div>
                  </div>
                  <div className="text-center text-[9px] font-bold text-slate-500 mt-2 uppercase tracking-wider block">
                    For {config.samitiName}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button onClick={() => window.print()} className="px-5 py-2.5 bg-saffron-600 hover:bg-saffron-700 text-white font-bold rounded-xl flex items-center space-x-1">
                    <Printer className="w-4 h-4" />
                    <span>Print Slip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* HEADER PANEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm no-print">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center space-x-2">
            <span className="w-2.5 h-6 bg-forest-500 rounded-full inline-block"></span>
            <span>आवक व भुगतान (Receipts & Payments)</span>
          </h2>
          <p className="text-slate-500 text-xs dark:text-slate-400 mt-1">Record purchases (bhusa, chara), labor wages, donations, and verify double-entry rules</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Entry (नई प्रविष्टि)</span>
          </button>
        )}
      </div>

      {/* FORM: CREATE/EDIT */}
      {isCreating ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b">
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">
              {editingVoucher ? 'Edit Voucher Log (प्रविष्टि सुधारें)' : 'New Voucher Entry (नई प्रविष्टि)'}
            </h3>
            <button onClick={handleDiscard} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleCreateVoucher} className="space-y-6">
            
            {/* Metadata elements */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold text-slate-500">
              <div className="space-y-1">
                <label>Voucher Type (वाउचर प्रकार)</label>
                <select
                  value={vType}
                  onChange={(e) => {
                    setVType(e.target.value as VoucherType);
                    setSelectedParticular('');
                  }}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                >
                  <option value="PAYMENT">PAYMENT (भुगतान खर्च)</option>
                  <option value="RECEIPT">RECEIPT (आवक आय)</option>
                  <option value="CONTRA">CONTRA (बैंक-नकद अंतरण)</option>
                  <option value="JOURNAL">JOURNAL (एडजस्टमेंट बही)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label>Date (दिनांक)</label>
                <input
                  type="date"
                  required
                  value={vDate}
                  onChange={(e) => setVDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                />
              </div>

              <div className="space-y-1">
                <label>Cost Center (खर्च केंद्र)</label>
                <select
                  value={vCostCenter}
                  onChange={(e) => setVCostCenter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                >
                  <option value="cc-general">No Cost Center (General)</option>
                  {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label>Payment Mode (भुगतान मोड)</label>
                <select
                  value={selectedPaymentMode}
                  onChange={(e) => setSelectedPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal"
                >
                  {((config as any).paymentModes || ['CASH', 'BANK_UPI', 'BANK_TRANSFER', 'CHEQUE']).map((m: string) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub fields mode wise */}
            {selectedPaymentMode !== 'CASH' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-500 bg-slate-50/50 p-4 rounded-xl border">
                <div className="space-y-1">
                  <label>Transaction Reference ID / Cheque / UPI Code (संदर्भ संख्या/चेक/UPI)</label>
                  <input
                    type="text"
                    placeholder="e.g. Ref: 890123512 / CHQ082"
                    value={upiReference}
                    onChange={(e) => setUpiReference(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-white text-slate-900 font-normal"
                  />
                </div>
              </div>
            )}

            {/* DOUBLE ENTRY LEDGER ACCOUNTS CARD */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-bold text-slate-500">
              
              <div className="space-y-1.5">
                <label>
                  {vType === 'RECEIPT' && "पैसा किस मद से आया? (Source of Income)"}
                  {vType === 'PAYMENT' && "पैसा कहाँ खर्च हुआ? (Expense Account)"}
                  {vType === 'CONTRA' && "Transfer To (जमा खाता - Cash/Bank)"}
                  {vType === 'JOURNAL' && "Debit Account (Dr)"}
                </label>
                <select
                  value={selectedParticular}
                  required
                  onChange={(e) => setSelectedParticular(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100"
                >
                  <option value="">Choose Account Ledger</option>
                  {vType === 'PAYMENT' && expenseLedgers.map(l => (
                    <option key={l.id} value={l.id}>{l.name} [{l.code}]</option>
                  ))}
                  {vType === 'RECEIPT' && incomeLedgers.map(l => (
                    <option key={l.id} value={l.id}>{l.name} [{l.code}]</option>
                  ))}
                  {vType === 'CONTRA' && cashBankLedgers.map(l => (
                    <option key={l.id} value={l.id}>{l.name} [{l.code}]</option>
                  ))}
                  {vType === 'JOURNAL' && ledgers.map(l => (
                    <option key={l.id} value={l.id}>{l.name} [{l.code}]</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label>
                  {vType === 'RECEIPT' && "पैसा कहाँ आया? (Deposit To - Cash/Bank)"}
                  {vType === 'PAYMENT' && "पैसा कहाँ से गया? (Pay From - Cash/Bank)"}
                  {vType === 'CONTRA' && "Transfer From (निकासी खाता - Cash/Bank)"}
                  {vType === 'JOURNAL' && "Credit Account (Cr)"}
                </label>
                <select
                  value={selectedCashBank}
                  required
                  onChange={(e) => setSelectedCashBank(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100"
                >
                  <option value="">Choose Ledger Account</option>
                  {vType === 'JOURNAL' ? ledgers.map(l => (
                    <option key={l.id} value={l.id}>{l.name} [{l.code}]</option>
                  )) : cashBankLedgers.map(l => (
                    <option key={l.id} value={l.id}>{l.name} [{l.code}]</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label>Party Name (पक्षकार / व्यक्ति)</label>
                  <button type="button" onClick={handleAddNewContact} className="text-[10px] text-forest-650 hover:underline">+ Quick Add</button>
                </div>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-100"
                >
                  <option value="">Select contact (Optional)</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label>Transaction Amount (राशि - ₹)</label>
                <input
                  type="number"
                  required
                  placeholder="Amount in Rupees"
                  value={singleAmount || ''}
                  onChange={(e) => setSingleAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 text-sm font-bold"
                />
              </div>

              {/* CAMERA / GALLERY ATTACHMENT IMAGE LOADER */}
              <div className="space-y-1.5 md:col-span-2">
                <label>Attach Bill Receipt (बिल फोटो अपलोड करें - Max 150 KB)</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="flex-1 px-3 py-1.5 border rounded-xl bg-white text-slate-900 font-normal"
                  />
                  {billFile && (
                    <div className="relative group cursor-pointer" onClick={() => setLightboxImage(billFile)}>
                      <img src={billFile} alt="Receipt Thumbnail" className="w-12 h-12 object-cover rounded-xl border group-hover:opacity-75 transition" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBillFile('');
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Narration */}
            <div className="space-y-1 text-xs font-bold text-slate-500">
              <label>Narration / General Particulars (विवरण / टिप्पणी)</label>
              <textarea
                required
                rows={2}
                value={vNarration}
                onChange={(e) => setVNarration(e.target.value)}
                placeholder="Describe transaction context clearly..."
                className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-slate-100 font-normal"
              />
            </div>

            <div className="flex justify-end space-x-2.5 pt-4 border-t">
              <button type="button" onClick={handleDiscard} className="px-4 py-2 border rounded-xl font-bold text-xs text-slate-500">Discard</button>
              <button type="submit" className="px-6 py-2 bg-forest-600 hover:bg-forest-750 text-white font-bold text-xs rounded-xl shadow-lg">
                {editingVoucher ? 'Save Changes' : 'Post Voucher'}
              </button>
            </div>
          </form>

          {/* Quick Contact creator modal */}
          {showQuickContact && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-40">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border shadow-xl max-w-md w-full space-y-4 text-xs font-bold text-slate-500">
                <h3 className="text-slate-800 dark:text-white text-sm">Add New Contact Party</h3>
                <form onSubmit={handleSaveQuickContact} className="space-y-3">
                  <div className="space-y-1">
                    <label>Full Name (नाम)</label>
                    <input type="text" required value={quickContactName} onChange={(e) => setQuickContactName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-slate-900 font-normal" />
                  </div>
                  <div className="space-y-1">
                    <label>Phone Number</label>
                    <input type="text" value={quickContactPhone} onChange={(e) => setQuickContactPhone(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-slate-900 font-normal" />
                  </div>
                  <div className="space-y-1">
                    <label>Postal Address</label>
                    <input type="text" value={quickContactAddress} onChange={(e) => setQuickContactAddress(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-slate-900 font-normal" />
                  </div>
                  <div className="space-y-1">
                    <label>Contact Type</label>
                    <select value={quickContactType} onChange={(e) => setQuickContactType(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-slate-850">
                      <option value="VENDOR">Vendor (विक्रेता/आपूर्तिकर्ता)</option>
                      <option value="VOLUNTEER">Employee (कर्मचारी/मजदूर)</option>
                      <option value="DONOR">Donor (दानदाता)</option>
                      <option value="CUSTOMER">Customer (ग्राहक/दूध खरीदार)</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2 pt-3">
                    <button type="button" onClick={() => setShowQuickContact(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-forest-600 text-white rounded-xl">Save Contact</button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      ) : (
        
        // TRANSACTION BOOK TABLE REGISTRY
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4 no-print animate-in fade-in duration-200">
          
          <div className="flex flex-col space-y-4 pb-4 border-b">
            
            {/* Upper filtering bar */}
            <div className="flex flex-wrap items-center gap-3">
              
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Search Text (खोज)</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search amount, remarks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-xs font-semibold w-56"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Particular Category (मद)</label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="">All Categories (सभी श्रेणियां)</option>
                  <optgroup label="Expenses">
                    {expenseLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </optgroup>
                  <optgroup label="Incomes">
                    {incomeLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Ledger (खाता)</label>
                <select
                  value={selectedLedgerFilter}
                  onChange={(e) => setSelectedLedgerFilter(e.target.value)}
                  className="px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="">All Ledgers (सभी खाते)</option>
                  {ledgers.map(l => <option key={l.id} value={l.id}>{l.name} [{l.code}]</option>)}
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Cost Center (खर्च केंद्र)</label>
                <select
                  value={selectedCcFilter}
                  onChange={(e) => setSelectedCcFilter(e.target.value)}
                  className="px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="">All Divisions</option>
                  {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Pay Mode (भुगतान मोड)</label>
                <select
                  value={selectedModeFilter}
                  onChange={(e) => setSelectedModeFilter(e.target.value)}
                  className="px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="">All Modes</option>
                  <option value="CASH">CASH Only</option>
                  <option value="BANK_UPI">UPI Only</option>
                  <option value="BANK_TRANSFER">Bank NetBanking</option>
                  <option value="CHEQUE">Cheque Only</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Date Range (समयावधि)</label>
                <select
                  value={dateFilterRange}
                  onChange={(e) => setDateFilterRange(e.target.value as any)}
                  className="px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Past Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

            </div>

            {/* Custom Dates Picker block */}
            {dateFilterRange === 'custom' && (
              <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border max-w-md text-xs font-bold text-slate-500 animate-in slide-in-from-top-1 duration-150">
                <div className="space-y-1">
                  <label>Start Date</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-2.5 py-1 border rounded-lg" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 mt-4" />
                <div className="space-y-1">
                  <label>End Date</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-2.5 py-1 border rounded-lg" />
                </div>
              </div>
            )}

          </div>

          {/* Vouchers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-750 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-3">Voucher #</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Cost Center</th>
                  <th className="pb-3">Particular Account</th>
                  <th className="pb-3">Contra Account</th>
                  <th className="pb-3">Particulars / Narration</th>
                  <th className="pb-3 text-right">Amount (₹)</th>
                  <th className="pb-3 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-350">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400 italic">No vouchers found matching selected query criteria.</td>
                  </tr>
                ) : filteredVouchers.map(v => {
                  const debEntry = v.entries.find(e => e.isDebit);
                  const credEntry = v.entries.find(e => !e.isDebit);
                  const debLedgerId = debEntry?.ledgerId || '';
                  const credLedgerId = credEntry?.ledgerId || '';
                  const debitsSum = debEntry?.amount || 0;

                  let partText = '';
                  let cashBankText = '';

                  if (v.voucherType === 'PAYMENT') {
                    partText = getLedgerName(debLedgerId);
                    cashBankText = getLedgerName(credLedgerId);
                  } else if (v.voucherType === 'RECEIPT') {
                    partText = getLedgerName(credLedgerId);
                    cashBankText = getLedgerName(debLedgerId);
                  } else {
                    partText = getLedgerName(debLedgerId);
                    cashBankText = getLedgerName(credLedgerId);
                  }

                  const imageAttach = v.attachments && v.attachments.length > 0 ? v.attachments[0] : null;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-4 pl-3 font-bold text-slate-850 dark:text-slate-200">{v.voucherNumber}</td>
                      <td className="py-4">{v.date}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider ${
                          v.voucherType === 'RECEIPT' ? 'bg-forest-550/10 text-forest-650' :
                          v.voucherType === 'PAYMENT' ? 'bg-saffron-550/10 text-saffron-650' :
                          'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650'
                        }`}>
                          {v.voucherType}
                        </span>
                      </td>
                      <td className="py-4 font-semibold text-slate-400">{getCostCenterName(v.costCenterId)}</td>
                      <td className="py-4 font-bold text-slate-800 dark:text-slate-200">{partText}</td>
                      <td className="py-4 font-semibold text-slate-450">{cashBankText}</td>
                      <td className="py-4 max-w-[200px]" title={v.narration}>
                        <div className="flex items-center space-x-1.5">
                          {imageAttach && (
                            <button
                              type="button"
                              onClick={() => setLightboxImage(imageAttach)}
                              className="p-1 text-slate-400 hover:text-forest-600 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100"
                              title="View receipt bill image"
                            >
                              <Image className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="truncate">{v.narration}</span>
                        </div>
                      </td>
                      <td className="py-4 font-extrabold text-slate-850 dark:text-white">₹{debitsSum.toLocaleString()}</td>
                      <td className="py-4 text-right pr-3 space-x-1.5">
                        <button
                          onClick={() => setSelectedVoucher(v)}
                          className="px-2 py-1 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 hover:text-forest-600 text-slate-500 dark:text-slate-200 rounded font-bold text-[10px] border border-slate-100 dark:border-slate-700"
                        >
                          View
                        </button>
                        {v.voucherType === 'RECEIPT' && (
                          <button
                            onClick={() => triggerPrintReceipt(v)}
                            className="px-2 py-1 bg-forest-50 hover:bg-forest-100 text-forest-750 rounded font-bold text-[10px] border border-forest-100"
                          >
                            Receipt
                          </button>
                        )}
                        {v.voucherType === 'PAYMENT' && (
                          <button
                            onClick={() => triggerPrintPaymentSlip(v)}
                            className="px-2 py-1 bg-saffron-50 hover:bg-saffron-100 text-saffron-750 rounded font-bold text-[10px] border border-saffron-100"
                          >
                            Print Slip
                          </button>
                        )}
                        <button
                          onClick={() => handleEditVoucher(v)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded font-bold text-[10px]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVoucher(v.id)}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-550 rounded font-bold text-[10px]"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900/60 font-black border-t-2 border-slate-200 dark:border-slate-700 text-slate-850 dark:text-white text-xs">
                  <td colSpan={7} className="py-4 pl-3 text-right font-extrabold uppercase">Filtered Total Amount (कुल जोड़):</td>
                  <td className="py-4 font-black text-forest-650 dark:text-forest-400">
                    ₹{filteredVouchers.reduce((sum, v) => sum + (v.entries.find(e => e.isDebit)?.amount || 0), 0).toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}

      {/* VIEW DETAILS VOUCHER POPUP */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-250">
            <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-850 dark:text-white text-xs">Voucher details: {selectedVoucher.voucherNumber}</h3>
              <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 hover:text-slate-655 font-bold"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-slate-400">Date:</span> <strong>{selectedVoucher.date}</strong></div>
                <div><span className="text-slate-400">Voucher Type:</span> <strong className="text-indigo-650">{selectedVoucher.voucherType}</strong></div>
                <div><span className="text-slate-400">Cost Center:</span> <strong>{getCostCenterName(selectedVoucher.costCenterId)}</strong></div>
                <div><span className="text-slate-400">Status:</span> <strong className="text-forest-650">{selectedVoucher.status}</strong></div>
                {selectedVoucher.paymentMode && <div><span className="text-slate-400">Payment Mode:</span> <strong>{selectedVoucher.paymentMode}</strong></div>}
                {selectedVoucher.referenceDetails && <div className="col-span-2"><span className="text-slate-400">Reference Logs:</span> <strong>{selectedVoucher.referenceDetails}</strong></div>}
              </div>
              <div className="space-y-2 pt-2 border-t">
                <span className="text-slate-400 font-bold block">Ledger Postings:</span>
                {selectedVoucher.entries.map((ent, i) => (
                  <div key={i} className="flex justify-between py-1 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl">
                    <span>{getLedgerName(ent.ledgerId)}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ₹{ent.amount.toLocaleString()} ({ent.isDebit ? 'Dr' : 'Cr'})
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t"><span className="text-slate-400 font-bold">Narration:</span> <p className="italic mt-1">{selectedVoucher.narration}</p></div>
              
              {/* Attachment Preview in details popup */}
              {selectedVoucher.attachments && selectedVoucher.attachments.length > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <span className="text-slate-400 font-bold block">Attached Bill Receipt Photo:</span>
                  <div className="relative border rounded-xl overflow-hidden max-w-[200px] cursor-zoom-in" onClick={() => setLightboxImage(selectedVoucher.attachments[0])}>
                    <img src={selectedVoucher.attachments[0]} alt="Bill Receipt Preview" className="max-w-full h-auto object-contain max-h-32" />
                    <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification overlay modal */}
      {pinPromptAction && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border shadow-xl max-w-sm w-full space-y-4">
            <h3 className="text-slate-850 dark:text-white font-bold text-sm text-center">Security PIN Required</h3>
            <p className="text-slate-500 text-xs text-center">Enter your 4-digit PIN to authenticate this operation.</p>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center tracking-[1em] text-xl font-bold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
            {pinError && <p className="text-red-500 text-xs text-center font-bold">Incorrect Security PIN! Try again.</p>}
            <div className="flex space-x-2">
              <button type="button" onClick={() => setPinPromptAction(null)} className="flex-1 py-2 border rounded-xl text-xs font-bold">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const currentPin = localStorage.getItem('goshala_erp_app_pin') || '1234';
                  if (pinInput === currentPin) {
                    const actionToExec = pinPromptAction;
                    setPinPromptAction(null);
                    actionToExec();
                  } else {
                    setPinError(true);
                  }
                }}
                className="flex-1 py-2 bg-red-650 text-white rounded-xl text-xs font-bold"
              >
                Verify & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
