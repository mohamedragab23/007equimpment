import React, { useState, useEffect } from 'react';
import { RefreshCw, Send, CheckCircle, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BASE = '';

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { ...options, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

export default function EquipmentExchangeView() {
  const { user, config } = useAuth();
  const zones = config?.zones || [];
  const canApprove = user?.role === 'admin' || user?.role === 'warehouse_manager';

  const [form, setForm] = useState({
    rider_code: '',
    rider_name: '',
    zone: user?.zone || '',
    old_pouch_details: '',
    reason: '',
    new_pouch_details: '',
  });
  const [photo, setPhoto] = useState(null);
  const [exchangesList, setExchangesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchExchanges = async () => {
    setLoadingList(true);
    try {
      const res = await api(`/api/equipment/exchanges?status=${encodeURIComponent(statusFilter)}`);
      if (res.ok && Array.isArray(res.exchanges)) setExchangesList(res.exchanges);
    } catch (_) {
      setExchangesList([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (canApprove) fetchExchanges();
  }, [canApprove, statusFilter]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.rider_code.trim() || !form.rider_name.trim()) {
      setError('كود الطيار واسم الطيار مطلوبان');
      return;
    }
    if (!photo) {
      setError('يجب رفع صورة الطلب (إلزامي)');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('rider_code', form.rider_code.trim());
      formData.append('rider_name', form.rider_name.trim());
      formData.append('zone', form.zone.trim());
      formData.append('old_pouch_details', form.old_pouch_details.trim());
      formData.append('reason', form.reason.trim());
      formData.append('exchange_photo', photo);

      const res = await fetch(`${BASE}/api/equipment/exchange`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'فشل التسجيل');

      setSuccess('تم تسجيل طلب التبديل. بانتظار موافقة مدير المخازن.');
      setForm({
        rider_code: '',
        rider_name: '',
        zone: user?.zone || '',
        old_pouch_details: '',
        reason: '',
        new_pouch_details: '',
      });
      setPhoto(null);
      if (canApprove) fetchExchanges();
    } catch (err) {
      setError(err.message || 'فشل تسجيل طلب التبديل');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (exchangeId, newPouchDetails = '') => {
    setError('');
    try {
      await api(`/api/equipment/exchange/${encodeURIComponent(exchangeId)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_pouch_details: newPouchDetails }),
      });
      setSuccess('تمت الموافقة على طلب التبديل.');
      fetchExchanges();
    } catch (err) {
      setError(err.message || 'فشل الموافقة');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-indigo-600" />
          تبديل الصناديق
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          طلب تبديل صناديق للطيار. صورة إلزامية. الموافقة من مدير المخازن.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}

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
              <label className="block text-sm font-medium text-slate-700 mb-1">تفاصيل الصناديق الحالية</label>
              <input
                type="text"
                value={form.old_pouch_details}
                onChange={(e) => handleChange('old_pouch_details', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
                placeholder="مثال: باوتش نارية تالف"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">سبب التبديل</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
              placeholder="اختياري"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">صورة الطلب (إلزامي) *</label>
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 w-fit">
              <Camera className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setPhoto(e.target.files[0] || null);
                  setError('');
                }}
                required={!photo}
                className="hidden"
              />
              {photo ? photo.name : 'اختر صورة'}
            </label>
            {photo && (
              <button type="button" onClick={() => setPhoto(null)} className="text-sm text-red-600 mr-2">
                إزالة
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? 'جاري التسجيل...' : 'تسجيل طلب التبديل'}
          </button>
        </form>
      </div>

      {canApprove && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              طلبات التبديل المعلقة
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="pending">معلقة</option>
                <option value="approved">موافق عليها</option>
              </select>
              <button
                onClick={fetchExchanges}
                disabled={loadingList}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm"
              >
                <RefreshCw className={loadingList ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
                تحديث
              </button>
            </div>
          </div>
          {loadingList && exchangesList.length === 0 ? (
            <p className="text-slate-500 py-4">جاري التحميل...</p>
          ) : exchangesList.length === 0 ? (
            <p className="text-slate-500 py-4">لا توجد طلبات تبديل.</p>
          ) : (
            <div className="space-y-3">
              {exchangesList.map((ex) => (
                <div
                  key={ex.id}
                  className="p-4 border rounded-lg bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-medium">{ex.rider_name} ({ex.rider_code})</div>
                    <div className="text-sm text-slate-600">المنطقة: {ex.zone}</div>
                    <div className="text-sm text-slate-500">تفاصيل الحالية: {ex.old_pouch_details || '—'}</div>
                    <div className="text-sm text-slate-500">السبب: {ex.reason || '—'}</div>
                    {ex.photo_url && (
                      <a href={ex.photo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600">
                        عرض الصورة
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        ex.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ex.status === 'approved' ? 'موافق عليها' : 'معلقة'}
                    </span>
                    {(ex.status || '').trim() === 'pending' && (
                      <button
                        onClick={() => handleApprove(ex.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        موافقة
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
