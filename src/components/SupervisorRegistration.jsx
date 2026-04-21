import React, { useState, useEffect } from 'react';
import { UserPlus, RefreshCw, Users } from 'lucide-react';
import { supervisorsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

const INITIAL_FORM = {
  code: '',
  name: '',
  phone: '',
  zone: '',
  email: '',
  job_title: '',
  start_date: '',
  base_salary: '',
  work_hours: '',
  daily_rate: '',
  card_number: '',
  emergency_contact: '',
  company_line: '',
  bank_client_number: '',
  bank_account: '',
  username: '',
  password: '',
  notes: '',
};

const FIELDS = [
  { key: 'code', label: 'كود المشرف', required: true, type: 'text' },
  { key: 'name', label: 'الاسم', required: true, type: 'text' },
  { key: 'phone', label: 'رقم الهاتف', required: false, type: 'tel' },
  { key: 'zone', label: 'المنطقة', required: false, type: 'text' },
  { key: 'email', label: 'البريد الإلكتروني', required: false, type: 'email' },
  { key: 'job_title', label: 'المسمى الوظيفي', required: false, type: 'text' },
  { key: 'start_date', label: 'تاريخ بداية العمل', required: false, type: 'date' },
  { key: 'base_salary', label: 'الراتب الأساسي', required: false, type: 'text' },
  { key: 'work_hours', label: 'ساعات العمل', required: false, type: 'text' },
  { key: 'daily_rate', label: 'المعدل اليومي', required: false, type: 'text' },
  { key: 'card_number', label: 'رقم البطاقة', required: false, type: 'text' },
  { key: 'emergency_contact', label: 'رقم قريب من الدرجة الأولى', required: false, type: 'text' },
  { key: 'company_line', label: 'رقم خط الشركة', required: false, type: 'text' },
  { key: 'bank_client_number', label: 'رقم عميل البنك', required: false, type: 'text' },
  { key: 'bank_account', label: 'رقم الحساب البنكي', required: false, type: 'text' },
  { key: 'username', label: 'اسم المستخدم', required: true, type: 'text' },
  { key: 'password', label: 'كلمة المرور', required: true, type: 'password' },
  { key: 'notes', label: 'ملاحظات', required: false, type: 'textarea' },
];

export default function SupervisorRegistration({ onListChange }) {
  const { config } = useAuth();
  const zones = config?.zones || [];
  const [form, setForm] = useState(INITIAL_FORM);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [source, setSource] = useState('');

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await supervisorsApi.list();
      if (res.ok && Array.isArray(res.supervisors)) {
        setList(res.supervisors);
        setSource(res.source || '');
        if (onListChange) onListChange(res.supervisors.length);
      }
    } catch (e) {
      setError(e.message || 'فشل تحميل قائمة المشرفين');
      setList([]);
      if (onListChange) onListChange(0);
    } finally {
      setLoading(false);
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
    if (!form.code.trim() || !form.name.trim()) {
      setError('كود المشرف والاسم مطلوبان');
      return;
    }
    if (!form.username.trim()) {
      setError('اسم المستخدم مطلوب');
      return;
    }
    if (!form.password || form.password.length < 4) {
      setError('كلمة المرور مطلوبة (4 أحرف على الأقل)');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const result = await supervisorsApi.add(form);
      const msg = result?.message || 'تمت إضافة المشرف بنجاح.';
      setSuccess(msg);
      setForm(INITIAL_FORM);
      await fetchList();
      if (result?.source === 'local') {
        setSuccess(msg + ' (البيانات محفوظة محلياً لأن Google Sheets غير متصل)');
      }
    } catch (err) {
      const msg = err?.message || 'فشل حفظ المشرف';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* نموذج الإضافة */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-indigo-600" />
          إضافة مشرف
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          البيانات تُحفظ في Google Sheets (إن كان مربوطاً) والملف المحلي. ربط Supabase اختياري.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm font-medium" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-medium" role="status">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FIELDS.map(({ key, label, required, type }) => (
              <div key={key} className={type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {label}
                  {required && <span className="text-red-500"> *</span>}
                </label>
                {type === 'textarea' ? (
                  <textarea
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={2}
                    dir="auto"
                  />
                ) : (
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    dir={type === 'email' ? 'ltr' : 'auto'}
                    placeholder={label}
                  />
                )}
              </div>
            ))}
          </div>

          {form.zone === '' && zones.length > 0 && (
            <div className="text-sm text-slate-600">
              المنطقة: يمكن اختيارها من القائمة بعد ملء الحقل أو كتابة منطقة جديدة.
            </div>
          )}
          {zones.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اختيار منطقة جاهزة</label>
              <select
                value={form.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
                className="w-full max-w-xs p-2 border border-slate-300 rounded-lg"
              >
                <option value="">-- اختر المنطقة --</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'جاري الحفظ...' : 'إضافة المشرف'}
            </button>
            <button
              type="button"
              onClick={() => setForm(INITIAL_FORM)}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
            >
              مسح النموذج
            </button>
          </div>
        </form>
      </div>

      {/* قائمة المشرفين */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            قائمة المشرفين
            {source && (
              <span className="text-xs font-normal text-slate-500">(مصدر: {source === 'sheets' ? 'Google Sheets' : 'محلي'})</span>
            )}
          </h2>
          <button
            onClick={fetchList}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>

        {loading && list.length === 0 ? (
          <p className="text-slate-500 py-4">جاري التحميل...</p>
        ) : list.length === 0 ? (
          <p className="text-slate-500 py-4">لا يوجد مشرفون بعد. أضف مشرفاً من النموذج أعلاه.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-right p-2">كود</th>
                  <th className="text-right p-2">الاسم</th>
                  <th className="text-right p-2">المنطقة</th>
                  <th className="text-right p-2">الهاتف</th>
                  <th className="text-right p-2">اسم المستخدم</th>
                  <th className="text-right p-2">المخزون (ب/ت/ج/خ)</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.code || s.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2">{s.code}</td>
                    <td className="p-2">{s.name}</td>
                    <td className="p-2">{s.zone}</td>
                    <td className="p-2">{s.phone}</td>
                    <td className="p-2">{s.username}</td>
                    <td className="p-2">
                      {[s.pouch_motorcycle, s.pouch_bicycle, s.tshirt, s.jacket, s.helmet]
                        .map((v) => Number(v) || 0)
                        .join(' / ')}
                    </td>
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
