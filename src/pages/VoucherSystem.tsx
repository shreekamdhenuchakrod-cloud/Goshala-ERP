import React, { useState, useEffect, useMemo } from 'react';
import { GoshalaDB } from '../db/db';
import { Ledger, Voucher, CostCenter, CRMContact as Contact, VoucherType, ERPConfig } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage, formatBilingual } from '../hooks/useLanguage';
import {
  Plus,
  Search,
  X,
  Printer,
  Image,
  Trash2,
  Calendar,
  Eye,
  CreditCard,
  ChevronRight,
  FileText,
  CheckCircle2,
  Building2,
  Landmark,
  Wallet,
  Receipt,
  Edit3,
  Layers,
  ArrowRight,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';

const amountToHindiWords = (num: number): string => {
  if (!num || isNaN(num)) return 'शून्य रुपये';
  const integerPart = Math.floor(Math.abs(num));
  const paisePart = Math.round((Math.abs(num) - integerPart) * 100);

  const units = ['', 'एक', 'दो', 'तीन', 'चार', 'पांच', 'छह', 'सात', 'आठ', 'नौ', 'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस'];
  const tens = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे'];

  const convertHindiInt = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' सौ' + (n % 100 ? ' ' + convertHindiInt(n % 100) : '');
    if (n < 100000) return convertHindiInt(Math.floor(n / 1000)) + ' हजार' + (n % 1000 ? ' ' + convertHindiInt(n % 1000) : '');
    if (n < 10000000) return convertHindiInt(Math.floor(n / 100000)) + ' लाख' + (n % 100000 ? ' ' + convertHindiInt(n % 100000) : '');
    return convertHindiInt(Math.floor(n / 10000000)) + ' करोड़' + (n % 10000000 ? ' ' + convertHindiInt(n % 10000000) : '');
  };

  let res = convertHindiInt(integerPart).trim();
  if (!res) res = 'शून्य';
  res += ' रुपये';
  if (paisePart > 0) {
    const paiseText = convertHindiInt(paisePart).trim();
    res += ` ${paiseText} पैसे`;
  }
  return res + ' मात्र';
};

const amountToWords = (num: number): string => {
  if (isNaN(num)) return 'Zero Rupees Only';
  if (num === 0) return 'Zero Rupees Only';
  if (num < 0) return 'Minus ' + amountToWords(Math.abs(num));

  const integerPart = Math.floor(num);
  const paisePart = Math.round((num - integerPart) * 100);

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertSubCrore = (n: number): string => {
    let str = '';
    if (Math.floor(n / 10000000) > 0) {
      str += convertSubCrore(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (Math.floor(n / 100000) > 0) {
      str += convertSubCrore(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (Math.floor(n / 1000) > 0) {
      str += convertSubCrore(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (Math.floor(n / 100) > 0) {
      str += convertSubCrore(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) str += a[n];
      else str += b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : ' ');
    }
    return str;
  };

  let words = convertSubCrore(integerPart).trim();
  if (!words) words = 'Zero';
  words += ' Rupees';

  if (paisePart > 0) {
    const paiseWords = convertSubCrore(paisePart).trim();
    words += ` and ${paiseWords} Paise`;
  }
  return words + ' Only';
};

export const VoucherSystem: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  // App Configuration
  const [config, setConfig] = useState<ERPConfig>({
    activeFyId: 'fy-2025-26',
    voucherNumberFormat: 'V-{TYPE}-{NUM}',
    receiptFormat: 'R-{NUM}',
    taxRate: 5,
    letterheadText: 'Shree Krishna Balram Goushala\nChakrod, Shajapur (M.P.)\n12A & 80G Certified Non-Profit Organisation',
    enable80G: true,
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
  const [fys, setFys] = useState<any[]>([]);
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
  const [billFile, setBillFile] = useState('');
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);

  // Dynamic Contact quick creation
  const [showQuickContact, setShowQuickContact] = useState(false);
  const [quickContactName, setQuickContactName] = useState('');
  const [quickContactPhone, setQuickContactPhone] = useState('');
  const [quickContactAddress, setQuickContactAddress] = useState('');
  const [quickContactType, setQuickContactType] = useState<'VENDOR' | 'VOLUNTEER' | 'DONOR' | 'CUSTOMER'>('VENDOR');

  // Quick Ledger Creator state & handlers
  const [showQuickLedgerModal, setShowQuickLedgerModal] = useState(false);
  const [quickLedgerType, setQuickLedgerType] = useState<'EXPENSE' | 'BANK_CASH' | 'INCOME' | 'LOAN'>('EXPENSE');
  const [quickLedgerName, setQuickLedgerName] = useState('');
  const [quickLedgerCode, setQuickLedgerCode] = useState('');
  const [quickOpeningBal, setQuickOpeningBal] = useState<number>(0);
  const [quickNotes, setQuickNotes] = useState('');
  const [quickGroup, setQuickGroup] = useState('');
  const [quickBankAccNo, setQuickBankAccNo] = useState('');
  const [quickBankIfsc, setQuickBankIfsc] = useState('');
  const [quickBankBranch, setQuickBankBranch] = useState('');
  const [quickCashOrBank, setQuickCashOrBank] = useState<'BANK' | 'CASH'>('BANK');
  const [quickInterestRate, setQuickInterestRate] = useState<number>(0);
  const [interestAmount, setInterestAmount] = useState<number>(0);
  const [customPrintName, setCustomPrintName] = useState('');

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedLedgerFilter, setSelectedLedgerFilter] = useState('');
  const [selectedCcFilter, setSelectedCcFilter] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState('');
  const [dateFilterRange, setDateFilterRange] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

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

    const handleNav = (e: any) => {
      if (e.detail?.openCreate) {
        setIsCreating(true);
      }
    };
    const handleUpdate = () => {
      loadDatabase();
    };

    window.addEventListener('goshala_nav', handleNav);
    window.addEventListener('goshala_voucher_updated', handleUpdate);
    window.addEventListener('goshala_db_updated', handleUpdate);
    return () => {
      window.removeEventListener('goshala_nav', handleNav);
      window.removeEventListener('goshala_voucher_updated', handleUpdate);
      window.removeEventListener('goshala_db_updated', handleUpdate);
    };
  }, []);

  const loadDatabase = () => {
    const table = GoshalaDB.getTable<ERPConfig>('config');
    if (table.length > 0) {
      setConfig({
        enable80G: true,
        samitiName: 'Shree Krishna Balram Goushala',
        address: 'Chakrod, Shajapur (M.P.)',
        mobileNumber: '9876543210',
        registrationNo: '410/2012',
        ...table[0],
      });
    }
    setVouchers(
      GoshalaDB.getTable<Voucher>('vouchers').sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        const tsA = a.createdAt || '';
        const tsB = b.createdAt || '';
        if (tsA !== tsB) return tsB.localeCompare(tsA);
        return b.voucherNumber.localeCompare(a.voucherNumber);
      })
    );
    setLedgers(GoshalaDB.getTable<Ledger>('ledgers'));
    setCostCenters(GoshalaDB.getTable<CostCenter>('cost_centers'));
    setContacts(GoshalaDB.getTable<Contact>('contacts'));
    setFys(GoshalaDB.getTable<any>('fys'));
  };

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
    } catch {
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

          let quality = 0.75;
          let resultBase64 = canvas.toDataURL('image/jpeg', quality);
          let sizeInBytes = Math.round(((resultBase64.length - 22) * 3) / 4);

          while (sizeInBytes > 150 * 1024 && quality > 0.2) {
            quality -= 0.1;
            resultBase64 = canvas.toDataURL('image/jpeg', quality);
            sizeInBytes = Math.round(((resultBase64.length - 22) * 3) / 4);
          }

          resolve(resultBase64);
        };
        img.onerror = () => reject(new Error('Image loading failed.'));
      };
      reader.onerror = () => reject(new Error('File reading failed.'));
    });
  };

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
      communicationHistory: [],
    };
    conList.push(newContact);
    GoshalaDB.saveTable('contacts', conList);
    setContacts(conList);
    setSelectedContactId(newId);
    setShowQuickContact(false);
    alert(`Party "${quickContactName}" created successfully.`);
  };

  const generateAutoCode = (type: string) => {
    const allLedgers = GoshalaDB.getTable<Ledger>('ledgers');
    let prefix = 'EXP';
    if (type === 'INCOME') prefix = 'INC';
    else if (type === 'BANK_CASH' || type === 'BANK') prefix = 'BANK';
    else if (type === 'CASH') prefix = 'CASH';
    else if (type === 'LOAN') prefix = 'LOAN';
    else if (type === 'PARTY') prefix = 'PARTY';

    const count = allLedgers.filter((l) => l.code && l.code.toUpperCase().startsWith(prefix)).length + 1;
    return `${prefix}${String(count).padStart(3, '0')}`;
  };

  const handleOpenQuickLedger = (type: 'EXPENSE' | 'BANK_CASH' | 'INCOME' | 'LOAN') => {
    setQuickLedgerType(type);
    setQuickLedgerName('');
    setQuickOpeningBal(0);
    setQuickNotes('');
    setQuickGroup('');
    setQuickBankAccNo('');
    setQuickBankIfsc('');
    setQuickBankBranch('');
    setQuickCashOrBank('BANK');
    setQuickInterestRate(0);
    setQuickLedgerCode(generateAutoCode(type));
    setShowQuickLedgerModal(true);
  };

  const handleSaveQuickLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLedgerName) return;

    const allLedgers = GoshalaDB.getTable<Ledger>('ledgers');
    const newId = `l-${Date.now()}`;

    let groupId = quickGroup || 'g-expense';
    let ledgerType: 'EXPENSE' | 'INCOME' | 'ASSET' | 'LIABILITY' | 'CAPITAL' = 'EXPENSE';
    let fullName = quickLedgerName;

    if (quickLedgerType === 'INCOME') {
      groupId = quickGroup || 'g-income';
      ledgerType = 'INCOME';
    } else if (quickLedgerType === 'BANK_CASH') {
      groupId = 'g-current-assets';
      ledgerType = 'ASSET';
      if (quickCashOrBank === 'BANK' && quickBankAccNo) {
        fullName = `${quickLedgerName} (A/c: ${quickBankAccNo})`;
        const bankAccounts = GoshalaDB.getTable<any>('bank_accounts');
        bankAccounts.push({
          id: newId,
          bankName: quickLedgerName,
          accountNumber: quickBankAccNo,
          ifscCode: quickBankIfsc,
          branchName: quickBankBranch,
          currentBalance: Number(quickOpeningBal) || 0,
        });
        GoshalaDB.saveTable('bank_accounts', bankAccounts);
      }
    } else if (quickLedgerType === 'LOAN') {
      groupId = 'g-loans-liab';
      ledgerType = 'LIABILITY';
      fullName = `${quickLedgerName} Loan`;

      const loans = GoshalaDB.getTable<any>('loans');
      loans.push({
        id: newId,
        type: 'TAKEN',
        partyName: quickLedgerName,
        principalAmount: Number(quickOpeningBal) || 100000,
        interestRate: Number(quickInterestRate) || 0,
        installments: 12,
        outstandingAmount: Number(quickOpeningBal) || 100000,
        dateDisbursed: new Date().toISOString().split('T')[0],
        history: [],
      });
      GoshalaDB.saveTable('loans', loans);
    }

    const newLedger: Ledger = {
      id: newId,
      code: quickLedgerCode || generateAutoCode(quickLedgerType),
      name: fullName,
      groupId: groupId,
      type: ledgerType,
      openingBalance: Number(quickOpeningBal) || 0,
      currentBalance: Number(quickOpeningBal) || 0,
      isSystem: false,
    };

    const updated = [...allLedgers, newLedger];
    GoshalaDB.saveTable('ledgers', updated);
    setLedgers(updated);
    GoshalaDB.recalculateLedgers();

    if (quickLedgerType === 'EXPENSE' || quickLedgerType === 'INCOME' || quickLedgerType === 'LOAN') {
      setSelectedParticular(newId);
    } else if (quickLedgerType === 'BANK_CASH') {
      setSelectedCashBank(newId);
    }

    setShowQuickLedgerModal(false);
    alert(`Account "${fullName}" created successfully.`);
  };

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();

    const activeFy = GoshalaDB.getActiveFy();
    if (activeFy && activeFy.status !== 'ACTIVE') {
      alert(`ERROR: Financial Year (${activeFy.name}) is CLOSED or LOCKED. Unlock it in Settings first.`);
      return;
    }

    if (activeFy) {
      if (vDate < activeFy.startDate || vDate > activeFy.endDate) {
        alert(
          `Date Error: Voucher date (${vDate}) must be within active Financial Year (${activeFy.name}) bounds (${activeFy.startDate} to ${activeFy.endDate}).`
        );
        return;
      }
    }

    if (!selectedParticular || !selectedCashBank || singleAmount <= 0) {
      alert('Voucher contains invalid amounts or unassigned ledgers. Please verify fields.');
      return;
    }

    const createEntry = (ledgerId: string, amount: number, isDebit: boolean, contactId?: string) => {
      const entry: { ledgerId: string; amount: number; isDebit: boolean; subLedgerId?: string } = {
        ledgerId,
        amount,
        isDebit,
      };
      if (contactId && contactId.trim()) {
        entry.subLedgerId = contactId.trim();
      }
      return entry;
    };

    const entries = [];

    if (vType === 'PAYMENT' || vType === 'SUPPLIER_PAYMENT') {
      entries.push(createEntry(selectedParticular, singleAmount, true, selectedContactId));
      entries.push(createEntry(selectedCashBank, singleAmount, false));
    } else if (vType === 'PURCHASE') {
      entries.push(createEntry(selectedParticular, singleAmount, true));
      entries.push(createEntry(selectedCashBank, singleAmount, false, selectedContactId));
    } else if (vType === 'RECEIPT') {
      entries.push(createEntry(selectedCashBank, singleAmount, true));
      entries.push(createEntry(selectedParticular, singleAmount, false, selectedContactId));
    } else if (vType === 'LOAN_REPAYMENT') {
      entries.push(createEntry(selectedParticular, singleAmount, true, selectedContactId));
      if (interestAmount > 0) {
        entries.push(createEntry('l-exp-interest', interestAmount, true));
      }
      entries.push(createEntry(selectedCashBank, singleAmount + interestAmount, false));
    } else if (vType === 'CONTRA' || vType === 'JOURNAL') {
      entries.push(createEntry(selectedParticular, singleAmount, true, selectedContactId));
      entries.push(createEntry(selectedCashBank, singleAmount, false));
    }

    if (editingVoucher) {
      const vToSave: Voucher = {
        ...editingVoucher,
        fyId: editingVoucher.fyId || GoshalaDB.getActiveFyId(),
        date: vDate,
        voucherType: vType,
        costCenterId: vCostCenter,
        entries,
        narration: vNarration,
        paymentMode: selectedPaymentMode as any,
        attachments: billFile ? [billFile] : [],
        referenceDetails: `${selectedPaymentMode} • Ref: ${upiReference || chequeNumber || '—'}`,
        status: editingVoucher.status || 'POSTED',
      };
      GoshalaDB.saveVoucher(vToSave, user);
    } else {
      const vToSave: Voucher = {
        id: `v-${Date.now()}`,
        fyId: GoshalaDB.getActiveFyId(),
        voucherNumber: '',
        voucherType: vType,
        date: vDate,
        status: 'POSTED',
        costCenterId: vCostCenter,
        narration: vNarration,
        entries,
        attachments: billFile ? [billFile] : [],
        paymentMode: selectedPaymentMode as any,
        referenceDetails: `${selectedPaymentMode} • Ref: ${upiReference || chequeNumber || '—'}`,
        auditTrail: [],
      };
      GoshalaDB.saveVoucher(vToSave, user);
    }

    // Note: Cost center spent amount is recalculated automatically inside GoshalaDB.saveVoucher -> recalculateLedgers()

    alert(editingVoucher ? 'Voucher updated successfully.' : 'Voucher posted successfully.');
    handleDiscard();
    loadDatabase();
  };

  const handleDiscard = () => {
    setIsCreating(false);
    setEditingVoucher(null);
    setSelectedCashBank('');
    setSelectedParticular('');
    setSingleAmount(0);
    setInterestAmount(0);
    setVNarration('');
    setSelectedContactId('');
    setUpiReference('');
    setChequeNumber('');
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

      const interestEntry = v.entries.find((e) => e.isDebit && e.ledgerId === 'l-exp-interest');
      const principalDeb = v.entries.find((e) => e.isDebit && e.ledgerId !== 'l-exp-interest');
      const deb = v.entries.find((e) => e.isDebit);
      const cred = v.entries.find((e) => !e.isDebit);

      if (v.voucherType === 'LOAN_REPAYMENT') {
        setSelectedParticular(principalDeb?.ledgerId || '');
        setSelectedCashBank(cred?.ledgerId || '');
        setSingleAmount(principalDeb?.amount || 0);
        setInterestAmount(interestEntry?.amount || 0);
      } else if (v.voucherType === 'PAYMENT' || v.voucherType === 'SUPPLIER_PAYMENT') {
        setSelectedParticular(deb?.ledgerId || '');
        setSelectedCashBank(cred?.ledgerId || '');
        setSingleAmount(deb?.amount || 0);
        setInterestAmount(0);
      } else if (v.voucherType === 'RECEIPT') {
        setSelectedParticular(cred?.ledgerId || '');
        setSelectedCashBank(deb?.ledgerId || '');
        setSingleAmount(deb?.amount || 0);
        setInterestAmount(0);
      } else {
        setSelectedParticular(deb?.ledgerId || '');
        setSelectedCashBank(cred?.ledgerId || '');
        setSingleAmount(deb?.amount || 0);
        setInterestAmount(0);
      }

      setVNarration(v.narration);

      const entryWithSubLedger = v.entries.find((e) => e.subLedgerId);
      if (entryWithSubLedger && entryWithSubLedger.subLedgerId) {
        setSelectedContactId(entryWithSubLedger.subLedgerId);
      } else {
        const match = v.narration.match(/^\[([^\]]+)\]\s*(.*)/);
        if (match) {
          setVNarration(match[2]);
          const party = contacts.find((c) => c.name === match[1]);
          if (party) setSelectedContactId(party.id);
        }
      }

      setBillFile(v.attachments && v.attachments.length > 0 ? v.attachments[0] : '');
    });
  };

  const handleBulkDelete = () => {
    if (selectedVoucherIds.length === 0) return;
    if (!window.confirm('Are you sure you want to delete all selected vouchers?')) return;

    let currentVouchers = [...vouchers];
    selectedVoucherIds.forEach((id) => {
      currentVouchers = currentVouchers.filter((v) => v.id !== id);
    });
    GoshalaDB.saveTable('vouchers', currentVouchers);
    GoshalaDB.recalculateLedgers();

    setVouchers(currentVouchers);
    setSelectedVoucherIds([]);
    alert('Selected vouchers deleted.');
  };

  const handleDeleteVoucher = (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this voucher?')) return;
    requirePin(() => {
      const dbVouchers = GoshalaDB.getTable<Voucher>('vouchers');
      const filtered = dbVouchers.filter((v) => v.id !== id);
      GoshalaDB.saveTable('vouchers', filtered);
      GoshalaDB.recalculateLedgers();
      alert('Voucher deleted successfully.');
      loadDatabase();
    });
  };

  const triggerPrintReceipt = (v: Voucher) => {
    setDonorName('');
    setDonorPan('');

    const match = v.narration.match(/^\[([^\]]+)\]/);
    if (match) {
      setDonorName(match[1]);
      const party = contacts.find((c) => c.name === match[1]);
      if (party) setDonorPan(party.phone || '—');
    }
    setPrintReceiptVoucher(v);
  };

  const triggerPrintPaymentSlip = (v: Voucher) => {
    setPrintPaymentVoucher(v);
  };

  const expenseLedgers = ledgers.filter((l) => l.type === 'EXPENSE');
  const incomeLedgers = ledgers.filter((l) => l.type === 'INCOME');
  const cashBankLedgers = ledgers.filter(
    (l) =>
      (l.groupId === 'g-current-assets' && l.id !== 'l-tds-receivable') ||
      l.groupId === 'g-current-liab' ||
      l.id === 'l-liab-creditors'
  );

  const getLedgerName = (id: string) => ledgers.find((l) => l.id === id)?.name || id;
  const getCostCenterName = (id?: string) => costCenters.find((c) => c.id === id)?.name || 'General';

  useEffect(() => {
    if (!editingVoucher) {
      const activeFyObj = GoshalaDB.getActiveFy();
      const fyMin = activeFyObj.startDate;
      const fyMax = activeFyObj.endDate;
      const today = new Date().toISOString().split('T')[0];

      if (today < fyMin) setVDate(fyMin);
      else if (today > fyMax) setVDate(fyMax);
      else setVDate(today);
    }
  }, [editingVoucher, isCreating]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const activeFyObj = GoshalaDB.getActiveFy();
      if (activeFyObj && v.date) {
        if (v.date < activeFyObj.startDate || v.date > activeFyObj.endDate) {
          return false;
        }
      } else if (activeFyObj && v.fyId && v.fyId !== activeFyObj.id) {
        return false;
      }

      const query = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        v.voucherNumber.toLowerCase().includes(query) ||
        v.narration.toLowerCase().includes(query) ||
        v.date.includes(query) ||
        v.entries.some(
          (e) => getLedgerName(e.ledgerId).toLowerCase().includes(query) || String(e.amount).includes(query)
        );

      const matchesCategory = !selectedCategoryFilter || v.entries.some((e) => e.ledgerId === selectedCategoryFilter);
      const matchesLedger = !selectedLedgerFilter || v.entries.some((e) => e.ledgerId === selectedLedgerFilter);
      const matchesCc = !selectedCcFilter || v.costCenterId === selectedCcFilter;
      const matchesMode = !selectedModeFilter || v.paymentMode === selectedModeFilter;

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
  }, [
    vouchers,
    searchTerm,
    selectedCategoryFilter,
    selectedLedgerFilter,
    selectedCcFilter,
    selectedModeFilter,
    dateFilterRange,
    customStartDate,
    customEndDate,
  ]);

  const paginatedVouchers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVouchers.slice(start, start + pageSize);
  }, [filteredVouchers, currentPage]);

  const activeFyObj = GoshalaDB.getActiveFy();
  const minDate = activeFyObj.startDate;
  const maxDate = activeFyObj.endDate;

  return (
    <div className="space-y-6 pb-12">
      {/* Lightbox attachment modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] overflow-hidden rounded-xl bg-black flex items-center justify-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 text-white/70 hover:text-white p-1 rounded-lg"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={lightboxImage} alt="Receipt Attachment" className="max-w-full max-h-[80vh] object-contain" />
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800 no-print">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Voucher Management System
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Double-entry journals, receipts, payments, supplier bills, and contra vouchers
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => {
              if (activeFyObj && (activeFyObj.status === 'LOCKED' || activeFyObj.status === 'CLOSED')) {
                alert(`Notice: Financial Year (${activeFyObj.name}) is LOCKED. Unlock in Settings to add entries.`);
                return;
              }
              setIsCreating(true);
            }}
            className="h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Voucher Entry</span>
          </button>
        )}
      </div>

      {/* FORM: CREATE/EDIT VOUCHER */}
      {isCreating ? (
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {editingVoucher ? 'Edit Transaction Voucher' : 'Record New Transaction Voucher'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified double-entry bookkeeping with real-time audit ledger validation
              </p>
            </div>
            <button
              onClick={handleDiscard}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title="Close form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateVoucher} className="space-y-6">
            {/* Metadata inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 dark:text-slate-300">Voucher Type</label>
                <select
                  value={vType}
                  onChange={(e) => {
                    setVType(e.target.value as VoucherType);
                    setSelectedParticular('');
                  }}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="PAYMENT">Payment (Operating Expense)</option>
                  <option value="RECEIPT">Receipt (Income / Donation)</option>
                  <option value="SUPPLIER_PAYMENT">Supplier Payment (Vendor Settle)</option>
                  <option value="PURCHASE">Purchase (Credit Bill)</option>
                  <option value="LOAN_REPAYMENT">Loan Repayment (EMI)</option>
                  <option value="CONTRA">Contra (Bank-Cash Transfer)</option>
                  <option value="JOURNAL">Journal (Adjustment)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 dark:text-slate-300">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={vDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setVDate(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 dark:text-slate-300">Cost Center</label>
                <select
                  value={vCostCenter}
                  onChange={(e) => setVCostCenter(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="cc-general">General / Common</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 dark:text-slate-300">Payment Mode</label>
                <select
                  value={selectedPaymentMode}
                  onChange={(e) => setSelectedPaymentMode(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {((config as any).paymentModes || ['CASH', 'BANK_UPI', 'BANK_TRANSFER', 'CHEQUE']).map((m: string) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reference info if non-cash */}
            {selectedPaymentMode !== 'CASH' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5 max-w-md">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Transaction Reference ID / Cheque / UTR
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9821049281, CHQ-0021"
                  value={upiReference}
                  onChange={(e) => setUpiReference(e.target.value)}
                  className="w-full h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            )}

            {/* Double-entry card */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              {/* Account 1: Particulars */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    {vType === 'RECEIPT' && 'Credit Ledger (Income / Source)'}
                    {vType === 'PAYMENT' && 'Debit Ledger (Expense / Destination)'}
                    {vType === 'PURCHASE' && 'Debit Ledger (Expense / Asset)'}
                    {vType === 'SUPPLIER_PAYMENT' && 'Debit Ledger (Vendor Liability)'}
                    {vType === 'LOAN_REPAYMENT' && 'Debit Ledger (Loan Account)'}
                    {vType === 'CONTRA' && 'Deposit To (Cash / Bank)'}
                    {vType === 'JOURNAL' && 'Debit Account (Dr)'}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenQuickLedger(
                        vType === 'RECEIPT' ? 'INCOME' : vType === 'LOAN_REPAYMENT' ? 'LOAN' : 'EXPENSE'
                      )
                    }
                    className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium cursor-pointer"
                  >
                    + New Account
                  </button>
                </div>
                <select
                  value={selectedParticular}
                  required
                  onChange={(e) => setSelectedParticular(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">Select Ledger Account</option>
                  {vType === 'PAYMENT' &&
                    expenseLedgers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} [{l.code}]
                      </option>
                    ))}
                  {vType === 'PURCHASE' &&
                    ledgers
                      .filter((l) => l.type === 'EXPENSE' || l.type === 'ASSET')
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} [{l.code}]
                        </option>
                      ))}
                  {vType === 'SUPPLIER_PAYMENT' &&
                    ledgers
                      .filter((l) => l.groupId === 'g-current-liab' || l.id === 'l-liab-creditors' || l.type === 'LIABILITY')
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} [{l.code}]
                        </option>
                      ))}
                  {vType === 'RECEIPT' &&
                    incomeLedgers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} [{l.code}]
                      </option>
                    ))}
                  {vType === 'LOAN_REPAYMENT' &&
                    ledgers
                      .filter(
                        (l) =>
                          l.groupId === 'g-loans-liab' ||
                          l.groupId === 'g-loans-liabilities' ||
                          l.type === 'LIABILITY' ||
                          l.id.startsWith('l-loan') ||
                          l.name.toLowerCase().includes('loan')
                      )
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} [{l.code}]
                        </option>
                      ))}
                  {vType === 'CONTRA' &&
                    cashBankLedgers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} [{l.code}]
                      </option>
                    ))}
                  {vType === 'JOURNAL' &&
                    ledgers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} [{l.code}]
                      </option>
                    ))}
                </select>
              </div>

              {/* Account 2: Cash / Bank or Contra */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    {vType === 'RECEIPT' && 'Debit Ledger (Deposit To)'}
                    {vType === 'PAYMENT' && 'Credit Ledger (Pay From)'}
                    {vType === 'SUPPLIER_PAYMENT' && 'Credit Ledger (Pay From)'}
                    {vType === 'PURCHASE' && 'Credit Ledger (Payable To)'}
                    {vType === 'CONTRA' && 'Withdraw From (Cash / Bank)'}
                    {vType === 'JOURNAL' && 'Credit Account (Cr)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenQuickLedger('BANK_CASH')}
                    className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium cursor-pointer"
                  >
                    + New Bank/Cash
                  </button>
                </div>
                <select
                  value={selectedCashBank}
                  required
                  onChange={(e) => setSelectedCashBank(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">Select Ledger Account</option>
                  {vType === 'JOURNAL'
                    ? ledgers.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} [{l.code}]
                        </option>
                      ))
                    : vType === 'PURCHASE'
                    ? ledgers
                        .filter((l) => l.groupId === 'g-current-liab' || l.id === 'l-liab-creditors' || l.type === 'LIABILITY')
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} [{l.code}]
                          </option>
                        ))
                    : cashBankLedgers.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} [{l.code}]
                        </option>
                      ))}
                </select>
              </div>

              {/* Contact Party */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Party / Contact Name</label>
                  <button
                    type="button"
                    onClick={handleAddNewContact}
                    className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium cursor-pointer"
                  >
                    + New Party
                  </button>
                </div>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">Select Contact (Optional)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  {vType === 'LOAN_REPAYMENT' ? 'Principal Repayment (₹)' : 'Transaction Amount (₹)'}
                </label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={singleAmount || ''}
                  onChange={(e) => setSingleAmount(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Loan Repayment Interest Amount */}
              {vType === 'LOAN_REPAYMENT' && (
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Interest Amount (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={interestAmount || ''}
                    onChange={(e) => setInterestAmount(Number(e.target.value))}
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  {interestAmount > 0 && (
                    <p className="text-[10px] text-slate-500 font-medium">
                      Total Payout: ₹{(singleAmount + interestAmount).toLocaleString('en-IN')} (Principal: ₹{singleAmount.toLocaleString('en-IN')} + Interest: ₹{interestAmount.toLocaleString('en-IN')})
                    </p>
                  )}
                </div>
              )}

              {/* Bill Attachment upload */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Attach Bill / Receipt Photo (Max 150 KB)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-medium file:bg-slate-100 file:text-slate-700"
                  />
                  {billFile && (
                    <div
                      className="relative shrink-0 cursor-pointer"
                      onClick={() => setLightboxImage(billFile)}
                    >
                      <img
                        src={billFile}
                        alt="Receipt"
                        className="w-9 h-9 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBillFile('');
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white p-0.5 rounded-full"
                        title="Remove attachment"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Narration */}
            <div className="space-y-1.5 text-xs">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                Narration / Transaction Description
              </label>
              <textarea
                required
                rows={2}
                value={vNarration}
                onChange={(e) => setVNarration(e.target.value)}
                placeholder="Detailed remarks or justification for this double-entry..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleDiscard}
                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Discard
              </button>
              <button
                type="submit"
                className="h-8 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-medium transition-colors shadow-xs"
              >
                {editingVoucher ? 'Save Changes' : 'Post Voucher to Books'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* VOUCHERS DATA TABLE & FILTERS */
        <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 no-print animate-in fade-in duration-150">
          {/* Filters Toolbar */}
          <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search voucher, narration..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => {
                    setSelectedCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">All Categories</option>
                  <optgroup label="Expenses">
                    {expenseLedgers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {formatBilingual(l.name, language)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Incomes">
                    {incomeLedgers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {formatBilingual(l.name, language)}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <select
                  value={selectedCcFilter}
                  onChange={(e) => {
                    setSelectedCcFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">All Cost Centers</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {formatBilingual(cc.name, language)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedModeFilter}
                  onChange={(e) => {
                    setSelectedModeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">All Payment Modes</option>
                  <option value="CASH">CASH</option>
                  <option value="BANK_UPI">BANK_UPI</option>
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  <option value="CHEQUE">CHEQUE</option>
                </select>
              </div>

              <div>
                <select
                  value={dateFilterRange}
                  onChange={(e) => {
                    setDateFilterRange(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="all">All Dates (Current FY)</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>
            </div>

            {/* Custom Dates Picker block */}
            {dateFilterRange === 'custom' && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs max-w-sm">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-7 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-7 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {selectedVoucherIds.length > 0 && (
            <div className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200/80 dark:border-rose-800/60 text-xs">
              <span className="font-medium text-rose-700 dark:text-rose-300">
                {selectedVoucherIds.length} vouchers selected
              </span>
              <button
                type="button"
                onClick={() => requirePin(handleBulkDelete)}
                className="h-7 px-3 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}

          {/* Vouchers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-2 w-8">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 dark:border-slate-600 cursor-pointer w-3.5 h-3.5 accent-slate-900"
                      checked={filteredVouchers.length > 0 && selectedVoucherIds.length === filteredVouchers.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVoucherIds(filteredVouchers.map((v) => v.id));
                        } else {
                          setSelectedVoucherIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="pb-3">Voucher #</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Particular Account</th>
                  <th className="pb-3">Payment Account</th>
                  <th className="pb-3">Narration</th>
                  <th className="pb-3 text-right">Amount (₹)</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      No vouchers found matching selected query criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedVouchers.map((v) => {
                    const debEntry = v.entries.find((e) => e.isDebit);
                    const credEntry = v.entries.find((e) => !e.isDebit);
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
                      <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 pl-2">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 dark:border-slate-600 cursor-pointer w-3.5 h-3.5 accent-slate-900"
                            checked={selectedVoucherIds.includes(v.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVoucherIds((prev) => [...prev, v.id]);
                              } else {
                                setSelectedVoucherIds((prev) => prev.filter((id) => id !== v.id));
                              }
                            }}
                          />
                        </td>
                        <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {v.voucherNumber}
                        </td>
                        <td className="py-3 text-slate-500">{v.date}</td>
                        <td className="py-3">
                          <Badge
                            variant={
                              v.voucherType === 'RECEIPT'
                                ? 'success'
                                : v.voucherType === 'PAYMENT'
                                ? 'danger'
                                : v.voucherType === 'CONTRA'
                                ? 'info'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {v.voucherType}
                          </Badge>
                        </td>
                        <td className="py-3 font-medium text-slate-900 dark:text-slate-100 max-w-[160px] truncate">
                          {partText}
                        </td>
                        <td className="py-3 text-slate-500 max-w-[140px] truncate">{cashBankText}</td>
                        <td className="py-3 max-w-xs truncate" title={v.narration}>
                          <div className="flex items-center gap-1.5">
                            {imageAttach && (
                              <button
                                type="button"
                                onClick={() => setLightboxImage(imageAttach)}
                                className="p-0.5 text-slate-400 hover:text-slate-700 shrink-0"
                                title="View Bill Image"
                              >
                                <Image className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <span className="truncate">{v.narration}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{debitsSum.toLocaleString()}
                        </td>
                        <td className="py-3 text-right pr-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedVoucher(v)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {v.voucherType === 'RECEIPT' && (
                              <button
                                type="button"
                                onClick={() => triggerPrintReceipt(v)}
                                className="p-1 rounded text-emerald-600 hover:text-emerald-700"
                                title="Print 80G Receipt"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {v.voucherType === 'PAYMENT' && (
                              <button
                                type="button"
                                onClick={() => triggerPrintPaymentSlip(v)}
                                className="p-1 rounded text-slate-600 hover:text-slate-900 dark:text-slate-400"
                                title="Print Payment Voucher Slip"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEditVoucher(v)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              title="Edit Voucher"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVoucher(v.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600"
                              title="Delete Voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <td colSpan={7} className="py-3 pl-2 text-right">
                    Filtered Total:
                  </td>
                  <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{filteredVouchers.reduce((sum, v) => sum + (v.entries.find((e) => e.isDebit)?.amount || 0), 0).toLocaleString()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredVouchers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedVoucher && (
        <Modal
          isOpen={!!selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
          title={`Voucher Details: ${selectedVoucher.voucherNumber}`}
          description={`Date: ${selectedVoucher.date} • Type: ${selectedVoucher.voucherType}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cost Center</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {getCostCenterName(selectedVoucher.costCenterId)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
                <span className="font-medium text-emerald-600">{selectedVoucher.status}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Payment Mode</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {selectedVoucher.paymentMode || 'CASH'}
                </span>
              </div>
              {selectedVoucher.referenceDetails && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Reference</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {selectedVoucher.referenceDetails}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">Ledger Postings:</span>
              <div className="space-y-1">
                {selectedVoucher.entries.map((ent, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-1.5 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg"
                  >
                    <span>{getLedgerName(ent.ledgerId)}</span>
                    <span className="font-mono font-semibold">
                      ₹{ent.amount.toLocaleString()} ({ent.isDebit ? 'Dr' : 'Cr'})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">Narration:</span>
              <p className="text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                {selectedVoucher.narration}
              </p>
            </div>

            {selectedVoucher.attachments && selectedVoucher.attachments.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">Attached Receipt:</span>
                <div
                  className="w-32 h-24 rounded-lg overflow-hidden border border-slate-200 cursor-pointer"
                  onClick={() => setLightboxImage(selectedVoucher.attachments[0])}
                >
                  <img
                    src={selectedVoucher.attachments[0]}
                    alt="Receipt Attachment"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* QUICK CONTACT MODAL */}
      <Modal
        isOpen={showQuickContact}
        onClose={() => setShowQuickContact(false)}
        title="Add New Contact Party"
        description="Add a vendor, donor, volunteer, or customer to the registry"
      >
        <form onSubmit={handleSaveQuickContact} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
            <input
              type="text"
              required
              value={quickContactName}
              onChange={(e) => setQuickContactName(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
            <input
              type="text"
              value={quickContactPhone}
              onChange={(e) => setQuickContactPhone(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Address</label>
            <input
              type="text"
              value={quickContactAddress}
              onChange={(e) => setQuickContactAddress(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Contact Type</label>
            <select
              value={quickContactType}
              onChange={(e) => setQuickContactType(e.target.value as any)}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
            >
              <option value="VENDOR">Vendor (Supplier)</option>
              <option value="VOLUNTEER">Employee / Labor</option>
              <option value="DONOR">Donor</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowQuickContact(false)}
              className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-3.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
            >
              Save Contact
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK LEDGER CREATOR MODAL */}
      <Modal
        isOpen={showQuickLedgerModal}
        onClose={() => setShowQuickLedgerModal(false)}
        title="Quick Add Ledger Account"
        description="Create a new general ledger account for bookkeeping"
      >
        <form onSubmit={handleSaveQuickLedger} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Account Name *</label>
            <input
              type="text"
              required
              value={quickLedgerName}
              onChange={(e) => setQuickLedgerName(e.target.value)}
              placeholder="e.g. Grass Fodder Purchase, Diesel Expense"
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Auto Code</label>
              <input
                type="text"
                value={quickLedgerCode}
                onChange={(e) => setQuickLedgerCode(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Opening Balance (₹)</label>
              <input
                type="number"
                value={quickOpeningBal || ''}
                onChange={(e) => setQuickOpeningBal(Number(e.target.value))}
                placeholder="0"
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowQuickLedgerModal(false)}
              className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-3.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
            >
              Save Ledger
            </button>
          </div>
        </form>
      </Modal>

      {/* SECURITY PIN PROMPT MODAL */}
      {pinPromptAction && (
        <Modal
          isOpen={!!pinPromptAction}
          onClose={() => setPinPromptAction(null)}
          title="Security PIN Required"
          description="Authenticate with your 4-digit PIN to perform this operation"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <input
              type="password"
              autoComplete="new-password"
              maxLength={4}
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center tracking-[0.8em] text-xl font-bold h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            {pinError && (
              <p className="text-rose-600 text-xs text-center font-medium">
                Incorrect Security PIN. Please try again.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPinPromptAction(null)}
                className="flex-1 h-9 rounded-lg border border-slate-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentPin = GoshalaDB.getAppPin();
                  if (pinInput === currentPin) {
                    const actionToExec = pinPromptAction;
                    setPinPromptAction(null);
                    actionToExec();
                  } else {
                    setPinError(true);
                  }
                }}
                className="flex-1 h-9 rounded-lg bg-slate-900 text-white text-xs font-medium"
              >
                Verify & Proceed
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PRINTABLE RECEIPT (80G) MODAL */}
      {printReceiptVoucher && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Print Donation Slip (80G Exemption)
              </h3>
              <button onClick={() => setPrintReceiptVoucher(null)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Print Card Container with exact ID */}
            <div
              id="printable-receipt-card"
              className="p-6 border-2 border-double border-slate-800 bg-white text-slate-900 rounded-xl space-y-4 font-sans text-xs"
            >
              <div className="text-center space-y-1 pb-3 border-b border-slate-200">
                <h2 className="text-base font-bold uppercase">{config.samitiName}</h2>
                <p className="text-[10px] text-slate-500">
                  {config.address} • Regd No: {config.registrationNo}
                </p>
                {config.enable80G && (
                  <p className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block border border-emerald-200">
                    12A & 80G Certified Income Tax Exempted Organisation
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-y-1.5 text-[11px] pb-3 border-b border-slate-200">
                <div>
                  Receipt No: <strong>{printReceiptVoucher.voucherNumber}</strong>
                </div>
                <div className="text-right">
                  Date: <strong>{printReceiptVoucher.date}</strong>
                </div>
                <div>
                  Received From: <strong>{donorName || 'Donor'}</strong>
                </div>
                <div className="text-right">
                  PAN: <strong>{donorPan || '—'}</strong>
                </div>
              </div>

              <div className="py-2 text-xs leading-relaxed">
                Received with thanks a sum of{' '}
                <strong>₹{printReceiptVoucher.entries[0]?.amount.toLocaleString()}</strong> (in words:{' '}
                <strong>{amountToWords(printReceiptVoucher.entries[0]?.amount || 0)}</strong> / अक्षरी:{' '}
                <strong>{amountToHindiWords(printReceiptVoucher.entries[0]?.amount || 0)}</strong>) from Shri/Smt{' '}
                <strong>{donorName || 'Donor'}</strong> for fodder and Goshala welfare.
              </div>

              <div className="pt-6 border-t border-dashed border-slate-300">
                <div className="text-center text-[10px] font-semibold text-slate-500 mb-4 uppercase">
                  For {config.samitiName}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center text-[10px] font-medium text-slate-700">
                  <div className="space-y-4">
                    <div className="h-6 border-b border-dashed border-slate-300" />
                    <div>President</div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-6 border-b border-dashed border-slate-300" />
                    <div>Secretary</div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-6 border-b border-dashed border-slate-300" />
                    <div>Treasurer</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPrintReceiptVoucher(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-8 px-4 rounded-lg bg-slate-900 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE PAYMENT SLIP MODAL */}
      {printPaymentVoucher &&
        (() => {
          const deb = printPaymentVoucher.entries.find((e) => e.isDebit);
          const categoryId = deb?.ledgerId || '';
          let recipientName = '';
          const match = printPaymentVoucher.narration.match(/^\[([^\]]+)\]/);
          if (match) recipientName = match[1];

          return (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
              <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Print Payment Voucher Slip
                  </h3>
                  <button onClick={() => setPrintPaymentVoucher(null)} className="text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div
                  id="printable-payment-card"
                  className="p-6 border-2 border-double border-slate-800 bg-white text-slate-900 rounded-xl space-y-4 font-sans text-xs"
                >
                  <div className="text-center space-y-1 pb-3 border-b border-slate-200">
                    <h2 className="text-base font-bold uppercase">{config.samitiName}</h2>
                    <p className="text-[10px] text-slate-500">
                      {config.address} • Mobile: {config.mobileNumber}
                    </p>
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">
                      PAYMENT VOUCHER SLIP
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px] pb-3 border-b border-slate-200">
                    <div>
                      Voucher No: <strong>{printPaymentVoucher.voucherNumber}</strong>
                    </div>
                    <div className="text-right">
                      Date: <strong>{printPaymentVoucher.date}</strong>
                    </div>
                    <div>
                      Paid To: <strong>{recipientName || 'Recipient'}</strong>
                    </div>
                    <div className="text-right">
                      Account Head: <strong>{getLedgerName(categoryId)}</strong>
                    </div>
                  </div>

                  <div className="py-2 text-xs leading-relaxed">
                    Paid a sum of <strong>₹{deb?.amount.toLocaleString()}</strong> (in words:{' '}
                    <strong>{amountToWords(deb?.amount || 0)}</strong> / अक्षरी:{' '}
                    <strong>{amountToHindiWords(deb?.amount || 0)}</strong>) in favor of the recipient.
                    <p className="mt-1 text-slate-500 italic">Particulars: {printPaymentVoucher.narration}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-center text-[10px] font-medium text-slate-700 pt-6 border-t border-dashed border-slate-300">
                    <div className="space-y-4">
                      <div className="h-6 border-b border-dashed border-slate-300" />
                      <div>Receiver</div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-6 border-b border-dashed border-slate-300" />
                      <div>President</div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-6 border-b border-dashed border-slate-300" />
                      <div>Secretary</div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-6 border-b border-dashed border-slate-300" />
                      <div>Treasurer</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPrintPaymentVoucher(null)}
                    className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="h-8 px-4 rounded-lg bg-slate-900 text-white text-xs font-medium flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Slip</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
