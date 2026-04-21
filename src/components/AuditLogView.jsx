import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, User, Calendar } from 'lucide-react';
import { auditApi } from '../api/client';

export default function AuditLogView() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [limit, setLimit] = useState(200);

  const fetchLog = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await auditApi.list(limit);
      if (res.ok && Array.isArray(res.entries)) {
        setEntries(res.entries);
        setSource(res.source || '');
      } else {
        setEntries([]);
      }
    } catch (e) {
      setError(e.message || 'فشل تحميل سجل التدقيق');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog();
  }, [limit]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-800">سجل التغييرات والأنشطة</h2>
      </div>
      {source && (
        <p className="text-xs text-slate-500 mb-2">مصدر البيانات: {source === 'sheets' ? 'Google Sheets' : '—'}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={fetchLog}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="p-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value={50}>آخر 50</option>
          <option value={200}>آخر 200</option>
          <option value={500}>آخر 500</option>
          <option value={1000}>آخر 1000</option>
        </select>
      </div>
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm mb-4">{error}</div>}
      {loading && entries.length === 0 ? (
        <p className="text-slate-500 py-4">جاري التحميل...</p>
      ) : entries.length === 0 ? (
        <p className="text-slate-500 py-4">لا توجد سجلات تدقيق.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 p-2 text-right">الوقت</th>
                <th className="border border-slate-200 p-2 text-right">نوع العملية</th>
                <th className="border border-slate-200 p-2 text-right">المستخدم</th>
                <th className="border border-slate-200 p-2 text-right">الهدف</th>
                <th className="border border-slate-200 p-2 text-right">التفاصيل</th>
                <th className="border border-slate-200 p-2 text-right">الحالة</th>
                <th className="border border-slate-200 p-2 text-right">IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="border border-slate-200 p-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {e.timestamp || '—'}
                    </span>
                  </td>
                  <td className="border border-slate-200 p-2">{e.action_type || '—'}</td>
                  <td className="border border-slate-200 p-2">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4 text-slate-400" />
                      {e.username || e.user_id || '—'}
                    </span>
                  </td>
                  <td className="border border-slate-200 p-2">
                    {e.target_type && e.target_id ? `${e.target_type}: ${e.target_id}` : '—'}
                  </td>
                  <td className="border border-slate-200 p-2 max-w-xs truncate" title={e.details}>
                    {e.details || '—'}
                  </td>
                  <td className="border border-slate-200 p-2">
                    <span
                      className={
                        (e.success || '').toString().toLowerCase() === 'yes'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {e.success === 'yes' ? 'نجاح' : e.success === 'no' ? 'فشل' : e.success || '—'}
                    </span>
                  </td>
                  <td className="border border-slate-200 p-2 text-slate-500">{e.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
