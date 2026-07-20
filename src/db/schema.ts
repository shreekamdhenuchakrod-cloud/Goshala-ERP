export type Role =
  | 'SUPER_ADMIN'
  | 'PRESIDENT'
  | 'SECRETARY'
  | 'TREASURER'
  | 'ACCOUNTANT'
  | 'AUDITOR'
  | 'EMPLOYEE'
  | 'VOLUNTEER';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  avatar?: string;
}

export interface FinancialYear {
  id: string;
  name: string; // e.g. "2024-25", "2025-26"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'CLOSED' | 'LOCKED';
}

export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'CAPITAL'
  | 'INCOME'
  | 'EXPENSE';

export interface LedgerGroup {
  id: string;
  name: string;
  type: AccountType;
  parentId?: string; // For hierarchical trees
}

export interface Ledger {
  id: string;
  groupId: string;
  name: string;
  code: string; // e.g. "1001", "2002"
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  isSystem?: boolean; // System ledgers like Cash, Bank, Fodder Stock, Sales, etc.
}

export interface SubLedger {
  id: string;
  ledgerId: string; // Parent general ledger (e.g. Accounts Receivable / Accounts Payable)
  name: string;
  phone?: string;
  email?: string;
  pan?: string;
  gstin?: string;
  outstandingBalance: number;
}

export interface CostCenter {
  id: string;
  name: string;
  allocatedBudget: number;
  spentAmount: number;
}

export type VoucherType = 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'CONTRA';
export type VoucherStatus =
  | 'DRAFT'
  | 'ACCOUNTANT_VERIFIED'
  | 'TREASURER_APPROVED'
  | 'PRESIDENT_APPROVED'
  | 'COMMITTEE_APPROVED'
  | 'POSTED';

export interface VoucherEntry {
  ledgerId: string;
  subLedgerId?: string; // Optional specific party
  amount: number;
  isDebit: boolean;
  narration?: string;
}

export interface Voucher {
  id: string;
  fyId: string; // Financial Year link
  voucherNumber: string; // Auto-numbered
  voucherType: VoucherType;
  date: string;
  status: VoucherStatus;
  costCenterId?: string;
  narration: string;
  entries: VoucherEntry[];
  attachments: string[]; // Document file names or base64
  auditTrail: {
    user: string;
    role: Role;
    action: string;
    timestamp: string;
  }[];
  // New fields
  paymentMode?: string;
  referenceDetails?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Budget {
  id: string;
  fyId: string;
  costCenterId: string;
  monthlyLimit: number;
  allocatedAmount: number;
  spent: { [month: string]: number }; // e.g. { "2026-04": 4500 }
}

export interface Cow {
  id: string;
  rfidTag: string;
  photoUrl?: string;
  breed: string;
  color: string;
  gender: 'Male' | 'Female';
  birthDate: string;
  purchaseDate?: string;
  purchaseCost?: number;
  weight: number; // in kg
  healthStatus: 'Healthy' | 'Sick' | 'Under Treatment' | 'Critical';
  pregnancyStatus?: 'Not Pregnant' | 'Pregnant' | 'Lactating';
  pregnancyDueDate?: string;
  calfHistoryCount: number;
  milkYieldQuantity?: number; // average daily litres (if lactating)
  locationShed: string;
  vaccinations: { name: string; date: string; dueDate?: string }[];
  medicalHistory: { diagnosis: string; date: string; treatment: string; status: string }[];
  qrCodeUrl?: string;
  insuranceDetails?: { policyNumber: string; amount: number; expiryDate: string };
  deathDetails?: { date: string; reason: string };
  saleDetails?: { date: string; buyer: string; amount: number };
}

export interface MilkYieldEntry {
  id: string;
  date: string;
  shift: 'Morning' | 'Evening';
  cowId?: string; // Cow specific
  employeeId: string; // Logged by
  quantity: number; // litres
}

export interface MilkSale {
  id: string;
  date: string;
  customerName: string;
  phone?: string;
  quantity: number; // litres
  ratePerLitre: number;
  amount: number;
  gstAmount: number;
  discount: number;
  paymentMode: 'CASH' | 'BANK' | 'UPI';
  invoiceNumber: string;
  isOutstanding: boolean;
}

export interface Donor {
  id: string;
  name: string;
  phone: string;
  address?: string;
  pan?: string;
  aadhar?: string;
  birthday?: string;
}

export interface Donation {
  id: string;
  donorId: string;
  date: string;
  receiptNumber: string;
  amount: number;
  paymentMode: 'CASH' | 'CHEQUE' | 'BANK' | 'UPI' | 'ONLINE';
  purpose: 'General' | 'Cow Feeding' | 'Construction' | 'Medical' | 'Festival' | 'Corpus';
  taxExemptionEligible: boolean; // 80G eligibility
  isRecurring: boolean;
}

export interface GovtGrant {
  id: string;
  name: string;
  department: string;
  sanctionLetterNo: string;
  amount: number;
  receivedAmount: number;
  pendingAmount: number;
  purpose: string;
  utilizationCertificates: { name: string; uploadDate: string; url: string }[];
  reminders: string[]; // Reminder dates
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Grass' | 'Dry Fodder' | 'Green Fodder' | 'Medicine' | 'Packing Material' | 'Product' | 'Consumable';
  unit: string; // e.g. "kg", "litres", "box"
  minimumStock: number;
}

export interface InventoryBatch {
  id: string;
  itemId: string;
  batchNumber: string;
  expiryDate?: string;
  supplierId: string;
  purchaseRate: number;
  qtyReceived: number;
  qtyRemaining: number;
  dateReceived: string;
}

export interface StockTransaction {
  id: string;
  itemId: string;
  batchId?: string; // FIFO matching batch
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'DAMAGE' | 'WASTE' | 'TRANSFER';
  qty: number;
  rate?: number; // Cost rate
  date: string;
  slipNumber: string; // Issue/Receive slip
  reference?: string; // Purchase Invoice or Cow ID
}

export interface CRMContact {
  id: string;
  type: 'DONOR' | 'CUSTOMER' | 'VENDOR' | 'VOLUNTEER';
  name: string;
  phone: string;
  email?: string;
  pan?: string;
  aadhar?: string;
  birthday?: string;
  outstandingBalance: number;
  communicationHistory: { date: string; channel: 'SMS' | 'WhatsApp' | 'Email' | 'Call'; summary: string }[];
  address?: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  designation: string;
  salary: number;
  pfNumber?: string;
  esiNumber?: string;
  joiningDate: string;
  bankAccountDetails?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string; // HH:MM
  checkOut?: string; // HH:MM
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  gpsLat?: number;
  gpsLng?: number;
  selfieUrl?: string;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  fyId: string;
  month: string; // e.g. "2026-07"
  baseSalary: number;
  overtime: number;
  bonus: number;
  advanceDeduction: number;
  fine: number;
  pfDeduction: number;
  esiDeduction: number;
  netSalary: number;
  status: 'PENDING' | 'PAID';
  slipNumber: string;
}

export interface Loan {
  id: string;
  type: 'TAKEN' | 'GIVEN';
  partyName: string;
  principalAmount: number;
  interestRate: number; // yearly percentage
  installments: number; // number of months
  outstandingAmount: number;
  dateDisbursed: string;
  history: { date: string; amount: string; principal: number; interest: number }[];
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  currentBalance: number;
}

export interface DocumentRecord {
  id: string;
  folder: 'PAN' | 'Aadhar' | 'Registration' | '12A_80G' | 'FCRA' | 'GST' | 'Bank' | 'Bills' | 'Receipts' | 'Other';
  name: string;
  tags: string[];
  version: number;
  fileUrl: string;
  uploadDate: string;
  expiryDate?: string;
}

export interface CommitteeMeeting {
  id: string;
  date: string;
  agenda: string;
  resolutions: string[];
  attendance: string[]; // employee/CRM names
  minutesPdfUrl?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  role: Role;
  action: string;
  details: string;
  timestamp: string;
}

export interface ERPConfig {
  activeFyId: string;
  voucherNumberFormat: string; // e.g. "V-{TYPE}-{NUM}"
  receiptFormat: string; // e.g. "R-{NUM}"
  taxRate: number; // default GST %
  letterheadText: string;
  logoUrl?: string;
  digitalSignatureUrl?: string;

  // Organization details
  samitiName?: string;
  address?: string;
  village?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  mobileNumber?: string;
  alternateMobile?: string;
  email?: string;
  website?: string;
  registrationNo?: string;
  panNo?: string;
  gstNo?: string;
  rtcDetails?: string;
  currency?: string;
  decimalPlaces?: number;
  dateFormat?: string;
  timeFormat?: string;

  // Tax & Registration toggles
  enable12A?: boolean;
  enable80G?: boolean;
  enableGST?: boolean;
  enableTDS?: boolean;
  enableDonationReceipt?: boolean;

  // Printing settings
  printHeader?: string;
  printFooter?: string;
  authorizedSignatory?: string;
  sealPosition?: 'left' | 'right' | 'center' | 'none';
  receiptPrefix?: string;
  voucherPrefix?: string;
  fontSize?: number;
  paperSize?: 'A4' | 'A5' | 'Letter';

  // Customizable templates for receipts per category
  receiptTemplates?: Record<string, string>;
  paymentModes?: string[];
}
