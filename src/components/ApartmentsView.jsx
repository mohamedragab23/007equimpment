import React, { useState, useEffect } from 'react';
import { Home, Plus, RefreshCw, User } from 'lucide-react';
import { apartmentsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ApartmentsView() {
  const { user, config } = useAuth();
  const zones = config?.zones || [];
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [source, setSource] = useState('');
  const [form, setForm] = useState({
    owner_name: '',
    address: '',
    zone: '',
    rent: '',
    contract_duration: '',
    payment_method: '',
    owner_phone: '',
    rider_code: '',
    move_in_date: '',
  });

  const fetchList = async () => {
    setLoadingList(true);
    setError('');
    try {
      const res = await apartmentsApi.list();
      if (res.ok && Array.isArray(res.apartments)) {
        setList(res.apartments);
        setSource(res.source || '');
      }
    } catch (e) {
      setError(e.message || 'فشل تحميل الشقق');
      setList([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.owner_name.trim() || !form.address.trim()) {
      setError('اسم المالك والعنوان مطلوبان');
      return;
    }
    const rent = parseFloat(form.rent) || 0;
    setLoading(true);
    try {
      await apartmentsApi.add({
        owner_name: form.owner_name.trim(),
        address: form.address.trim(),
        zone: form.zone.trim(),
        rent,
        contract_duration: form.contract_duration.trim(),
        payment_method: form.payment_method.trim(),
        owner_phone: form.owner_phone.trim(),
        rider_code: form.rider_code.trim(),
        move_in_date: form.move_in_date.trim(),
      });
      setSuccess('تمت إضافة الشقة بنجاح.');
      setForm({
        owner_name: '',
        address: '',
        zone: '',
        rent: '',
        contract_duration: '',
        payment_method: '',
        owner_phone: '',
        rider_code: '',
        move_in_date: '',
      });
      fetchList();
    } catch (err) {
      setError(err.message || 'فشل إضافة الشقة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Home className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-800">إدارة الشقق</h2>
      </div>
      {source && (
        <p className="text-xs text-slate-500 mb-2">مصدر البيانات: {source === 'sheets' ? 'Google Sheets' : 'محلي'}</p>
      )}

      <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg space-y-4">
        <h3 className="font-medium text-slate-700 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          إضافة شقة جديدة
        </h3>
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
        {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">اسم المالك *</label>
            <input
              type="text"
              value={form.owner_name}
              onChange={(e) => handleChange('owner_name', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              required
              placeholder="اسم المالك"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">العنوان *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              required
              placeholder="عنوان الشقة"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">المنطقة</label>
            {zones.length > 0 ? (
              <select
                value={form.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              >
                <option value="">-- اختر المنطقة --</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
                placeholder="المنطقة"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الإيجار (ج.م)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.rent}
              onChange={(e) => handleChange('rent', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مدة العقد</label>
            <input
              type="text"
              value={form.contract_duration}
              onChange={(e) => handleChange('contract_duration', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="مثال: سنة"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">طريقة الدفع</label>
            <input
              type="text"
              value={form.payment_method}
              onChange={(e) => handleChange('payment_method', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="شهري / سنوي"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">هاتف المالك</label>
            <input
              type="text"
              value={form.owner_phone}
              onChange={(e) => handleChange('owner_phone', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="رقم الهاتف"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كود الطيار (تسكين)</label>
            <input
              type="text"
              value={form.rider_code}
              onChange={(e) => handleChange('rider_code', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="كود الطيار"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ التسكين</label>
            <input
              type="text"
              value={form.move_in_date}
              onChange={(e) => handleChange('move_in_date', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'جاري الحفظ...' : 'إضافة الشقة'}
        </button>
      </form>

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-slate-700">قائمة الشقق</h3>
        <button
          onClick={fetchList}
          disabled={loadingList}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>
      {loadingList && list.length === 0 ? (
        <p className="text-slate-500 py-4">جاري التحميل...</p>
      ) : list.length === 0 ? (
        <p className="text-slate-500 py-4">لا توجد شقق مسجلة. أضف شقة جديدة.</p>
      ) : (
        <div className="space-y-3">
          {list.map((apt, index) => (
            <div key={apt.id ?? `apt-${index}`} className="p-4 border rounded-lg bg-slate-50 flex flex-col md:flex-row md:justify-between gap-3">
              <div className="flex items-start gap-2">
                <User className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800">{apt.owner_name || '—'}</div>
                  <div className="text-sm text-slate-600">{apt.address || '—'}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {apt.zone && `المنطقة: ${apt.zone}`}
                    {apt.rent != null && apt.rent !== '' && ` • الإيجار: ${apt.rent} ج.م`}
                    {apt.rider_code && ` • الطيار: ${apt.rider_code}`}
                    {apt.move_in_date && ` • تاريخ التسكين: ${apt.move_in_date}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
