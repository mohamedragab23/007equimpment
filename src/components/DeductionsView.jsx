import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Upload, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { deductionsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

const DEDUCTION_TYPES = [
  'قسط باوتش',
  'استعلام امني',
  'مديونية سابقة',
  'سلفة',
  'ايجار سكن',
  'ايجار موتوسيكل',
  'اخرى',
];

const CYCLES = [
  'الدورة الأولى',
  'الدورة الثانية',
  'الدورة الثالثة',
  'الدورة الرابعة',
  'قفلة',
];

export default function DeductionsView() {
  const { user, config } = useAuth();
  const zones = config?.zones || [];
  const [form, setForm] = useState({
    rider_code: '',
    rider_name: '',
    supervisor_code: user?.supervisor_code || '',
    amount: '',
    reason: '',
    cycle: '',
    notes: '',
    zone: '',
    deduction_type: 'سلفة',
  });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [riderFilter, setRiderFilter] = useState('');

  const fetchList = async () => {
    setLoadingList(true);
    setError('');
    try {
      const res = await deductionsApi.list(riderFilter || undefined, 200);
      if (res.ok && Array.isArray(res.deductions)) setList(res.deductions);
    } catch (e) {
      setError(e.message || 'فشل تحميل الخصومات');
      setList([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [riderFilter]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const amount = parseFloat(form.amount);
    if (!form.rider_code.trim() || !form.rider_name.trim()) {
      setError('كود المندوب واسم المندوب مطلوبان');
      return;
    }
    if (!amount || amount <= 0) {
      setError('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    setLoading(true);
    try {
      const reasonText = [form.zone, form.reason].filter(Boolean).join(' - ');
    await deductionsApi.add({
        rider_code: form.rider_code.trim(),
        rider_name: form.rider_name.trim(),
        supervisor_code: form.supervisor_code || user?.supervisor_code,
        amount,
        reason: reasonText.trim(),
        cycle: form.cycle.trim(),
        notes: form.notes.trim(),
        deduction_type: form.deduction_type,
      });
      setSuccess('تمت إضافة الخصم بنجاح.');
      setForm((prev) => ({ ...prev, amount: '', reason: '', notes: '' }));
      fetchList();
    } catch (err) {
      setError(err.message || 'فشل إضافة الخصم');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    setImporting(true);
    try {
      const res = await deductionsApi.importExcel(file);
      if (res.ok) {
        setSuccess(res.message || `تم استيراد ${res.imported_count || 0} خصم بنجاح.`);
        fetchList();
      } else {
        setError(res.error || 'فشل الاستيراد');
      }
    } catch (err) {
      setError(err.message || 'فشل استيراد Excel');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-indigo-600" />
          إدارة الخصومات
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          إضافة خصم فردي أو استيراد من Excel. أعمدة Excel: كود المندوب، اسم المندوب، المبلغ، الدورات، ملاحظات، الزون.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كود المندوب *</label>
              <input
                type="text"
                value={form.rider_code}
                onChange={(e) => handleChange('rider_code', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم المندوب *</label>
              <input
                type="text"
                value={form.rider_name}
                onChange={(e) => handleChange('rider_name', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نوع الخصم</label>
              <select
                value={form.deduction_type}
                onChange={(e) => handleChange('deduction_type', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              >
                {DEDUCTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">الدورات</label>
              <select
                value={form.cycle}
                onChange={(e) => handleChange('cycle', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              >
                <option value="">-- اختر الدورة --</option>
                {CYCLES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">السبب / ملاحظات</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
                placeholder="اختياري"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="اختياري"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              {loading ? 'جاري الحفظ...' : 'إضافة خصم'}
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer disabled:opacity-50">
              <FileSpreadsheet className="w-5 h-5" />
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleExcelUpload}
                disabled={importing}
                className="hidden"
              />
              {importing ? 'جاري الاستيراد...' : 'استيراد من Excel'}
            </label>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            قائمة الخصومات
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={riderFilter}
              onChange={(e) => setRiderFilter(e.target.value)}
              placeholder="تصفية بكود المندوب"
              className="p-2 border border-slate-300 rounded-lg text-sm max-w-xs"
            />
            <button
              onClick={fetchList}
              disabled={loadingList}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm"
            >
              <RefreshCw className={loadingList ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
              تحديث
            </button>
          </div>
        </div>

        {loadingList && list.length === 0 ? (
          <p className="text-slate-500 py-4">جاري التحميل...</p>
        ) : list.length === 0 ? (
          <p className="text-slate-500 py-4">لا توجد خصومات.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-right p-2">التاريخ</th>
                  <th className="text-right p-2">كود المندوب</th>
                  <th className="text-right p-2">اسم المندوب</th>
                  <th className="text-right p-2">المبلغ</th>
                  <th className="text-right p-2">السبب</th>
                  <th className="text-right p-2">الدورات</th>
                  <th className="text-right p-2">أضافه</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 100).map((d, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2">{d.Date} {d.Time}</td>
                    <td className="p-2">{d['Rider Code']}</td>
                    <td className="p-2">{d['Rider Name']}</td>
                    <td className="p-2 font-medium">{d.Amount}</td>
                    <td className="p-2">{d.Reason}</td>
                    <td className="p-2">{d.Cycle}</td>
                    <td className="p-2 text-slate-500">{d['Added By']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length > 100 && (
              <p className="text-xs text-slate-500 mt-2">عرض آخر 100 سجل. استخدم التصفية لعرض أكثر.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
