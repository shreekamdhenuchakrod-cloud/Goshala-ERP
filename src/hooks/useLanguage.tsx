import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const formatBilingual = (str: string, lang: 'en' | 'hi'): string => {
  if (!str) return '';
  const match = str.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    const [, enText, hiText] = match;
    return lang === 'hi' ? hiText.trim() : enText.trim();
  }
  return str;
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    dashboard: 'Dashboard',
    vouchers: 'Vouchers & Entries',
    contra: 'Bank & Cash Book',
    assets_loans: 'Assets & Loans',
    reports: 'CA Reports & Balance Sheet',
    settings: 'Backup & Settings',
    
    // Dashboard metrics
    total_cows: 'Total Cattle',
    milk_production: 'Today\'s Milk Production',
    total_donations: 'Total Donations',
    today_income: 'Today\'s Income',
    today_expense: 'Today\'s Expenses',
    cash_balance: 'Cash Balance',
    bank_balance: 'Bank Balance',
    outstanding_loans: 'Outstanding Loans',
    pending_approvals: 'Pending Approvals',
    pending_audits: 'Pending Audits',
    vaccinations_due: 'Vaccination Due',
    today_birth: 'Today\'s Births',
    today_death: 'Today\'s Deaths',
    stock_status: 'Stock Status',
    recent_transactions: 'Recent Vouchers',
    active_financial_year: 'Active Financial Year',

    // Additional metrics labels
    cash_in_hand: 'Cash in Hand',
    bank_accounts_bal: 'Bank Balance',
    fodder_stock_val: 'Fodder Stock Value',
    fixed_assets_val: 'Fixed Assets',
    ai_suggestions_title: 'AI Insight Suggestions',
    ai_assistant_title: 'AI Accounting Assistant',
    ai_assistant_desc: 'Type natural language commands to automatically draft or post journal double-entries',
    ai_instruction_label: 'Write transaction instructions in plain English',
    ai_parsed_preview: 'Parsed Transaction Preview',
    post_entry_btn: 'Post Entry to Books',
    analyze_instructions_btn: 'Analyze instructions',
    ai_notifications_title: 'Live Notifications & Safety Alerts',
    
    // Settings & security
    add_payment_type_title: 'ADD NEW PAYMENT TYPE',
    app_security_pin_title: 'App Security PIN',
    current_pin_label: 'Current PIN',
    new_pin_label: 'New 4-Digit PIN',
    save_pin_btn: 'Save New PIN',
    wipe_data_title: 'Wipe All Data',
    danger_zone_title: '🚨 Danger Zone',
    cost_center_budget_label: 'Allocated Budget',
    spent_amount_label: 'Total Spent',
    financial_years_title: 'Financial Years Manager',

    // Generic Actions
    add_new: 'Add New',
    save: 'Save',
    cancel: 'Cancel',
    approve: 'Approve',
    reject: 'Reject',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    status: 'Status',
    date: 'Date',
    amount: 'Amount',
    narration: 'Narration',
    submit: 'Submit',
    actions: 'Actions',
    
    // Roles
    super_admin: 'Super Admin',
    president: 'President',
    secretary: 'Secretary',
    treasurer: 'Goshala Treasurer',
    accountant: 'Accountant',
    auditor: 'Auditor',
    employee: 'Employee',
    volunteer: 'Volunteer',
    switch_role: 'Switch Role'
  },
  hi: {
    // Nav
    dashboard: 'डैशबोर्ड',
    vouchers: 'आवक व भुगतान (वाउचर)',
    contra: 'बैंक एवं नकद बही',
    assets_loans: 'संपत्ति एवं ऋण',
    reports: 'लेखा रिपोर्ट एवं बैलेंस शीट',
    settings: 'सेटिंग्स एवं बैकअप',

    // Dashboard metrics
    total_cows: 'कुल गौवंश',
    milk_production: 'आज का दुग्ध उत्पादन',
    total_donations: 'कुल प्राप्त दान',
    today_income: 'आज की आय',
    today_expense: 'आज का खर्च',
    cash_balance: 'नकद शेष',
    bank_balance: 'बैंक शेष',
    outstanding_loans: 'बकाया ऋण',
    pending_approvals: 'लंबित स्वीकृतियां',
    pending_audits: 'लंबित ऑडिट',
    vaccinations_due: 'टीकाकरण देय',
    today_birth: 'आज के जन्म',
    today_death: 'आज की मृत्यु',
    stock_status: 'स्टॉक स्थिति',
    recent_transactions: 'हाल के वाउचर',
    active_financial_year: 'सक्रिय वित्तीय वर्ष',

    // Additional metrics labels
    cash_in_hand: 'कैश इन हैंड (नकद शेष)',
    bank_accounts_bal: 'बैंक शेष',
    fodder_stock_val: 'चारा स्टॉक मूल्य',
    fixed_assets_val: 'अचल संपत्ति',
    ai_suggestions_title: 'एआई सुझाव',
    ai_assistant_title: 'एआई लेखा सहायक',
    ai_assistant_desc: 'खाते में सीधे प्रविष्टि करने के लिए निर्देश लिखें',
    ai_instruction_label: 'सीधे प्रविष्टि करने के लिए निर्देश लिखें',
    ai_parsed_preview: 'एआई परिणाम (पूर्वावलोकन)',
    post_entry_btn: 'खाते में दर्ज करें',
    analyze_instructions_btn: 'निर्देश का विश्लेषण करें',
    ai_notifications_title: 'लाइव सूचनाएं एवं सुरक्षा अलर्ट',
    
    // Settings & security
    add_payment_type_title: 'नया भुगतान प्रकार जोड़ें',
    app_security_pin_title: 'सुरक्षा पिन बदलें',
    current_pin_label: 'वर्तमान पिन',
    new_pin_label: 'नया पिन',
    save_pin_btn: 'सुरक्षा पिन सहेजें',
    wipe_data_title: 'खाता खाली करें (डेटा साफ करें)',
    danger_zone_title: '🚨 डेंजर ज़ोन',
    cost_center_budget_label: 'आवंटित राशि',
    spent_amount_label: 'कुल व्यय',
    financial_years_title: 'वित्तीय वर्ष प्रबंधक',

    // Generic Actions
    add_new: 'नया जोड़ें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    approve: 'स्वीकृत करें',
    reject: 'अस्वीकार करें',
    edit: 'संपादित करें',
    delete: 'हटाएं',
    view: 'देखें',
    status: 'स्थिति',
    date: 'तारीख',
    amount: 'राशि',
    narration: 'विवरण',
    submit: 'जमा करें',
    actions: 'कार्रवाई',

    // Roles
    super_admin: 'सुपर एडमिन',
    president: 'अध्यक्ष',
    secretary: 'सचिव',
    treasurer: 'गौशाला कोषाध्यक्ष',
    accountant: 'मुनीम (एकाउंटेंट)',
    auditor: 'अंकेक्षक (सीए)',
    employee: 'कर्मचारी',
    volunteer: 'स्वयंसेवक',
    switch_role: 'भूमिका बदलें'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('goshala_erp_lang') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('goshala_erp_lang', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
