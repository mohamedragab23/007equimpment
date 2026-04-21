import React, { useState, useEffect } from 'react';
import { Package, Send, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BASE = '';

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { ...options, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

export default function EquipmentReturn() {
  const { user, config } = useAuth();
  const zones = config?.zones || [];
  const isSupervisor = user?.role === 'supervisor';
  const canApprove = user?.role === 'admin' || user?.role === 'warehouse_manager';

  const [form, setForm] = useState({
    supervisor_code: '',
    rider_code: '',
    rider_name: '',
    zone: user?.zone || '',
    vehicle_type: 'دراجة نارية',
    pouch_motorcycle: 0,
    pouch_bicycle: 0,
    tshirt: 0,
    jacket: 0,
    helmet: 0,
    return_reason: '',
  });
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supervisorCode = user?.supervisor_code || user?.id || '';

  const fetchReturns = async () => {
    setLoadingList(true);
    try {
      const res = await api('/api/equipment/returns?status=pending');
      if (res.ok && Array.isArray(res.returns)) setReturnsList(res.returns);
    } catch (_) {
      setReturnsList([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (canApprove) fetchReturns();
  }, [canApprove]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const total =
      Number(form.pouch_motorcycle) +
      Number(form.pouch_bicycle) +
      Number(form.tshirt) +
      Number(form.jacket) +
      Number(form.helmet);
    if (total === 0) {
      setError('يجب تحديد كمية واحدة على الأقل من المعدات المستردة');
      return;
    }
    if (!form.rider_code.trim() || !form.rider_name.trim()) {
      setError('كود الطيار واسم الطيار مطلوبان');
      return;
    }
    const code = isSupervisor ? supervisorCode : form.supervisor_code;
    if (!code) {
      setError('كود المشرف مطلوب أو يجب الدخول كمشرف');
      return;
    }

    setLoading(true);
    try {
      await api('/api/equipment/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          supervisor_code: code,
        }),
      });
      setSuccess('تم تسجيل طلب الاسترداد. بانتظار موافقة مدير المخازن.');
      setForm({
        rider_code: '',
        rider_name: '',
        zone: user?.zone || '',
        vehicle_type: 'دراجة نارية',
        pouch_motorcycle: 0,
        pouch_bicycle: 0,
        tshirt: 0,
        jacket: 0,
        helmet: 0,
        return_reason: '',
      });
      if (canApprove) fetchReturns();
    } catch (err) {
      setError(err.message || 'فشل تسجيل الاسترداد');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (returnId) => {
    setError('');
    try {
      await api(`/api/equipment/return/${encodeURIComponent(returnId)}/approve`, { method: 'POST' });
      setSuccess('تمت الموافقة على الاسترداد.');
      fetchReturns();
    } catch (err) {
      setError(err.message || 'فشل الموافقة');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-600" />
          استرداد المعدات
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          تسجيل معدات مستردة من الطيار. الموافقة النهائية لمدير المخازن.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}

          {!isSupervisor && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كود المشرف *</label>
              <input
                type="text"
                value={form.supervisor_code || ''}
                onChange={(e) => handleChange('supervisor_code', e.target.value)}
                className="w-full max-w-xs p-2 border border-slate-300 rounded-lg"
                placeholder="كود المشرف"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كود الطيار *</label>
              <input
                type="text"
                value={form.rider_code}
                onChange={(e) => handleChange('rider_code', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الطيار *</label>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">المنطقة</label>
              {zones.length > 0 ? (
                <select
                  value={form.zone}
                  onChange={(e) => handleChange('zone', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="">-- اختر --</option>
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
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">سبب الاسترداد</label>
              <input
                type="text"
                value={form.return_reason}
                onChange={(e) => handleChange('return_reason', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
                placeholder="اختياري"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">كميات المعدات المستردة</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { key: 'pouch_motorcycle', label: 'باوتش نارية' },
                { key: 'pouch_bicycle', label: 'باوتش هوائية' },
                { key: 'tshirt', label: 'تيشرت' },
                { key: 'jacket', label: 'جاكيت' },
                { key: 'helmet', label: 'خوذه' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-slate-500">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={form[key]}
                    onChange={(e) => handleChange(key, parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? 'جاري التسجيل...' : 'تسجيل الاسترداد'}
          </button>
        </form>
      </div>

      {canApprove && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              طلبات الاسترداد المعلقة (موافقة مدير المخازن)
            </h2>
            <button
              onClick={fetchReturns}
              disabled={loadingList}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm"
            >
              <RefreshCw className={loadingList ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
              تحديث
            </button>
          </div>
          {loadingList && returnsList.length === 0 ? (
            <p className="text-slate-500 py-4">جاري التحميل...</p>
          ) : returnsList.length === 0 ? (
            <p className="text-slate-500 py-4">لا توجد طلبات استرداد معلقة.</p>
          ) : (
            <div className="space-y-3">
              {returnsList.map((r) => (
                <div
                  key={r.id}
                  className="p-4 border rounded-lg bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-medium">{r.rider_name} ({r.rider_code})</div>
                    <div className="text-sm text-slate-600">
                      المشرف: {r.supervisor_code} · المنطقة: {r.zone}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      باوتش نارية: {r.pouch_motorcycle} · باوتش هوائية: {r.pouch_bicycle} · تيشرت: {r.tshirt} · جاكيت: {r.jacket} · خوذه: {r.helmet}
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(r.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    موافقة
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
