import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { ERPConfig, Ledger, CostCenter, LedgerGroup, Voucher, CRMContact } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Save, Download, UploadCloud, RotateCcw, Check, Trash, Plus, Edit3, UserCheck, Search, Folder, FolderOpen, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

interface SamitiMember {
  id: string;
  designation: string;
  name: string;
  phone: string;
  address: string;
  aadhar: string;
  pan: string;
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [showDangerZone, setShowDangerZone] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'org' | 'acct_prefs' | 'tax' | 'bank' | 'print' | 'ledgers' | 'cost_centers' | 'fys' | 'pay_modes' | 'security' | 'danger_zone' | 'members' | 'parties'>('org');

  // PIN states
  const [currentPinText, setCurrentPinText] = useState('');
  const [newPinText, setNewPinText] = useState('');
  const [pinPromptAction, setPinPromptAction] = useState<(() => void) | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Custom Payment Modes state
  const [paymentModes, setPaymentModes] = useState<string[]>([]);
  const [newPayMode, setNewPayMode] = useState('');
  const [editingPayModeIdx, setEditingPayModeIdx] = useState<number | null>(null);
  const [editPayModeValue, setEditPayModeValue] = useState('');


  // Samiti Members state
  const [members, setMembers] = useState<SamitiMember[]>([]);
  const [editingMember, setEditingMember] = useState<SamitiMember | null>(null);
  const [mDesignation, setMDesignation] = useState('');
  const [mName, setMName] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mAddress, setMAddress] = useState('');
  const [mAadhar, setMAadhar] = useState('');
  const [mPan, setMPan] = useState('');

  // Parties / CRM Contacts state
  const [parties, setParties] = useState<CRMContact[]>([]);
  const [editingParty, setEditingParty] = useState<CRMContact | null>(null);
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState<'DONOR' | 'CUSTOMER' | 'VENDOR' | 'VOLUNTEER'>('DONOR');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [partyPan, setPartyPan] = useState('');
  const [partyAadhar, setPartyAadhar] = useState('');
  const [partySearch, setPartySearch] = useState('');

  // Financial Years state
  const [fys, setFys] = useState<any[]>([]);
  const [newFyName, setNewFyName] = useState('');
  const [isOpLocked, setIsOpLocked] = useState(() => localStorage.getItem('goshala_erp_op_locked') !== 'false');

  const [config, setConfig] = useState<ERPConfig>({
    activeFyId: 'fy-2025-26',
    voucherNumberFormat: 'V-{TYPE}-{NUM}',
    receiptFormat: 'R-{NUM}',
    taxRate: 5,
    letterheadText: 'Shree Krishna Gaushala Samiti\nRegd. No. 410/2012, Sector 5, Town Area\n12A & 80G Certified Non-Profit Organization'
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Bank Balances states
  const [ledgersList, setLedgersList] = useState<Ledger[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    ASSET: true,
    LIABILITY: true,
    INCOME: true,
    EXPENSE: true,
    CAPITAL: true
  });
  const [bankBalances, setBankBalances] = useState<Record<string, number>>({});
  const [newBankName, setNewBankName] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [newBankOpenBalance, setNewBankOpenBalance] = useState(0);

  // Cost Center manager states
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [newCcName, setNewCcName] = useState('');
  const [newCcBudget, setNewCcBudget] = useState(0);
  const [editingCc, setEditingCc] = useState<CostCenter | null>(null);

  // Ledger manager states
  const [groups, setGroups] = useState<LedgerGroup[]>([]);
  const [newLName, setNewLName] = useState('');
  const [newLCode, setNewLCode] = useState('');
  const [newLGroup, setNewLGroup] = useState('g-expense');
  const [newLType, setNewLType] = useState<'EXPENSE' | 'INCOME' | 'ASSET' | 'LIABILITY'>('EXPENSE');
  const [newLOpenBal, setNewLOpenBal] = useState(0);
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load config
    const table = GoshalaDB.getTable<ERPConfig>('config');
    if (table.length > 0) {
      setConfig({
        // Fill fallbacks to prevent undefined values
        enable12A: true,
        enable80G: true,
        enableGST: true,
        enableTDS: true,
        enableDonationReceipt: true,
        samitiName: 'Shree Krishna Balram Goushala',
        address: 'Chakrod, Shajapur (M.P.)',
        village: 'Chakrod',
        district: 'Shajapur',
        state: 'Madhya Pradesh',
        pinCode: '465220',
        mobileNumber: '9876543210',
        alternateMobile: '',
        email: 'goushala.chakrod@gmail.com',
        website: 'www.shreekrishnagaushala.org',
        registrationNo: '410/2012',
        panNo: 'ABCDE1234F',
        gstNo: '23ABCDE1234F1Z5',
        rtcDetails: 'Khasra No. 104, 105',
        currency: 'INR',
        decimalPlaces: 2,
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        printHeader: 'SHREE KRISHNA BALRAM GOUSHALA\nChakrod, Shajapur (M.P.)',
        printFooter: 'Thank you for your generous support of Goshala welfare.',
        authorizedSignatory: 'Authorized Signatory',
        sealPosition: 'left',
        receiptPrefix: 'R',
        voucherPrefix: 'V',
        fontSize: 12,
        paperSize: 'A4',
        receiptTemplates: {
          'l-exp-majduri': 'Received payment for Goshala labor and supervisor wages.',
          'l-exp-chara': 'Received payment for cattle feed (Chara/Bhusa) supplier delivery.',
          'l-exp-elect': 'Received payment for electricity utility consumption.',
          'l-exp-marammat': 'Received payment for Goshala infrastructure maintenance and repairs.',
          'l-exp-transport': 'Received payment for cattle transportation and fuel logs.',
          'l-exp-bank-charges': 'Deducted directly for bank account servicing fees.',
          'default': 'Received cash/bank payment for Goshala expenses.'
        },
        ...table[0]
      });
    }

    // Load Cost Centers
    setCostCenters(GoshalaDB.getTable<CostCenter>('cost_centers'));

    // Load Ledgers
    const allLedgers = GoshalaDB.getTable<Ledger>('ledgers');
    setLedgersList(allLedgers);
    setGroups(GoshalaDB.getTable<LedgerGroup>('groups'));

    const cashBank = allLedgers.filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable');
    const bals: Record<string, number> = {};
    cashBank.forEach(l => {
      bals[l.id] = l.openingBalance || 0;
    });
    setBankBalances(bals);

    setFys(GoshalaDB.getTable<any>('fys'));
    setMembers(GoshalaDB.getTable<SamitiMember>('samiti_members'));
    setParties(GoshalaDB.getTable<CRMContact>('contacts'));
    const modes = table[0]?.paymentModes || ['CASH', 'BANK_UPI', 'BANK_TRANSFER', 'CHEQUE'];
    setPaymentModes(modes);
    setMembers(GoshalaDB.getTable<SamitiMember>('samiti_members'));
  };

  const handleTabClick = (tab: any) => {
    if (tab === 'danger_zone') {
      requirePin(() => setActiveTab('danger_zone'));
    } else {
      setActiveTab(tab);
    }
  };

  // PIN Verification Action helper
  const requirePin = (action: () => void) => {
    setPinPromptAction(() => action);
    setPinInput('');
    setPinError(false);
  };

  const handleSavePin = () => {
    const correctPin = GoshalaDB.getAppPin();
    if (currentPinText !== correctPin) {
      alert('Current PIN is incorrect!');
      return;
    }
    if (newPinText.length !== 4 || isNaN(Number(newPinText))) {
      alert('New PIN must be exactly 4 digits!');
      return;
    }
    GoshalaDB.setAppPin(newPinText);
    alert('Security PIN updated successfully and synced to all devices!');
    setCurrentPinText('');
    setNewPinText('');
  };

  // Payment Modes Handlers
  const handleAddPayMode = () => {
    if (!newPayMode) return;
    const updated = [...paymentModes, newPayMode.toUpperCase()];
    setPaymentModes(updated);
    setNewPayMode('');
    const dbConfig = GoshalaDB.getTable<ERPConfig>('config')[0] || {};
    GoshalaDB.saveTable('config', [{ ...dbConfig, paymentModes: updated }]);
    GoshalaDB.logAction(user.name, user.role, 'ADD_PAYMENT_MODE', `Added payment mode: ${newPayMode}`);
  };

  const handleDeletePayMode = (idx: number) => {
    requirePin(() => {
      const modeToDelete = paymentModes[idx];
      const updated = paymentModes.filter((_, i) => i !== idx);
      setPaymentModes(updated);
      const dbConfig = GoshalaDB.getTable<ERPConfig>('config')[0] || {};
      GoshalaDB.saveTable('config', [{ ...dbConfig, paymentModes: updated }]);
      GoshalaDB.logAction(user.name, user.role, 'DELETE_PAYMENT_MODE', `Deleted payment mode: ${modeToDelete}`);
      alert('Payment mode deleted successfully!');
    });
  };

  const handleStartEditPayMode = (idx: number) => {
    setEditingPayModeIdx(idx);
    setEditPayModeValue(paymentModes[idx]);
  };

  const handleSaveEditPayMode = (idx: number) => {
    if (!editPayModeValue) return;
    const updated = [...paymentModes];
    updated[idx] = editPayModeValue.toUpperCase();
    setPaymentModes(updated);
    setEditingPayModeIdx(null);
    const dbConfig = GoshalaDB.getTable<ERPConfig>('config')[0] || {};
    GoshalaDB.saveTable('config', [{ ...dbConfig, paymentModes: updated }]);
    GoshalaDB.logAction(user.name, user.role, 'EDIT_PAYMENT_MODE', `Edited payment mode to: ${editPayModeValue}`);
  };

  // Samiti Members Handlers
  const resetMemberForm = () => {
    setMDesignation(''); setMName(''); setMPhone('');
    setMAddress(''); setMAadhar(''); setMPan('');
    setEditingMember(null);
  };

  const handleSaveMember = () => {
    if (!mName || !mDesignation) { alert('Name and Designation are required!'); return; }
    const all = GoshalaDB.getTable<SamitiMember>('samiti_members');
    if (editingMember) {
      const updated = all.map(m => m.id === editingMember.id
        ? { ...m, designation: mDesignation, name: mName, phone: mPhone, address: mAddress, aadhar: mAadhar, pan: mPan }
        : m);
      GoshalaDB.saveTable('samiti_members', updated);
    } else {
      const newM: SamitiMember = {
        id: `m-${Date.now()}`, designation: mDesignation, name: mName,
        phone: mPhone, address: mAddress, aadhar: mAadhar, pan: mPan
      };
      GoshalaDB.saveTable('samiti_members', [...all, newM]);
    }
    setMembers(GoshalaDB.getTable<SamitiMember>('samiti_members'));
    resetMemberForm();
    alert(editingMember ? 'Member updated!' : 'Member added!');
  };

  const handleEditMember = (m: SamitiMember) => {
    setEditingMember(m);
    setMDesignation(m.designation); setMName(m.name); setMPhone(m.phone);
    setMAddress(m.address); setMAadhar(m.aadhar); setMPan(m.pan);
    setActiveTab('members');
  };

  const handleDeleteMember = (id: string) => {
    requirePin(() => {
      const updated = GoshalaDB.getTable<SamitiMember>('samiti_members').filter(m => m.id !== id);
      GoshalaDB.saveTable('samiti_members', updated);
      setMembers(updated);
      alert('Member deleted!');
    });
  };

  // Parties Handlers
  const resetPartyForm = () => {
    setEditingParty(null);
    setPartyName(''); setPartyType('DONOR'); setPartyPhone('');
    setPartyAddress(''); setPartyPan(''); setPartyAadhar('');
  };

  const handleSaveParty = () => {
    if (!partyName) { alert('Party Name (पक्षकार नाम) is required!'); return; }
    const all = GoshalaDB.getTable<CRMContact>('contacts');
    if (editingParty) {
      const updated = all.map(p => p.id === editingParty.id
        ? { ...p, name: partyName, type: partyType, phone: partyPhone, address: partyAddress, pan: partyPan, aadhar: partyAadhar }
        : p);
      GoshalaDB.saveTable('contacts', updated);
    } else {
      const newP: CRMContact = {
        id: `c-${Date.now()}`,
        name: partyName,
        type: partyType,
        phone: partyPhone,
        address: partyAddress,
        pan: partyPan,
        aadhar: partyAadhar,
        outstandingBalance: 0,
        communicationHistory: []
      };
      GoshalaDB.saveTable('contacts', [...all, newP]);
    }
    setParties(GoshalaDB.getTable<CRMContact>('contacts'));
    resetPartyForm();
    alert(editingParty ? 'Party updated successfully!' : 'Party created successfully!');
  };

  const handleEditParty = (p: CRMContact) => {
    setEditingParty(p);
    setPartyName(p.name);
    setPartyType(p.type || 'DONOR');
    setPartyPhone(p.phone || '');
    setPartyAddress(p.address || '');
    setPartyPan(p.pan || '');
    setPartyAadhar(p.aadhar || '');
    setActiveTab('parties');
  };

  const handleDeleteParty = (id: string) => {
    requirePin(() => {
      const updated = GoshalaDB.getTable<CRMContact>('contacts').filter(p => p.id !== id);
      GoshalaDB.saveTable('contacts', updated);
      setParties(updated);
      alert('Party deleted successfully!');
    });
  };

  // Financial Years Handlers
  const handleAddFy = () => {
    if (!newFyName) return;
    if (!newFyName.match(/^\d{4}-\d{2,4}$/)) {
      alert('कृपया सही वित्तीय वर्ष नाम लिखें, उदाहरण: 2026-27');
      return;
    }
    const yearParts = newFyName.split('-');
    const startYr = parseInt(yearParts[0]);
    let endYrVal = parseInt(yearParts[1]);
    if (endYrVal < 100) endYrVal += 2000;
    const newFyId = `fy-${newFyName}`;
    const allFys = GoshalaDB.getTable<any>('fys');
    if (allFys.some(f => f.id === newFyId)) {
      alert('यह वित्तीय वर्ष पहले से मौजूद है!');
      return;
    }

    const startDate = `${startYr}-04-01`;
    const endDate = `${endYrVal}-03-31`;

    allFys.push({
      id: newFyId,
      name: newFyName,
      startDate,
      endDate,
      status: 'ACTIVE'
    });
    GoshalaDB.saveTable('fys', allFys);
    setFys(allFys);
    setNewFyName('');

    // Recalculate ledgers so closing balances of previous FY become opening balances of new FY
    GoshalaDB.recalculateLedgers();
    GoshalaDB.logAction(user.name, user.role, 'CREATE_FY', `Created new financial year: ${newFyName}`);
    alert(`✅ नया वित्तीय वर्ष (${newFyName}) सफलतापूर्वक जोड़ दिया गया है! इसमें पिछले वर्ष का क्लोजिंग बैलेंस ओपनिंग बैलेंस के रूप में आ गया है और कोई पुरानी प्रविष्टि (Vouchers) कॉपी नहीं हुई है।`);
  };

  const handleToggleFyStatus = (fyId: string, currentStatus: string) => {
    requirePin(() => {
      const allFys = GoshalaDB.getTable<any>('fys');
      const target = allFys.find(f => f.id === fyId);
      if (!target) return;

      const todayStr = new Date().toISOString().split('T')[0];

      // Block closing/deactivating current running FY before March 31st
      if (currentStatus === 'ACTIVE' && todayStr < target.endDate && todayStr >= target.startDate) {
        alert(`❌ क्लोज़ त्रुटि: चल रहे सक्रिय वित्तीय वर्ष (${target.name}) को 31 मार्च (${target.endDate}) के पहले क्लोज़ या डीएक्टिवेट नहीं किया जा सकता है!`);
        return;
      }

      const newStatus = currentStatus === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
      target.status = newStatus;
      GoshalaDB.saveTable('fys', allFys);
      setFys(allFys);
      GoshalaDB.logAction(user.name, user.role, 'TOGGLE_FY_STATUS', `Toggled Financial Year ${target.name} status to ${newStatus}`);
      alert(`वित्तीय वर्ष स्थिति सफलतापूर्वक बदलकर ${newStatus} कर दी गई है!`);
    });
  };

  const handleDeleteFy = (fyId: string) => {
    requirePin(() => {
      const allFys = GoshalaDB.getTable<any>('fys');
      const target = allFys.find(f => f.id === fyId);
      if (!target) return;

      const confirmMsg = `⚠️ चेतावनी: क्या आप निश्चित हैं कि आप वित्तीय वर्ष ${target.name} को हटाना चाहते हैं?\n\nध्यान दें: डिलीट करने पर केवल वित्तीय वर्ष ${target.name} (${target.startDate} से ${target.endDate}) की प्रविष्टियां (Vouchers) हटाई जाएंगी, अन्य किसी वित्तीय वर्ष की प्रविष्टि पर कोई प्रभाव नहीं पड़ेगा।`;

      if (!window.confirm(confirmMsg)) return;

      // Delete only vouchers belonging to this specific FY
      const allVouchers = GoshalaDB.getTable<Voucher>('vouchers');
      const remainingVouchers = allVouchers.filter(v => v.fyId !== fyId && (v.date < target.startDate || v.date > target.endDate));
      GoshalaDB.saveTable('vouchers', remainingVouchers);

      // Remove FY from fys table
      const remainingFys = allFys.filter(f => f.id !== fyId);
      GoshalaDB.saveTable('fys', remainingFys);

      // If currently active FY was deleted, switch active FY to first available
      const activeFyId = GoshalaDB.getActiveFyId();
      if (activeFyId === fyId) {
        const nextActive = remainingFys[0]?.id || 'fy-2025-26';
        GoshalaDB.setActiveFyId(nextActive);
      }

      GoshalaDB.recalculateLedgers();
      setFys(remainingFys);
      GoshalaDB.logAction(user.name, user.role, 'DELETE_FY', `Deleted financial year ${target.name} and its vouchers`);
      alert(`✅ वित्तीय वर्ष ${target.name} और उसकी सभी प्रविष्टियां सफलतापूर्वक हटा दी गई हैं!`);
      loadData();
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    GoshalaDB.saveTable('config', [config]);
    setSavedSuccess(true);
    GoshalaDB.logAction(user.name, user.role, 'SAVE_SETTINGS', `Updated ERP configuration rules`);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Bank Balances handlers
  const handleToggleOpLock = () => {
    requirePin(() => {
      const nextState = !isOpLocked;
      setIsOpLocked(nextState);
      localStorage.setItem('goshala_erp_op_locked', String(nextState));
      alert(nextState 
        ? '🔒 प्रारंभिक शेष (Opening Balances) सफलतापूर्वक लॉक कर दिए गए हैं! अब इसमें कोई बदलाव नहीं किया जा सकता।'
        : '🔓 प्रारंभिक शेष (Opening Balances) अनलॉक हो गए हैं! अब आप आवश्यकतानुसार बदलाव कर सकते हैं।'
      );
    });
  };

  const handleSaveBankBalances = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOpLocked) {
      alert('❌ लॉक त्रुटि: प्रारंभिक बैंक और नकद शेष वर्तमान में सुरक्षित लॉक हैं! कोई भी बदलाव करने के लिए पहले सेटिंग्स में जाकर अनलॉक करें।');
      return;
    }
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    Object.entries(bankBalances).forEach(([ledgerId, val]) => {
      const ledger = ledgers.find(l => l.id === ledgerId);
      if (ledger) {
        ledger.openingBalance = Number(val);
      }
    });
    GoshalaDB.saveTable('ledgers', ledgers);
    GoshalaDB.recalculateLedgers();
    alert('प्रारंभिक बैंक और नकद शेष सफलतापूर्वक अपडेट कर दिए गए हैं!');
    loadData();
  };

  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOpLocked) {
      alert('❌ लॉक त्रुटि: प्रारंभिक बैंक और नकद शेष वर्तमान में सुरक्षित लॉक हैं! नया बैंक खाता जोड़ने के लिए पहले अनलॉक करें।');
      return;
    }
    if (!newBankName || !newBankCode) return alert('Name and Code are required');
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    if (ledgers.some(l => l.code === newBankCode)) {
      return alert(`Account Code ${newBankCode} already exists! Choose another code.`);
    }

    const newLedgerId = `l-bank-${Date.now()}`;
    const newLedger: Ledger = {
      id: newLedgerId,
      groupId: 'g-current-assets',
      name: newBankName,
      code: newBankCode,
      type: 'ASSET',
      openingBalance: Number(newBankOpenBalance),
      currentBalance: Number(newBankOpenBalance)
    };
    ledgers.push(newLedger);
    GoshalaDB.saveTable('ledgers', ledgers);

    const bankAccounts = GoshalaDB.getTable<any>('bank_accounts');
    bankAccounts.push({
      id: `ba-${Date.now()}`,
      bankName: newBankName,
      accountNumber: newBankCode,
      ifscCode: '—',
      branchName: '—',
      openingBalance: Number(newBankOpenBalance),
      currentBalance: Number(newBankOpenBalance)
    });
    GoshalaDB.saveTable('bank_accounts', bankAccounts);

    GoshalaDB.recalculateLedgers();
    setNewBankName('');
    setNewBankCode('');
    setNewBankOpenBalance(0);
    alert(`Bank Account "${newBankName}" added successfully!`);
    loadData();
  };

  const handleDeleteBankAccount = (ledgerId: string) => {
    if (!window.confirm('क्या आप सचमुच इस बैंक खाते को हटाना चाहते हैं?')) return;
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const filteredLedgers = ledgers.filter(l => l.id !== ledgerId);
    GoshalaDB.saveTable('ledgers', filteredLedgers);

    const ledger = ledgers.find(l => l.id === ledgerId);
    if (ledger) {
      const bankAccounts = GoshalaDB.getTable<any>('bank_accounts');
      const filteredBanks = bankAccounts.filter((b: any) => b.bankName !== ledger.name);
      GoshalaDB.saveTable('bank_accounts', filteredBanks);
    }
    GoshalaDB.recalculateLedgers();
    alert('Bank Account removed successfully!');
    loadData();
  };

  // Cost Center handlers
  const handleAddCc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCcName) return;
    const ccList = GoshalaDB.getTable<CostCenter>('cost_centers');
    const newCc: CostCenter = {
      id: `cc-${Date.now()}`,
      name: newCcName,
      allocatedBudget: Number(newCcBudget),
      spentAmount: 0
    };
    ccList.push(newCc);
    GoshalaDB.saveTable('cost_centers', ccList);
    setNewCcName('');
    setNewCcBudget(0);
    alert('Cost Center added successfully!');
    loadData();
  };

  const handleUpdateCc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCc) return;
    const ccList = GoshalaDB.getTable<CostCenter>('cost_centers');
    const index = ccList.findIndex(c => c.id === editingCc.id);
    if (index !== -1) {
      ccList[index] = editingCc;
      GoshalaDB.saveTable('cost_centers', ccList);
      setEditingCc(null);
      alert('Cost Center updated successfully!');
      loadData();
    }
  };

  const handleDeleteCc = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Cost Center?')) return;
    const ccList = GoshalaDB.getTable<CostCenter>('cost_centers');
    const filtered = ccList.filter(c => c.id !== id);
    GoshalaDB.saveTable('cost_centers', filtered);
    loadData();
  };

  // Ledger COA handlers
  const handleAddLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLName || !newLCode) return;
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    if (ledgers.some(l => l.code === newLCode)) {
      return alert('Ledger code already exists!');
    }
    const newLedger: Ledger = {
      id: `l-custom-${Date.now()}`,
      groupId: newLGroup,
      name: newLName,
      code: newLCode,
      type: newLType,
      openingBalance: Number(newLOpenBal),
      currentBalance: Number(newLOpenBal)
    };
    ledgers.push(newLedger);
    GoshalaDB.saveTable('ledgers', ledgers);
    GoshalaDB.recalculateLedgers();
    setNewLName('');
    setNewLCode('');
    setNewLOpenBal(0);
    alert('Custom ledger account added successfully!');
    loadData();
  };

  const handleUpdateLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLedger) return;
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const index = ledgers.findIndex(l => l.id === editingLedger.id);
    if (index !== -1) {
      ledgers[index] = editingLedger;
      GoshalaDB.saveTable('ledgers', ledgers);
      GoshalaDB.recalculateLedgers();
      setEditingLedger(null);
      alert('Ledger updated successfully!');
      loadData();
    }
  };

  const handleDeleteLedger = (id: string) => {
    // Prevent delete if ledger is used in vouchers
    const vouchers = GoshalaDB.getTable<Voucher>('vouchers');
    const isUsed = vouchers.some(v => v.entries.some(e => e.ledgerId === id));
    if (isUsed) {
      return alert('This ledger has active transaction entries and cannot be deleted. Wipe transactions first.');
    }

    if (!window.confirm('Are you sure you want to delete this ledger account?')) return;
    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const filtered = ledgers.filter(l => l.id !== id);
    GoshalaDB.saveTable('ledgers', filtered);
    GoshalaDB.recalculateLedgers();
    loadData();
  };

  // Reset & Clear data triggers
  const handleResetDatabase = () => {
    if (!window.confirm('⚠️ WARNING: This will DELETE all your manually entered vouchers, test entries, and reset to baseline historical CA data. Your Security PIN will also be WIPED to fix the default PIN issue (you will be asked to create a new one on reload).\n\nProceed?')) return;
    GoshalaDB.hardResetToBaseline();
    alert('✅ Database reset to baseline CA data! All test/QA entries and Security PIN have been removed. Reloading...');
    window.location.reload();
  };

  const handleClearAllTransactions = () => {
    if (!window.confirm('चेतावनी: इससे आपकी सभी प्रविष्टियां (Vouchers), उधारी (Loans), सभी प्रारंभिक अचल संपत्तियां (Default Assets) और सरकारी अनुदान (Grants) हमेशा के लिए मिट जाएंगे और पूरा खाता शून्य (₹0.00) हो जाएगा। क्या आप जारी रखना चाहते हैं?')) return;
    localStorage.setItem('goshala_erp_vouchers', JSON.stringify([]));
    localStorage.setItem('goshala_erp_loans', JSON.stringify([]));
    localStorage.setItem('goshala_erp_contacts', JSON.stringify([]));
    
    const costCenters = GoshalaDB.getTable<any>('cost_centers');
    costCenters.forEach((cc: any) => {
      cc.spentAmount = 0;
    });
    localStorage.setItem('goshala_erp_cost_centers', JSON.stringify(costCenters));

    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const filteredLedgers = ledgers.filter(l => 
      l.groupId !== 'g-fixed-assets' && 
      l.groupId !== 'g-capital-aid' && 
      l.groupId !== 'g-members-contrib'
    );
    filteredLedgers.forEach(l => {
      l.openingBalance = 0;
      l.currentBalance = 0;
    });
    localStorage.setItem('goshala_erp_ledgers', JSON.stringify(filteredLedgers));

    alert('सभी वाउचर्स, डिफॉल्ट अचल संपत्तियां और अनुदान खाते बहीखाते से पूरी तरह हटा दिए गए हैं!');
    window.location.reload();
  };

  const handleExportBackup = () => {
    const backup: Record<string, any> = {};
    const keys = [
      'fys', 'ledgers', 'groups', 'cost_centers', 'cows', 'contacts',
      'inventory', 'batches', 'stock_tx', 'bank_accounts', 'vouchers',
      'milk_yields', 'milk_sales', 'donations', 'grants', 'employees',
      'attendance', 'payroll', 'loans', 'documents', 'meetings', 'audit_logs', 'config'
    ];
    keys.forEach(k => {
      backup[k] = GoshalaDB.getTable(k);
    });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `goshala_erp_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const requiredKeys = ['vouchers', 'ledgers', 'config'];
        const isValid = requiredKeys.every(k => k in parsed);
        if (!isValid) return alert('Invalid backup file structure.');
        Object.entries(parsed).forEach(([key, val]) => {
          localStorage.setItem(`goshala_erp_${key}`, JSON.stringify(val));
        });
        alert('Database restored successfully!');
        window.location.reload();
      } catch {
        alert('Error parsing backup file.');
      }
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Modern Enterprise Settings Header */}
      <div className="bg-gradient-to-r from-forest-700 to-forest-900 dark:from-forest-900 dark:to-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl">⚙️</span>
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Settings & Configuration</h2>
              <p className="text-forest-100/80 text-xs mt-0.5">Goshala ERP — Enterprise Administration Panel</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            {[
              { key: 'org', icon: '🏢', label: 'Organization' },
              { key: 'acct_prefs', icon: '📊', label: 'Accounting' },
              { key: 'ledgers', icon: '📒', label: 'Ledgers' },
              { key: 'security', icon: '🔒', label: 'Security' },
              { key: 'danger_zone', icon: '🚨', label: 'Reset' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === tab.key ? 'bg-white text-forest-800 shadow' : 'bg-white/15 text-white hover:bg-white/25'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0 space-y-2">
          {/* Group 1: Organisation */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">🏢 Organisation</p>
            </div>
            {[
              { key: 'org', icon: '📋', label: 'Organization Profile', sub: 'नाम, पता, लोगो' },
              { key: 'members', icon: '👥', label: 'Samiti Members', sub: 'समिति सदस्य' },
              { key: 'parties', icon: '🤝', label: 'Parties & Contacts', sub: 'पक्षकार / व्यक्ति' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as any)}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-all border-b border-slate-50 dark:border-slate-700/60 last:border-0 ${activeTab === item.key ? 'bg-forest-50 dark:bg-forest-900/30 border-l-2 border-l-forest-600' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className={`text-xs font-bold ${activeTab === item.key ? 'text-forest-700 dark:text-forest-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Group 2: Accounting */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">📊 Accounting</p>
            </div>
            {[
              { key: 'acct_prefs', icon: '⚙️', label: 'Accounting Mode', sub: 'Simple / Professional' },
              { key: 'tax', icon: '🧾', label: 'Tax & Registrations', sub: 'GST, 12A, 80G' },
              { key: 'bank', icon: '🏦', label: 'Bank Balances', sub: 'Cash & Bank opening' },
              { key: 'fys', icon: '📅', label: 'Financial Years', sub: 'वित्तीय वर्ष' },
              { key: 'cost_centers', icon: '💡', label: 'Cost Centers', sub: 'खर्च केंद्र' },
              { key: 'pay_modes', icon: '💳', label: 'Payment Modes', sub: 'भुगतान मोड' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as any)}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-all border-b border-slate-50 dark:border-slate-700/60 last:border-0 ${activeTab === item.key ? 'bg-forest-50 dark:bg-forest-900/30 border-l-2 border-l-forest-600' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className={`text-xs font-bold ${activeTab === item.key ? 'text-forest-700 dark:text-forest-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Group 3: Ledgers & Print */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">📒 Ledgers & Print</p>
            </div>
            {[
              { key: 'ledgers', icon: '📒', label: 'Chart of Accounts', sub: 'खाता प्रबंधक' },
              { key: 'print', icon: '🖨️', label: 'Print Templates', sub: 'रसीद प्रारूप' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as any)}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-all border-b border-slate-50 dark:border-slate-700/60 last:border-0 ${activeTab === item.key ? 'bg-forest-50 dark:bg-forest-900/30 border-l-2 border-l-forest-600' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className={`text-xs font-bold ${activeTab === item.key ? 'text-forest-700 dark:text-forest-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Group 4: Security & Danger */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">🔒 Security & Data</p>
            </div>
            {[
              { key: 'security', icon: '🔑', label: 'Security PIN', sub: 'App PIN & access' },
              { key: 'danger_zone', icon: '🚨', label: 'Reset & Data', sub: 'Backup / Restore', danger: true },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as any)}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-all border-b border-slate-50 dark:border-slate-700/60 last:border-0 ${activeTab === item.key ? (item.danger ? 'bg-red-50 dark:bg-red-900/20 border-l-2 border-l-red-500' : 'bg-forest-50 dark:bg-forest-900/30 border-l-2 border-l-forest-600') : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className={`text-xs font-bold ${activeTab === item.key ? (item.danger ? 'text-red-600' : 'text-forest-700 dark:text-forest-400') : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 space-y-6 min-w-0">

      {/* TAB 1: ORG DETAILS */}

          {activeTab === 'org' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Organization Identity Details</h3>
              <form onSubmit={handleSave} className="space-y-4 text-xs font-bold text-slate-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label>Samiti / Trust Name (समिति का नाम)</label>
                    <input
                      type="text"
                      value={config.samitiName || ''}
                      onChange={(e) => setConfig({ ...config, samitiName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Samiti Logo (Upload Image)</label>
                    <div className="flex items-center space-x-3">
                      {config.logoUrl && (
                        <img src={config.logoUrl} alt="Logo Preview" className="w-14 h-14 object-contain border rounded-xl bg-slate-50 p-1" />
                      )}
                      <div className="space-y-1.5 flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const img = new Image();
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              img.src = ev.target?.result as string;
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_SIZE = 250;
                                let width = img.width;
                                let height = img.height;
                                if (width > height) {
                                  if (width > MAX_SIZE) {
                                    height *= MAX_SIZE / width;
                                    width = MAX_SIZE;
                                  }
                                } else {
                                  if (height > MAX_SIZE) {
                                    width *= MAX_SIZE / height;
                                    height = MAX_SIZE;
                                  }
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx?.drawImage(img, 0, 0, width, height);
                                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                                setConfig(prev => ({ ...prev, logoUrl: compressedBase64 }));
                              };
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="w-full px-3 py-2 border rounded-xl font-normal text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-forest-50 file:text-forest-700 file:font-bold cursor-pointer"
                        />
                        {config.logoUrl && (
                          <button type="button" onClick={() => setConfig({ ...config, logoUrl: '' })}
                            className="text-[10px] text-red-500 font-bold hover:underline">
                            × Remove Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label>Mobile Number (मोबाइल)</label>
                    <input
                      type="text"
                      value={config.mobileNumber || ''}
                      onChange={(e) => setConfig({ ...config, mobileNumber: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Alternate Mobile</label>
                    <input
                      type="text"
                      value={config.alternateMobile || ''}
                      onChange={(e) => setConfig({ ...config, alternateMobile: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={config.email || ''}
                      onChange={(e) => setConfig({ ...config, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Website</label>
                    <input
                      type="text"
                      value={config.website || ''}
                      onChange={(e) => setConfig({ ...config, website: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Registration Number (पंजीयन क्र.)</label>
                    <input
                      type="text"
                      value={config.registrationNo || ''}
                      onChange={(e) => setConfig({ ...config, registrationNo: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>PAN Number</label>
                    <input
                      type="text"
                      value={config.panNo || ''}
                      onChange={(e) => setConfig({ ...config, panNo: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>GST Number</label>
                    <input
                      type="text"
                      value={config.gstNo || ''}
                      onChange={(e) => setConfig({ ...config, gstNo: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>RTC Land Details (Khasra Number)</label>
                    <input
                      type="text"
                      value={config.rtcDetails || ''}
                      onChange={(e) => setConfig({ ...config, rtcDetails: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                  <div className="space-y-1.5">
                    <label>Village (ग्राम)</label>
                    <input
                      type="text"
                      value={config.village || ''}
                      onChange={(e) => setConfig({ ...config, village: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>District (जिला)</label>
                    <input
                      type="text"
                      value={config.district || ''}
                      onChange={(e) => setConfig({ ...config, district: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>State (राज्य)</label>
                    <input
                      type="text"
                      value={config.state || ''}
                      onChange={(e) => setConfig({ ...config, state: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label>Full Postal Address (पूरा पता)</label>
                  <textarea
                    rows={2}
                    value={config.address || ''}
                    onChange={(e) => setConfig({ ...config, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-normal"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="bg-forest-600 hover:bg-forest-750 text-white font-bold px-6 py-2.5 rounded-xl flex items-center space-x-1.5 transition"
                  >
                    {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    <span>{savedSuccess ? 'Saved successfully!' : 'Save Details'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: ACCOUNTING & INTERFACE PREFERENCES */}
          {activeTab === 'acct_prefs' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Interface & Accounting Preferences (लेखांकन प्राथमिकताएं)</h3>
              <form onSubmit={handleSave} className="space-y-6 text-xs font-bold text-slate-500">
                <div className="p-5 bg-forest-50/60 dark:bg-slate-900/60 rounded-2xl border border-forest-100 dark:border-slate-700 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-850 dark:text-white">Accounting Mode (लेखांकन मोड) *</h4>
                      <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                        Choose how accounting entries and reports are displayed across the system.
                      </p>
                    </div>
                    <select
                      value={config.accountingMode || 'SIMPLE'}
                      onChange={(e) => setConfig({ ...config, accountingMode: e.target.value as any })}
                      className="px-4 py-2 border rounded-xl bg-white dark:bg-slate-900 font-extrabold text-forest-750 dark:text-forest-400 text-xs shadow-xs"
                    >
                      <option value="SIMPLE">Simple Mode (आसान मोड - पैसा आया / पैसा गया)</option>
                      <option value="PROFESSIONAL">Professional Mode (सीए / एकाउंटेंट मोड - DR / CR)</option>
                    </select>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-forest-100 dark:border-slate-700 text-[11px] font-normal text-slate-600 dark:text-slate-300">
                    {config.accountingMode === 'PROFESSIONAL' ? (
                      <p>✨ <strong>Professional Mode active:</strong> Displays traditional Debit (Dr), Credit (Cr), Double-Entry Journal views, and Trial Balance formatting.</p>
                    ) : (
                      <p>✨ <strong>Simple Mode active:</strong> Hides complex accounting jargon (DR/CR). Displays intuitive terms like "पैसा कहाँ से आया", "पैसा कहाँ गया", "नकद", "बैंक", and "आय/व्यय".</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label>Voucher Number Prefix Format (वाउचर वाउचर नंबर फॉर्मेट)</label>
                    <input
                      type="text"
                      value={config.voucherNumberFormat || 'V-{TYPE}-{NUM}'}
                      onChange={(e) => setConfig({ ...config, voucherNumberFormat: e.target.value })}
                      placeholder="V-{TYPE}-{NUM}"
                      className="w-full px-3 py-2 border rounded-xl font-mono text-slate-800 dark:text-slate-100"
                    />
                    <p className="text-[10px] text-slate-400 font-normal">Use &#123;TYPE&#125; for voucher code and &#123;NUM&#125; for sequence.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label>Receipt Number Format (रसीद नंबर फॉर्मेट)</label>
                    <input
                      type="text"
                      value={config.receiptFormat || 'R-{NUM}'}
                      onChange={(e) => setConfig({ ...config, receiptFormat: e.target.value })}
                      placeholder="R-{NUM}"
                      className="w-full px-3 py-2 border rounded-xl font-mono text-slate-800 dark:text-slate-100"
                    />
                  </div>



                  <div className="space-y-1.5">
                    <label>Default Financial Year</label>
                    <select
                      value={config.activeFyId || 'fy-2025-26'}
                      onChange={(e) => setConfig({ ...config, activeFyId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 font-bold"
                    >
                      {fys.map(fy => (
                        <option key={fy.id} value={fy.id}>{fy.name} ({fy.status})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="bg-forest-600 hover:bg-forest-750 text-white font-bold px-6 py-2.5 rounded-xl flex items-center space-x-1.5 transition"
                  >
                    {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    <span>{savedSuccess ? 'Saved successfully!' : 'Save Preferences'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: RULES & TAXES */}
          {activeTab === 'tax' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Tax Parameters & Registrations</h3>
              <form onSubmit={handleSave} className="space-y-6 text-xs font-bold text-slate-500">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Toggles */}
                  <div className="space-y-4">
                    <label className="text-slate-400 uppercase tracking-wider block text-[10px]">Taxes & Modules</label>
                    
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="text-slate-800 dark:text-white font-bold">12A Income Tax Certification</p>
                        <p className="text-[10px] text-slate-400 font-normal">Toggle 12A registration exemption clauses on receipts</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!config.enable12A}
                        onChange={(e) => setConfig({ ...config, enable12A: e.target.checked })}
                        className="w-4 h-4 rounded text-forest-600"
                      />
                    </div>

                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="text-slate-800 dark:text-white font-bold">80G Tax Exemption (Donations)</p>
                        <p className="text-[10px] text-slate-400 font-normal">Enable 80G tax deductions on donation print certificates</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!config.enable80G}
                        onChange={(e) => setConfig({ ...config, enable80G: e.target.checked })}
                        className="w-4 h-4 rounded text-forest-600"
                      />
                    </div>

                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="text-slate-800 dark:text-white font-bold">GST Sub-System module</p>
                        <p className="text-[10px] text-slate-400 font-normal">Enable tax rate selection and billing parameters</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!config.enableGST}
                        onChange={(e) => setConfig({ ...config, enableGST: e.target.checked })}
                        className="w-4 h-4 rounded text-forest-600"
                      />
                    </div>

                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="text-slate-800 dark:text-white font-bold">TDS Receivables ledger</p>
                        <p className="text-[10px] text-slate-400 font-normal">Tracks withholding tax assets from government grants</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!config.enableTDS}
                        onChange={(e) => setConfig({ ...config, enableTDS: e.target.checked })}
                        className="w-4 h-4 rounded text-forest-600"
                      />
                    </div>
                  </div>

                  {/* Core numbering rules */}
                  <div className="space-y-4">
                    <label className="text-slate-400 uppercase tracking-wider block text-[10px]">Voucher Rules</label>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label>Voucher Format Prefix</label>
                        <input
                          type="text"
                          value={config.voucherNumberFormat}
                          onChange={(e) => setConfig({ ...config, voucherNumberFormat: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl font-normal font-mono"
                        />
                      </div>

                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    type="submit"
                    className="bg-forest-600 hover:bg-forest-750 text-white font-bold px-6 py-2.5 rounded-xl flex items-center space-x-1.5 transition"
                  >
                    {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    <span>{savedSuccess ? 'Saved successfully!' : 'Save Settings'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: BANK ACCOUNTS */}
          {activeTab === 'bank' && (
            <div className="space-y-6">
              
              {/* Balances configuration */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Bank & Cash Starting Balances (प्रारंभिक बैंक व नकद राशि)</h3>
                    <p className="text-xs text-slate-400 font-normal">सुरक्षित बहीखाता प्रविष्टि के लिए प्रारंभिक शेष को लॉक या अनलॉक करें।</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center space-x-1 ${
                      isOpLocked ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}>
                      <span>{isOpLocked ? '🔒 OPENING BALANCE LOCKED' : '🔓 OPENING BALANCE UNLOCKED'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleOpLock}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center space-x-1 ${
                        isOpLocked 
                          ? 'bg-forest-650 hover:bg-forest-750 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {isOpLocked ? 'Unlock (अनलॉक करें)' : 'Lock (सुरक्षित लॉक करें)'}
                    </button>
                  </div>
                </div>
                
                <form onSubmit={handleSaveBankBalances} className="space-y-4 text-xs font-bold text-slate-500">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {ledgersList.filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable').map(l => (
                      <div key={l.id} className="space-y-1.5">
                        <label>{l.name} (₹)</label>
                        <input
                          type="number"
                          required
                          disabled={isOpLocked}
                          value={bankBalances[l.id] !== undefined ? bankBalances[l.id] : (l.openingBalance || 0)}
                          onChange={(e) => setBankBalances({ ...bankBalances, [l.id]: Number(e.target.value) })}
                          className={`w-full px-3 py-2 border rounded-xl font-normal font-sans ${
                            isOpLocked ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  {!isOpLocked && (
                    <div className="flex justify-start">
                      <button
                        type="submit"
                        className="bg-forest-600 hover:bg-forest-750 text-white font-bold px-5 py-2 rounded-xl flex items-center space-x-1.5 transition"
                      >
                        <Save className="w-4.5 h-4.5" />
                        <span>Save Starting Balances</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Manage Banks Table */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">Manage Bank Accounts (बैंक खाते प्रबंधित करें)</h3>
                
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-750 text-slate-400 font-semibold uppercase">
                        <th className="pb-2">Code</th>
                        <th className="pb-2">Bank Name</th>
                        <th className="pb-2 text-right">Starting Bal</th>
                        <th className="pb-2 text-right pr-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-750">
                      {ledgersList.filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable').map(l => (
                        <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          <td className="py-2.5 font-bold font-mono text-slate-850 dark:text-slate-100">{l.code}</td>
                          <td className="py-2.5 font-semibold text-slate-750 dark:text-slate-200">{l.name}</td>
                          <td className="py-2.5 text-right font-bold text-slate-650">₹{l.openingBalance.toLocaleString()}</td>
                          <td className="py-2.5 text-right pr-2">
                            {l.id === 'l-cash' ? (
                              <span className="text-[10px] text-slate-400 italic">System Ledger</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteBankAccount(l.id)}
                                className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded font-bold text-[10px]"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add new bank form */}
                <form onSubmit={handleAddBankAccount} className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border space-y-3 text-xs font-bold text-slate-500">
                  <h4 className="text-slate-800 dark:text-white">ADD NEW BANK ACCOUNT (नया बैंक खाता जोड़ें)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label>Bank Name (बैंक का नाम)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. State Bank of India"
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-xl font-normal"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Ledger Code (खाता कोड)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1004"
                        value={newBankCode}
                        onChange={(e) => setNewBankCode(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-xl font-normal font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Starting Balance (₹)</label>
                      <input
                        type="number"
                        required
                        value={newBankOpenBalance}
                        onChange={(e) => setNewBankOpenBalance(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border rounded-xl font-normal"
                      />
                    </div>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-forest-600 hover:bg-forest-750 text-white font-bold rounded-xl flex items-center space-x-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Bank</span>
                  </button>
                </form>

              </div>
            </div>
          )}

          {/* TAB 4: VOUCHER PRINT TEMPLATES */}
          {activeTab === 'print' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Voucher Wording & Printing Templates</h3>
              <form onSubmit={handleSave} className="space-y-6 text-xs font-bold text-slate-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label>Print Slip Header Text</label>
                    <textarea
                      rows={2}
                      value={config.printHeader || ''}
                      onChange={(e) => setConfig({ ...config, printHeader: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Print Slip Footer Text</label>
                    <textarea
                      rows={2}
                      value={config.printFooter || ''}
                      onChange={(e) => setConfig({ ...config, printFooter: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Authorized Signatory Title</label>
                    <input
                      type="text"
                      value={config.authorizedSignatory || ''}
                      onChange={(e) => setConfig({ ...config, authorizedSignatory: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-normal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Paper Size</label>
                    <select
                      value={config.paperSize || 'A4'}
                      onChange={(e) => setConfig({ ...config, paperSize: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-slate-850"
                    >
                      <option value="A4">A4 (Standard Document)</option>
                      <option value="A5">A5 (Half Letter Booklet)</option>
                      <option value="Letter">US Letter</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h4 className="text-slate-800 dark:text-white text-xs">Custom Receipt Note Wording (रसीद में क्या छपेगा)</h4>
                  <p className="text-[10px] text-slate-400 font-normal">Define basic description templates that print automatically when you output Payment receipts for specific categories.</p>
                  
                  <div className="space-y-3">
                    {ledgersList.filter(l => l.type === 'EXPENSE').map(l => (
                      <div key={l.id} className="space-y-1">
                        <label>{l.name} Note Template</label>
                        <input
                          type="text"
                          value={config.receiptTemplates?.[l.id] || ''}
                          onChange={(e) => {
                            const temps = { ...config.receiptTemplates, [l.id]: e.target.value };
                            setConfig({ ...config, receiptTemplates: temps });
                          }}
                          placeholder="e.g. Received cash/bank payment for supervisor wages..."
                          className="w-full px-3 py-2 border rounded-xl font-normal"
                        />
                      </div>
                    ))}
                    <div className="space-y-1">
                      <label>Default Expense Note (अन्य सभी खर्चों के लिए)</label>
                      <input
                        type="text"
                        value={config.receiptTemplates?.['default'] || ''}
                        onChange={(e) => {
                          const temps = { ...config.receiptTemplates, default: e.target.value };
                          setConfig({ ...config, receiptTemplates: temps });
                        }}
                        className="w-full px-3 py-2 border rounded-xl font-normal"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    type="submit"
                    className="bg-forest-600 hover:bg-forest-750 text-white font-bold px-6 py-2.5 rounded-xl flex items-center space-x-1.5 transition"
                  >
                    {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    <span>{savedSuccess ? 'Saved successfully!' : 'Save Slips Configuration'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: CHART OF ACCOUNTS (LEDGER MANAGER) */}
          {activeTab === 'ledgers' && (
            <div className="space-y-6">
              
              {/* List of active ledgers in Folder Tree */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">Chart of Accounts Folder Tree (खाता निर्देशिका)</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{ledgersList.length} Accounts Registered</span>
                </div>
                
                {/* Folder Groups */}
                {[
                  { key: 'ASSET', title: '📁 1. ASSETS (संपत्तियां)', subtitle: 'Cash, Banks, Fixed Assets & Receivables', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20' },
                  { key: 'LIABILITY', title: '📁 2. LIABILITIES (देनदारियां व ऋण)', subtitle: 'Bank Loans, Private Borrowings & Creditors', color: 'text-red-600 bg-red-50 dark:bg-red-950/20' },
                  { key: 'INCOME', title: '📁 3. INCOME (आय खाता)', subtitle: 'Donations, Grants, Milk/Dung Sales', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
                  { key: 'EXPENSE', title: '📁 4. EXPENSES (व्यय खाता)', subtitle: 'Fodder, Wages, Electricity, Maintenance', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
                  { key: 'CAPITAL', title: '📁 5. EQUITY / CAPITAL (पूंजी व संचय)', subtitle: 'Corpus Funds & Reserve Funds', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/20' }
                ].map(group => {
                  const isExp = expandedFolders[group.key] !== false;
                  const groupLedgers = ledgersList.filter(l => l.type === group.key);

                  return (
                    <div key={group.key} className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden text-xs">
                      <div
                        onClick={() => setExpandedFolders({ ...expandedFolders, [group.key]: !isExp })}
                        className={`p-3 flex justify-between items-center cursor-pointer select-none font-bold ${group.color}`}
                      >
                        <div className="flex items-center space-x-2">
                          {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="font-extrabold text-xs">{group.title}</span>
                          <span className="text-[10px] opacity-75 font-normal">({group.subtitle})</span>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-900/60">
                          {groupLedgers.length} Accounts
                        </span>
                      </div>

                      {isExp && (
                        <div className="p-3 bg-slate-50/50 dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-slate-800">
                          {groupLedgers.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-2">No accounts in this folder group.</p>
                          ) : groupLedgers.map(l => (
                            <div key={l.id} className="py-2.5 flex justify-between items-center hover:bg-white dark:hover:bg-slate-800/80 px-2 rounded-xl transition">
                              <div className="flex items-center space-x-3">
                                <span className="font-mono text-[10px] font-bold text-slate-400">[{l.code}]</span>
                                <div>
                                  <h4 className="font-bold text-slate-800 dark:text-white text-xs">{l.name}</h4>
                                  <p className="text-[9px] text-slate-400">Group ID: {l.groupId} • Current Bal: ₹{l.currentBalance.toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-[10px] text-slate-500">Op: ₹{l.openingBalance.toLocaleString()}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingLedger(l)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-lg font-bold text-[10px]"
                                >
                                  Edit
                                </button>
                                {!l.isSystem && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLedger(l.id)}
                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg font-bold text-[10px]"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Custom Ledger Form */}
                <form onSubmit={handleAddLedger} className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border space-y-3 text-xs font-bold text-slate-500">
                  <h4 className="text-slate-800 dark:text-white">ADD NEW CUSTOM LEDGER (नया खाता जोडें)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label>Ledger Name (खाता का नाम)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Gaushala Medicine Setup"
                        value={newLName}
                        onChange={(e) => setNewLName(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-xl font-normal"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Account Code (खाता कोड)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 5012"
                        value={newLCode}
                        onChange={(e) => setNewLCode(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-xl font-normal font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Parent Group Division</label>
                      <select
                        value={newLGroup}
                        onChange={(e) => {
                          setNewLGroup(e.target.value);
                          const matchedType = groups.find(g => g.id === e.target.value)?.type || 'EXPENSE';
                          setNewLType(matchedType as any);
                        }}
                        className="w-full px-3 py-1.5 border rounded-xl bg-white text-slate-850"
                      >
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Opening Starting Balance (₹)</label>
                      <input
                        type="number"
                        value={newLOpenBal}
                        onChange={(e) => setNewLOpenBal(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border rounded-xl font-normal"
                      />
                    </div>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-forest-600 hover:bg-forest-750 text-white font-bold rounded-xl flex items-center space-x-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Account Ledger</span>
                  </button>
                </form>

              </div>

              {/* Edit Ledger Modal */}
              {editingLedger && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-40">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border shadow-xl max-w-md w-full space-y-4 text-xs font-bold text-slate-500">
                    <h3 className="text-slate-800 dark:text-white text-sm">Edit Account Ledger</h3>
                    <form onSubmit={handleUpdateLedger} className="space-y-4">
                      <div className="space-y-1">
                        <label>Ledger Name</label>
                        <input
                          type="text"
                          required
                          value={editingLedger.name}
                          onChange={(e) => setEditingLedger({ ...editingLedger, name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl font-normal text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label>Account Code</label>
                        <input
                          type="text"
                          required
                          value={editingLedger.code}
                          onChange={(e) => setEditingLedger({ ...editingLedger, code: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl font-normal font-mono text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label>Opening Starting Balance (₹)</label>
                        <input
                          type="number"
                          required
                          value={editingLedger.openingBalance}
                          onChange={(e) => setEditingLedger({ ...editingLedger, openingBalance: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-xl font-normal text-slate-900"
                        />
                      </div>
                      <div className="flex justify-end space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingLedger(null)}
                          className="px-4 py-2 border rounded-xl text-slate-500 font-bold"
                        >
                          Discard
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-forest-600 hover:bg-forest-750 text-white font-bold rounded-xl"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 6: COST CENTERS MANAGER */}
          {activeTab === 'cost_centers' && (
            <div className="space-y-6">
              
              {/* Cost centers lists */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">Active Cost Centers (खर्च केंद्र सूची)</h3>
                
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-750 text-slate-400 font-semibold uppercase">
                        <th className="pb-2">Name</th>
                        <th className="pb-2 text-right">Allocated Budget</th>
                        <th className="pb-2 text-right">Total Spent</th>
                        <th className="pb-2 text-right pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-750">
                      {costCenters.map(cc => (
                        <tr key={cc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{cc.name}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-650">₹{(cc.allocatedBudget || (cc as any).budgetLimit || 0).toLocaleString()}</td>
                          <td className="py-2.5 text-right font-bold text-red-500">₹{(cc.spentAmount || 0).toLocaleString()}</td>
                          <td className="py-2.5 text-right pr-2 space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCc(cc)}
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded font-bold text-[10px]"
                            >
                              Edit
                            </button>
                            {cc.id !== 'cc-general' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCc(cc.id)}
                                className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-500 rounded font-bold text-[10px]"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add new Cost Center Form */}
                <form onSubmit={handleAddCc} className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border space-y-3 text-xs font-bold text-slate-500">
                  <h4 className="text-slate-800 dark:text-white">ADD NEW COST CENTER (नया खर्च केंद्र जोड़ें)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label>Cost Center Name (केंद्र का नाम)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Veterinary Hospital Setup"
                        value={newCcName}
                        onChange={(e) => setNewCcName(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-xl font-normal"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Allocated Budget (आवंटित राशि - ₹)</label>
                      <input
                        type="number"
                        required
                        value={newCcBudget}
                        onChange={(e) => setNewCcBudget(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border rounded-xl font-normal"
                      />
                    </div>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-forest-600 hover:bg-forest-750 text-white font-bold rounded-xl flex items-center space-x-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Cost Center</span>
                  </button>
                </form>

              </div>

              {/* Edit Cost Center Modal */}
              {editingCc && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-40">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border shadow-xl max-w-md w-full space-y-4 text-xs font-bold text-slate-500">
                    <h3 className="text-slate-800 dark:text-white text-sm">Edit Cost Center Budget</h3>
                    <form onSubmit={handleUpdateCc} className="space-y-4">
                      <div className="space-y-1">
                        <label>Cost Center Name</label>
                        <input
                          type="text"
                          required
                          value={editingCc.name}
                          onChange={(e) => setEditingCc({ ...editingCc, name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl font-normal text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label>Allocated Budget (₹)</label>
                        <input
                          type="number"
                          required
                          value={editingCc.allocatedBudget !== undefined ? editingCc.allocatedBudget : ((editingCc as any).budgetLimit || 0)}
                          onChange={(e) => setEditingCc({ ...editingCc, allocatedBudget: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-xl font-normal text-slate-900"
                        />
                      </div>
                      <div className="flex justify-end space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingCc(null)}
                          className="px-4 py-2 border rounded-xl text-slate-500 font-bold"
                        >
                          Discard
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-forest-600 hover:bg-forest-750 text-white font-bold rounded-xl"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 7: FINANCIAL YEARS */}
          {activeTab === 'fys' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Financial Years Manager</h3>
              
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-750 text-slate-400 font-semibold uppercase">
                      <th className="pb-2">Year Name</th>
                      <th className="pb-2">Start Date</th>
                      <th className="pb-2">End Date</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-750 text-slate-700 dark:text-slate-350">
                    {fys.map(fy => (
                      <tr key={fy.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-2.5 font-bold">{fy.name}</td>
                        <td className="py-2.5">{fy.startDate}</td>
                        <td className="py-2.5">{fy.endDate}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                            fy.status === 'ACTIVE' ? 'bg-forest-550/15 text-forest-650' : 'bg-red-50 text-red-650'
                          }`}>
                            {fy.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right pr-2 space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleFyStatus(fy.id, fy.status)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-lg font-bold text-[10px]"
                          >
                            {fy.status === 'ACTIVE' ? 'Close/Deactivate' : 'Reactivate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFy(fy.id)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg font-bold text-[10px]"
                          >
                            Delete (हटाएं)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Create new financial year */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border space-y-3 text-xs font-bold text-slate-500">
                <h4 className="text-slate-850 dark:text-white">CREATE NEW FINANCIAL YEAR</h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. 2026-27"
                    value={newFyName}
                    onChange={(e) => setNewFyName(e.target.value)}
                    className="px-3 py-1.5 border rounded-xl font-normal text-slate-800"
                  />
                  <button type="button" onClick={handleAddFy} className="px-4 py-2 bg-forest-650 hover:bg-forest-750 text-white rounded-xl">Add Year</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: PAYMENT MODES */}
          {activeTab === 'pay_modes' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Payment Modes Manager</h3>
              
              <div className="space-y-3">
                {paymentModes.map((mode, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border">
                    {editingPayModeIdx === idx ? (
                      <input
                        type="text"
                        value={editPayModeValue}
                        onChange={(e) => setEditPayModeValue(e.target.value)}
                        className="px-3 py-1 border rounded-lg text-slate-800 font-normal"
                      />
                    ) : (
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{mode}</span>
                    )}

                    <div className="space-x-1.5">
                      {editingPayModeIdx === idx ? (
                        <button
                          type="button"
                          onClick={() => handleSaveEditPayMode(idx)}
                          className="px-2.5 py-1 bg-forest-600 text-white text-[10px] font-bold rounded"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEditPayMode(idx)}
                          className="px-2.5 py-1 bg-indigo-550/10 text-indigo-650 hover:bg-indigo-100 text-[10px] font-bold rounded"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeletePayMode(idx)}
                        className="px-2.5 py-1 bg-red-50 text-red-500 hover:bg-red-100 text-[10px] font-bold rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add payment type form */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border space-y-3 text-xs font-bold text-slate-500">
                <h4 className="text-slate-850 dark:text-white">{t('add_payment_type_title')}</h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. CARD or NET_BANKING"
                    value={newPayMode}
                    onChange={(e) => setNewPayMode(e.target.value)}
                    className="px-3 py-1.5 border rounded-xl font-normal text-slate-800"
                  />
                  <button type="button" onClick={handleAddPayMode} className="px-4 py-2 bg-forest-650 hover:bg-forest-750 text-white rounded-xl">Add Mode</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SAMITI MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
                <h3 className="font-extrabold text-base text-slate-850 dark:text-white">
                  {editingMember ? '✏️ Edit Samiti Member (सदस्य संपादित करें)' : '➕ Add New Samiti Member (नया सदस्य जोड़ें)'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {[
                    { label: 'Designation / पद *', val: mDesignation, setter: setMDesignation, ph: 'e.g. President, Secretary, Treasurer' },
                    { label: 'Full Name / पूरा नाम *', val: mName, setter: setMName, ph: 'e.g. Aditya Vardhan' },
                    { label: 'Mobile No. / मोबाइल', val: mPhone, setter: setMPhone, ph: '9876543210' },
                    { label: 'Aadhar No. / आधार', val: mAadhar, setter: setMAadhar, ph: '1234 5678 9012' },
                    { label: 'PAN No. / पैन', val: mPan, setter: setMPan, ph: 'ABCDE1234F' },
                    { label: 'Address / पता', val: mAddress, setter: setMAddress, ph: 'Village, District, State' },
                  ].map(({ label, val, setter, ph }) => (
                    <div key={label} className="space-y-1.5">
                      <label className="font-bold text-slate-500">{label}</label>
                      <input
                        type="text"
                        value={val}
                        onChange={e => setter(e.target.value)}
                        placeholder={ph}
                        className="w-full px-3 py-2 border rounded-xl font-normal text-slate-800 dark:text-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveMember}
                    className="px-5 py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold rounded-xl text-xs"
                  >
                    {editingMember ? '✅ Update Member' : '➕ Add Member'}
                  </button>
                  {editingMember && (
                    <button type="button" onClick={resetMemberForm} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-white font-bold rounded-xl text-xs">
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">All Samiti Members ({members.length})</h3>
                {members.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No members added yet. Use the form above to add members.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                          <th className="pb-3">Designation (पद)</th>
                          <th className="pb-3">Name (नाम)</th>
                          <th className="pb-3">Mobile (मोबाइल)</th>
                          <th className="pb-3">Aadhar (आधार)</th>
                          <th className="pb-3">PAN</th>
                          <th className="pb-3">Address (पता)</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                        {members.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="py-3 font-bold text-forest-700 dark:text-forest-400">{m.designation}</td>
                            <td className="py-3 font-bold text-slate-850 dark:text-white">{m.name}</td>
                            <td className="py-3">{m.phone || '—'}</td>
                            <td className="py-3 font-mono">{m.aadhar ? m.aadhar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : '—'}</td>
                            <td className="py-3 font-mono">{m.pan || '—'}</td>
                            <td className="py-3 max-w-[150px] truncate" title={m.address}>{m.address || '—'}</td>
                            <td className="py-3 text-right space-x-1.5">
                              <button
                                onClick={() => handleEditMember(m)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-bold text-[10px]"
                              >Edit</button>
                              <button
                                onClick={() => handleDeleteMember(m.id)}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded font-bold text-[10px]"
                              >Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PARTIES / CONTACTS */}
          {activeTab === 'parties' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
                <h3 className="font-extrabold text-base text-slate-850 dark:text-white">
                  {editingParty ? '✏️ Edit Party (पक्षकार संपादित करें)' : '➕ Add New Party / Contact (नया पक्षकार जोड़ें)'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Party Name (पक्षकार / व्यक्ति का नाम) *</label>
                    <input
                      type="text"
                      value={partyName}
                      onChange={e => setPartyName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar, Singhal Trading"
                      className="w-full px-3 py-2 border rounded-xl font-normal text-slate-800 dark:text-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Party Type (प्रकार) *</label>
                    <select
                      value={partyType}
                      onChange={e => setPartyType(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-xl font-semibold text-slate-800 dark:text-white dark:bg-slate-900 text-xs"
                    >
                      <option value="DONOR">DONOR (दानदाता)</option>
                      <option value="VENDOR">VENDOR (विक्रेता / आपूर्तिकर्ता)</option>
                      <option value="CUSTOMER">CUSTOMER (ग्राहक / खरीदार)</option>
                      <option value="VOLUNTEER">VOLUNTEER (सेवक / कार्यकर्ता)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Mobile No. (मोबाइल नंबर)</label>
                    <input
                      type="text"
                      value={partyPhone}
                      onChange={e => setPartyPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 border rounded-xl font-normal text-slate-800 dark:text-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">PAN Number (पैन)</label>
                    <input
                      type="text"
                      value={partyPan}
                      onChange={e => setPartyPan(e.target.value)}
                      placeholder="ABCDE1234F"
                      className="w-full px-3 py-2 border rounded-xl font-normal text-slate-800 dark:text-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Aadhar Number (आधार)</label>
                    <input
                      type="text"
                      value={partyAadhar}
                      onChange={e => setPartyAadhar(e.target.value)}
                      placeholder="1234 5678 9012"
                      className="w-full px-3 py-2 border rounded-xl font-normal text-slate-800 dark:text-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Address (पता)</label>
                    <input
                      type="text"
                      value={partyAddress}
                      onChange={e => setPartyAddress(e.target.value)}
                      placeholder="Village, Town, District"
                      className="w-full px-3 py-2 border rounded-xl font-normal text-slate-800 dark:text-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveParty}
                    className="px-5 py-2.5 bg-forest-600 hover:bg-forest-750 text-white font-bold rounded-xl text-xs shadow-xs"
                  >
                    {editingParty ? '✅ Update Party' : '➕ Add Party'}
                  </button>
                  {editingParty && (
                    <button type="button" onClick={resetPartyForm} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-white font-bold rounded-xl text-xs">
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Parties List Table */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">All Managed Parties ({parties.length})</h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search party name / mobile..."
                      value={partySearch}
                      onChange={e => setPartySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border rounded-xl text-xs font-normal bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {parties.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No parties registered yet. Use the form above to add a party.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                          <th className="pb-3">Party Name (पक्षकार)</th>
                          <th className="pb-3">Type (प्रकार)</th>
                          <th className="pb-3">Mobile (मोबाइल)</th>
                          <th className="pb-3">Outstanding Payable (देना बाकी)</th>
                          <th className="pb-3">Address (पता)</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                        {parties
                          .filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase()) || (p.phone && p.phone.includes(partySearch)))
                          .map(p => {
                            const vouchers = GoshalaDB.getTable<any>('vouchers').filter(v => v.status === 'POSTED');
                            const partyVouchers = vouchers.filter(v => v.entries.some(e => e.subLedgerId === p.id) || v.narration?.toLowerCase().includes(p.name.toLowerCase()));
                            const creditBillsSum = partyVouchers.filter(v => v.entries.some((e: any) => e.ledgerId === 'l-liab-creditors' && !e.isDebit)).reduce((s: number, v: any) => s + (v.entries.find((e: any) => e.ledgerId === 'l-liab-creditors')?.amount || 0), 0);
                            const paymentsSum = partyVouchers.filter(v => v.entries.some((e: any) => e.ledgerId === 'l-liab-creditors' && e.isDebit)).reduce((s: number, v: any) => s + (v.entries.find((e: any) => e.ledgerId === 'l-liab-creditors')?.amount || 0), 0);
                            const netOutstanding = (p.outstandingBalance || 0) + creditBillsSum - paymentsSum;

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                <td className="py-3 font-bold text-slate-850 dark:text-white flex items-center space-x-2">
                                  <span className="w-6 h-6 rounded-full bg-forest-50 dark:bg-forest-900/40 text-forest-700 dark:text-forest-400 font-bold flex items-center justify-center text-[10px]">
                                    {p.name.charAt(0).toUpperCase()}
                                  </span>
                                  <span>{p.name}</span>
                                </td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    p.type === 'DONOR' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                    p.type === 'VENDOR' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                                    'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                  }`}>
                                    {p.type}
                                  </span>
                                </td>
                                <td className="py-3 font-mono">{p.phone || '—'}</td>
                                <td className="py-3">
                                  {netOutstanding > 0 ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-xs">
                                      ₹{netOutstanding.toLocaleString()} (देना बाकी)
                                    </span>
                                  ) : netOutstanding < 0 ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-extrabold text-xs">
                                      ₹{Math.abs(netOutstanding).toLocaleString()} (अग्रिम)
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                                      ₹0 (कोई बकाया नहीं)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 max-w-[150px] truncate" title={p.address}>{p.address || '—'}</td>
                                <td className="py-3 text-right space-x-1.5">
                                  <button
                                    onClick={() => handleEditParty(p)}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-bold text-[10px]"
                                  >Edit</button>
                                  <button
                                    onClick={() => handleDeleteParty(p.id)}
                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded font-bold text-[10px]"
                                  >Delete</button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 10: APP SECURITY */}
          {activeTab === 'security' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-6">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-white">App Security Configurations</h3>
              
              <div className="p-5 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border space-y-4 text-xs font-bold text-slate-500">
                <h4 className="text-slate-800 dark:text-white font-extrabold">{t('app_security_pin_title')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label>{t('current_pin_label')}</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      maxLength={4}
                      placeholder="••••"
                      value={currentPinText}
                      onChange={(e) => setCurrentPinText(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl font-normal text-slate-850"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>{t('new_pin_label')}</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      maxLength={4}
                      placeholder="••••"
                      value={newPinText}
                      onChange={(e) => setNewPinText(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl font-normal text-slate-850"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSavePin}
                  className="px-4 py-2 bg-forest-600 hover:bg-forest-750 text-white font-bold rounded-xl"
                >
                  {t('save_pin_btn')}
                </button>
              </div>
            </div>
          )}

          {/* TAB 9: DANGER ZONE */}
          {activeTab === 'danger_zone' && (
            <div className="space-y-6">
              
              {/* Backups */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
                <h3 className="font-extrabold text-base text-slate-850 dark:text-white font-sans">Database Backup & Restores</h3>
                <p className="text-slate-400 text-xs font-normal leading-relaxed">Save database states as backup JSON files, or restore existing worksheets back onto this device.</p>
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-4 py-2.5 border border-forest-600 text-forest-700 dark:text-forest-450 hover:bg-forest-50/20 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Local Backup file</span>
                  </button>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button
                      type="button"
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Select Backup File</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Collapsible Danger Zone Section */}
              <div className="pt-4 border-t">
                {!showDangerZone ? (
                  <button
                    type="button"
                    onClick={() => setShowDangerZone(true)}
                    className="w-full py-3.5 px-5 bg-red-50/50 hover:bg-red-100/60 dark:bg-red-950/20 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-650 dark:text-red-400 font-extrabold text-xs flex items-center justify-between transition group shadow-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-550 group-hover:scale-110 transition" />
                      <span>{language === 'hi' ? '🔓 Danger Zone (खतरा क्षेत्र) खोलें' : '🔓 Reveal Danger Zone Options'}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-red-500" />
                  </button>
                ) : (
                  <div className="bg-red-50/70 dark:bg-red-950/40 p-6 rounded-3xl border-2 border-red-500/50 shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-red-200 dark:border-red-900/40 pb-3">
                      <div className="flex items-center space-x-2 text-red-650 dark:text-red-400">
                        <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                        <h3 className="font-black text-base uppercase tracking-wider">
                          {language === 'hi' ? '🚨 Danger Zone (खतरा क्षेत्र - रीसेट विकल्प)' : '🚨 Danger Zone (System Reset Controls)'}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDangerZone(false)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline font-bold"
                      >
                        {language === 'hi' ? 'छिपाएं (Hide Danger Zone)' : 'Hide Controls'}
                      </button>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300 font-semibold leading-relaxed">
                      {language === 'hi'
                        ? 'चेतावनी: नीचे दिए गए विकल्पों का उपयोग केवल आपात स्थिति में करें। डेटा रीसेट करने से पहले हमेशा ऊपर दिए गए बटन से बैकअप फ़ाइल डाउनलोड कर लें।'
                        : 'Warning: Use the options below with extreme caution. Always export a local backup file before executing any database wipe actions.'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-500">
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm space-y-3">
                        <div className="space-y-1">
                          <h4 className="text-red-650 font-extrabold text-sm flex items-center space-x-1">
                            <span>Factory Database Reset</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                            Clears custom transaction logs & user additions. Restores baseline historical CA records and resets Security PIN.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => requirePin(handleResetDatabase)}
                          className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-center shadow-md font-bold text-xs transition"
                        >
                          Re-seed Baseline Database
                        </button>
                      </div>
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-saffron-300 dark:border-saffron-900/50 shadow-sm space-y-3">
                        <div className="space-y-1">
                          <h4 className="text-saffron-700 dark:text-saffron-400 font-extrabold text-sm">
                            Clear Vouchers & Start Clean (खाता खाली करें)
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                            Wipes receipt, payment, and contra vouchers to give you a 100% clean ledger with zero transactions.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => requirePin(handleClearAllTransactions)}
                          className="w-full py-2.5 bg-saffron-600 hover:bg-saffron-700 active:scale-95 text-white rounded-xl text-center shadow-md font-bold text-xs transition"
                        >
                          Clear Vouchers & Start Clean
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Security PIN prompts modal */}
      {pinPromptAction && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border shadow-xl max-w-sm w-full space-y-4">
            <h3 className="text-slate-850 dark:text-white font-bold text-sm text-center font-sans">Security PIN Required</h3>
            <p className="text-slate-500 text-xs text-center">Enter your 4-digit PIN to authenticate this operation.</p>
            <input
              type="password"
              autoComplete="new-password"
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
                  const currentPin = localStorage.getItem('goshala_erp_app_pin') || '';
                  if (currentPin && pinInput === currentPin) {
                    const actionToExec = pinPromptAction;
                    setPinPromptAction(null);
                    actionToExec();
                  } else {
                    setPinError(true);
                  }
                }}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
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
