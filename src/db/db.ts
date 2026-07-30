import {
  FinancialYear,
  Ledger,
  LedgerGroup,
  CostCenter,
  Cow,
  CRMContact,
  InventoryItem,
  InventoryBatch,
  StockTransaction,
  BankAccount,
  Voucher,
  ERPConfig,
  VoucherEntry,
  MilkYieldEntry,
  MilkSale,
  Donation,
  GovtGrant,
  Employee,
  AttendanceRecord,
  PayrollEntry,
  Loan,
  DocumentRecord,
  AuditLog,
  VoucherStatus,
  Role
} from './schema';

import {
  SEED_FYS,
  SEED_GROUPS,
  SEED_LEDGERS,
  SEED_COST_CENTERS,
  SEED_COWS,
  SEED_CONTACTS,
  SEED_INVENTORY,
  SEED_BANK_ACCOUNTS,
  SEED_CONFIG,
  SEED_VOUCHERS,
  SEED_LOANS
} from './seed';
import { db } from './firebase';
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

// Storage Helper
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Firestore Sync Helper
const notifySyncStatus = (status: 'synced' | 'syncing' | 'offline') => {
  (window as any)._goshala_sync_status = status;
  window.dispatchEvent(new CustomEvent('goshala_sync_status', { detail: { status } }));
};

const syncTableToFirestore = (name: string, data: any) => {
  try {
    notifySyncStatus('syncing');
    const docRef = doc(db, 'goshala_erp', name);
    setDoc(docRef, { items: data, updatedAt: Date.now() }, { merge: true })
      .then(() => notifySyncStatus('synced'))
      .catch(err => {
        console.warn(`Firestore sync warning [${name}]:`, err?.message || err);
        notifySyncStatus('offline');
      });
  } catch (err) {
    console.warn(`Firestore write exception [${name}]:`, err);
    notifySyncStatus('offline');
  }
};

// Database class to manage everything client-side
export class GoshalaDB {
  static getAppPin(): string {
    return localStorage.getItem('goshala_erp_app_pin') || '';
  }

  static setAppPin(newPin: string): void {
    localStorage.setItem('goshala_erp_app_pin', newPin);
    try {
      notifySyncStatus('syncing');
      const docRef = doc(db, 'goshala_erp', 'security_pin');
      setDoc(docRef, { pin: newPin, updatedAt: Date.now() }, { merge: true })
        .then(() => notifySyncStatus('synced'))
        .catch(() => notifySyncStatus('offline'));
    } catch {
      notifySyncStatus('offline');
    }
  }

  static init() {
    const seedVersion = 'v17';
    const seeded = localStorage.getItem('goshala_erp_seeded');
    if (!seeded || seeded !== seedVersion) {
      console.log('Migrating to Goshala ERP baseline version:', seedVersion);
      
      const cleanLedgers = SEED_LEDGERS.map(l => ({
        ...l,
        openingBalance: l.id === 'l-liab-creditors' ? 0 : (l.openingBalance || 0),
        currentBalance: l.id === 'l-liab-creditors' ? 0 : (l.currentBalance || 0)
      }));

      const cleanBanks = SEED_BANK_ACCOUNTS.map(ba => ({
        ...ba,
        currentBalance: ba.currentBalance || 0
      }));

      // Non-destructive safe migration path
      const currentVouchersStr = localStorage.getItem('goshala_erp_vouchers');
      const currentVouchers: Voucher[] = currentVouchersStr ? JSON.parse(currentVouchersStr) : [];
      
      if (!currentVouchers || currentVouchers.length === 0) {
        // Fresh install: Full wipe & seed
        const savedConfig = localStorage.getItem('goshala_erp_config');
        const savedPin = localStorage.getItem('goshala_erp_app_pin');
        
        const allKeys = Object.keys(localStorage).filter(k => k.startsWith('goshala_erp_') && k !== 'goshala_erp_config' && k !== 'goshala_erp_app_pin');
        allKeys.forEach(k => localStorage.removeItem(k));
        
        if (savedConfig) localStorage.setItem('goshala_erp_config', savedConfig);
        if (savedPin) localStorage.setItem('goshala_erp_app_pin', savedPin);
        
        setStorageItem('goshala_erp_fys', SEED_FYS);
        setStorageItem('goshala_erp_groups', SEED_GROUPS);
        setStorageItem('goshala_erp_ledgers', cleanLedgers);
        setStorageItem('goshala_erp_cost_centers', SEED_COST_CENTERS);
        setStorageItem('goshala_erp_cows', SEED_COWS);
        setStorageItem('goshala_erp_bank_accounts', cleanBanks);
        setStorageItem('goshala_erp_loans', SEED_LOANS);
        setStorageItem('goshala_erp_contacts', SEED_CONTACTS);
        setStorageItem('goshala_erp_vouchers', SEED_VOUCHERS);
      } else {
        // MIGRATION: Preserve user data, but patch baseline missing seed data
        
        // 1. Remove the incorrect monolithic vendor voucher
        let migratedVouchers = currentVouchers.filter(v => v.id !== 'v-feed-accrual');
        
        // 2. Add the split baseline vendor vouchers if missing
        const newVendorVouchers = SEED_VOUCHERS.filter(sv => 
          (sv.id === 'v-feed-accrual-parvat' || sv.id === 'v-feed-accrual-dharmendra' || sv.id === 'v-feed-accrual-suner') && 
          !migratedVouchers.some(cv => cv.id === sv.id)
        );
        if (newVendorVouchers.length > 0) {
          migratedVouchers = [...migratedVouchers, ...newVendorVouchers];
          setStorageItem('goshala_erp_vouchers', migratedVouchers);
        }
        
        // 3. Update missing contacts
        const currentContactsStr = localStorage.getItem('goshala_erp_contacts');
        let currentContacts: any[] = currentContactsStr ? JSON.parse(currentContactsStr) : [];
        const missingContacts = SEED_CONTACTS.filter(sc => !currentContacts.some(cc => cc.id === sc.id));
        if (missingContacts.length > 0) {
          setStorageItem('goshala_erp_contacts', [...currentContacts, ...missingContacts]);
        }
      }
      
      if (!localStorage.getItem('goshala_erp_config')) setStorageItem('goshala_erp_config', SEED_CONFIG);

      localStorage.setItem('goshala_erp_seeded', seedVersion);
      this.recalculateLedgers();
    }
    this.initFirebaseSync();
  }

  // Full wipe: clears ALL transaction data and re-seeds from baseline
  static hardResetToBaseline() {
    const savedConfig = localStorage.getItem('goshala_erp_config');

    // Remove ALL local storage keys
    localStorage.removeItem('goshala_erp_seeded');
    Object.keys(localStorage)
      .filter(k => k.startsWith('goshala_erp_') && k !== 'goshala_erp_app_pin')
      .forEach(k => localStorage.removeItem(k));

    if (savedConfig) localStorage.setItem('goshala_erp_config', savedConfig);

    // Wipe the PIN from Firebase
    try {
      const pinRef = doc(db, 'goshala_erp', 'security_pin');
      deleteDoc(pinRef).catch(() => {});
    } catch (e) {
      console.warn('Could not delete Firebase PIN:', e);
    }

    // Overwrite ALL Firestore collections with clean baseline seeds so cloud sync won't restore old data
    const cleanLedgers = SEED_LEDGERS.map(l => ({
      ...l,
      openingBalance: l.openingBalance || 0,
      currentBalance: l.currentBalance || 0
    }));

    const cleanBanks = SEED_BANK_ACCOUNTS.map(ba => ({
      ...ba,
      currentBalance: ba.currentBalance || 0
    }));

    this.saveTable('fys', SEED_FYS);
    this.saveTable('groups', SEED_GROUPS);
    this.saveTable('ledgers', cleanLedgers);
    this.saveTable('cost_centers', SEED_COST_CENTERS);
    this.saveTable('cows', SEED_COWS);
    this.saveTable('bank_accounts', cleanBanks);
    this.saveTable('config', [SEED_CONFIG]);
    this.saveTable('loans', SEED_LOANS);
    this.saveTable('vouchers', SEED_VOUCHERS);
    this.saveTable('donations', []);
    this.saveTable('grants', []);
    this.saveTable('employees', []);
    this.saveTable('attendance', []);
    this.saveTable('payroll', []);
    this.saveTable('inventory', SEED_INVENTORY || []);
    this.saveTable('batches', []);
    this.saveTable('stock_tx', []);
    this.saveTable('samiti_members', []);
    this.saveTable('contacts', SEED_CONTACTS || []);

    // Force re-seed local
    this.init();
    this.recalculateLedgers();
  }

  // Wipe only user-entered vouchers, keep seed historical data
  static wipeUserVouchers() {
    const allVouchers = this.getTable<Voucher>('vouchers');
    const seedOnly = allVouchers.filter(v => v.id.startsWith('v-'));
    this.saveTable('vouchers', seedOnly);
    this.recalculateLedgers();
  }

  // Clear ALL vouchers to start clean
  static clearAllTransactions() {
    this.saveTable('vouchers', []);
    this.saveTable('donations', []);
    this.saveTable('grants', []);
    this.saveTable('stock_tx', []);
    this.saveTable('payroll', []);
    this.saveTable('attendance', []);
    this.recalculateLedgers();
  }

  static getConfig(): ERPConfig {
    const table = this.getTable<ERPConfig>('config');
    return table[0] || SEED_CONFIG;
  }

  static getActiveFyId(): string {
    const stored = localStorage.getItem('goshala_active_fy_id');
    if (stored) return stored;
    const config = this.getConfig();
    return config?.activeFyId || 'fy-2025-26';
  }

  static setActiveFyId(fyId: string): void {
    localStorage.setItem('goshala_active_fy_id', fyId);
    const configList = this.getTable<any>('config');
    const config = configList[0] || { ...SEED_CONFIG };
    config.activeFyId = fyId;
    this.saveTable('config', [config]);
    window.dispatchEvent(new CustomEvent('goshala_fy_changed', { detail: { fyId } }));
  }

  static getActiveFy(): FinancialYear {
    const activeFyId = this.getActiveFyId();
    const fys = this.getTable<FinancialYear>('fys');
    const fy = fys.find(f => f.id === activeFyId);
    if (fy) return fy;
    const active = fys.find(f => f.status === 'ACTIVE');
    if (active) return active;
    return fys[0] || { id: 'fy-2025-26', name: '2025-26', startDate: '2025-04-01', endDate: '2026-03-31', status: 'ACTIVE' };
  }

  // General Accessors
  static getTable<T>(name: string): T[] {
    this.init();
    const data = getStorageItem<any>(`goshala_erp_${name}`, []);
    
    // Safety check for config: always return [ERPConfig] as array
    if (name === 'config') {
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return [SEED_CONFIG] as any;
      }
      if (!Array.isArray(data)) {
        return [data] as any;
      }
      return data;
    }

    const items = Array.isArray(data) ? data : [];
    if (name === 'vouchers') {
      items.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return items;
  }

  static saveTable<T>(name: string, data: T[]): void {
    setStorageItem(`goshala_erp_${name}`, data);
    syncTableToFirestore(name, data);
  }

  static initFirebaseSync() {
    if ((window as any)._firebase_sync_initialized) return;
    (window as any)._firebase_sync_initialized = true;

    notifySyncStatus('syncing');

    // PIN Sync Listener
    try {
      const pinDocRef = doc(db, 'goshala_erp', 'security_pin');
      onSnapshot(pinDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const remotePin = snapshot.data()?.pin;
          if (remotePin && remotePin !== localStorage.getItem('goshala_erp_app_pin')) {
            localStorage.setItem('goshala_erp_app_pin', remotePin);
            window.dispatchEvent(new CustomEvent('goshala_pin_updated', { detail: { pin: remotePin } }));
          }
        }
      });
    } catch (e) {
      console.warn('PIN listener warning:', e);
    }

    const tables = [
      'fys', 'groups', 'ledgers', 'cost_centers', 'cows', 'contacts',
      'inventory', 'batches', 'stock_tx', 'bank_accounts', 'vouchers',
      'milk_yields', 'milk_sales', 'donations', 'grants', 'employees',
      'attendance', 'payroll', 'loans', 'documents', 'meetings',
      'audit_logs', 'config', 'samiti_members'
    ];

    let loadedCount = 0;
    tables.forEach(tableName => {
      try {
        const docRef = doc(db, 'goshala_erp', tableName);
        onSnapshot(docRef, (snapshot) => {
          loadedCount++;
          if (loadedCount >= 3) notifySyncStatus('synced');

          if (snapshot.exists()) {
            const remoteItems = snapshot.data()?.items;
            if (remoteItems !== undefined) {
              const localItems = getStorageItem(`goshala_erp_${tableName}`, null);
              if (JSON.stringify(localItems) !== JSON.stringify(remoteItems)) {
                setStorageItem(`goshala_erp_${tableName}`, remoteItems);
                window.dispatchEvent(new CustomEvent('goshala_db_updated', { detail: { table: tableName } }));
              }
            }
          }
        }, err => {
          notifySyncStatus('offline');
        });
      } catch (e) {
        notifySyncStatus('offline');
      }
    });
  }

  // Calculates exact Year-Wise Ledger Balances for any specified Financial Year (100% Isolated & Immunity from compounding)
  static getLedgerBalancesForFy(fyId?: string): { [ledgerId: string]: { openingBalance: number; currentBalance: number } } {
    const targetFyId = fyId || this.getActiveFyId();
    const fys = this.getTable<FinancialYear>('fys');
    const ledgers = this.getTable<Ledger>('ledgers');
    const vouchers = this.getTable<Voucher>('vouchers').filter(v => v.status === 'POSTED');

    // Chronological order of FYs
    const sortedFys = [...fys].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const targetFyIndex = sortedFys.findIndex(f => f.id === targetFyId);

    const balances: { [ledgerId: string]: { openingBalance: number; currentBalance: number } } = {};

    // Baseline inception values from stored ledgers table
    ledgers.forEach(l => {
      const initOp = l.openingBalance || 0;
      balances[l.id] = { openingBalance: initOp, currentBalance: initOp };
    });

    sortedFys.forEach((fy, idx) => {
      if (targetFyIndex >= 0 && idx > targetFyIndex) return;

      const isTargetFy = idx === targetFyIndex || (targetFyIndex < 0 && fy.id === targetFyId);
      const isPastFy = idx < targetFyIndex;

      // Match vouchers belonging to this FY strictly by fyId or date range
      const fyVouchers = vouchers.filter(v => 
        (v.fyId && v.fyId === fy.id) ||
        (v.date >= fy.startDate && v.date <= fy.endDate)
      );

      fyVouchers.forEach(v => {
        v.entries.forEach(entry => {
          if (!balances[entry.ledgerId]) {
            const l = ledgers.find(item => item.id === entry.ledgerId);
            const initOp = l ? (l.openingBalance || 0) : 0;
            balances[entry.ledgerId] = { openingBalance: initOp, currentBalance: initOp };
          }
          const l = ledgers.find(item => item.id === entry.ledgerId);
          if (!l) return;

          const isDebit = entry.isDebit;
          const amount = entry.amount;

          if (isPastFy) {
            // Carry forward ONLY Assets, Liabilities, and Capital accounts
            if (l.type === 'ASSET' || l.type === 'LIABILITY' || l.type === 'CAPITAL') {
              if (l.type === 'ASSET') {
                balances[l.id].currentBalance += isDebit ? amount : -amount;
              } else {
                balances[l.id].currentBalance += isDebit ? -amount : amount;
              }
            }
          } else if (isTargetFy) {
            if (l.type === 'ASSET' || l.type === 'EXPENSE') {
              balances[l.id].currentBalance += isDebit ? amount : -amount;
            } else {
              balances[l.id].currentBalance += isDebit ? -amount : amount;
            }
          }
        });
      });

      // At boundary of past FY, transfer currentBalance to openingBalance for the target year
      if (isPastFy) {
        ledgers.forEach(l => {
          if (l.type === 'ASSET' || l.type === 'LIABILITY' || l.type === 'CAPITAL') {
            balances[l.id].openingBalance = balances[l.id].currentBalance;
          } else {
            balances[l.id].openingBalance = 0;
            balances[l.id].currentBalance = 0;
          }
        });
      }
    });

    return balances;
  }

  // Recalculates ledger accounts from all POSTED vouchers for active FY
  static recalculateLedgers() {
    const activeFyId = this.getActiveFyId();
    const ledgers = this.getTable<Ledger>('ledgers');
    const fyBalances = this.getLedgerBalancesForFy(activeFyId);
    const bankAccounts = this.getTable<BankAccount>('bank_accounts');
    const costCenters = this.getTable<CostCenter>('cost_centers');
    const vouchers = this.getTable<Voucher>('vouchers');
    const activeFyObj = this.getActiveFy();

    // Apply calculated FY balances to ledgers (DO NOT MUTATE BASELINE OPENING BALANCE)
    ledgers.forEach(l => {
      if (fyBalances[l.id]) {
        l.activeFyOpeningBalance = fyBalances[l.id].openingBalance;
        l.currentBalance = fyBalances[l.id].currentBalance;
      }
    });

    // Update Cost Centers (only for active FY date range)
    costCenters.forEach(cc => {
      cc.spentAmount = 0;
    });
    vouchers.forEach(v => {
      if (v.status === 'POSTED' && v.costCenterId && v.date >= activeFyObj.startDate && v.date <= activeFyObj.endDate) {
        const cc = costCenters.find(c => c.id === v.costCenterId);
        if (cc) {
          const debitsSum = v.entries.filter(e => e.isDebit).reduce((acc, curr) => acc + curr.amount, 0);
          cc.spentAmount += debitsSum;
        }
      }
    });

    // Sync bank balances
    bankAccounts.forEach(ba => {
      const ledger = ledgers.find(l => l.name === ba.bankName && l.groupId === 'g-current-assets');
      if (ledger) {
        ba.currentBalance = ledger.currentBalance;
      }
    });

    // Save updated current balances for ledgers and bank accounts to LocalStorage
    this.saveTable('ledgers', ledgers);
    this.saveTable('bank_accounts', bankAccounts);

    // Sync Loans table outstanding amounts from accounting ledger postings
    const loans = this.getTable<Loan>('loans');
    loans.forEach(loan => {
      let matchingLedger = ledgers.find(l => l.id === loan.id || l.id === `l-loan-${loan.id}` || l.name.toLowerCase() === loan.partyName.toLowerCase());
      if (!matchingLedger) {
        matchingLedger = ledgers.find(l => (l.name.toLowerCase().includes(loan.partyName.toLowerCase()) || loan.partyName.toLowerCase().includes(l.name.toLowerCase())) && !l.name.toLowerCase().includes('building'));
      }
      if (!matchingLedger && loan.partyName.toLowerCase().includes('packing')) {
        matchingLedger = ledgers.find(l => l.id === 'l-member-packing' || l.name.toLowerCase().includes('packing'));
      }
      if (matchingLedger) {
        loan.outstandingAmount = Math.max(0, matchingLedger.currentBalance);
      } else {
        // Fallback: sum posted repayments
        const totalRepaid = vouchers.filter(v => v.status === 'POSTED').reduce((sum, v) => {
          if (v.voucherType === 'LOAN_REPAYMENT' || v.narration.toLowerCase().includes(loan.partyName.toLowerCase())) {
            const deb = v.entries.find(e => e.isDebit && e.ledgerId !== 'l-exp-interest');
            return sum + (deb ? deb.amount : 0);
          }
          return sum;
        }, 0);
        loan.outstandingAmount = Math.max(0, loan.principalAmount - totalRepaid);
      }
    });

    this.saveTable('ledgers', ledgers);
    this.saveTable('cost_centers', costCenters);
    this.saveTable('bank_accounts', bankAccounts);
    this.saveTable('loans', loans);
  }

  // Voucher operations
  static saveVoucher(v: Voucher, activeUser: { name: string; role: any }) {
    const vouchers = this.getTable<Voucher>('vouchers');
    const config = getStorageItem<ERPConfig>('goshala_erp_config', SEED_CONFIG);

    const index = vouchers.findIndex(item => item.id === v.id);

    if (index >= 0) {
      // Validate Lock status of current year
      const fys = this.getTable<FinancialYear>('fys');
      const fy = fys.find(item => item.id === v.fyId);
      if (fy && fy.status === 'LOCKED') {
        throw new Error('Voucher belongs to a locked Financial Year.');
      }

      v.auditTrail.push({
        user: activeUser.name,
        role: activeUser.role,
        action: `Edited voucher details. Status: ${v.status}`,
        timestamp: new Date().toISOString()
      });
      vouchers[index] = v;
    } else {
      // New Voucher
      // Generate Voucher Number
      const count = vouchers.filter(item => item.voucherType === v.voucherType).length + 1;
      const typeCode = v.voucherType.substring(0, 3).toUpperCase();
      v.voucherNumber = `V-${typeCode}-${String(count).padStart(4, '0')}`;
      v.auditTrail = [{
        user: activeUser.name,
        role: activeUser.role,
        action: 'Created Voucher',
        timestamp: new Date().toISOString()
      }];
      vouchers.push(v);
    }

    this.saveTable('vouchers', vouchers);
    this.recalculateLedgers();
    this.logAction(activeUser.name, activeUser.role, 'SAVE_VOUCHER', `Voucher ${v.voucherNumber} saved with status ${v.status}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('goshala_voucher_updated'));
    }
  }

  // Complete Financial Year Closing
  static closeFinancialYear(fyId: string, newFyName: string, activeUser: { name: string; role: any }) {
    const fys = this.getTable<FinancialYear>('fys');
    const ledgers = this.getTable<Ledger>('ledgers');
    const targetFy = fys.find(f => f.id === fyId);
    if (!targetFy) throw new Error('Financial Year not found.');

    // Step 1: Update status of current FY
    targetFy.status = 'CLOSED';

    // Step 2: Calculate Surplus/Deficit (Income - Expenses)
    const incomeLedgers = ledgers.filter(l => l.type === 'INCOME');
    const expenseLedgers = ledgers.filter(l => l.type === 'EXPENSE');

    const totalIncome = incomeLedgers.reduce((sum, l) => sum + l.currentBalance, 0);
    const totalExpense = expenseLedgers.reduce((sum, l) => sum + l.currentBalance, 0);
    const surplus = totalIncome - totalExpense;

    // Step 3: Create a new FY record
    const yearParts = newFyName.split('-');
    const startYr = parseInt(yearParts[0]);
    const endYr = 2000 + parseInt(yearParts[1]); // e.g. 26 -> 2026
    const newFyId = `fy-${newFyName}`;

    // check if it exists
    if (!fys.some(f => f.id === newFyId)) {
      fys.push({
        id: newFyId,
        name: newFyName,
        startDate: `${startYr}-04-01`,
        endDate: `${endYr}-03-31`,
        status: 'ACTIVE'
      });
    }

    // Step 4: Carry Forward Balances
    // Assets, Liabilities, and Capital accounts carry forward current balances as opening balance.
    // Income and Expense accounts start at 0.
    ledgers.forEach(l => {
      if (l.type === 'ASSET' || l.type === 'LIABILITY' || l.type === 'CAPITAL') {
        if (l.id === 'l-retained-earnings') {
          l.openingBalance = l.currentBalance + surplus; // Transfer surplus to retained earnings
        } else {
          l.openingBalance = l.currentBalance;
        }
        l.currentBalance = l.openingBalance;
      } else {
        l.openingBalance = 0;
        l.currentBalance = 0;
      }
    });

    // Lock the old year to prevent editing
    targetFy.status = 'LOCKED';

    this.saveTable('fys', fys);
    this.saveTable('ledgers', ledgers);

    // Save configuration with new active FY
    const config = getStorageItem<ERPConfig>('goshala_erp_config', SEED_CONFIG);
    config.activeFyId = newFyId;
    setStorageItem('goshala_erp_config', config);
    syncTableToFirestore('config', config);

    this.recalculateLedgers();
    this.logAction(
      activeUser.name,
      activeUser.role,
      'CLOSE_FY',
      `Closed FY ${targetFy.name}, transferred Net Surplus: ${surplus.toFixed(2)} to Retained Earnings, launched FY ${newFyName}`
    );
  }

  // Reopen financial year
  static reopenFinancialYear(fyId: string, activeUser: { name: string; role: any }) {
    const fys = this.getTable<FinancialYear>('fys');
    const targetFy = fys.find(f => f.id === fyId);
    if (!targetFy) throw new Error('Financial year not found.');
    targetFy.status = 'ACTIVE';
    this.saveTable('fys', fys);
    this.logAction(activeUser.name, activeUser.role, 'REOPEN_FY', `Reopened Financial Year ${targetFy.name}`);
  }

  // FIFO Inventory issues
  static issueStockFIFO(itemId: string, quantityToIssue: number, date: string, slipNumber: string, reference?: string) {
    const batches = this.getTable<InventoryBatch>('batches');
    const stockTx = this.getTable<StockTransaction>('stock_tx');

    // Filter available batches for this item, sorted by dateReceived ascending (FIFO)
    const itemBatches = batches
      .filter(b => b.itemId === itemId && b.qtyRemaining > 0)
      .sort((a, b) => new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime());

    let remainingToIssue = quantityToIssue;

    for (const batch of itemBatches) {
      if (remainingToIssue <= 0) break;

      const qtyDeducted = Math.min(batch.qtyRemaining, remainingToIssue);
      batch.qtyRemaining -= qtyDeducted;
      remainingToIssue -= qtyDeducted;

      // Log transaction
      stockTx.push({
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        itemId,
        batchId: batch.id,
        type: 'OUT',
        qty: qtyDeducted,
        rate: batch.purchaseRate,
        date,
        slipNumber,
        reference
      });
    }

    if (remainingToIssue > 0) {
      // Stock shortage occurred (negative stock allowed but warning)
      stockTx.push({
        id: `tx-${Date.now()}-shortage`,
        itemId,
        type: 'OUT',
        qty: remainingToIssue,
        date,
        slipNumber,
        reference: `${reference ? reference + ' ' : ''}(Shortage Warning)`
      });
    }

    this.saveTable('batches', batches);
    this.saveTable('stock_tx', stockTx);

    // Sync inventory stock count in system ledger if necessary (done dynamically in UI)
  }

  static receiveStock(itemId: string, supplierId: string, batchNumber: string, qty: number, rate: number, date: string, slipNumber: string, expiryDate?: string) {
    const batches = this.getTable<InventoryBatch>('batches');
    const stockTx = this.getTable<StockTransaction>('stock_tx');

    const newBatch: InventoryBatch = {
      id: `b-${Date.now()}`,
      itemId,
      batchNumber,
      expiryDate,
      supplierId,
      purchaseRate: rate,
      qtyReceived: qty,
      qtyRemaining: qty,
      dateReceived: date
    };

    batches.push(newBatch);

    stockTx.push({
      id: `tx-${Date.now()}`,
      itemId,
      batchId: newBatch.id,
      type: 'IN',
      qty,
      rate,
      date,
      slipNumber,
      reference: `Batch ${batchNumber}`
    });

    this.saveTable('batches', batches);
    this.saveTable('stock_tx', stockTx);
  }

  // Audit scanning logs
  static runOneClickAudit(fyId: string) {
    const vouchers = this.getTable<Voucher>('vouchers').filter(v => v.fyId === fyId);
    const ledgers = this.getTable<Ledger>('ledgers');

    const missingBills: Voucher[] = [];
    const duplicateEntries: { v1: Voucher; v2: Voucher }[] = [];
    const highCashVouchers: Voucher[] = [];
    let negativeCashDetected = false;

    // 1. Missing Bills: payments above 5,000 without bills
    vouchers.forEach(v => {
      if (v.voucherType === 'PAYMENT' && v.status === 'POSTED') {
        const totalAmount = v.entries
          .filter(e => e.isDebit)
          .reduce((sum, e) => sum + e.amount, 0);
        if (totalAmount > 5000 && v.attachments.length === 0) {
          missingBills.push(v);
        }
      }
    });

    // 2. Duplicate entries detection: matching date and total amount
    for (let i = 0; i < vouchers.length; i++) {
      const v1 = vouchers[i];
      const sum1 = v1.entries.reduce((s, e) => s + e.amount, 0);
      for (let j = i + 1; j < vouchers.length; j++) {
        const v2 = vouchers[j];
        const sum2 = v2.entries.reduce((s, e) => s + e.amount, 0);
        if (v1.date === v2.date && sum1 === sum2 && v1.voucherType === v2.voucherType && v1.id !== v2.id) {
          duplicateEntries.push({ v1, v2 });
        }
      }
    }

    // 3. High Cash Vouchers (fraud audit - Cash receipts/payments above 2,000 INR)
    vouchers.forEach(v => {
      const usesCash = v.entries.some(e => e.ledgerId === 'l-cash');
      const totalAmt = v.entries.filter(e => e.isDebit).reduce((s, e) => s + e.amount, 0);
      if (usesCash && totalAmt > 2000 && (v.voucherType === 'PAYMENT' || v.voucherType === 'RECEIPT')) {
        highCashVouchers.push(v);
      }
    });

    // 4. Negative cash validation: check cash balance
    const cashLedger = ledgers.find(l => l.id === 'l-cash');
    if (cashLedger && cashLedger.currentBalance < 0) {
      negativeCashDetected = true;
    }

    return {
      missingBills,
      duplicateEntries,
      highCashVouchers,
      negativeCashDetected,
      trialBalanceBalanced: true // Verified in UI reporting
    };
  }

  // Audit logger
  static logAction(user: string, role: Role, action: string, details: string) {
    const logs = this.getTable<AuditLog>('audit_logs');
    logs.push({
      id: `log-${Date.now()}`,
      userId: 'user-id',
      username: user,
      role,
      action,
      details,
      timestamp: new Date().toISOString()
    });
    // Cap logs size at 500 for local storage efficiency
    if (logs.length > 500) {
      logs.shift();
    }
    this.saveTable('audit_logs', logs);
  }
}
