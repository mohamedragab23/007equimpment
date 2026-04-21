import React, { useState, useEffect } from 'react';
import { Package, Users, Upload, Trash2, DollarSign, Plus, Edit2, Search, Download, UserPlus, X, ShieldCheck, User, LogOut, LayoutDashboard } from 'lucide-react';
import SupervisorRegistration from './SupervisorRegistration';
import EquipmentDelivery from './EquipmentDelivery';
import SupervisorInventoryView from './SupervisorInventoryView';
import ZoneInventoryView from './ZoneInventoryView';
import EquipmentReturn from './EquipmentReturn';
import OrdersView from './OrdersView';
import EquipmentExchangeView from './EquipmentExchangeView';
import DeductionsView from './DeductionsView';
import ApartmentsView from './ApartmentsView';
import MotorcyclesView from './MotorcyclesView';
import IncentivesView from './IncentivesView';
import AuditLogView from './AuditLogView';
import GoogleSheetsDiagnostic from './GoogleSheetsDiagnostic';

// EquipmentManagementSystem - مع دعم الصلاحيات والمستخدم
const STORAGE_KEYS = {
  SUPERVISORS: 'ems_supervisors_v1',
  RIDERS: 'ems_riders_v1',
  INVENTORY: 'ems_inventory_v1',
  ORDERS: 'ems_orders_v1'
};

const defaultInventory = {
  motorcyclePouches: 100,
  bicyclePouches: 80,
  tshirts: 300
};

// ربط أقسام الواجهة بوحدات الصلاحيات
const SECTION_PERMISSION = {
  overview: null,
  supervisors: 'إدارة المشرفين والمناديب',
  riders: 'إدارة المشرفين والمناديب',
  equipmentDelivery: 'تسليم المعدات',
  equipmentReturn: 'استرداد المعدات',
  equipmentExchange: 'تبديل الصناديق',
  supervisorInventory: 'مخزون المشرف',
  inventory: 'المخزون الرئيسي',
  zoneInventory: 'مخزون الزونات',
  orders: 'الطلبيات',
  deductions: 'إدارة الخصومات',
  apartments: 'إدارة الشقق',
  motorcycles: 'إدارة الموتوسيكلات',
  incentives: 'الحوافز',
  auditLog: 'سجل التغييرات والأنشطة',
  'permissions': 'إدارة الصلاحيات',
};

const canView = (user, section) => {
  if (!user?.permissions) return true;
  const mod = SECTION_PERMISSION[section];
  if (!mod) return true;
  const modules = user.permissions.modules || user.permissions?.modules;
  if (!modules || !modules[mod]) return false;
  return !!modules[mod].view;
};


const EquipmentManagementSystem = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState('overview');

  const [supervisors, setSupervisors] = useState([]);
  const [riders, setRiders] = useState([]);
  const [inventory, setInventory] = useState(defaultInventory);
  const [orders, setOrders] = useState([]);

  // Forms
  const [supervisorForm, setSupervisorForm] = useState({ code: '', name: '', region: '', username: '', password: '' });
  const [riderForm, setRiderForm] = useState({ code: '', name: '', region: '', vehicleType: 'motorcycle', tshirtQuantity: 1, equipment: [] });
  const [orderForm, setOrderForm] = useState({ motorcyclePouches: 0, bicyclePouches: 0, tshirts: 0, supervisorCode: '' });
  const [deductionForm, setDeductionForm] = useState({ type: 'advance', amount: '', reason: '' });

  // UI helpers
  const [search, setSearch] = useState('');
  const [selectedRiderForPhoto, setSelectedRiderForPhoto] = useState(null);
  const [apiSupervisorsCount, setApiSupervisorsCount] = useState(0);

  // إعادة التوجيه للوحة التحكم إذا لم تكن هناك صلاحية للقسم الحالي
  useEffect(() => {
    if (user && activeSection !== 'overview' && !canView(user, activeSection)) {
      setActiveSection('overview');
    }
  }, [user, activeSection]);

  // Load from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEYS.SUPERVISORS);
      const r = localStorage.getItem(STORAGE_KEYS.RIDERS);
      const i = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      const o = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (s) setSupervisors(JSON.parse(s));
      if (r) setRiders(JSON.parse(r));
      if (i) setInventory(JSON.parse(i));
      if (o) setOrders(JSON.parse(o));
    } catch (err) {
      console.warn('Failed to load EMS data from localStorage', err);
    }
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPERVISORS, JSON.stringify(supervisors));
    localStorage.setItem(STORAGE_KEYS.RIDERS, JSON.stringify(riders));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [supervisors, riders, inventory, orders]);

  // Supervisors
  const addSupervisor = () => {
    if (!supervisorForm.code || !supervisorForm.name) return;
    setSupervisors(prev => [...prev, { ...supervisorForm, inventory: { motorcyclePouches: 0, bicyclePouches: 0, tshirts: 0 } }]);
    setSupervisorForm({ code: '', name: '', region: '', username: '', password: '' });
  };

  const removeSupervisor = (code) => {
    setSupervisors(prev => prev.filter(s => s.code !== code));
  };

  // Riders
  const addRider = () => {
    if (!riderForm.code || !riderForm.name) return;
    const newRider = { ...riderForm, equipmentPhoto: null, deductions: { advance: 0, securityCheck: 0, previousDebt: 0, deduction: 0 } };
    setRiders(prev => [...prev, newRider]);
    setRiderForm({ code: '', name: '', region: '', vehicleType: 'motorcycle', tshirtQuantity: 1, equipment: [] });
  };

  const removeRider = (code) => {
    setRiders(prev => prev.filter(r => r.code !== code));
  };

  const uploadRiderPhoto = (code, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRiders(prev => prev.map(r => r.code === code ? { ...r, equipmentPhoto: reader.result } : r));
    };
    reader.readAsDataURL(file);
  };

  // Inventory
  const adjustInventory = (type, amount) => {
    setInventory(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) + amount) }));
  };

  // Orders (supervisor requests)
  const requestOrder = () => {
    const totalRequested = parseInt(orderForm.motorcyclePouches || 0) + parseInt(orderForm.bicyclePouches || 0) + parseInt(orderForm.tshirts || 0);
    if (totalRequested === 0) return;
    const newOrder = { id: Date.now(), ...orderForm, status: 'pending' };
    setOrders(prev => [...prev, newOrder]);
    setOrderForm({ motorcyclePouches: 0, bicyclePouches: 0, tshirts: 0, supervisorCode: '' });
  };

  const approveOrder = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    // check inventory
    if ((inventory.motorcyclePouches || 0) < order.motorcyclePouches || (inventory.bicyclePouches || 0) < order.bicyclePouches || (inventory.tshirts || 0) < order.tshirts) {
      alert('Not enough inventory to approve order');
      return;
    }
    // deduct
    adjustInventory('motorcyclePouches', -order.motorcyclePouches);
    adjustInventory('bicyclePouches', -order.bicyclePouches);
    adjustInventory('tshirts', -order.tshirts);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'approved' } : o));
  };

  const rejectOrder = (orderId) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'rejected' } : o));
  };

  // Deductions
  const addDeductionToRider = (riderCode, deduction) => {
    setRiders(prev => prev.map(r => r.code === riderCode ? { ...r, deductions: { ...r.deductions, [deduction.type]: (Number(r.deductions[deduction.type] || 0) + Number(deduction.amount)) } } : r));
    setDeductionForm({ type: 'advance', amount: '', reason: '' });
  };

  // CSV upload for riders (simple: code,name,region,vehicleType,tshirtQuantity)
  const handleRidersCsvUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const parsed = lines.map(line => {
        const [code, name, region, vehicleType, tshirtQuantity] = line.split(',').map(s => s.trim());
        return { code, name, region: region || '', vehicleType: vehicleType || 'motorcycle', tshirtQuantity: Number(tshirtQuantity || 1), equipmentPhoto: null, deductions: { advance: 0, securityCheck: 0, previousDebt: 0, deduction: 0 } };
      });
      setRiders(prev => [...prev, ...parsed]);
    };
    reader.readAsText(file);
  };

  // Export JSON
  const exportJSON = () => {
    const payload = { supervisors, riders, inventory, orders };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ems-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Quick search
  const filteredRiders = riders.filter(r => !search || r.name.includes(search) || r.code.includes(search) || r.region.includes(search));

  const showPermissions = user?.role === 'admin' && canView(user, 'permissions');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* شريط علوي: المستخدم وتسجيل الخروج */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-bold text-slate-800">نظام إدارة مخزون معدات طلبات - وكالة 007</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{user?.display_name || user?.username}</span>
          <span className="text-xs text-slate-400">({user?.role === 'admin' ? 'المسؤول' : user?.role === 'warehouse_manager' ? 'مدير المخازن' : user?.role === 'accounts_manager' ? 'مدير الحسابات' : 'مشرف'})</span>
          <button onClick={onLogout} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-700 text-sm">
            <LogOut className="w-4 h-4" /> خروج
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
        <aside className="md:col-span-1 bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-bold mb-4">القائمة</h3>
          <div className="space-y-2">
            <button onClick={() => setActiveSection('overview')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='overview'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>لوحة التحكم</button>
            {canView(user, 'supervisors') && <button onClick={() => setActiveSection('supervisors')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='supervisors'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>المشرفين</button>}
            {canView(user, 'riders') && <button onClick={() => setActiveSection('riders')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='riders'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>المناديب</button>}
            {canView(user, 'equipmentDelivery') && <button onClick={() => setActiveSection('equipmentDelivery')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='equipmentDelivery'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>تسليم المعدات</button>}
            {canView(user, 'equipmentReturn') && <button onClick={() => setActiveSection('equipmentReturn')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='equipmentReturn'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>استرداد المعدات</button>}
            {canView(user, 'equipmentExchange') && <button onClick={() => setActiveSection('equipmentExchange')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='equipmentExchange'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>تبديل الصناديق</button>}
            {canView(user, 'supervisorInventory') && <button onClick={() => setActiveSection('supervisorInventory')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='supervisorInventory'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>مخزون المشرف</button>}
            {canView(user, 'inventory') && <button onClick={() => setActiveSection('inventory')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='inventory'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>المخزون الرئيسي</button>}
            {canView(user, 'zoneInventory') && <button onClick={() => setActiveSection('zoneInventory')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='zoneInventory'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>مخزون الزونات</button>}
            {canView(user, 'orders') && <button onClick={() => setActiveSection('orders')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='orders'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>الطلبات</button>}
            {canView(user, 'deductions') && <button onClick={() => setActiveSection('deductions')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='deductions'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>الخصومات</button>}
            {canView(user, 'apartments') && <button onClick={() => setActiveSection('apartments')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='apartments'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>الشقق</button>}
            {canView(user, 'motorcycles') && <button onClick={() => setActiveSection('motorcycles')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='motorcycles'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>الموتوسيكلات</button>}
            {canView(user, 'incentives') && <button onClick={() => setActiveSection('incentives')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='incentives'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>الحوافز</button>}
            {canView(user, 'auditLog') && <button onClick={() => setActiveSection('auditLog')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='auditLog'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>سجل التغييرات والأنشطة</button>}
            {showPermissions && <button onClick={() => setActiveSection('permissions')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='permissions'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>إدارة الصلاحيات</button>}
            {user?.role === 'admin' && <button onClick={() => setActiveSection('sheetsDiagnostic')} className={`w-full text-right px-3 py-2 rounded ${activeSection==='sheetsDiagnostic'?'bg-blue-600 text-white':'hover:bg-gray-100'}`}>تشخيص Google Sheets</button>}
            <div className="pt-4 border-t" />
            <div className="flex gap-2">
              <button onClick={exportJSON} className="flex-1 bg-green-600 text-white py-2 rounded">تصدير JSON</button>
            </div>
          </div>
        </aside>

        <main className="md:col-span-3 space-y-6">
          {activeSection === 'overview' && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">لوحة التحكم</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-700">المشرفين</div>
                  <div className="text-2xl font-bold">{apiSupervisorsCount > 0 ? apiSupervisorsCount : supervisors.length}</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-700">المناديب</div>
                  <div className="text-2xl font-bold">{riders.length}</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-sm text-gray-700">قيمة المخزون (تقريبي)</div>
                  <div className="text-2xl font-bold">{(inventory.tshirts*50 + inventory.motorcyclePouches*200 + inventory.bicyclePouches*200).toLocaleString()} ج.م</div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'supervisors' && canView(user, 'supervisors') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <SupervisorRegistration onListChange={setApiSupervisorsCount} />
            </div>
          )}

          {activeSection === 'equipmentDelivery' && canView(user, 'equipmentDelivery') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <EquipmentDelivery />
            </div>
          )}

          {activeSection === 'equipmentReturn' && canView(user, 'equipmentReturn') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <EquipmentReturn />
            </div>
          )}

          {activeSection === 'equipmentExchange' && canView(user, 'equipmentExchange') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <EquipmentExchangeView />
            </div>
          )}

          {activeSection === 'supervisorInventory' && canView(user, 'supervisorInventory') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <SupervisorInventoryView user={user} />
            </div>
          )}

          {activeSection === 'riders' && canView(user, 'riders') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">إدارة المناديب</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <input placeholder="كود المندوب" className="p-2 border rounded" value={riderForm.code} onChange={e=>setRiderForm({...riderForm, code:e.target.value})} />
                <input placeholder="اسم المندوب" className="p-2 border rounded" value={riderForm.name} onChange={e=>setRiderForm({...riderForm, name:e.target.value})} />
                <input placeholder="المنطقة" className="p-2 border rounded" value={riderForm.region} onChange={e=>setRiderForm({...riderForm, region:e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <select value={riderForm.vehicleType} onChange={e=>setRiderForm({...riderForm, vehicleType:e.target.value})} className="p-2 border rounded">
                  <option value="motorcycle">دراجة نارية</option>
                  <option value="bicycle">دراجة هوائية</option>
                </select>
                <input type="number" min={1} value={riderForm.tshirtQuantity} onChange={e=>setRiderForm({...riderForm, tshirtQuantity:Number(e.target.value)})} className="p-2 border rounded" />
                <div className="flex gap-2">
                  <input id="ridersCsv" type="file" accept=".csv,text/csv" className="hidden" onChange={e=>handleRidersCsvUpload(e.target.files[0])} />
                  <label htmlFor="ridersCsv" className="bg-gray-100 p-2 rounded cursor-pointer">رفع CSV</label>
                  <button onClick={addRider} className="bg-blue-600 text-white px-4 py-2 rounded">إضافة مندوب</button>
                </div>
              </div>

              <div className="mb-4">
                <input placeholder="بحث باسم/كود/منطقة" className="p-2 border rounded w-full" value={search} onChange={e=>setSearch(e.target.value)} />
              </div>

              <div className="space-y-3">
                {filteredRiders.map(r => (
                  <div key={r.code} className="p-3 border rounded flex flex-col md:flex-row md:justify-between gap-3 items-start md:items-center">
                    <div className="flex gap-3 items-center">
                      <div className="text-right">
                        <div className="font-bold">{r.name} <span className="text-sm text-gray-500">({r.code})</span></div>
                        <div className="text-sm text-gray-600">{r.region} • {r.vehicleType}</div>
                        <div className="text-sm text-gray-600">خصومات: {Object.values(r.deductions||{}).reduce((a,b)=>a+Number(b),0)} ج.م</div>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <label className="cursor-pointer bg-gray-100 p-2 rounded">
                        <input type="file" accept="image/*" className="hidden" onChange={e=>uploadRiderPhoto(r.code, e.target.files[0])} />
                        رفع صورة
                      </label>
                      <button onClick={()=>removeRider(r.code)} className="text-red-600">حذف</button>
                    </div>
                    {r.equipmentPhoto && <img src={r.equipmentPhoto} alt="photo" className="w-24 h-24 object-cover rounded mt-2 md:mt-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'zoneInventory' && canView(user, 'zoneInventory') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <ZoneInventoryView />
            </div>
          )}

          {activeSection === 'inventory' && canView(user, 'inventory') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">المخزون الرئيسي</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 border rounded">
                  <div className="text-sm">حقائب دراجة نارية</div>
                  <div className="text-2xl font-bold">{inventory.motorcyclePouches}</div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={()=>adjustInventory('motorcyclePouches', 1)} className="bg-green-600 text-white px-3 py-1 rounded">+</button>
                    <button onClick={()=>adjustInventory('motorcyclePouches', -1)} className="bg-red-600 text-white px-3 py-1 rounded">-</button>
                  </div>
                </div>
                <div className="p-4 border rounded">
                  <div className="text-sm">حقائب دراجة هوائية</div>
                  <div className="text-2xl font-bold">{inventory.bicyclePouches}</div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={()=>adjustInventory('bicyclePouches', 1)} className="bg-green-600 text-white px-3 py-1 rounded">+</button>
                    <button onClick={()=>adjustInventory('bicyclePouches', -1)} className="bg-red-600 text-white px-3 py-1 rounded">-</button>
                  </div>
                </div>
                <div className="p-4 border rounded">
                  <div className="text-sm">تيشيرتات</div>
                  <div className="text-2xl font-bold">{inventory.tshirts}</div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={()=>adjustInventory('tshirts', 1)} className="bg-green-600 text-white px-3 py-1 rounded">+</button>
                    <button onClick={()=>adjustInventory('tshirts', -1)} className="bg-red-600 text-white px-3 py-1 rounded">-</button>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="font-bold mb-2">إضافة كمية</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select id="itemType" className="p-2 border rounded" defaultValue="motorcyclePouches" onChange={e=>setOrderForm({...orderForm, supervisorCode: orderForm.supervisorCode})}>
                    <option value="motorcyclePouches">حقيبة دراجة نارية</option>
                    <option value="bicyclePouches">حقيبة دراجة هوائية</option>
                    <option value="tshirts">تيشيرت</option>
                  </select>
                  <input id="amountToAdd" type="number" min={1} className="p-2 border rounded" placeholder="كمية" />
                  <div />
                  <div />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'permissions' && showPermissions && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">إدارة الصلاحيات</h2>
              <p className="text-gray-600 mb-4">هذه الصفحة للمسؤول فقط. يمكن لاحقاً إضافة واجهة منح/سحب الصلاحيات لكل دور ومستخدم.</p>
              <div className="p-4 bg-slate-50 rounded-lg text-sm">
                <div className="font-medium mb-2">الوحدات والصلاحيات الحالية (من الإعداد):</div>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {user?.permissions?.modules && Object.entries(user.permissions.modules).map(([name, perms]) => (
                    <li key={name}>{name}: عرض {perms.view ? '✓' : '✗'}، إضافة {perms.add ? '✓' : '✗'}، تعديل {perms.edit ? '✓' : '✗'}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'orders' && canView(user, 'orders') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <OrdersView />
            </div>
          )}

          {activeSection === 'deductions' && canView(user, 'deductions') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <DeductionsView />
            </div>
          )}

          {activeSection === 'apartments' && canView(user, 'apartments') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <ApartmentsView />
            </div>
          )}

          {activeSection === 'motorcycles' && canView(user, 'motorcycles') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <MotorcyclesView />
            </div>
          )}

          {activeSection === 'incentives' && canView(user, 'incentives') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <IncentivesView />
            </div>
          )}

          {activeSection === 'sheetsDiagnostic' && user?.role === 'admin' && (
            <GoogleSheetsDiagnostic />
          )}
          {activeSection === 'auditLog' && canView(user, 'auditLog') && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <AuditLogView />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default EquipmentManagementSystem;