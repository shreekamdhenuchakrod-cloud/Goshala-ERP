import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { ERPConfig, Ledger, CostCenter, LedgerGroup, Voucher, CRMContact } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import {
  Building2,
  Users,
  Contact,
  SlidersHorizontal,
  Receipt,
  Landmark,
  Calendar,
  PieChart,
  CreditCard,
  FolderTree,
  Printer,
  KeyRound,
  Database,
  Save,
  Download,
  UploadCloud,
  Check,
  Trash2,
  Plus,
  Edit3,
  Search,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldAlert,
  ArrowRight,
  X,
  FileText
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

interface SamitiMember {
  id: string;
  designation: string;
  name: string;
  phone: string;
  address: string;
  aadhar: string;
  pan: string;
}

type SettingsTab =
  | 'org'
  | 'members'
  | 'parties'
  | 'acct_prefs'
  | 'tax'
  | 'bank'
  | 'fys'
  | 'cost_centers'
  | 'pay_modes'
  | 'ledgers'
  | 'print'
  | 'security'
  | 'danger_zone';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('org');

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
    const table = GoshalaDB.getTable<ERPConfig>('config');
    if (table.length > 0) {
      setConfig({
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
          default: 'Received cash/bank payment for Goshala expenses.'
        },
        ...table[0]
      });
    }

    setCostCenters(GoshalaDB.getTable<CostCenter>('cost_centers'));

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
  };

  const handleTabClick = (tab: SettingsTab) => {
    if (tab === 'danger_zone') {
      requirePin(() => setActiveTab('danger_zone'));
    } else {
      setActiveTab(tab);
    }
  };

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

  const resetMemberForm = () => {
    setMDesignation('');
    setMName('');
    setMPhone('');
    setMAddress('');
    setMAadhar('');
    setMPan('');
    setEditingMember(null);
  };

  const handleSaveMember = () => {
    if (!mName || !mDesignation) {
      alert('Name and Designation are required!');
      return;
    }
    const all = GoshalaDB.getTable<SamitiMember>('samiti_members');
    if (editingMember) {
      const updated = all.map(m =>
        m.id === editingMember.id
          ? { ...m, designation: mDesignation, name: mName, phone: mPhone, address: mAddress, aadhar: mAadhar, pan: mPan }
          : m
      );
      GoshalaDB.saveTable('samiti_members', updated);
    } else {
      const newM: SamitiMember = {
        id: `m-${Date.now()}`,
        designation: mDesignation,
        name: mName,
        phone: mPhone,
        address: mAddress,
        aadhar: mAadhar,
        pan: mPan
      };
      GoshalaDB.saveTable('samiti_members', [...all, newM]);
    }
    setMembers(GoshalaDB.getTable<SamitiMember>('samiti_members'));
    resetMemberForm();
    alert(editingMember ? 'Member updated!' : 'Member added!');
  };

  const handleEditMember = (m: SamitiMember) => {
    setEditingMember(m);
    setMDesignation(m.designation);
    setMName(m.name);
    setMPhone(m.phone);
    setMAddress(m.address);
    setMAadhar(m.aadhar);
    setMPan(m.pan);
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

  const resetPartyForm = () => {
    setEditingParty(null);
    setPartyName('');
    setPartyType('DONOR');
    setPartyPhone('');
    setPartyAddress('');
    setPartyPan('');
    setPartyAadhar('');
  };

  const handleSaveParty = () => {
    if (!partyName) {
      alert('Party Name (पक्षकार नाम) is required!');
      return;
    }
    const all = GoshalaDB.getTable<CRMContact>('contacts');
    if (editingParty) {
      const updated = all.map(p =>
        p.id === editingParty.id
          ? { ...p, name: partyName, type: partyType, phone: partyPhone, address: partyAddress, pan: partyPan, aadhar: partyAadhar }
          : p
      );
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

    GoshalaDB.recalculateLedgers();
    GoshalaDB.logAction(user.name, user.role, 'CREATE_FY', `Created new financial year: ${newFyName}`);
    alert(`नया वित्तीय वर्ष (${newFyName}) सफलतापूर्वक जोड़ दिया गया है! इसमें पिछले वर्ष का क्लोजिंग बैलेंस ओपनिंग बैलेंस के रूप में आ गया है।`);
  };

  const handleToggleFyStatus = (fyId: string, currentStatus: string) => {
    requirePin(() => {
      const allFys = GoshalaDB.getTable<any>('fys');
      const target = allFys.find(f => f.id === fyId);
      if (!target) return;

      const todayStr = new Date().toISOString().split('T')[0];
      if (currentStatus === 'ACTIVE' && todayStr < target.endDate && todayStr >= target.startDate) {
        alert(`क्लोज़ त्रुटि: चल रहे सक्रिय वित्तीय वर्ष (${target.name}) को 31 मार्च (${target.endDate}) के पहले क्लोज़ या डीएक्टिवेट नहीं किया जा सकता है!`);
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

      const confirmMsg = `चेतावनी: क्या आप निश्चित हैं कि आप वित्तीय वर्ष ${target.name} को हटाना चाहते हैं?\n\nध्यान दें: डिलीट करने पर केवल वित्तीय वर्ष ${target.name} (${target.startDate} से ${target.endDate}) की प्रविष्टियां (Vouchers) हटाई जाएंगी।`;
      if (!window.confirm(confirmMsg)) return;

      const allVouchers = GoshalaDB.getTable<Voucher>('vouchers');
      const remainingVouchers = allVouchers.filter(v => v.fyId !== fyId && (v.date < target.startDate || v.date > target.endDate));
      GoshalaDB.saveTable('vouchers', remainingVouchers);

      const remainingFys = allFys.filter(f => f.id !== fyId);
      GoshalaDB.saveTable('fys', remainingFys);

      const activeFyId = GoshalaDB.getActiveFyId();
      if (activeFyId === fyId) {
        const nextActive = remainingFys[0]?.id || 'fy-2025-26';
        GoshalaDB.setActiveFyId(nextActive);
      }

      GoshalaDB.recalculateLedgers();
      setFys(remainingFys);
      GoshalaDB.logAction(user.name, user.role, 'DELETE_FY', `Deleted financial year ${target.name} and its vouchers`);
      alert(`वित्तीय वर्ष ${target.name} और उसकी सभी प्रविष्टियां सफलतापूर्वक हटा दी गई हैं!`);
      loadData();
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    GoshalaDB.saveTable('config', [config]);
    setSavedSuccess(true);
    GoshalaDB.logAction(user.name, user.role, 'SAVE_SETTINGS', `Updated ERP configuration rules`);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleToggleOpLock = () => {
    requirePin(() => {
      const nextState = !isOpLocked;
      setIsOpLocked(nextState);
      localStorage.setItem('goshala_erp_op_locked', String(nextState));
      alert(
        nextState
          ? 'प्रारंभिक शेष (Opening Balances) सफलतापूर्वक लॉक कर दिए गए हैं!'
          : 'प्रारंभिक शेष (Opening Balances) अनलॉक हो गए हैं!'
      );
    });
  };

  const handleSaveBankBalances = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOpLocked) {
      alert('लॉक त्रुटि: प्रारंभिक बैंक और नकद शेष वर्तमान में सुरक्षित लॉक हैं! कोई भी बदलाव करने के लिए पहले सेटिंग्स में जाकर अनलॉक करें।');
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
      alert('लॉक त्रुटि: प्रारंभिक बैंक और नकद शेष वर्तमान में सुरक्षित लॉक हैं! नया बैंक खाता जोड़ने के लिए पहले अनलॉक करें।');
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

  const handleResetDatabase = () => {
    if (
      !window.confirm(
        'WARNING: This will DELETE all your manually entered vouchers, test entries, and reset to baseline historical CA data. Your Security PIN will also be WIPED.\n\nProceed?'
      )
    )
      return;
    GoshalaDB.hardResetToBaseline();
    alert('Database reset to baseline CA data! All test entries have been removed. Reloading...');
    window.location.reload();
  };

  const handleClearAllTransactions = () => {
    if (
      !window.confirm(
        'चेतावनी: इससे आपकी सभी प्रविष्टियां (Vouchers), उधारी (Loans), सभी प्रारंभिक अचल संपत्तियां और अनुदान हमेशा के लिए मिट जाएंगे और पूरा खाता शून्य (₹0.00) हो जाएगा। क्या आप जारी रखना चाहते हैं?'
      )
    )
      return;

    GoshalaDB.clearAllTransactions();

    const costCentersList = GoshalaDB.getTable<any>('cost_centers');
    costCentersList.forEach((cc: any) => {
      cc.spentAmount = 0;
    });
    GoshalaDB.saveTable('cost_centers', costCentersList);

    const ledgers = GoshalaDB.getTable<Ledger>('ledgers');
    const filteredLedgers = ledgers.filter(
      l => l.groupId !== 'g-fixed-assets' && l.groupId !== 'g-capital-aid' && l.groupId !== 'g-members-contrib'
    );
    filteredLedgers.forEach(l => {
      l.openingBalance = 0;
      l.currentBalance = 0;
    });
    GoshalaDB.saveTable('ledgers', filteredLedgers);
    GoshalaDB.saveTable('loans', []);
    GoshalaDB.saveTable('contacts', []);
    GoshalaDB.recalculateLedgers();

    alert('सभी वाउचर्स, डिफॉल्ट अचल संपत्तियां और अनुदान खाते बहीखाते से पूरी तरह हटा दिए गए हैं!');
    window.location.reload();
  };

  const handleExportBackup = () => {
    const backup: Record<string, any> = {};
    const keys = [
      'fys',
      'ledgers',
      'groups',
      'cost_centers',
      'cows',
      'contacts',
      'inventory',
      'batches',
      'stock_tx',
      'bank_accounts',
      'vouchers',
      'milk_yields',
      'milk_sales',
      'donations',
      'grants',
      'employees',
      'attendance',
      'payroll',
      'loans',
      'documents',
      'meetings',
      'audit_logs',
      'config'
    ];
    keys.forEach(k => {
      backup[k] = GoshalaDB.getTable(k);
    });
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `goshala_erp_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;
    fileReader.readAsText(file, 'UTF-8');
    fileReader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const requiredKeys = ['vouchers', 'ledgers', 'config'];
        const isValid = requiredKeys.every(k => k in parsed);
        if (!isValid) return alert('Invalid backup file structure.');
        Object.entries(parsed).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            GoshalaDB.saveTable(key, val);
          } else {
            localStorage.setItem(`goshala_erp_${key}`, JSON.stringify(val));
          }
        });
        GoshalaDB.recalculateLedgers();
        alert('Database restored and synchronized successfully!');
        window.location.reload();
      } catch {
        alert('Error parsing backup file.');
      }
    };
  };

  // Nav Groups definition
  const navGroups = [
    {
      title: 'Organization',
      hindiTitle: 'संगठन',
      items: [
        { key: 'org', label: 'Organization Profile', hindi: 'संगठन प्रोफाइल', icon: Building2 },
        { key: 'members', label: 'Samiti Members', hindi: 'समिति सदस्य', icon: Users },
        { key: 'parties', label: 'Parties & CRM', hindi: 'पक्षकार / संपर्क', icon: Contact }
      ]
    },
    {
      title: 'Accounting & Rules',
      hindiTitle: 'लेखांकन एवं नियम',
      items: [
        { key: 'acct_prefs', label: 'Accounting Mode', hindi: 'लेखांकन प्राथमिकताएं', icon: SlidersHorizontal },
        { key: 'tax', label: 'Tax & Registrations', hindi: 'कर एवं पंजीकरण', icon: Receipt },
        { key: 'bank', label: 'Bank & Cash Balances', hindi: 'बैंक एवं नकद शेष', icon: Landmark },
        { key: 'fys', label: 'Financial Years', hindi: 'वित्तीय वर्ष', icon: Calendar },
        { key: 'cost_centers', label: 'Cost Centers', hindi: 'खर्च केंद्र', icon: PieChart },
        { key: 'pay_modes', label: 'Payment Modes', hindi: 'भुगतान मोड', icon: CreditCard }
      ]
    },
    {
      title: 'Ledgers & Templates',
      hindiTitle: 'बहीखाता एवं प्रिंट',
      items: [
        { key: 'ledgers', label: 'Chart of Accounts', hindi: 'खाता निर्देशिका (COA)', icon: FolderTree },
        { key: 'print', label: 'Print Templates', hindi: 'रसीद प्रारूप', icon: Printer }
      ]
    },
    {
      title: 'Security & System',
      hindiTitle: 'सुरक्षा एवं सिस्टम',
      items: [
        { key: 'security', label: 'Security PIN', hindi: 'सुरक्षा पिन', icon: KeyRound },
        { key: 'danger_zone', label: 'Backup & Reset', hindi: 'बैकअप एवं रीसेट', icon: Database, danger: true }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Settings & Configuration
            </h1>
            <Badge variant="neutral" className="text-[10px] font-mono">
              Enterprise ERP
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage organization identity, chart of accounts, financial years, security, and print formatting
          </p>
        </div>
        {savedSuccess && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Main Container: Left Nav + Right Content */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2 shadow-xs space-y-4">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 pt-2 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {group.title}
                  </p>
                </div>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleTabClick(item.key as SettingsTab)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        isActive
                          ? item.danger
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold'
                            : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-xs'
                          : item.danger
                          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? (item.danger ? 'text-rose-600' : 'text-current') : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Content View */}
        <div className="flex-1 w-full min-w-0 space-y-6">
          {/* TAB 1: ORGANIZATION PROFILE */}
          {activeTab === 'org' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Organization Identity</CardTitle>
                    <CardDescription>
                      Master registration, address, tax identifiers, and official letterhead credentials
                    </CardDescription>
                  </div>
                  <Badge variant="neutral">Core Profile</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Samiti / Trust Name (समिति का नाम)
                      </label>
                      <input
                        type="text"
                        value={config.samitiName || ''}
                        onChange={e => setConfig({ ...config, samitiName: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Official Logo
                      </label>
                      <div className="flex items-center space-x-3">
                        {config.logoUrl && (
                          <img
                            src={config.logoUrl}
                            alt="Logo Preview"
                            className="w-10 h-10 object-contain rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-white"
                          />
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const img = new Image();
                              const reader = new FileReader();
                              reader.onload = ev => {
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
                            className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border file:border-slate-200 dark:file:border-slate-700 file:bg-slate-50 dark:file:bg-slate-800 file:text-xs file:font-medium hover:file:bg-slate-100 cursor-pointer"
                          />
                          {config.logoUrl && (
                            <button
                              type="button"
                              onClick={() => setConfig({ ...config, logoUrl: '' })}
                              className="text-[11px] text-rose-600 hover:underline mt-1 font-medium"
                            >
                              Remove current logo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Primary Mobile Number
                      </label>
                      <input
                        type="text"
                        value={config.mobileNumber || ''}
                        onChange={e => setConfig({ ...config, mobileNumber: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Alternate Mobile Number
                      </label>
                      <input
                        type="text"
                        value={config.alternateMobile || ''}
                        onChange={e => setConfig({ ...config, alternateMobile: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={config.email || ''}
                        onChange={e => setConfig({ ...config, email: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Website URL
                      </label>
                      <input
                        type="text"
                        value={config.website || ''}
                        onChange={e => setConfig({ ...config, website: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Registration Number (पंजीयन क्र.)
                      </label>
                      <input
                        type="text"
                        value={config.registrationNo || ''}
                        onChange={e => setConfig({ ...config, registrationNo: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        value={config.panNo || ''}
                        onChange={e => setConfig({ ...config, panNo: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 uppercase font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        GSTIN
                      </label>
                      <input
                        type="text"
                        value={config.gstNo || ''}
                        onChange={e => setConfig({ ...config, gstNo: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 uppercase font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        RTC Land Details (Khasra Number)
                      </label>
                      <input
                        type="text"
                        value={config.rtcDetails || ''}
                        onChange={e => setConfig({ ...config, rtcDetails: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Village / Town (ग्राम)
                      </label>
                      <input
                        type="text"
                        value={config.village || ''}
                        onChange={e => setConfig({ ...config, village: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        District (जिला)
                      </label>
                      <input
                        type="text"
                        value={config.district || ''}
                        onChange={e => setConfig({ ...config, district: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        State (राज्य)
                      </label>
                      <input
                        type="text"
                        value={config.state || ''}
                        onChange={e => setConfig({ ...config, state: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Full Postal Address (पूरा पता)
                    </label>
                    <textarea
                      rows={2}
                      value={config.address || ''}
                      onChange={e => setConfig({ ...config, address: e.target.value })}
                      className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit">
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      <span>Save Organization Details</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: SAMITI MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{editingMember ? 'Edit Samiti Member' : 'Add Samiti Member'}</CardTitle>
                  <CardDescription>
                    Record committee executives, trustees, designations, contact credentials, and KYC identifiers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Designation / पद <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. President, Secretary, Treasurer"
                        value={mDesignation}
                        onChange={e => setMDesignation(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Full Name / पूरा नाम <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Aditya Vardhan"
                        value={mName}
                        onChange={e => setMName(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        placeholder="9876543210"
                        value={mPhone}
                        onChange={e => setMPhone(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Aadhar Number
                      </label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012"
                        value={mAadhar}
                        onChange={e => setMAadhar(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        placeholder="ABCDE1234F"
                        value={mPan}
                        onChange={e => setMPan(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 uppercase font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Address / पता
                      </label>
                      <input
                        type="text"
                        placeholder="Village, District, State"
                        value={mAddress}
                        onChange={e => setMAddress(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Button onClick={handleSaveMember} size="sm">
                      {editingMember ? <Save className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                      <span>{editingMember ? 'Update Member' : 'Add Member'}</span>
                    </Button>
                    {editingMember && (
                      <Button variant="outline" size="sm" onClick={resetMemberForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Members Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Registered Samiti Members</CardTitle>
                      <CardDescription>Official committee board members and signatories</CardDescription>
                    </div>
                    <Badge variant="neutral">{members.length} Members</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No members registered. Use the form above to add a member.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="pb-2.5">Designation</th>
                            <th className="pb-2.5">Name</th>
                            <th className="pb-2.5">Mobile</th>
                            <th className="pb-2.5">Aadhar</th>
                            <th className="pb-2.5">PAN</th>
                            <th className="pb-2.5">Address</th>
                            <th className="pb-2.5 text-right pr-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {members.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                                <Badge variant="neutral" className="font-medium text-[10px]">
                                  {m.designation}
                                </Badge>
                              </td>
                              <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{m.name}</td>
                              <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">{m.phone || '—'}</td>
                              <td className="py-2.5 font-mono text-slate-500 text-[11px]">
                                {m.aadhar ? m.aadhar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : '—'}
                              </td>
                              <td className="py-2.5 font-mono text-slate-500 text-[11px] uppercase">{m.pan || '—'}</td>
                              <td className="py-2.5 text-slate-500 max-w-[150px] truncate" title={m.address}>
                                {m.address || '—'}
                              </td>
                              <td className="py-2.5 text-right pr-2 space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEditMember(m)} className="h-7 px-2">
                                  <Edit3 className="w-3 h-3 text-slate-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteMember(m.id)} className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: PARTIES & CRM */}
          {activeTab === 'parties' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{editingParty ? 'Edit Party Details' : 'Add Party / CRM Contact'}</CardTitle>
                  <CardDescription>
                    Manage donors, vendors, feed suppliers, customers, and volunteers with live outstanding balance tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Party Name (पक्षकार / व्यक्ति का नाम) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Kumar, Singhal Trading"
                        value={partyName}
                        onChange={e => setPartyName(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Party Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={partyType}
                        onChange={e => setPartyType(e.target.value as any)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="DONOR">DONOR (दानदाता)</option>
                        <option value="VENDOR">VENDOR (विक्रेता / आपूर्तिकर्ता)</option>
                        <option value="CUSTOMER">CUSTOMER (ग्राहक / खरीदार)</option>
                        <option value="VOLUNTEER">VOLUNTEER (सेवक / कार्यकर्ता)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        placeholder="9876543210"
                        value={partyPhone}
                        onChange={e => setPartyPhone(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        placeholder="ABCDE1234F"
                        value={partyPan}
                        onChange={e => setPartyPan(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 uppercase font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Aadhar Number
                      </label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012"
                        value={partyAadhar}
                        onChange={e => setPartyAadhar(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Postal Address
                      </label>
                      <input
                        type="text"
                        placeholder="Village, Town, District"
                        value={partyAddress}
                        onChange={e => setPartyAddress(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Button onClick={handleSaveParty} size="sm">
                      {editingParty ? <Save className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                      <span>{editingParty ? 'Update Party' : 'Add Party'}</span>
                    </Button>
                    {editingParty && (
                      <Button variant="outline" size="sm" onClick={resetPartyForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Parties Table */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle>All Parties & Contacts</CardTitle>
                      <CardDescription>Managed vendors, suppliers, and donors with live outstanding calculation</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search name or mobile..."
                        value={partySearch}
                        onChange={e => setPartySearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {parties.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No parties registered yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="pb-2.5">Party Name</th>
                            <th className="pb-2.5">Type</th>
                            <th className="pb-2.5">Mobile</th>
                            <th className="pb-2.5">Outstanding Balance</th>
                            <th className="pb-2.5">Address</th>
                            <th className="pb-2.5 text-right pr-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {parties
                            .filter(
                              p =>
                                p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
                                (p.phone && p.phone.includes(partySearch))
                            )
                            .map(p => {
                              const vouchers = GoshalaDB.getTable<any>('vouchers').filter(v => v.status === 'POSTED');
                              const partyVouchers = vouchers.filter(v => v.narration?.toLowerCase().includes(p.name.toLowerCase()));
                              const creditBillsSum = partyVouchers
                                .filter(v => v.entries.some((e: any) => e.ledgerId === 'l-liab-creditors' && !e.isDebit))
                                .reduce((s: number, v: any) => s + (v.entries.find((e: any) => e.ledgerId === 'l-liab-creditors')?.amount || 0), 0);
                              const paymentsSum = partyVouchers
                                .filter(v => v.entries.some((e: any) => e.ledgerId === 'l-liab-creditors' && e.isDebit))
                                .reduce((s: number, v: any) => s + (v.entries.find((e: any) => e.ledgerId === 'l-liab-creditors')?.amount || 0), 0);
                              const netOutstanding = (p.outstandingBalance || 0) + creditBillsSum - paymentsSum;

                              return (
                                <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                  <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center text-[10px]">
                                      {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{p.name}</span>
                                  </td>
                                  <td className="py-2.5">
                                    <Badge
                                      variant={
                                        p.type === 'DONOR'
                                          ? 'success'
                                          : p.type === 'VENDOR'
                                          ? 'warning'
                                          : 'neutral'
                                      }
                                      className="text-[10px]"
                                    >
                                      {p.type}
                                    </Badge>
                                  </td>
                                  <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">{p.phone || '—'}</td>
                                  <td className="py-2.5">
                                    {netOutstanding > 0 ? (
                                      <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                                        ₹{netOutstanding.toLocaleString('en-IN')} (Payable)
                                      </span>
                                    ) : netOutstanding < 0 ? (
                                      <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                                        ₹{Math.abs(netOutstanding).toLocaleString('en-IN')} (Advance)
                                      </span>
                                    ) : (
                                      <span className="font-mono text-xs text-slate-400">₹0.00</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-slate-500 max-w-[150px] truncate" title={p.address}>
                                    {p.address || '—'}
                                  </td>
                                  <td className="py-2.5 text-right pr-2 space-x-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditParty(p)} className="h-7 px-2">
                                      <Edit3 className="w-3 h-3 text-slate-600" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteParty(p.id)} className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: ACCOUNTING PREFERENCES */}
          {activeTab === 'acct_prefs' && (
            <Card>
              <CardHeader>
                <CardTitle>Accounting & Interface Preferences</CardTitle>
                <CardDescription>
                  Configure system display mode, default numbering templates, and active fiscal period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  {/* Mode Card */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Accounting Interface Mode
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Choose how transaction entries and reports are formatted across the entire application
                        </p>
                      </div>
                      <select
                        value={config.accountingMode || 'SIMPLE'}
                        onChange={e => setConfig({ ...config, accountingMode: e.target.value as any })}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="SIMPLE">Simple Mode (पैसा आया / पैसा गया)</option>
                        <option value="PROFESSIONAL">Professional CA Mode (Dr / Cr Journal)</option>
                      </select>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                      {config.accountingMode === 'PROFESSIONAL' ? (
                        <p>
                          <strong>Professional Mode:</strong> Displays standard double-entry Debit (Dr), Credit (Cr),
                          general ledger journals, and audited financial statements formatting.
                        </p>
                      ) : (
                        <p>
                          <strong>Simple Mode:</strong> Uses intuitive non-technical terminology (Income, Expense,
                          Money In, Money Out, Cash, Bank) suited for general trustees and staff.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Voucher Number Prefix Format
                      </label>
                      <input
                        type="text"
                        value={config.voucherNumberFormat || 'V-{TYPE}-{NUM}'}
                        onChange={e => setConfig({ ...config, voucherNumberFormat: e.target.value })}
                        placeholder="V-{TYPE}-{NUM}"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                      <p className="text-[10px] text-slate-400">
                        Use &#123;TYPE&#125; for voucher code and &#123;NUM&#125; for automatic sequence
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Receipt Number Format
                      </label>
                      <input
                        type="text"
                        value={config.receiptFormat || 'R-{NUM}'}
                        onChange={e => setConfig({ ...config, receiptFormat: e.target.value })}
                        placeholder="R-{NUM}"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Default Financial Year
                      </label>
                      <select
                        value={config.activeFyId || 'fy-2025-26'}
                        onChange={e => setConfig({ ...config, activeFyId: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        {fys.map(fy => (
                          <option key={fy.id} value={fy.id}>
                            {fy.name} ({fy.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button type="submit">
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      <span>Save Preferences</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: TAX & REGISTRATIONS */}
          {activeTab === 'tax' && (
            <Card>
              <CardHeader>
                <CardTitle>Tax Exemption & Module Parameters</CardTitle>
                <CardDescription>
                  Enable statutory taxation compliance clauses, Section 12A/80G certificates, and withholding TDS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          12A Income Tax Certification
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Includes statutory 12A non-profit exemption clauses on printed vouchers and receipts
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!config.enable12A}
                        onChange={e => setConfig({ ...config, enable12A: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          80G Tax Exemption (Donation Receipts)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Enables Section 80G deduction certificate numbers on donor receipts
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!config.enable80G}
                        onChange={e => setConfig({ ...config, enable80G: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          GST Sub-System Module
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Enables CGST/SGST ledger selections and tax billing line item calculations
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!config.enableGST}
                        onChange={e => setConfig({ ...config, enableGST: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          TDS Receivables Ledger
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Tracks withholding tax deductions on government grant transfers and bank interest
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!config.enableTDS}
                        onChange={e => setConfig({ ...config, enableTDS: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button type="submit">
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      <span>Save Tax Settings</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 6: BANK & CASH BALANCES */}
          {activeTab === 'bank' && (
            <div className="space-y-6">
              {/* Starting Balances */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle>Bank & Cash Starting Balances</CardTitle>
                      <CardDescription>
                        Set opening balances for active bank ledgers and cash-in-hand accounts
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={isOpLocked ? 'warning' : 'success'} className="text-[10px]">
                        {isOpLocked ? (
                          <span className="flex items-center">
                            <Lock className="w-3 h-3 mr-1" /> Balances Locked
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Unlock className="w-3 h-3 mr-1" /> Balances Unlocked
                          </span>
                        )}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={handleToggleOpLock}>
                        {isOpLocked ? 'Unlock Balances' : 'Lock Balances'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveBankBalances} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {ledgersList
                        .filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable')
                        .map(l => (
                          <div key={l.id} className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {l.name} (₹)
                            </label>
                            <input
                              type="number"
                              required
                              disabled={isOpLocked}
                              value={bankBalances[l.id] !== undefined ? bankBalances[l.id] : l.openingBalance || 0}
                              onChange={e => setBankBalances({ ...bankBalances, [l.id]: Number(e.target.value) })}
                              className={`w-full h-9 px-3 rounded-lg border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900 ${
                                isOpLocked
                                  ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                              }`}
                            />
                          </div>
                        ))}
                    </div>

                    {!isOpLocked && (
                      <div className="flex justify-start pt-2">
                        <Button type="submit" size="sm">
                          <Save className="w-3.5 h-3.5 mr-1" />
                          <span>Save Starting Balances</span>
                        </Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* Manage Banks Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Manage Bank Accounts</CardTitle>
                  <CardDescription>All linked savings, current, and depository accounts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="pb-2.5">Code</th>
                          <th className="pb-2.5">Bank Name</th>
                          <th className="pb-2.5 text-right">Starting Balance</th>
                          <th className="pb-2.5 text-right pr-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ledgersList
                          .filter(l => l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable')
                          .map(l => (
                            <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                                {l.code}
                              </td>
                              <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{l.name}</td>
                              <td className="py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                                ₹{l.openingBalance.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 text-right pr-2">
                                {l.id === 'l-cash' ? (
                                  <Badge variant="neutral" className="text-[10px]">
                                    System Ledger
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteBankAccount(l.id)}
                                    className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add New Bank */}
                  <form
                    onSubmit={handleAddBankAccount}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
                  >
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Add New Bank Account
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Bank Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. State Bank of India"
                          value={newBankName}
                          onChange={e => setNewBankName(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Ledger Code</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 1004"
                          value={newBankCode}
                          onChange={e => setNewBankCode(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Starting Balance (₹)
                        </label>
                        <input
                          type="number"
                          required
                          value={newBankOpenBalance}
                          onChange={e => setNewBankOpenBalance(Number(e.target.value))}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Add Bank Account</span>
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 7: FINANCIAL YEARS */}
          {activeTab === 'fys' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Years Manager</CardTitle>
                  <CardDescription>
                    Create accounting periods, carry forward closing ledger balances, and enforce year-end closure policies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="pb-2.5">Year Name</th>
                          <th className="pb-2.5">Start Date</th>
                          <th className="pb-2.5">End Date</th>
                          <th className="pb-2.5">Status</th>
                          <th className="pb-2.5 text-right pr-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {fys.map(fy => (
                          <tr key={fy.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">{fy.name}</td>
                            <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">{fy.startDate}</td>
                            <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">{fy.endDate}</td>
                            <td className="py-2.5">
                              <Badge
                                variant={fy.status === 'ACTIVE' ? 'success' : 'danger'}
                                className="text-[10px]"
                              >
                                {fy.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right pr-2 space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleFyStatus(fy.id, fy.status)}
                                className="h-7 text-xs"
                              >
                                {fy.status === 'ACTIVE' ? 'Close Period' : 'Reactivate'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteFy(fy.id)}
                                className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add FY Form */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Create New Financial Year
                    </h4>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="e.g. 2026-27"
                        value={newFyName}
                        onChange={e => setNewFyName(e.target.value)}
                        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                      <Button size="sm" onClick={handleAddFy}>
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Add Financial Year</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 8: COST CENTERS */}
          {activeTab === 'cost_centers' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Cost Centers</CardTitle>
                  <CardDescription>
                    Allocate expenditure budgets, track department spends, and control cost overruns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="pb-2.5">Cost Center Name</th>
                          <th className="pb-2.5 text-right">Allocated Budget</th>
                          <th className="pb-2.5 text-right">Total Spent</th>
                          <th className="pb-2.5 text-right pr-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {costCenters.map(cc => (
                          <tr key={cc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">{cc.name}</td>
                            <td className="py-2.5 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                              ₹{(cc.allocatedBudget || (cc as any).budgetLimit || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                              ₹{(cc.spentAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 text-right pr-2 space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingCc(cc)}
                                className="h-7 px-2"
                              >
                                <Edit3 className="w-3 h-3 text-slate-600" />
                              </Button>
                              {cc.id !== 'cc-general' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCc(cc.id)}
                                  className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Cost Center */}
                  <form
                    onSubmit={handleAddCc}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
                  >
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Add New Cost Center
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Cost Center Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Veterinary Hospital Setup"
                          value={newCcName}
                          onChange={e => setNewCcName(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Allocated Budget (₹)
                        </label>
                        <input
                          type="number"
                          required
                          value={newCcBudget}
                          onChange={e => setNewCcBudget(Number(e.target.value))}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Create Cost Center</span>
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Edit Modal */}
              <Modal
                isOpen={!!editingCc}
                onClose={() => setEditingCc(null)}
                title="Edit Cost Center Budget"
                description="Update the allocated expenditure budget limit"
              >
                {editingCc && (
                  <form onSubmit={handleUpdateCc} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Cost Center Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editingCc.name}
                        onChange={e => setEditingCc({ ...editingCc, name: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Allocated Budget (₹)
                      </label>
                      <input
                        type="number"
                        required
                        value={
                          editingCc.allocatedBudget !== undefined
                            ? editingCc.allocatedBudget
                            : (editingCc as any).budgetLimit || 0
                        }
                        onChange={e => setEditingCc({ ...editingCc, allocatedBudget: Number(e.target.value) })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button variant="outline" type="button" onClick={() => setEditingCc(null)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </form>
                )}
              </Modal>
            </div>
          )}

          {/* TAB 9: PAYMENT MODES */}
          {activeTab === 'pay_modes' && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Modes Manager</CardTitle>
                <CardDescription>
                  Configure active settlement methods available on voucher entry forms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  {paymentModes.map((mode, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    >
                      {editingPayModeIdx === idx ? (
                        <input
                          type="text"
                          value={editPayModeValue}
                          onChange={e => setEditPayModeValue(e.target.value)}
                          className="h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase text-slate-900 dark:text-slate-100"
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                            {mode}
                          </span>
                        </div>
                      )}

                      <div className="space-x-1">
                        {editingPayModeIdx === idx ? (
                          <Button size="sm" onClick={() => handleSaveEditPayMode(idx)} className="h-7 text-xs">
                            Save
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEditPayMode(idx)}
                            className="h-7 px-2"
                          >
                            <Edit3 className="w-3 h-3 text-slate-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayMode(idx)}
                          className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Payment Mode */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Add Payment Mode
                  </h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. CARD or NET_BANKING"
                      value={newPayMode}
                      onChange={e => setNewPayMode(e.target.value)}
                      className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono uppercase text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <Button size="sm" onClick={handleAddPayMode}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Add Mode</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 10: CHART OF ACCOUNTS (LEDGER MANAGER) */}
          {activeTab === 'ledgers' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Chart of Accounts Directory</CardTitle>
                      <CardDescription>
                        Hierarchical tree structure of all asset, liability, income, expense, and equity ledger accounts
                      </CardDescription>
                    </div>
                    <Badge variant="neutral">{ledgersList.length} Total Accounts</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* COA Groups */}
                  {[
                    { key: 'ASSET', title: '1. ASSETS (संपत्तियां)', subtitle: 'Cash, Bank, Fixed Assets & Receivables' },
                    { key: 'LIABILITY', title: '2. LIABILITIES (देनदारियां व ऋण)', subtitle: 'Bank Loans, Borrowings & Creditors' },
                    { key: 'INCOME', title: '3. INCOME (आय खाता)', subtitle: 'Donations, Grants, Milk & Cattle Sales' },
                    { key: 'EXPENSE', title: '4. EXPENSES (व्यय खाता)', subtitle: 'Feed, Labor, Utilities, Veterinary & Repairs' },
                    { key: 'CAPITAL', title: '5. EQUITY & CAPITAL (पूंजी व संचय)', subtitle: 'Corpus Funds & Reserve Funds' }
                  ].map(group => {
                    const isExp = expandedFolders[group.key] !== false;
                    const groupLedgers = ledgersList.filter(l => l.type === group.key);

                    return (
                      <div
                        key={group.key}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs"
                      >
                        <div
                          onClick={() => setExpandedFolders({ ...expandedFolders, [group.key]: !isExp })}
                          className="p-3 flex justify-between items-center cursor-pointer select-none bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            {isExp ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <Folder className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{group.title}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({group.subtitle})</span>
                          </div>
                          <Badge variant="neutral" className="text-[10px] font-mono">
                            {groupLedgers.length} Accounts
                          </Badge>
                        </div>

                        {isExp && (
                          <div className="p-2 bg-white dark:bg-slate-900/30 divide-y divide-slate-100 dark:divide-slate-800/60">
                            {groupLedgers.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic py-2 px-3">No accounts in this folder.</p>
                            ) : (
                              groupLedgers.map(l => (
                                <div
                                  key={l.id}
                                  className="py-2 px-3 flex justify-between items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-lg transition-colors"
                                >
                                  <div className="flex items-center space-x-3">
                                    <span className="font-mono text-[10px] font-bold text-slate-400">
                                      [{l.code}]
                                    </span>
                                    <div>
                                      <h4 className="font-medium text-slate-900 dark:text-slate-100 text-xs">
                                        {l.name}
                                      </h4>
                                      <p className="text-[10px] text-slate-400">
                                        Group: {l.groupId} • Bal: ₹{l.currentBalance.toLocaleString('en-IN')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono text-[11px] text-slate-500">
                                      Op: ₹{l.openingBalance.toLocaleString('en-IN')}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingLedger(l)}
                                      className="h-6 px-2 text-[10px]"
                                    >
                                      Edit
                                    </Button>
                                    {!l.isSystem && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteLedger(l.id)}
                                        className="h-6 px-2 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                      >
                                        Delete
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Custom Ledger Form */}
                  <form
                    onSubmit={handleAddLedger}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
                  >
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Add Custom Ledger Account
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Account Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Veterinary Medicine Supply"
                          value={newLName}
                          onChange={e => setNewLName(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Account Code
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 5012"
                          value={newLCode}
                          onChange={e => setNewLCode(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Parent Group
                        </label>
                        <select
                          value={newLGroup}
                          onChange={e => {
                            setNewLGroup(e.target.value);
                            const matchedType = groups.find(g => g.id === e.target.value)?.type || 'EXPENSE';
                            setNewLType(matchedType as any);
                          }}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.name} ({g.type})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Opening Balance (₹)
                        </label>
                        <input
                          type="number"
                          value={newLOpenBal}
                          onChange={e => setNewLOpenBal(Number(e.target.value))}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Create Account Ledger</span>
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Edit Ledger Modal */}
              <Modal
                isOpen={!!editingLedger}
                onClose={() => setEditingLedger(null)}
                title="Edit Account Ledger"
                description="Update ledger name, account code, and starting opening balance"
              >
                {editingLedger && (
                  <form onSubmit={handleUpdateLedger} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Ledger Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editingLedger.name}
                        onChange={e => setEditingLedger({ ...editingLedger, name: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Account Code
                      </label>
                      <input
                        type="text"
                        required
                        value={editingLedger.code}
                        onChange={e => setEditingLedger({ ...editingLedger, code: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Opening Balance (₹)
                      </label>
                      <input
                        type="number"
                        required
                        value={editingLedger.openingBalance}
                        onChange={e =>
                          setEditingLedger({ ...editingLedger, openingBalance: Number(e.target.value) })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button variant="outline" type="button" onClick={() => setEditingLedger(null)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </form>
                )}
              </Modal>
            </div>
          )}

          {/* TAB 11: PRINT TEMPLATES */}
          {activeTab === 'print' && (
            <Card>
              <CardHeader>
                <CardTitle>Voucher & Slip Print Templates</CardTitle>
                <CardDescription>
                  Letterhead header/footer lines, signatory descriptions, paper size parameters, and automatic receipt notes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Print Header Text
                      </label>
                      <textarea
                        rows={2}
                        value={config.printHeader || ''}
                        onChange={e => setConfig({ ...config, printHeader: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Print Footer Text
                      </label>
                      <textarea
                        rows={2}
                        value={config.printFooter || ''}
                        onChange={e => setConfig({ ...config, printFooter: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Authorized Signatory Title
                      </label>
                      <input
                        type="text"
                        value={config.authorizedSignatory || ''}
                        onChange={e => setConfig({ ...config, authorizedSignatory: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Paper Standard
                      </label>
                      <select
                        value={config.paperSize || 'A4'}
                        onChange={e => setConfig({ ...config, paperSize: e.target.value as any })}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="A4">A4 (Standard Sheet)</option>
                        <option value="A5">A5 (Half Letter Receipt Slip)</option>
                        <option value="Letter">US Letter</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Category-specific Receipt Note Templates
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Pre-defined payment acknowledgment text printed automatically for specific expense ledgers
                      </p>
                    </div>

                    <div className="space-y-3">
                      {ledgersList
                        .filter(l => l.type === 'EXPENSE')
                        .map(l => (
                          <div key={l.id} className="space-y-1">
                            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                              {l.name}
                            </label>
                            <input
                              type="text"
                              value={config.receiptTemplates?.[l.id] || ''}
                              onChange={e => {
                                const temps = { ...config.receiptTemplates, [l.id]: e.target.value };
                                setConfig({ ...config, receiptTemplates: temps });
                              }}
                              placeholder="e.g. Received payment for supervisor wages..."
                              className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </div>
                        ))}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          Default Fallback Note
                        </label>
                        <input
                          type="text"
                          value={config.receiptTemplates?.['default'] || ''}
                          onChange={e => {
                            const temps = { ...config.receiptTemplates, default: e.target.value };
                            setConfig({ ...config, receiptTemplates: temps });
                          }}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button type="submit">
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      <span>Save Print Templates</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 12: APP SECURITY */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Application PIN Security</CardTitle>
                <CardDescription>
                  Configure 4-digit terminal protection PIN for critical ledger updates and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {t('current_pin_label')}
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        maxLength={4}
                        placeholder="••••"
                        value={currentPinText}
                        onChange={e => setCurrentPinText(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {t('new_pin_label')}
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        maxLength={4}
                        placeholder="••••"
                        value={newPinText}
                        onChange={e => setNewPinText(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleSavePin}>
                    <KeyRound className="w-3.5 h-3.5 mr-1" />
                    <span>{t('save_pin_btn')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 13: BACKUP & DANGER ZONE */}
          {activeTab === 'danger_zone' && (
            <div className="space-y-6">
              {/* Backups */}
              <Card>
                <CardHeader>
                  <CardTitle>Database Backup & Restore</CardTitle>
                  <CardDescription>
                    Export portable JSON snapshots of all vouchers, ledgers, and configurations or restore previous snapshots
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportBackup}>
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      <span>Export Database Backup (.json)</span>
                    </Button>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="secondary" size="sm">
                        <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                        <span>Restore Backup File</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone Controls */}
              <Card className="border-rose-200 dark:border-rose-900/50">
                <CardHeader className="bg-rose-50/50 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100 dark:border-rose-900/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <CardTitle className="text-rose-700 dark:text-rose-300">
                        System Reset & Danger Controls
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDangerZone(!showDangerZone)}
                      className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-100/60"
                    >
                      {showDangerZone ? 'Hide Controls' : 'Reveal Controls'}
                    </Button>
                  </div>
                </CardHeader>
                {showDangerZone && (
                  <CardContent className="pt-5 space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Warning: Use these operations with extreme caution. Always export a local database backup first.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                            Factory Database Reset
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Clears custom user vouchers and additions. Restores baseline audited CA records and resets PIN.
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          className="w-full"
                          onClick={() => requirePin(handleResetDatabase)}
                        >
                          Re-seed Baseline Database
                        </Button>
                      </div>

                      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-900 space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                            Clear Vouchers & Start Clean
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Wipes all vouchers, loans, and transaction records to provide an empty ledger (₹0.00).
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-amber-700 border-amber-200 hover:bg-amber-50"
                          onClick={() => requirePin(handleClearAllTransactions)}
                        >
                          Clear All Vouchers
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Security PIN verification modal */}
      <Modal
        isOpen={!!pinPromptAction}
        onClose={() => setPinPromptAction(null)}
        title="Security PIN Verification"
        description="Enter your 4-digit PIN to authenticate this operation"
      >
        <div className="space-y-4">
          <div className="flex justify-center py-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
          </div>
          <input
            type="password"
            autoComplete="new-password"
            maxLength={4}
            placeholder="••••"
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            className="w-full h-11 text-center tracking-[1em] text-xl font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          {pinError && (
            <p className="text-xs text-rose-600 text-center font-medium">
              Incorrect Security PIN. Please try again.
            </p>
          )}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              type="button"
              onClick={() => setPinPromptAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              type="button"
              onClick={() => {
                const currentPin = localStorage.getItem('goshala_erp_app_pin') || '';
                if (currentPin && pinInput === currentPin) {
                  const actionToExec = pinPromptAction;
                  setPinPromptAction(null);
                  if (actionToExec) {
                    actionToExec();
                  }
                } else {
                  setPinError(true);
                }
              }}
            >
              Verify & Proceed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
