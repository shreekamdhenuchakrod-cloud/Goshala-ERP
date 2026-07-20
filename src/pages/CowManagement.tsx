import React, { useState, useEffect } from 'react';
import { GoshalaDB } from '../db/db';
import { Cow } from '../db/schema';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Search, Plus, QrCode, Clipboard, Activity, Syringe, HeartPulse, Sparkles, Download, X, PlusCircle } from 'lucide-react';

export const CowManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [cows, setCows] = useState<Cow[]>([]);
  const [search, setSearch] = useState('');
  const [filterBreed, setFilterBreed] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCow, setSelectedCow] = useState<Cow | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Cow>>({
    rfidTag: '',
    breed: 'Gir',
    color: '',
    gender: 'Female',
    birthDate: '',
    purchaseDate: '',
    purchaseCost: 0,
    weight: 350,
    healthStatus: 'Healthy',
    pregnancyStatus: 'Not Pregnant',
    calfHistoryCount: 0,
    milkYieldQuantity: 0,
    locationShed: 'Shed Number 1'
  });

  useEffect(() => {
    setCows(GoshalaDB.getTable<Cow>('cows'));
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rfidTag) return alert('RFID Tag is required');

    const newCow: Cow = {
      id: selectedCow?.id || `cow-${Date.now()}`,
      rfidTag: formData.rfidTag,
      breed: formData.breed || 'Gir',
      color: formData.color || 'Brown',
      gender: formData.gender as 'Male' | 'Female',
      birthDate: formData.birthDate || new Date().toISOString().split('T')[0],
      purchaseDate: formData.purchaseDate,
      purchaseCost: Number(formData.purchaseCost) || undefined,
      weight: Number(formData.weight) || 350,
      healthStatus: formData.healthStatus as any,
      pregnancyStatus: formData.pregnancyStatus as any,
      calfHistoryCount: Number(formData.calfHistoryCount) || 0,
      milkYieldQuantity: Number(formData.milkYieldQuantity) || 0,
      locationShed: formData.locationShed || 'Shed Number 1',
      vaccinations: selectedCow?.vaccinations || [],
      medicalHistory: selectedCow?.medicalHistory || [],
      insuranceDetails: selectedCow?.insuranceDetails
    };

    const table = GoshalaDB.getTable<Cow>('cows');
    if (selectedCow) {
      const idx = table.findIndex(c => c.id === selectedCow.id);
      table[idx] = newCow;
    } else {
      table.push(newCow);
    }
    
    GoshalaDB.saveTable('cows', table);
    setCows(table);
    setShowAddModal(false);
    setSelectedCow(null);
    GoshalaDB.logAction(user.name, user.role, 'SAVE_COW', `Saved cow details for RFID: ${newCow.rfidTag}`);
  };

  const handleEditClick = (cow: Cow) => {
    setSelectedCow(cow);
    setFormData(cow);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this cattle record?')) return;
    const table = GoshalaDB.getTable<Cow>('cows');
    const filtered = table.filter(c => c.id !== id);
    GoshalaDB.saveTable('cows', filtered);
    setCows(filtered);
    GoshalaDB.logAction(user.name, user.role, 'DELETE_COW', `Deleted cattle ID: ${id}`);
  };

  // Add dummy medical log
  const [diag, setDiag] = useState('');
  const [treat, setTreat] = useState('');
  const addMedicalRecord = (cowId: string) => {
    if (!diag || !treat) return alert('Enter diagnosis and treatment');
    const table = GoshalaDB.getTable<Cow>('cows');
    const cow = table.find(c => c.id === cowId);
    if (cow) {
      cow.medicalHistory.push({
        diagnosis: diag,
        treatment: treat,
        date: new Date().toISOString().split('T')[0],
        status: 'Under Treatment'
      });
      GoshalaDB.saveTable('cows', table);
      setCows(table);
      setSelectedCow({ ...cow });
      setDiag('');
      setTreat('');
    }
  };

  const filteredCows = cows.filter(cow => {
    const matchesSearch = cow.rfidTag.toLowerCase().includes(search.toLowerCase()) || 
                          cow.breed.toLowerCase().includes(search.toLowerCase()) ||
                          cow.locationShed.toLowerCase().includes(search.toLowerCase());
    const matchesBreed = filterBreed === 'All' || cow.breed === filterBreed;
    const matchesStatus = filterStatus === 'All' || cow.healthStatus === filterStatus;
    return matchesSearch && matchesBreed && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Cattle Registry ({filteredCows.length})</h2>
          <p className="text-slate-500 text-xs dark:text-slate-400">Manage Goshala RFID tags, health profiles, and breeding lines</p>
        </div>
        
        {user.role !== 'AUDITOR' && user.role !== 'VOLUNTEER' && (
          <button
            onClick={() => {
              setSelectedCow(null);
              setFormData({
                rfidTag: `RFID-${Math.floor(10000 + Math.random() * 90000)}-${['A','B','C','D'][Math.floor(Math.random() * 4)]}`,
                breed: 'Gir',
                color: 'Saffron Brown',
                gender: 'Female',
                birthDate: '2022-01-01',
                weight: 350,
                healthStatus: 'Healthy',
                pregnancyStatus: 'Not Pregnant',
                calfHistoryCount: 0,
                milkYieldQuantity: 0,
                locationShed: 'Shed Number 1'
              });
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 bg-forest-600 hover:bg-forest-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-forest-900/10 transition duration-200"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Add Cattle</span>
          </button>
        )}
      </div>

      {/* Filter and Search bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search RFID, Breed, Shed Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={filterBreed}
            onChange={(e) => setFilterBreed(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 text-slate-700 dark:text-slate-200"
          >
            <option value="All">All Breeds</option>
            <option value="Gir">Gir</option>
            <option value="Sahiwal">Sahiwal</option>
            <option value="Tharparkar">Tharparkar</option>
            <option value="Kankrej">Kankrej</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 text-slate-700 dark:text-slate-200"
          >
            <option value="All">All Health Status</option>
            <option value="Healthy">Healthy</option>
            <option value="Sick">Sick</option>
            <option value="Under Treatment">Under Treatment</option>
          </select>
        </div>
      </div>

      {/* Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCows.map(cow => (
          <div key={cow.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between">
            <div className="p-5 space-y-4">
              
              {/* Header: RFID & Status */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">RFID Tag</span>
                  <h4 className="text-base font-extrabold text-slate-800 dark:text-white font-mono flex items-center space-x-1.5">
                    <span>{cow.rfidTag}</span>
                  </h4>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                  cow.healthStatus === 'Healthy' ? 'bg-forest-50 text-forest-600 dark:bg-forest-950/20 dark:text-forest-400' :
                  cow.healthStatus === 'Sick' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                  'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                }`}>
                  {cow.healthStatus}
                </span>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-slate-50 dark:border-slate-700/40 pt-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Breed</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{cow.breed}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Shed Number</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{cow.locationShed}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Yield (Daily avg)</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{cow.milkYieldQuantity ? `${cow.milkYieldQuantity} L` : '0 L (Dry)'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Status</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{cow.pregnancyStatus || 'Not Pregnant'}</span>
                </div>
              </div>

            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-700/60 px-5 py-3.5 flex justify-between items-center">
              <button
                onClick={() => setSelectedCow(cow)}
                className="text-xs font-bold text-forest-600 dark:text-forest-400 hover:text-forest-700 flex items-center space-x-1"
              >
                <Clipboard className="w-4 h-4" />
                <span>Full Passport</span>
              </button>
              
              <div className="flex space-x-2">
                {user.role !== 'AUDITOR' && user.role !== 'VOLUNTEER' && (
                  <>
                    <button
                      onClick={() => handleEditClick(cow)}
                      className="text-xs font-semibold px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(cow.id)}
                      className="text-xs font-semibold px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                    >
                      {t('delete')}
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">
                {selectedCow ? 'Edit Cattle Details' : 'Add New Cattle'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">RFID Tag Number</label>
                  <input
                    type="text"
                    required
                    value={formData.rfidTag}
                    onChange={(e) => setFormData({ ...formData, rfidTag: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Breed</label>
                  <select
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Gir">Gir</option>
                    <option value="Sahiwal">Sahiwal</option>
                    <option value="Tharparkar">Tharparkar</option>
                    <option value="Kankrej">Kankrej</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Color Description</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Shed Number Location</label>
                  <input
                    type="text"
                    value={formData.locationShed}
                    onChange={(e) => setFormData({ ...formData, locationShed: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Average Milk Yield (Litres)</label>
                  <input
                    type="number"
                    value={formData.milkYieldQuantity}
                    onChange={(e) => setFormData({ ...formData, milkYieldQuantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Health Status</label>
                  <select
                    value={formData.healthStatus}
                    onChange={(e) => setFormData({ ...formData, healthStatus: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="Sick">Sick</option>
                    <option value="Under Treatment">Under Treatment</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Pregnancy Status</label>
                  <select
                    value={formData.pregnancyStatus}
                    onChange={(e) => setFormData({ ...formData, pregnancyStatus: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Not Pregnant">Not Pregnant</option>
                    <option value="Pregnant">Pregnant</option>
                    <option value="Lactating">Lactating</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-500"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-forest-600 hover:bg-forest-700 text-white font-bold text-sm rounded-xl"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Passport Modal (RFID details scan sheet) */}
      {selectedCow && !showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-forest-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-saffron-400" />
                <h3 className="font-extrabold text-lg">Official Cattle Passport</h3>
              </div>
              <button onClick={() => setSelectedCow(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Layout: Info & QR */}
              <div className="flex flex-col md:flex-row gap-6 items-center border-b border-slate-100 dark:border-slate-700/60 pb-6">
                
                {/* Simulated QR Passport */}
                <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center bg-slate-50 dark:bg-slate-900 w-44">
                  {/* Clean SVG Mock QR */}
                  <svg className="w-32 h-32 text-slate-800 dark:text-slate-200" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="none" />
                    {/* QR Finder squares */}
                    <rect x="5" y="5" width="25" height="25" fill="currentColor" />
                    <rect x="10" y="10" width="15" height="15" fill="white" />
                    <rect x="12" y="12" width="11" height="11" fill="currentColor" />
                    
                    <rect x="70" y="5" width="25" height="25" fill="currentColor" />
                    <rect x="75" y="10" width="15" height="15" fill="white" />
                    <rect x="77" y="12" width="11" height="11" fill="currentColor" />
                    
                    <rect x="5" y="70" width="25" height="25" fill="currentColor" />
                    <rect x="10" y="75" width="15" height="15" fill="white" />
                    <rect x="12" y="77" width="11" height="11" fill="currentColor" />

                    {/* Small noise dots */}
                    <rect x="40" y="10" width="5" height="5" fill="currentColor" />
                    <rect x="55" y="15" width="8" height="6" fill="currentColor" />
                    <rect x="40" y="30" width="10" height="10" fill="currentColor" />
                    <rect x="45" y="55" width="5" height="12" fill="currentColor" />
                    <rect x="65" y="55" width="15" height="5" fill="currentColor" />
                    <rect x="75" y="75" width="12" height="12" fill="currentColor" />
                    
                    <circle cx="50" cy="50" r="10" fill="#418b5c" />
                  </svg>
                  <span className="text-[10px] text-slate-400 font-bold font-mono mt-2">CATTLE_ID_{selectedCow.id}</span>
                </div>

                {/* Primary specs */}
                <div className="flex-1 space-y-3">
                  <h4 className="text-xl font-black text-slate-800 dark:text-white font-mono">{selectedCow.rfidTag}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm leading-relaxed">
                    <p><strong className="text-slate-400">Breed:</strong> {selectedCow.breed}</p>
                    <p><strong className="text-slate-400">Color:</strong> {selectedCow.color}</p>
                    <p><strong className="text-slate-400">Gender:</strong> {selectedCow.gender}</p>
                    <p><strong className="text-slate-400">Weight:</strong> {selectedCow.weight} kg</p>
                    <p><strong className="text-slate-400">Location:</strong> {selectedCow.locationShed}</p>
                    <p><strong className="text-slate-400">Birth Date:</strong> {selectedCow.birthDate}</p>
                  </div>
                </div>

              </div>

              {/* Vaccinations */}
              <div className="space-y-3">
                <h5 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                  <Syringe className="w-4 h-4 text-forest-600" />
                  <span>Vaccination Record</span>
                </h5>
                <div className="border border-slate-100 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="px-4 py-2">Vaccine Name</th>
                        <th className="px-4 py-2">Inoculation Date</th>
                        <th className="px-4 py-2">Booster Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                      {selectedCow.vaccinations.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-3 text-slate-400 italic">No vaccination history recorded</td></tr>
                      ) : (
                        selectedCow.vaccinations.map((vac, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{vac.name}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{vac.date}</td>
                            <td className="px-4 py-3 text-amber-500 font-bold">{vac.dueDate || 'N/A'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Medical Treatment Log */}
              <div className="space-y-3">
                <h5 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                  <HeartPulse className="w-4 h-4 text-red-500" />
                  <span>Medical Diagnosis & Treatment History</span>
                </h5>
                
                {/* Form to log quick treatment */}
                {user.role !== 'AUDITOR' && user.role !== 'VOLUNTEER' && (
                  <div className="flex gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <input
                      type="text"
                      placeholder="Diagnosis (e.g. Foot Rot)"
                      value={diag}
                      onChange={(e) => setDiag(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Treatment (e.g. Spray bandage)"
                      value={treat}
                      onChange={(e) => setTreat(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => addMedicalRecord(selectedCow.id)}
                      className="bg-forest-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Log</span>
                    </button>
                  </div>
                )}

                <div className="border border-slate-100 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="px-4 py-2">Diagnosis</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Treatment Administered</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                      {selectedCow.medicalHistory.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-3 text-slate-400 italic">No medical events logged</td></tr>
                      ) : (
                        selectedCow.medicalHistory.map((med, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{med.diagnosis}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{med.date}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{med.treatment}</td>
                            <td className="px-4 py-3 font-bold text-forest-600">{med.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Insurance info */}
              {selectedCow.insuranceDetails && (
                <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-850 dark:text-indigo-300 flex justify-between items-center">
                  <div>
                    <h6 className="font-bold text-sm mb-1">Cattle Insurance Exemption Protected</h6>
                    <p>Policy: {selectedCow.insuranceDetails.policyNumber} • Coverage Value: ₹{selectedCow.insuranceDetails.amount.toLocaleString()}</p>
                  </div>
                  <span className="font-bold">Expires: {selectedCow.insuranceDetails.expiryDate}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / Print Passport PDF</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
