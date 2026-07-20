import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Employee, AttendanceRecord, PayrollEntry } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Plus, Check, Clock, MapPin, Camera, Printer, Award, FileSpreadsheet, Trash, Play } from 'lucide-react';

export const EmployeeModule: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollEntry[]>([]);

  // Simulator state
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [mockCoords, setMockCoords] = useState({ lat: 0, lng: 0 });

  // Payroll Form state
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollEntry | null>(null);
  
  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    month: '2026-07',
    overtime: 0,
    bonus: 0,
    advanceDeduction: 0,
    fine: 0
  });

  useEffect(() => {
    setEmployees(GoshalaDB.getTable<Employee>('employees'));
    setAttendance(GoshalaDB.getTable<AttendanceRecord>('attendance'));
    setPayroll(GoshalaDB.getTable<PayrollEntry>('payroll'));
  }, []);

  const reloadData = () => {
    setAttendance(GoshalaDB.getTable<AttendanceRecord>('attendance'));
    setPayroll(GoshalaDB.getTable<PayrollEntry>('payroll'));
  };

  const getEmpName = (id: string) => {
    return employees.find(e => e.id === id)?.name || id;
  };

  const getEmpSalary = (id: string) => {
    return employees.find(e => e.id === id)?.salary || 0;
  };

  // GPS selfie clock in simulator
  const handleGPSClockIn = () => {
    if (!targetEmployeeId) return alert('Select employee profile first');
    
    // Simulate GPS acquisition
    const baseLat = 26.8467; // Lucknow/UP Goshala area
    const baseLng = 80.9462;
    const lat = baseLat + (Math.random() - 0.5) * 0.01;
    const lng = baseLng + (Math.random() - 0.5) * 0.01;
    
    setMockCoords({ lat, lng });
    setSelfieCaptured(true);

    setTimeout(() => {
      const record: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId: targetEmployeeId,
        date: new Date().toISOString().split('T')[0],
        checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'PRESENT',
        gpsLat: lat,
        gpsLng: lng,
        selfieUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${getEmpName(targetEmployeeId)}`
      };

      const table = GoshalaDB.getTable<AttendanceRecord>('attendance');
      table.push(record);
      GoshalaDB.saveTable('attendance', table);
      setAttendance(table);
      setSelfieCaptured(false);
      setTargetEmployeeId('');
      GoshalaDB.logAction(user.name, user.role, 'ATTENDANCE_CHECKIN', `Logged attendance via GPS selfie for employee ID: ${record.employeeId}`);
    }, 1200);
  };

  // Run payroll calculations
  const handleGeneratePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollForm.employeeId) return alert('Select employee');

    const emp = employees.find(e => e.id === payrollForm.employeeId);
    if (!emp) return;

    const base = emp.salary;
    const ov = Number(payrollForm.overtime);
    const bon = Number(payrollForm.bonus);
    const adv = Number(payrollForm.advanceDeduction);
    const fine = Number(payrollForm.fine);
    
    // PF 12%, ESI 0.75% of base
    const pf = base * 0.12;
    const esi = base * 0.0075;
    const net = base + ov + bon - adv - fine - pf - esi;

    const config = GoshalaDB.getTable<any>('config')[0] || { activeFyId: 'fy-2025-26' };
    const slipNumber = `PAY-${payrollForm.month.replace('-', '')}-${String(payroll.length + 1).padStart(3, '0')}`;

    const newPayroll: PayrollEntry = {
      id: `p-${Date.now()}`,
      employeeId: emp.id,
      fyId: config.activeFyId,
      month: payrollForm.month,
      baseSalary: base,
      overtime: ov,
      bonus: bon,
      advanceDeduction: adv,
      fine,
      pfDeduction: pf,
      esiDeduction: esi,
      netSalary: net,
      status: 'PENDING',
      slipNumber
    };

    const table = GoshalaDB.getTable<PayrollEntry>('payroll');
    table.push(newPayroll);
    GoshalaDB.saveTable('payroll', table);
    setPayroll(table);
    setShowPayrollModal(false);

    // Double-entry integration: Create a Journal/Payment Voucher for Salary Payable
    const voucher = {
      id: `v-pay-${Date.now()}`,
      fyId: config.activeFyId,
      voucherNumber: '',
      voucherType: 'PAYMENT' as const,
      date: new Date().toISOString().split('T')[0],
      status: 'POSTED' as const,
      costCenterId: 'cc-salary' as any,
      narration: `Disbursed employee monthly payroll. Staff: ${emp.name}. Month: ${payrollForm.month}. Net: ₹${net.toFixed(2)}. Slip: ${slipNumber}`,
      entries: [
        { ledgerId: 'l-exp-salary', amount: net, isDebit: true },
        { ledgerId: 'l-bank-sbi', amount: net, isDebit: false }
      ],
      attachments: [],
      auditTrail: []
    };

    GoshalaDB.saveVoucher(voucher, { name: user.name, role: user.role });
    GoshalaDB.logAction(user.name, user.role, 'RUN_PAYROLL', `Run payroll slip: ${slipNumber} for ${emp.name}`);
  };

  return (
    <div className="space-y-8">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Staff Attendance & Payroll Suite</h2>
          <p className="text-slate-500 text-xs dark:text-slate-400">Perform GPS selfie check-ins, record daily staff attendance logs, and compile CA payrolls</p>
        </div>

        {user.role !== 'AUDITOR' && user.role !== 'VOLUNTEER' && (
          <button
            onClick={() => {
              setPayrollForm({ employeeId: employees[0]?.id || '', month: '2026-07', overtime: 0, bonus: 0, advanceDeduction: 0, fine: 0 });
              setShowPayrollModal(true);
            }}
            className="flex items-center space-x-2 bg-forest-600 hover:bg-forest-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Salary Slip</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Card: GPS Selfie Clock-in Simulator */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-5 lg:col-span-1">
          <h3 className="font-extrabold text-base text-slate-850 dark:text-white flex items-center space-x-1.5">
            <Camera className="w-5 h-5 text-forest-600" />
            <span>GPS Selfie Check-In</span>
          </h3>

          <div className="space-y-4">
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-500">Select Employee Profile</label>
              <select
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900"
              >
                <option value="">Choose Staff Profile</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>)}
              </select>
            </div>

            {/* Shutter Camera box */}
            <div className="h-44 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
              {selfieCaptured ? (
                <div className="absolute inset-0 bg-forest-900/10 flex flex-col items-center justify-center animate-pulse">
                  <MapPin className="w-8 h-8 text-forest-600 animate-bounce" />
                  <span className="text-xs font-bold text-forest-600 mt-2">Acquiring GPS Lock...</span>
                </div>
              ) : targetEmployeeId ? (
                <div className="text-center p-4 space-y-2">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Ready to take selfie verification</p>
                  <p className="text-[10px] text-slate-400 font-mono">GPS Coordinates will snap Ahmedabad regional coordinates</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center px-6">Select employee above to initiate attendance simulator</p>
              )}
            </div>

            <button
              onClick={handleGPSClockIn}
              disabled={!targetEmployeeId || selfieCaptured}
              className="w-full py-2.5 bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>{selfieCaptured ? 'Processing check-in...' : 'Take Selfie & Clock-in'}</span>
            </button>
          </div>
        </div>

        {/* Right Section: Attendance Log */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4 lg:col-span-2">
          <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Attendance Register</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase">
                  <th className="pb-3">Selfie</th>
                  <th className="pb-3">Employee Name</th>
                  <th className="pb-3">Check-in Time</th>
                  <th className="pb-3">GPS Coordinates</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                {attendance.length === 0 ? (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-400 italic">No attendance records today. Use clock-in panel to simulate.</td></tr>
                ) : (
                  attendance.map(a => (
                    <tr key={a.id}>
                      <td className="py-3">
                        <img src={a.selfieUrl} alt="selfie" className="w-8 h-8 rounded-full border border-slate-200" />
                      </td>
                      <td className="py-3 font-semibold">{getEmpName(a.employeeId)}</td>
                      <td className="py-3">{a.checkIn}</td>
                      <td className="py-3 font-mono text-[10px] text-slate-400">
                        {a.gpsLat ? `${a.gpsLat.toFixed(4)}° N, ${a.gpsLng?.toFixed(4)}° E` : 'No GPS logs'}
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-forest-50 text-forest-600 dark:bg-forest-950/20">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Salary payroll records register */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/60 shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-slate-805 dark:text-white">Active Payroll Sheets</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase">
                <th className="pb-3">Payslip Ref</th>
                <th className="pb-3">Month</th>
                <th className="pb-3">Employee Name</th>
                <th className="pb-3">Base Pay</th>
                <th className="pb-3">ESI + PF Ded</th>
                <th className="pb-3">Net Disbursed</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">View Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
              {payroll.map(p => (
                <tr key={p.id}>
                  <td className="py-3.5 font-bold font-mono text-slate-850 dark:text-slate-200">{p.slipNumber}</td>
                  <td className="py-3.5">{p.month}</td>
                  <td className="py-3.5 font-semibold">{getEmpName(p.employeeId)}</td>
                  <td className="py-3.5">₹{p.baseSalary.toLocaleString()}</td>
                  <td className="py-3.5 font-mono text-red-500">-₹{(p.esiDeduction + p.pfDeduction).toFixed(2)}</td>
                  <td className="py-3.5 font-black text-forest-650">₹{p.netSalary.toLocaleString()}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-forest-500 text-white">DISBURSED</span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => setSelectedPayroll(p)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-forest-600 dark:text-forest-400"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Slip Generation Modal */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800">Generate Salary Payslip</h3>
              <button onClick={() => setShowPayrollModal(false)} className="text-xs font-bold text-slate-400">Close</button>
            </div>
            
            <form onSubmit={handleGeneratePayroll} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500">Select Employee</label>
                <select
                  value={payrollForm.employeeId}
                  required
                  onChange={(e) => setPayrollForm({ ...payrollForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} (Base: ₹{e.salary})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500">Pay Period Month</label>
                  <input
                    type="month"
                    required
                    value={payrollForm.month}
                    onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500">Overtime hours pay (₹)</label>
                  <input
                    type="number"
                    value={payrollForm.overtime}
                    onChange={(e) => setPayrollForm({ ...payrollForm, overtime: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500">Bonus (₹)</label>
                  <input
                    type="number"
                    value={payrollForm.bonus}
                    onChange={(e) => setPayrollForm({ ...payrollForm, bonus: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500">Advance Ded (₹)</label>
                  <input
                    type="number"
                    value={payrollForm.advanceDeduction}
                    onChange={(e) => setPayrollForm({ ...payrollForm, advanceDeduction: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500">Fines Ded (₹)</label>
                  <input
                    type="number"
                    value={payrollForm.fine}
                    onChange={(e) => setPayrollForm({ ...payrollForm, fine: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold text-sm rounded-xl mt-4">
                Calculate salary & Issue Bank Disburse
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Salary Slip Viewer Modal */}
      {selectedPayroll && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 dark:bg-slate-900/60 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white">Pay Slip Exemption Sheet</h4>
                <p className="text-[10px] font-mono text-slate-400">Slip ID: {selectedPayroll.slipNumber}</p>
              </div>
              <button onClick={() => setSelectedPayroll(null)} className="text-xs font-bold text-slate-400">Close</button>
            </div>
            
            <div className="p-6 space-y-5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between border-b pb-4">
                <div>
                  <h5 className="font-bold text-forest-700">Gaushala Samiti Office</h5>
                  <p className="text-[10px] text-slate-400">Salary Statement for period {selectedPayroll.month}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{getEmpName(selectedPayroll.employeeId)}</p>
                  <p className="text-slate-400">Bank transfer disburse</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Gross Salary:</span>
                  <span className="font-bold">₹{selectedPayroll.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-forest-600 font-semibold">
                  <span>Overtime allowance:</span>
                  <span>+₹{selectedPayroll.overtime}</span>
                </div>
                <div className="flex justify-between text-forest-600 font-semibold">
                  <span>Bonus incentive:</span>
                  <span>+₹{selectedPayroll.bonus}</span>
                </div>
                <div className="flex justify-between text-red-500 font-semibold">
                  <span>Advances deduction:</span>
                  <span>-₹{selectedPayroll.advanceDeduction}</span>
                </div>
                <div className="flex justify-between text-red-500 font-semibold">
                  <span>Fines/Late deductions:</span>
                  <span>-₹{selectedPayroll.fine}</span>
                </div>
                <div className="flex justify-between text-red-500 font-semibold">
                  <span>Provident Fund (PF - 12%):</span>
                  <span>-₹{selectedPayroll.pfDeduction.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-500 font-semibold">
                  <span>State Insurance (ESI - 0.75%):</span>
                  <span>-₹{selectedPayroll.esiDeduction.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t pt-2.5 text-slate-900 dark:text-white">
                  <span>Net Salary Credited:</span>
                  <span className="text-forest-600">₹{selectedPayroll.netSalary.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
