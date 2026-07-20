import React, { createContext, useContext, useState } from 'react';
import { Role, User } from '../db/schema';

interface AuthContextType {
  user: User;
  setRole: (role: Role) => void;
  hasAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple role permission mapping
const PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'], // Access everything
  PRESIDENT: ['dashboard', 'reports', 'committee', 'approve_expenses', 'documents'],
  SECRETARY: ['dashboard', 'cows', 'milk', 'inventory', 'crm', 'committee', 'documents'],
  TREASURER: ['dashboard', 'vouchers', 'reports', 'bank', 'cashbook', 'approve_vouchers', 'loans'],
  ACCOUNTANT: ['dashboard', 'vouchers', 'reports', 'bank', 'cashbook', 'ledger', 'inventory', 'crm'],
  AUDITOR: ['dashboard', 'reports', 'audit', 'audit_adjustments', 'fy_lock', 'documents'],
  EMPLOYEE: ['dashboard', 'attendance_log', 'milk_yield_log', 'view_cows'],
  VOLUNTEER: ['dashboard', 'view_cows', 'view_milk']
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    const savedRole = localStorage.getItem('goshala_erp_role') as Role;
    return {
      id: 'active-u',
      username: 'active_user',
      name: 'Aditya Vardhan',
      role: savedRole || 'SUPER_ADMIN'
    };
  });

  const setRole = (role: Role) => {
    const names: Record<Role, string> = {
      SUPER_ADMIN: 'Aditya Vardhan (Admin)',
      PRESIDENT: 'Dr. Mahesh Chandra (President)',
      SECRETARY: 'Yashwant Vyas (Secretary)',
      TREASURER: 'Rajendra Prasad (Treasurer)',
      ACCOUNTANT: 'Manoj Kumar Gupta (Accountant)',
      AUDITOR: 'CA Shailesh Taparia (Auditor)',
      EMPLOYEE: 'Ram Vilas (Employee)',
      VOLUNTEER: 'Suresh Patel (Volunteer)'
    };
    const updatedUser = { ...user, role, name: names[role] };
    setUser(updatedUser);
    localStorage.setItem('goshala_erp_role', role);
  };

  const hasAccess = (module: string): boolean => {
    const allowed = PERMISSIONS[user.role];
    if (allowed.includes('*')) return true;
    return allowed.includes(module);
  };

  return (
    <AuthContext.Provider value={{ user, setRole, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
