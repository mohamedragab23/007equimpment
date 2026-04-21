import React, { useState, useEffect } from 'react';
import { Bike, Plus, RefreshCw } from 'lucide-react';
import { motorcyclesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MotorcyclesView() {
  const { config } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [source, setSource] = useState('');
  const [form, setForm] = useState({
    license_plate: '',
    rental_price: '',
    model: '',
    year: '',
    rider_code: '',
    start_date: '',
    end_date: '',
  });

  const fetchList = async () => {
    setLoadingList(true);
    setError('');
    try {
      const res = await motorcyclesApi.list();
      if (res.ok && Array.isArray(res.motorcycles)) {
        setList(res.motorcycles);
        setSource(res.source || '');
      }
    } catch (e) {
      setError(e.message || 'فشل تحميل الموتوسيكلات');
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
    if (!form.license_plate.trim()) {
      setError('رقم اللوحة مطلوب');
      return;
    }
    const rental_price = parseFloat(form.rental_price) || 0;
    setLoading(true);
    try {
      await motorcyclesApi.add({
        license_plate: form.license_plate.trim(),
        rental_price,
        model: form.model.trim(),
        year: form.year.trim(),
        rider_code: form.rider_code.trim(),
        start_date: form.start_date.trim(),
        end_date: form.end_date.trim(),
      });
      setSuccess('تمت إضافة الموتوسيكل بنجاح.');
      setForm({
        license_plate: '',
        rental_price: '',
        model: '',
        year: '',
        rider_code: '',
        start_date: '',
        end_date: '',
      });
      fetchList();
    } catch (err) {
      setError(err.message || 'فشل إضافة الموتوسيكل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bike className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-800">إدارة الموتوسيكلات</h2>
      </div>
      {source && (
        <p className="text-xs text-slate-500 mb-2">مصدر البيانات: {source === 'sheets' ? 'Google Sheets' : 'محلي'}</p>
      )}

      <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg space-y-4">
        <h3 className="font-medium text-slate-700 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          إضافة موتوسيكل جديد
        </h3>
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
        {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">رقم اللوحة *</label>
            <input
              type="text"
              value={form.license_plate}
              onChange={(e) => handleChange('license_plate', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              required
              placeholder="رقم اللوحة"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">سعر التأجير (ج.م)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.rental_price}
              onChange={(e) => handleChange('rental_price', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الموديل</label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => handleChange('model', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="الموديل"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">السنة</label>
            <input
              type="text"
              value={form.year}
              onChange={(e) => handleChange('year', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="مثال: 2024"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كود الطيار (التأجير)</label>
            <input
              type="text"
              value={form.rider_code}
              onChange={(e) => handleChange('rider_code', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="كود الطيار"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ بداية التأجير</label>
            <input
              type="text"
              value={form.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ نهاية التأجير</label>
            <input
              type="text"
              value={form.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
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
          {loading ? 'جاري الحفظ...' : 'إضافة الموتوسيكل'}
        </button>
      </form>

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-slate-700">قائمة الموتوسيكلات</h3>
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
        <p className="text-slate-500 py-4">لا توجد موتوسيكلات مسجلة. أضف موتوسيكل جديد.</p>
      ) : (
        <div className="space-y-3">
          {list.map((m, index) => (
            <div key={m.id ?? `m-${index}`} className="p-4 border rounded-lg bg-slate-50 flex flex-col md:flex-row md:justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800">{m.license_plate || '—'}</div>
                <div className="text-sm text-slate-600">
                  {m.model && `الموديل: ${m.model}`}
                  {m.year && ` • السنة: ${m.year}`}
                  {m.rental_price != null && m.rental_price !== '' && ` • الإيجار: ${m.rental_price} ج.م`}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {m.rider_code && `الطيار: ${m.rider_code}`}
                  {m.start_date && ` • من: ${m.start_date}`}
                  {m.end_date && ` • إلى: ${m.end_date}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
