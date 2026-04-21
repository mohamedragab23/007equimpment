import React, { useState } from 'react';
import { Package, Camera, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BASE = '';

async function deliverEquipment(formData) {
  const res = await fetch(`${BASE}/api/equipment/deliver`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'فشل التسليم');
  return data;
}

export default function EquipmentDelivery() {
  const { user, config } = useAuth();
  const zones = config?.zones || [];
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
    notes: '',
  });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isSupervisor = user?.role === 'supervisor';
  const supervisorCode = isSupervisor ? (user?.supervisor_code || user?.id || '') : (form.supervisor_code || '');

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!photo) {
      setError('يجب رفع صورة الطيار بالمعدات (إلزامي)');
      return;
    }
    const total =
      Number(form.pouch_motorcycle) +
      Number(form.pouch_bicycle) +
      Number(form.tshirt) +
      Number(form.jacket) +
      Number(form.helmet);
    if (total === 0) {
      setError('يجب تحديد كمية واحدة على الأقل من المعدات');
      return;
    }
    if (!form.rider_code.trim() || !form.rider_name.trim()) {
      setError('كود الطيار واسم الطيار مطلوبان');
      return;
    }
    const code = isSupervisor ? (user?.supervisor_code || user?.id) : form.supervisor_code;
    if (!code) {
      setError('كود المشرف مطلوب أو يجب الدخول كمشرف');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('supervisor_code', code);
      formData.append('rider_code', form.rider_code.trim());
      formData.append('rider_name', form.rider_name.trim());
      formData.append('zone', form.zone.trim());
      formData.append('vehicle_type', form.vehicle_type);
      formData.append('pouch_motorcycle', form.pouch_motorcycle);
      formData.append('pouch_bicycle', form.pouch_bicycle);
      formData.append('tshirt', form.tshirt);
      formData.append('jacket', form.jacket);
      formData.append('helmet', form.helmet);
      formData.append('notes', form.notes);
      formData.append('delivery_photo', photo);

      await deliverEquipment(formData);
      setSuccess('تم تسليم المعدات بنجاح.');
      setForm((prev) => ({
        ...prev,
        rider_code: '',
        rider_name: '',
        zone: user?.zone || '',
        vehicle_type: 'دراجة نارية',
        pouch_motorcycle: 0,
        pouch_bicycle: 0,
        tshirt: 0,
        jacket: 0,
        helmet: 0,
        notes: '',
      }));
      setPhoto(null);
    } catch (err) {
      setError(err.message || 'حدث خطأ في التسليم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
        <Package className="w-6 h-6 text-indigo-600" />
        تسليم المعدات للطيارين
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        اختيار الطيار والمنطقة ونوع المركبة وكميات المعدات، مع رفع صورة إلزامية للطيار بالمعدات.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>
        )}

        {!isSupervisor && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كود المشرف *</label>
            <input
              type="text"
              value={form.supervisor_code}
              onChange={(e) => handleChange('supervisor_code', e.target.value)}
              className="w-full max-w-xs p-2 border border-slate-300 rounded-lg"
              placeholder="كود المشرف المسلّم منه"
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
              placeholder="كود الطيار"
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
              placeholder="اسم الطيار"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">نوع المركبة</label>
            <select
              value={form.vehicle_type}
              onChange={(e) => handleChange('vehicle_type', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            >
              <option value="دراجة نارية">دراجة نارية</option>
              <option value="دراجة هوائية">دراجة هوائية</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">كميات المعدات</label>
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            صورة التسليم (إلزامي) *
          </label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200">
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
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="text-sm text-red-600"
              >
                إزالة
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">يجب أن تظهر الصورة الطيار بالمعدات المسلمة</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg"
            rows={2}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
          {loading ? 'جاري التسليم...' : 'تسليم المعدات'}
        </button>
      </form>
    </div>
  );
}
