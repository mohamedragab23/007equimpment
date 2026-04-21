import React, { useState, useEffect } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { supervisorsApi } from '../api/client';

export default function ZoneInventoryView() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await supervisorsApi.list();
      if (res.ok && Array.isArray(res.supervisors)) {
        setList(res.supervisors);
        setSource(res.source || '');
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

  const byZone = {};
  list.forEach((s) => {
    const z = (s.zone || '').trim() || 'بدون منطقة';
    if (!byZone[z]) {
      byZone[z] = {
        pouch_motorcycle: 0,
        pouch_bicycle: 0,
        tshirt: 0,
        jacket: 0,
        helmet: 0,
        supervisors: [],
      };
    }
    byZone[z].pouch_motorcycle += Number(s.pouch_motorcycle) || 0;
    byZone[z].pouch_bicycle += Number(s.pouch_bicycle) || 0;
    byZone[z].tshirt += Number(s.tshirt) || 0;
    byZone[z].jacket += Number(s.jacket) || 0;
    byZone[z].helmet += Number(s.helmet) || 0;
    byZone[z].supervisors.push(s.name || s.code);
  });
  const zonesList = Object.entries(byZone);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-indigo-600" />
          مخزون الزونات
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
      {source && (
        <p className="text-xs text-slate-500 mb-2">مصدر البيانات: {source === 'sheets' ? 'Google Sheets' : 'محلي'}</p>
      )}
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && list.length === 0 ? (
        <p className="text-slate-500 py-4">جاري التحميل...</p>
      ) : zonesList.length === 0 ? (
        <p className="text-slate-500 py-4">لا توجد بيانات مخزون للزونات. أضف مشرفين مع مخزون.</p>
      ) : (
        <div className="space-y-4">
          {zonesList.map(([zoneName, data]) => (
            <div key={zoneName} className="p-4 border rounded-lg bg-slate-50">
              <h3 className="font-bold text-lg mb-2">{zoneName}</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>باوتش نارية: <strong>{data.pouch_motorcycle}</strong></div>
                <div>باوتش هوائية: <strong>{data.pouch_bicycle}</strong></div>
                <div>تيشرت: <strong>{data.tshirt}</strong></div>
                <div>جاكيت: <strong>{data.jacket}</strong></div>
                <div>خوذه: <strong>{data.helmet}</strong></div>
              </div>
              <div className="mt-2 text-xs text-slate-500">المشرفون: {data.supervisors.join('، ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
