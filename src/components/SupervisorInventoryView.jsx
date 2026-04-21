import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, User } from 'lucide-react';
import { supervisorsApi } from '../api/client';

const INV_LABELS = [
  { key: 'pouch_motorcycle', label: 'باوتش دراجة نارية' },
  { key: 'pouch_bicycle', label: 'باوتش دراجة هوائية' },
  { key: 'tshirt', label: 'تيشرت' },
  { key: 'jacket', label: 'جاكيت' },
  { key: 'helmet', label: 'خوذه' },
];

export default function SupervisorInventoryView({ user }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isSupervisor = user?.role === 'supervisor';
  const supervisorCode = user?.supervisor_code || user?.id;

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await supervisorsApi.list();
      if (res.ok && Array.isArray(res.supervisors)) {
        setList(res.supervisors);
      }
    } catch (e) {
      setError(e.message || 'فشل تحميل المخزون');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const displayList = isSupervisor && supervisorCode
    ? list.filter((s) => (s.code || '').toString().trim() === (supervisorCode || '').toString().trim())
    : list;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-600" />
          {isSupervisor ? 'مخزوني (مخزون المشرف)' : 'مخزون المشرفين'}
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

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && list.length === 0 ? (
        <p className="text-slate-500 py-4">جاري التحميل...</p>
      ) : displayList.length === 0 ? (
        <p className="text-slate-500 py-4">
          {isSupervisor ? 'لا توجد بيانات مخزون للمشرف الحالي.' : 'لا يوجد مشرفون أو لا يوجد مخزون.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayList.map((s) => (
            <div key={s.code} className="p-4 border rounded-lg bg-slate-50 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-slate-500" />
                <div>
                  <div className="font-bold text-slate-800">{s.name}</div>
                  <div className="text-sm text-slate-500">{s.code} · {s.zone || '—'}</div>
                </div>
              </div>
              <div className="space-y-2">
                {INV_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-medium">{Number(s[key]) || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
