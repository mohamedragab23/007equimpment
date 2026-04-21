import React, { useState, useEffect } from 'react';
import { Gift, Plus, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const INCENTIVE_TYPES = ['أداء ممتاز', 'توصيلات إضافية', 'مكافأة خاصة', 'أخرى'];
const USER_TYPES = [
  { value: 'rider', label: 'طيار' },
  { value: 'supervisor', label: 'مشرف' },
  { value: 'manager', label: 'مدير' },
];

export default function IncentivesView() {
  const { config } = useAuth();
  const zones = config?.zones || [];
  const [form, setForm] = useState({
    user_type: 'rider',
    user_code: '',
    user_name: '',
    zone: '',
    amount: '',
    incentive_type: 'أداء ممتاز',
    reason: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('');

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.user_code.trim() || !form.user_name.trim()) {
      setError('كود المستخدم واسم المستخدم مطلوبان');
      return;
    }
    const amount = parseFloat(form.amount) || 0;
    if (amount <= 0) {
      setError('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }
    const entry = {
      ...form,
      amount,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    setList((prev) => [entry, ...prev]);
    setSuccess('تمت إضافة الحافز (محلياً - ربط API قريباً).');
    setForm({
      user_type: 'rider',
      user_code: '',
      user_name: '',
      zone: '',
      amount: '',
      incentive_type: 'أداء ممتاز',
      reason: '',
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const filteredList = filter
    ? list.filter(
        (r) =>
          (r.user_code || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.user_name || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.zone || '').toLowerCase().includes(filter.toLowerCase())
      )
    : list;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Gift className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-800">إدارة الحوافز</h2>
      </div>
      <p className="text-sm text-slate-500">
        إضافة حوافز للطيارين / المشرفين / المديرين. (الربط مع Google Sheets أو API قريباً)
      </p>

      <form onSubmit={handleSubmit} className="p-4 bg-slate-50 rounded-lg space-y-4">
        <h3 className="font-medium text-slate-700 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          إضافة حافز جديد
        </h3>
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
        {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">نوع المستخدم</label>
            <select
              value={form.user_type}
              onChange={(e) => handleChange('user_type', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            >
              {USER_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كود المستخدم *</label>
            <input
              type="text"
              value={form.user_code}
              onChange={(e) => handleChange('user_code', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              required
              placeholder="كود المستخدم"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستخدم *</label>
            <input
              type="text"
              value={form.user_name}
              onChange={(e) => handleChange('user_name', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              required
              placeholder="اسم المستخدم"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">المنطقة</label>
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
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ (ج.م) *</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={form.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              required
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">نوع الحافز</label>
            <select
              value={form.incentive_type}
              onChange={(e) => handleChange('incentive_type', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            >
              {INCENTIVE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">التاريخ</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">سبب الحافز</label>
          <textarea
            value={form.reason}
            onChange={(e) => handleChange('reason', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg"
            rows={2}
            placeholder="سبب الحافز"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5" />
          إضافة الحافز
        </button>
      </form>

      <div>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h3 className="font-medium text-slate-700">جدول الحوافز</h3>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="بحث بالكود / الاسم / المنطقة"
              className="p-2 border border-slate-300 rounded-lg text-sm max-w-xs"
            />
          </div>
        </div>
        {filteredList.length === 0 ? (
          <p className="text-slate-500 py-4">لا توجد حوافز مسجلة. أضف حافزاً من النموذج أعلاه.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-200 p-2 text-right">الكود</th>
                  <th className="border border-slate-200 p-2 text-right">الاسم</th>
                  <th className="border border-slate-200 p-2 text-right">المنطقة</th>
                  <th className="border border-slate-200 p-2 text-right">المبلغ</th>
                  <th className="border border-slate-200 p-2 text-right">النوع</th>
                  <th className="border border-slate-200 p-2 text-right">التاريخ</th>
                  <th className="border border-slate-200 p-2 text-right">السبب</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="border border-slate-200 p-2">{r.user_code}</td>
                    <td className="border border-slate-200 p-2">{r.user_name}</td>
                    <td className="border border-slate-200 p-2">{r.zone || '—'}</td>
                    <td className="border border-slate-200 p-2 font-medium">{r.amount} ج.م</td>
                    <td className="border border-slate-200 p-2">{r.incentive_type}</td>
                    <td className="border border-slate-200 p-2">{r.date}</td>
                    <td className="border border-slate-200 p-2 max-w-xs truncate">{r.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
