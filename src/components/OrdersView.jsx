import React, { useState, useEffect } from 'react';
import { ShoppingCart, Send, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { ordersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function OrdersView() {
  const { user, config } = useAuth();
  const zones = config?.zones || [];
  const isSupervisor = user?.role === 'supervisor';
  const canApprove = user?.role === 'admin' || user?.role === 'warehouse_manager';

  const [form, setForm] = useState({
    supervisor_code: '',
    zone: user?.zone || '',
    pouch_motorcycle: 0,
    pouch_bicycle: 0,
    tshirt: 0,
    jacket: 0,
    helmet: 0,
    priority: 'عادي',
    notes: '',
  });
  const [ordersList, setOrdersList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supervisorCode = user?.supervisor_code || user?.id || '';

  const fetchOrders = async () => {
    setLoadingList(true);
    try {
      const res = await ordersApi.list(statusFilter);
      if (res.ok && Array.isArray(res.orders)) setOrdersList(res.orders);
    } catch (_) {
      setOrdersList([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

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
      setError('يجب تحديد كمية واحدة على الأقل');
      return;
    }
    const code = isSupervisor ? supervisorCode : form.supervisor_code;
    if (!code) {
      setError('كود المشرف مطلوب أو يجب الدخول كمشرف');
      return;
    }

    setLoading(true);
    try {
      await ordersApi.create({
        ...form,
        supervisor_code: code,
      });
      setSuccess('تم إنشاء الطلبية. بانتظار موافقة مدير المخازن.');
      setForm({
        supervisor_code: '',
        zone: user?.zone || '',
        pouch_motorcycle: 0,
        pouch_bicycle: 0,
        tshirt: 0,
        jacket: 0,
        helmet: 0,
        priority: 'عادي',
        notes: '',
      });
      fetchOrders();
    } catch (err) {
      setError(err.message || 'فشل إنشاء الطلبية');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId) => {
    setError('');
    try {
      await ordersApi.approve(orderId);
      setSuccess('تمت الموافقة على الطلبية.');
      fetchOrders();
    } catch (err) {
      setError(err.message || 'فشل الموافقة');
    }
  };

  const handleReject = async (orderId) => {
    setError('');
    try {
      await ordersApi.reject(orderId);
      setSuccess('تم رفض الطلبية.');
      fetchOrders();
    } catch (err) {
      setError(err.message || 'فشل الرفض');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-indigo-600" />
          الطلبيات
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          إنشاء طلبية معدات من المشرف. الموافقة أو الرفض من مدير المخازن.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}

          {!isSupervisor && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كود المشرف *</label>
              <input
                type="text"
                value={form.supervisor_code}
                onChange={(e) => handleChange('supervisor_code', e.target.value)}
                className="w-full max-w-xs p-2 border border-slate-300 rounded-lg"
                placeholder="كود المشرف"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">المنطقة</label>
            {zones.length > 0 ? (
              <select
                value={form.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
                className="w-full max-w-xs p-2 border border-slate-300 rounded-lg"
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
                className="w-full max-w-xs p-2 border border-slate-300 rounded-lg"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">الكميات المطلوبة</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الأولوية</label>
              <select
                value={form.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              >
                <option value="عادي">عادي</option>
                <option value="عاجل">عاجل</option>
              </select>
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? 'جاري الإرسال...' : 'إنشاء طلبية'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            قائمة الطلبيات
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">الكل</option>
              <option value="pending">معلقة</option>
              <option value="approved">موافق عليها</option>
              <option value="rejected">مرفوضة</option>
            </select>
            <button
              onClick={fetchOrders}
              disabled={loadingList}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm"
            >
              <RefreshCw className={loadingList ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
              تحديث
            </button>
          </div>
        </div>

        {loadingList && ordersList.length === 0 ? (
          <p className="text-slate-500 py-4">جاري التحميل...</p>
        ) : ordersList.length === 0 ? (
          <p className="text-slate-500 py-4">لا توجد طلبيات.</p>
        ) : (
          <div className="space-y-3">
            {ordersList.map((o) => (
              <div
                key={o.id}
                className="p-4 border rounded-lg bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium">طلب {o.id}</div>
                  <div className="text-sm text-slate-600">
                    المشرف: {o.supervisor_code} · المنطقة: {o.zone} · الأولوية: {o.priority || 'عادي'}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    باوتش نارية: {o.pouch_motorcycle} · باوتش هوائية: {o.pouch_bicycle} · تيشرت: {o.tshirt} · جاكيت: {o.jacket} · خوذه: {o.helmet}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {o.created_at}
                    {o.approved_by && ` · وافق: ${o.approved_by}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      o.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : o.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {o.status === 'approved' ? 'موافق عليها' : o.status === 'rejected' ? 'مرفوضة' : 'معلقة'}
                  </span>
                  {canApprove && (o.status || '').trim() === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(o.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        موافقة
                      </button>
                      <button
                        onClick={() => handleReject(o.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        رفض
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
