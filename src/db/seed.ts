import {
  FinancialYear,
  Ledger,
  LedgerGroup,
  CostCenter,
  Cow,
  CRMContact,
  InventoryItem,
  BankAccount,
  Voucher,
  ERPConfig,
  Loan
} from './schema';

export const SEED_FYS: FinancialYear[] = [
  { id: 'fy-2024-25', name: '2024-25', startDate: '2024-04-01', endDate: '2025-03-31', status: 'CLOSED' },
  { id: 'fy-2025-26', name: '2025-26', startDate: '2025-04-01', endDate: '2026-03-31', status: 'ACTIVE' },
  { id: 'fy-2026-27', name: '2026-27', startDate: '2026-04-01', endDate: '2027-03-31', status: 'ACTIVE' }
];

export const SEED_GROUPS: LedgerGroup[] = [
  { id: 'g-fixed-assets', name: 'Fixed Assets', type: 'ASSET' },
  { id: 'g-current-assets', name: 'Current Assets', type: 'ASSET' },
  
  { id: 'g-general-fund', name: 'General Fund', type: 'CAPITAL' },
  { id: 'g-capital-aid', name: 'Capital AID', type: 'CAPITAL' },
  { id: 'g-members-contrib', name: 'Members Contribution', type: 'CAPITAL' },
  { id: 'g-loans-liab', name: 'Loans & Borrowings', type: 'LIABILITY' },
  { id: 'g-current-liab', name: 'Current Liabilities', type: 'LIABILITY' },

  { id: 'g-income', name: 'Income', type: 'INCOME' },
  { id: 'g-expense', name: 'Expenses', type: 'EXPENSE' }
];

export const SEED_LEDGERS: Ledger[] = [
  // 1. Assets: Cash & Bank Balances (As per CA balance sheet)
  { id: 'l-cash', groupId: 'g-current-assets', name: 'Cash in Hand (नकद बही)', code: '1001', type: 'ASSET', openingBalance: 10230, currentBalance: 16417, isSystem: true },
  { id: 'l-bank-boi', groupId: 'g-current-assets', name: 'Bank of India (BOI)', code: '1002', type: 'ASSET', openingBalance: 11956, currentBalance: 657065, isSystem: true },
  { id: 'l-bank-bob', groupId: 'g-current-assets', name: 'Narmada Malwa Gramin Bank', code: '1003', type: 'ASSET', openingBalance: 3630, currentBalance: 3630, isSystem: true },
  { id: 'l-tds-receivable', groupId: 'g-current-assets', name: 'TDS Receivable (टीडीएस प्राप्य)', code: '1004', type: 'ASSET', openingBalance: 1552, currentBalance: 1552, isSystem: true },

  // 2. Fixed Assets (As per CA balance sheet)
  { id: 'l-fa-machine', groupId: 'g-fixed-assets', name: 'Machine (मशीन)', code: '1101', type: 'ASSET', openingBalance: 280000, currentBalance: 280000 },
  { id: 'l-fa-cycle', groupId: 'g-fixed-assets', name: 'Cycle (साइकिल)', code: '1102', type: 'ASSET', openingBalance: 1950, currentBalance: 1950 },
  { id: 'l-fa-khooti', groupId: 'g-fixed-assets', name: 'Khooti Machine (खूंटी मशीन)', code: '1103', type: 'ASSET', openingBalance: 8100, currentBalance: 8100 },
  { id: 'l-fa-bhavan', groupId: 'g-fixed-assets', name: 'Bhusa Bhavan (भूसा भवन)', code: '1104', type: 'ASSET', openingBalance: 358407, currentBalance: 358407 },
  { id: 'l-fa-shed', groupId: 'g-fixed-assets', name: 'Building & Shed (गौशाला शेड)', code: '1105', type: 'ASSET', openingBalance: 3165151, currentBalance: 3165151 },
  { id: 'l-fa-material', groupId: 'g-fixed-assets', name: 'Building Construction Material (भवन निर्माण सामग्री)', code: '1106', type: 'ASSET', openingBalance: 1206450, currentBalance: 1206450 },
  { id: 'l-fa-fuelplant', groupId: 'g-fixed-assets', name: 'Cow Dung Fuel Plant (गोबर गैस प्लांट)', code: '1107', type: 'ASSET', openingBalance: 47250, currentBalance: 47250 },
  { id: 'l-fa-boring', groupId: 'g-fixed-assets', name: 'Boring Motor (बोरिंग मोटर)', code: '1108', type: 'ASSET', openingBalance: 25000, currentBalance: 25000 },
  { id: 'l-fa-packing', groupId: 'g-fixed-assets', name: 'Bhusa Packing Machine (पैकिंग मशीन)', code: '1109', type: 'ASSET', openingBalance: 50513, currentBalance: 50513 },
  { id: 'l-fa-transformer', groupId: 'g-fixed-assets', name: 'Transformer (ट्रांसफार्मर)', code: '1110', type: 'ASSET', openingBalance: 300000, currentBalance: 300000 },
  { id: 'l-fa-flourmill', groupId: 'g-fixed-assets', name: 'Flour Mill (आटा चक्की)', code: '1111', type: 'ASSET', openingBalance: 52002, currentBalance: 52002 },

  // 3. Liabilities: General Fund (Corpus Fund)
  { id: 'l-fund-general', groupId: 'g-general-fund', name: 'General Fund Opening (सामान्य कोष)', code: '3001', type: 'CAPITAL', openingBalance: 2705, currentBalance: 2705 },
  
  // 4. Liabilities: Capital AID (Government & Grants)
  { id: 'l-aid-machinery', groupId: 'g-capital-aid', name: 'MP Gau Sewa Aayog for Machinary', code: '3101', type: 'CAPITAL', openingBalance: 200000, currentBalance: 200000 },
  { id: 'l-aid-shed', groupId: 'g-capital-aid', name: 'Capital AID: Construction of Building & Shed', code: '3102', type: 'CAPITAL', openingBalance: 296842, currentBalance: 296842 },
  { id: 'l-aid-jantu', groupId: 'g-capital-aid', name: 'Bhartiya Jiv Jantu Kalyan Board Chennai', code: '3103', type: 'CAPITAL', openingBalance: 1124749, currentBalance: 1124749 },
  { id: 'l-aid-shed-op', groupId: 'g-capital-aid', name: 'Opening balance received for Building & Shed', code: '3104', type: 'CAPITAL', openingBalance: 1100000, currentBalance: 1100000 },
  { id: 'l-aid-boundary', groupId: 'g-capital-aid', name: 'Janpad Panchayat Shujalpur Boundary Wall', code: '3105', type: 'CAPITAL', openingBalance: 1124749, currentBalance: 1124749 },
  { id: 'l-aid-boundary2', groupId: 'g-capital-aid', name: 'Janpad Panchayat Boundary Wall', code: '3106', type: 'CAPITAL', openingBalance: 188900, currentBalance: 188900 },
  { id: 'l-aid-jila', groupId: 'g-capital-aid', name: 'Jila Pashupalan Shajapur (Chara-Bhusa Ghar)', code: '3107', type: 'CAPITAL', openingBalance: 300000, currentBalance: 300000 },
  { id: 'l-aid-gouseva', groupId: 'g-capital-aid', name: 'Gou Seva Samardhan Board packing machine', code: '3108', type: 'CAPITAL', openingBalance: 400000, currentBalance: 400000 },

  // 5. Liabilities: Members Contribution
  { id: 'l-member-shed', groupId: 'g-loans-liab', name: 'Member Contribution: Building & Shed (सदस्य ऋण)', code: '3201', type: 'LIABILITY', openingBalance: 315000, currentBalance: 315000 },
  { id: 'l-member-packing', groupId: 'g-loans-liab', name: 'Member Contribution: Packing Machine (सदस्य ऋण)', code: '3202', type: 'LIABILITY', openingBalance: 80000, currentBalance: 80000 },

  // 6. Liabilities: Loans & Borrowings
  { id: 'l-loan-unsecured', groupId: 'g-loans-liab', name: 'Unsecured Loans (असुरक्षित ऋण - Gau Sewak)', code: '2101', type: 'LIABILITY', openingBalance: 385694, currentBalance: 385694 },
  
  // 7. Liabilities: Current Liabilities
  { id: 'l-liab-audit', groupId: 'g-current-liab', name: 'Audit Fees Payable (देय लेखापरीक्षा शुल्क)', code: '2001', type: 'LIABILITY', openingBalance: 2000, currentBalance: 2000 },
  { id: 'l-liab-creditors', groupId: 'g-current-liab', name: 'Outstanding Creditors for Purchase (लेनदार बकाया)', code: '2002', type: 'LIABILITY', openingBalance: 1552, currentBalance: 1552 },

  // 8. Income Streams (As per CA report)
  { id: 'l-inc-grants-aayog', groupId: 'g-income', name: 'MP Gau Sewa Samardhan Board Bhopal (एमपी गौ सेवा आयोग)', code: '4001', type: 'INCOME', openingBalance: 0, currentBalance: 0 },
  { id: 'l-inc-donations', groupId: 'g-income', name: 'Donation Received (दान रसीद)', code: '4002', type: 'INCOME', openingBalance: 0, currentBalance: 0 },
  { id: 'l-inc-milk-dung', groupId: 'g-income', name: 'Sales of Milk and Dung (दूध एवं गोबर बिक्री)', code: '4003', type: 'INCOME', openingBalance: 0, currentBalance: 0 },
  { id: 'l-inc-interest', groupId: 'g-income', name: 'Saving Bank Interest (बैंक ब्याज)', code: '4004', type: 'INCOME', openingBalance: 0, currentBalance: 0 },

  // 9. Expenses (As per CA report)
  { id: 'l-exp-chara', groupId: 'g-expense', name: 'Cattlefeed & Grass Expenses (चारा/घास खर्च)', code: '5001', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 },
  { id: 'l-exp-majduri', groupId: 'g-expense', name: 'Salary & Wages Paid (मजदूरी/वेतन)', code: '5002', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 },
  { id: 'l-exp-audit-fees', groupId: 'g-expense', name: 'Audit Fees (ऑडिट शुल्क)', code: '5003', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 },
  { id: 'l-exp-accounting-fees', groupId: 'g-expense', name: 'Accounting Charges Paid (लेखा शुल्क)', code: '5004', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 },
  { id: 'l-exp-other', groupId: 'g-expense', name: 'Other Expenses (अन्य फुटकर खर्च)', code: '5005', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 },
  { id: 'l-exp-elect', groupId: 'g-expense', name: 'Electricity Expenses (बिजली खर्च)', code: '5006', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 },
  { id: 'l-exp-marammat', groupId: 'g-expense', name: 'Repairing Expenses (मरम्मत खर्च)', code: '5007', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 },
  { id: 'l-exp-transport', groupId: 'g-expense', name: 'Transport Expenses (परिवहन खर्च)', code: '5008', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 },
  { id: 'l-exp-bank-charges', groupId: 'g-expense', name: 'Bank Charges (बैंक शुल्क)', code: '5009', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 }
];

export const SEED_COST_CENTERS: CostCenter[] = [
  { id: 'cc-feed', name: 'Cow Feed', allocatedBudget: 2500000, spentAmount: 0 },
  { id: 'cc-salary', name: 'Salary', allocatedBudget: 700000, spentAmount: 0 },
  { id: 'cc-repairs', name: 'Other', allocatedBudget: 50000, spentAmount: 0 },
  { id: 'cc-admin', name: 'Administration', allocatedBudget: 100000, spentAmount: 0 }
];

export const SEED_COWS: Cow[] = [];

export const SEED_CONTACTS: CRMContact[] = [
  { id: 'c-donor-1', type: 'DONOR', name: 'Rajesh Kumar Singhal', phone: '9876543210', email: 'rajesh@gmail.com', outstandingBalance: 0, communicationHistory: [] },
  { id: 'c-vend-feed', type: 'VENDOR', name: 'Bharat Kisan Suppliers', phone: '9009988776', email: 'sales@bharatfodder.com', outstandingBalance: 136450, communicationHistory: [] }
];

export const SEED_INVENTORY: InventoryItem[] = [];

export const SEED_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'ba-sbi', bankName: 'Bank of India (BOI)', accountNumber: '32014029901', ifsc: 'BKID0001234', branch: 'Chakrod Branch', currentBalance: 657065 },
  { id: 'ba-bob', bankName: 'Narmada Malwa Gramin Bank', accountNumber: '10040203001', ifsc: 'APGB000MAIN', branch: 'Shajapur Branch', currentBalance: 3630 }
];

export const SEED_CONFIG: ERPConfig = {
  activeFyId: 'fy-2025-26',
  voucherNumberFormat: 'V-{TYPE}-{NUM}',
  receiptFormat: 'R-{NUM}',
  taxRate: 5,
  letterheadText: 'Shree Krishna Balram Goushala\nChakrod, Shajapur (M.P.)\n12A & 80G Certified Non-Profit Organisation',
  logoUrl: '',
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
  enable12A: true,
  enable80G: true,
  enableGST: true,
  enableTDS: true,
  enableDonationReceipt: true,
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
  digitalSignatureUrl: ''
};

export const SEED_LOANS: Loan[] = [
  {
    id: 'l-loan-unsecured',
    type: 'TAKEN',
    partyName: 'Unsecured Loans (असुरक्षित ऋण - Gau Sewak)',
    principalAmount: 385694,
    interestRate: 0,
    installments: 1,
    outstandingAmount: 385694,
    dateDisbursed: '2025-04-01',
    history: []
  },
  {
    id: 'l-member-shed',
    type: 'TAKEN',
    partyName: 'Member Contribution: Building & Shed (सदस्य ऋण)',
    principalAmount: 315000,
    interestRate: 0,
    installments: 1,
    outstandingAmount: 315000,
    dateDisbursed: '2025-04-01',
    history: []
  },
  {
    id: 'l-member-packing',
    type: 'TAKEN',
    partyName: 'Member Contribution: Packing Machine (सदस्य ऋण)',
    principalAmount: 80000,
    interestRate: 0,
    installments: 1,
    outstandingAmount: 80000,
    dateDisbursed: '2025-04-01',
    history: []
  }
];

export const SEED_VOUCHERS: Voucher[] = [
  // ==========================================
  // 1. GOUSANVARDHAN BOARD BHOPAL (13 RECEIPT VOUCHERS)
  // ==========================================
  {
    id: 'v-gr-2',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0002',
    voucherType: 'RECEIPT',
    date: '2025-04-08',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 136400, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 136400, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-3',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0003',
    voucherType: 'RECEIPT',
    date: '2025-04-17',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 120960, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 120960, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-8',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0008',
    voucherType: 'RECEIPT',
    date: '2025-06-15',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 133920, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 133920, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-9',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0009',
    voucherType: 'RECEIPT',
    date: '2025-06-21',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 285200, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 285200, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-10',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0010',
    voucherType: 'RECEIPT',
    date: '2025-06-25',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 235320, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 235320, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-14',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0014',
    voucherType: 'RECEIPT',
    date: '2025-08-07',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 271200, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 271200, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-17',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0017',
    voucherType: 'RECEIPT',
    date: '2025-09-12',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 286440, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 286440, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-18',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0018',
    voucherType: 'RECEIPT',
    date: '2025-10-06',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 285200, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 285200, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-22',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0022',
    voucherType: 'RECEIPT',
    date: '2025-11-20',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 285600, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 285600, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-23',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0023',
    voucherType: 'RECEIPT',
    date: '2025-12-17',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 297600, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 297600, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-26',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0026',
    voucherType: 'RECEIPT',
    date: '2026-01-28',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 288000, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 288000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-29',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0029',
    voucherType: 'RECEIPT',
    date: '2026-02-23',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 297600, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 297600, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gr-30',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0030',
    voucherType: 'RECEIPT',
    date: '2026-03-26',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'MP Gau Sewa Samardhan Board Bhopal Grant received in Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 297600, isDebit: true },
      { ledgerId: 'l-inc-grants-aayog', amount: 297600, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },

  // ==========================================
  // 2. INCOME GOBAR & GOMUTRA SALES (11 RECEIPT VOUCHERS)
  // ==========================================
  {
    id: 'v-gb-1',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0001',
    voucherType: 'RECEIPT',
    date: '2025-04-04',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Received from sale of organic Gobar & Gomutra',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 45000, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 45000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gb-5',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0005',
    voucherType: 'RECEIPT',
    date: '2025-05-15',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Received from sale of organic Gobar & Gomutra',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 70000, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 70000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gb-6',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0006',
    voucherType: 'RECEIPT',
    date: '2025-06-06',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Cash sale of organic Gobar & Gomutra manure',
    entries: [
      { ledgerId: 'l-cash', amount: 17600, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 17600, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gb-7',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0007',
    voucherType: 'RECEIPT',
    date: '2025-06-14',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Cash sale of organic Gobar & Gomutra manure',
    entries: [
      { ledgerId: 'l-cash', amount: 10000, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 10000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gb-12',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0012',
    voucherType: 'RECEIPT',
    date: '2025-07-16',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Cash sale of organic Gobar & Gomutra manure',
    entries: [
      { ledgerId: 'l-cash', amount: 15000, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 15000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gb-15',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0015',
    voucherType: 'RECEIPT',
    date: '2025-08-13',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Cash sale of organic Gobar & Gomutra manure',
    entries: [
      { ledgerId: 'l-cash', amount: 6000, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 6000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gb-16',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0016',
    voucherType: 'RECEIPT',
    date: '2025-08-21',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Cash sale of organic Gobar & Gomutra manure',
    entries: [
      { ledgerId: 'l-cash', amount: 40000, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 40000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gb-19',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0019',
    voucherType: 'RECEIPT',
    date: '2025-10-08',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Cash sale of organic Gobar & Gomutra manure',
    entries: [
      { ledgerId: 'l-cash', amount: 10000, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 10000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gb-24',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0024',
    voucherType: 'RECEIPT',
    date: '2026-01-06',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Cash sale of organic Gobar & Gomutra manure',
    entries: [
      { ledgerId: 'l-cash', amount: 5250, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 5250, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gb-25',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0025',
    voucherType: 'RECEIPT',
    date: '2026-01-08',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Cash sale of organic Gobar & Gomutra manure',
    entries: [
      { ledgerId: 'l-cash', amount: 20000, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 20000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-gb-27',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0027',
    voucherType: 'RECEIPT',
    date: '2026-02-05',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Cash sale of organic Gobar & Gomutra manure',
    entries: [
      { ledgerId: 'l-cash', amount: 10000, isDebit: true },
      { ledgerId: 'l-inc-milk-dung', amount: 10000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },

  // ==========================================
  // 3. WAGES EXPENSES (5 PAYMENT VOUCHERS)
  // ==========================================
  {
    id: 'v-wg-26',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0026',
    voucherType: 'PAYMENT',
    date: '2025-08-21',
    status: 'POSTED',
    costCenterId: 'cc-salary',
    narration: 'Paid Salary & Wages to Goshala workers via bank',
    entries: [
      { ledgerId: 'l-exp-majduri', amount: 120000, isDebit: true },
      { ledgerId: 'l-bank-boi', amount: 120000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-wg-27',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0027',
    voucherType: 'PAYMENT',
    date: '2025-08-28',
    status: 'POSTED',
    costCenterId: 'cc-salary',
    narration: 'Paid Wages of helpers & cattle handlers via bank',
    entries: [
      { ledgerId: 'l-exp-majduri', amount: 120000, isDebit: true },
      { ledgerId: 'l-bank-boi', amount: 120000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-wg-43',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0043',
    voucherType: 'PAYMENT',
    date: '2025-11-25',
    status: 'POSTED',
    costCenterId: 'cc-salary',
    narration: 'Paid Wages of workers via bank',
    entries: [
      { ledgerId: 'l-exp-majduri', amount: 125000, isDebit: true },
      { ledgerId: 'l-bank-boi', amount: 125000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-wg-47',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0047',
    voucherType: 'PAYMENT',
    date: '2025-12-12',
    status: 'POSTED',
    costCenterId: 'cc-salary',
    narration: 'Paid Wages of workers via bank',
    entries: [
      { ledgerId: 'l-exp-majduri', amount: 120000, isDebit: true },
      { ledgerId: 'l-bank-boi', amount: 120000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-wg-77',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0077',
    voucherType: 'PAYMENT',
    date: '2026-03-31',
    status: 'POSTED',
    costCenterId: 'cc-salary',
    narration: 'Paid Wages and monthly labour salaries in cash',
    entries: [
      { ledgerId: 'l-exp-majduri', amount: 150000, isDebit: true },
      { ledgerId: 'l-cash', amount: 150000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },

  // ==========================================
  // 4. ELECTRICITY & WATER EXPENSES (12 PAYMENT VOUCHERS)
  // ==========================================
  {
    id: 'v-el-5',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0005',
    voucherType: 'PAYMENT',
    date: '2025-04-30',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 1979, isDebit: true },
      { ledgerId: 'l-cash', amount: 1979, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-11',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0011',
    voucherType: 'PAYMENT',
    date: '2025-05-31',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 6303, isDebit: true },
      { ledgerId: 'l-cash', amount: 6303, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-15',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0015',
    voucherType: 'PAYMENT',
    date: '2025-06-30',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 4336, isDebit: true },
      { ledgerId: 'l-cash', amount: 4336, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-25',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0025',
    voucherType: 'PAYMENT',
    date: '2025-07-31',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 11882, isDebit: true },
      { ledgerId: 'l-cash', amount: 11882, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-30',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0030',
    voucherType: 'PAYMENT',
    date: '2025-09-06',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 1460, isDebit: true },
      { ledgerId: 'l-cash', amount: 1460, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-34',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0034',
    voucherType: 'PAYMENT',
    date: '2025-09-30',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 1360, isDebit: true },
      { ledgerId: 'l-cash', amount: 1360, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-39',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0039',
    voucherType: 'PAYMENT',
    date: '2025-10-30',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 3496, isDebit: true },
      { ledgerId: 'l-cash', amount: 3496, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-45',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0045',
    voucherType: 'PAYMENT',
    date: '2025-11-30',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 3173, isDebit: true },
      { ledgerId: 'l-cash', amount: 3173, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-49',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0049',
    voucherType: 'PAYMENT',
    date: '2025-12-31',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 3311, isDebit: true },
      { ledgerId: 'l-cash', amount: 3311, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-57',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0057',
    voucherType: 'PAYMENT',
    date: '2026-01-31',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 3115, isDebit: true },
      { ledgerId: 'l-cash', amount: 3115, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-62',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0062',
    voucherType: 'PAYMENT',
    date: '2026-02-28',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 3436, isDebit: true },
      { ledgerId: 'l-cash', amount: 3436, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-el-75',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0075',
    voucherType: 'PAYMENT',
    date: '2026-03-31',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Electricity and Borewell water motor bill paid in cash',
    entries: [
      { ledgerId: 'l-exp-elect', amount: 4529, isDebit: true },
      { ledgerId: 'l-cash', amount: 4529, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },

  // ==========================================
  // 5. CATTLE FEED & GRASS EXPENSES (33 JOURNAL & PAYMENT VOUCHERS)
  // ==========================================
  {
    id: 'v-feed-j1',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0001',
    voucherType: 'JOURNAL',
    date: '2025-04-04',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Mohini Flour Mill',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 52500, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 52500, isDebit: false, narration: 'Mohini Flour Mill' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j2',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0002',
    voucherType: 'JOURNAL',
    date: '2025-04-04',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of grass chara fodder from Manohar Ji',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 27600, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 27600, isDebit: false, narration: 'Manohar Ji' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j3',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0003',
    voucherType: 'JOURNAL',
    date: '2025-04-10',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Mohini Flour Mill',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 53125, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 53125, isDebit: false, narration: 'Mohini Flour Mill' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j4',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0004',
    voucherType: 'JOURNAL',
    date: '2025-04-19',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Gopal Singh Mewada',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 200000, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 200000, isDebit: false, narration: 'Gopal Singh Mewada' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j5',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0005',
    voucherType: 'JOURNAL',
    date: '2025-05-19',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Gopal Singh Mewada',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 50000, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 50000, isDebit: false, narration: 'Gopal Singh Mewada' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-p10',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0010',
    voucherType: 'PAYMENT',
    date: '2025-05-30',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Paid cash for small grass fodder loads',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 2056, isDebit: true },
      { ledgerId: 'l-cash', amount: 2056, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j6',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0006',
    voucherType: 'JOURNAL',
    date: '2025-06-16',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Gopal Singh Mewada',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 132500, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 132500, isDebit: false, narration: 'Gopal Singh Mewada' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j7',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0007',
    voucherType: 'JOURNAL',
    date: '2025-07-11',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Mohini Flour Mill',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 101650, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 101650, isDebit: false, narration: 'Mohini Flour Mill' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j8',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0008',
    voucherType: 'JOURNAL',
    date: '2025-07-14',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Gopal Singh Mewada',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 182500, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 182500, isDebit: false, narration: 'Gopal Singh Mewada' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j9',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0009',
    voucherType: 'JOURNAL',
    date: '2025-07-14',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Manthan Agrawal',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 120000, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 120000, isDebit: false, narration: 'Manthan Agrawal' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-p23',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0023',
    voucherType: 'PAYMENT',
    date: '2025-07-25',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Paid cash for dry fodder load',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 1988, isDebit: true },
      { ledgerId: 'l-cash', amount: 1988, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j10',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0010',
    voucherType: 'JOURNAL',
    date: '2025-08-21',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Rajesh Patdar',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 100000, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 100000, isDebit: false, narration: 'Rajesh Patdar' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j12',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0012',
    voucherType: 'JOURNAL',
    date: '2025-09-19',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Mohini Flour Mill',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 53750, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 53750, isDebit: false, narration: 'Mohini Flour Mill' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j13',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0013',
    voucherType: 'JOURNAL',
    date: '2025-10-03',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Maruti Traders',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 87200, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 87200, isDebit: false, narration: 'Maruti Traders' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j14',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0014',
    voucherType: 'JOURNAL',
    date: '2025-10-13',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Manthan Agrawal',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 101800, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 101800, isDebit: false, narration: 'Manthan Agrawal' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j15',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0015',
    voucherType: 'JOURNAL',
    date: '2025-10-18',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Ritesh Agrawal',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 50000, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 50000, isDebit: false, narration: 'Ritesh Agrawal' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j16',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0016',
    voucherType: 'JOURNAL',
    date: '2025-11-06',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Mohini Flour Mill',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 51250, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 51250, isDebit: false, narration: 'Mohini Flour Mill' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j17',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0017',
    voucherType: 'JOURNAL',
    date: '2025-11-22',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Shri Giriraj Oil Industry',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 47580, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 47580, isDebit: false, narration: 'Shri Giriraj Oil Industry' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j18',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0018',
    voucherType: 'JOURNAL',
    date: '2025-11-25',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Manthan Agrawal',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 52850, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 52850, isDebit: false, narration: 'Manthan Agrawal' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j19',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0019',
    voucherType: 'JOURNAL',
    date: '2025-12-04',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Ritesh Agrawal',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 41000, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 41000, isDebit: false, narration: 'Ritesh Agrawal' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-p50',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0050',
    voucherType: 'PAYMENT',
    date: '2026-01-01',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Paid cash for small fodder supplies',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 2512, isDebit: true },
      { ledgerId: 'l-cash', amount: 2512, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j20',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0020',
    voucherType: 'JOURNAL',
    date: '2026-01-02',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Mohini Flour Mill',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 48000, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 48000, isDebit: false, narration: 'Mohini Flour Mill' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j21',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0021',
    voucherType: 'JOURNAL',
    date: '2026-01-23',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Mohini Flour Mill',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 55500, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 55500, isDebit: false, narration: 'Mohini Flour Mill' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j22',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0022',
    voucherType: 'JOURNAL',
    date: '2026-01-29',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Manthan Agrawal',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 92880, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 92880, isDebit: false, narration: 'Manthan Agrawal' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j23',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0023',
    voucherType: 'JOURNAL',
    date: '2026-02-20',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Mohini Flour Mill',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 52237, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 52237, isDebit: false, narration: 'Mohini Flour Mill' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j24',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0024',
    voucherType: 'JOURNAL',
    date: '2026-03-11',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Manohar Ji',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 37800, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 37800, isDebit: false, narration: 'Manohar Ji' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j25',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0025',
    voucherType: 'JOURNAL',
    date: '2026-03-11',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Naveen Rathore',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 88450, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 88450, isDebit: false, narration: 'Naveen Rathore' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j26',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0026',
    voucherType: 'JOURNAL',
    date: '2026-03-13',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Naveen Rathore',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 75000, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 75000, isDebit: false, narration: 'Naveen Rathore' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-p66',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0066',
    voucherType: 'PAYMENT',
    date: '2026-03-14',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Paid cash for small fodder loads',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 2104, isDebit: true },
      { ledgerId: 'l-cash', amount: 2104, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j27',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0027',
    voucherType: 'JOURNAL',
    date: '2026-03-16',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Bablu Dhangar',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 27637, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 27637, isDebit: false, narration: 'Bablu Dhangar' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j28',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0028',
    voucherType: 'JOURNAL',
    date: '2026-03-18',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Dharmendra Mewada',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 34290, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 34290, isDebit: false, narration: 'Dharmendra Mewada' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j29',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0029',
    voucherType: 'JOURNAL',
    date: '2026-03-25',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Bablu Dhangar',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 25812, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 25812, isDebit: false, narration: 'Bablu Dhangar' }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-feed-j30',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0030',
    voucherType: 'JOURNAL',
    date: '2026-03-26',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Purchase of cattlefeed grass from Suner Singh',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 22500, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 22500, isDebit: false, narration: 'Suner Singh' }
    ],
    attachments: [],
    auditTrail: []
  },

  // ==========================================
  // 6. YEAR END ACCRUAL ADJUSTMENTS & SPECIAL TRANSFERS
  // ==========================================
  // Accrued Cattle Feed: Add ₹1,36,450 to chara ledger to match ₹22,10,521 on P&L
  {
    id: 'v-feed-accrual',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0031',
    voucherType: 'JOURNAL',
    date: '2026-03-31',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Accrued Cattle Feed expenses for year-end outstanding balance',
    entries: [
      { ledgerId: 'l-exp-chara', amount: 136450, isDebit: true },
      { ledgerId: 'l-liab-creditors', amount: 136450, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },

  // Accrued Other Exp: Add ₹27,000 to other expenses to match ₹62,768 on P&L
  {
    id: 'v-other-accrual',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-JOR-0032',
    voucherType: 'JOURNAL',
    date: '2026-03-31',
    status: 'POSTED',
    narration: 'Year-end accrued other expenses adjustment entry',
    entries: [
      { ledgerId: 'l-exp-other', amount: 27000, isDebit: true },
      { ledgerId: 'l-fund-general', amount: 27000, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },

  // Bank of India closed account transfer of ₹3,630
  {
    id: 'v-bob-closure',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-CON-0002',
    voucherType: 'CONTRA',
    date: '2025-06-30',
    status: 'POSTED',
    narration: 'Closed Narmada Malwa Gramin Bank A/c and transferred balance to Bank of India A/c',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 3630, isDebit: true },
      { ledgerId: 'l-bank-bob', amount: 3630, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },

  // Contra Cash Withdrawal (Corrected value to hit exact closing cash)
  {
    id: 'v-contra-main',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-CON-0001',
    voucherType: 'CONTRA',
    date: '2025-04-15',
    status: 'POSTED',
    narration: 'Withdrew cash from BOI bank to fund cash expenditures',
    entries: [
      { ledgerId: 'l-cash', amount: 73277, isDebit: true },
      { ledgerId: 'l-bank-boi', amount: 73277, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },

  // Paid creditors for purchase of cattlefeed (Consolidated payment from bank): ₹20,92,411
  {
    id: 'v-pay-creditors',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0081',
    voucherType: 'PAYMENT',
    date: '2026-03-29',
    status: 'POSTED',
    costCenterId: 'cc-feed',
    narration: 'Paid Sundry Feed Creditors (Mohini Mill, Gopal Mewada, etc) via bank of India',
    entries: [
      { ledgerId: 'l-liab-creditors', amount: 2092411, isDebit: true },
      { ledgerId: 'l-bank-boi', amount: 2092411, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },

  // TDS Payment: ₹1,553
  {
    id: 'v-pay-tds',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0082',
    voucherType: 'PAYMENT',
    date: '2026-03-31',
    status: 'POSTED',
    narration: 'TDS paid via bank to Income Tax Dept',
    entries: [
      { ledgerId: 'l-tds-receivable', amount: 1553, isDebit: true }, // Record as asset/offset
      { ledgerId: 'l-bank-boi', amount: 1553, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },

  // Other General Vouchers
  {
    id: 'v-oth-don',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0031',
    voucherType: 'RECEIPT',
    date: '2026-03-20',
    status: 'POSTED',
    narration: 'Donation Received under receipt log',
    entries: [
      { ledgerId: 'l-cash', amount: 6100, isDebit: true },
      { ledgerId: 'l-inc-donations', amount: 6100, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-oth-int',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-REC-0032',
    voucherType: 'RECEIPT',
    date: '2026-03-28',
    status: 'POSTED',
    narration: 'Interest Rec on Saving A/c credited by bank',
    entries: [
      { ledgerId: 'l-bank-boi', amount: 4599, isDebit: true },
      { ledgerId: 'l-inc-interest', amount: 4599, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-oth-ca',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0079',
    voucherType: 'PAYMENT',
    date: '2026-03-31',
    status: 'POSTED',
    costCenterId: 'cc-admin',
    narration: 'Paid auditing fees and accounting charges',
    entries: [
      { ledgerId: 'l-exp-accounting-fees', amount: 1500, isDebit: true },
      { ledgerId: 'l-exp-audit-fees', amount: 2000, isDebit: true },
      { ledgerId: 'l-bank-boi', amount: 3500, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  },
  {
    id: 'v-oth-misc',
    fyId: 'fy-2025-26',
    voucherNumber: 'V-PAY-0080',
    voucherType: 'PAYMENT',
    date: '2026-03-31',
    status: 'POSTED',
    narration: 'Consolidated payments for repairs, transport, bank charges and other items',
    entries: [
      { ledgerId: 'l-exp-other', amount: 35768, isDebit: true }, // Cash outlay base
      { ledgerId: 'l-exp-marammat', amount: 1930, isDebit: true },
      { ledgerId: 'l-exp-transport', amount: 5155, isDebit: true },
      { ledgerId: 'l-exp-bank-charges', amount: 566.40, isDebit: true },
      { ledgerId: 'l-bank-boi', amount: 43419.40, isDebit: false }
    ],
    attachments: [],
    auditTrail: []
  }
];
