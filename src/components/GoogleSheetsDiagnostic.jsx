import React, { useState } from 'react';
import { RefreshCw, Database, CheckCircle, XCircle } from 'lucide-react';

// التابات الـ 11 الرئيسية فقط (لتجنب 429 عند جلب كل التابات)
const MAIN_SHEET_NAMES = [
  'Users',
  'Supervisors',
  'Zones',
  'MainInventory',
  'ZoneInventory',
  'Deductions',
  'Orders',
  'EquipmentExchange',
  'Apartments',
  'Motorcycles',
  'PermissionsLog',
];
const FETCH_DELAY_MS = 350; // تأخير بين كل طلب لتجنب تجاوز حد الطلبات (429)

export default function GoogleSheetsDiagnostic() {
  const [status, setStatus] = useState({
    connected: false,
    spreadsheetId: '',
    sheets: [],
    dataCounts: {},
    errors: [],
    loading: false,
  });

  const checkConnection = async () => {
    setStatus((prev) => ({ ...prev, loading: true, errors: [] }));
    try {
      const base = import.meta.env.VITE_API_BASE || '';
      const res = await fetch(`${base}/api/sync/status`, { credentials: 'include' });
      const data = await res.json();

      if (!data.connected) {
        setStatus((prev) => ({
          ...prev,
          loading: false,
          connected: false,
          errors: [data.message || data.error || 'غير متصل'],
        }));
        return;
      }

      const dataCounts = {};
      for (const sheet of MAIN_SHEET_NAMES) {
        try {
          if (FETCH_DELAY_MS > 0) await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
          const sheetRes = await fetch(`${base}/api/sync/sheet/${encodeURIComponent(sheet)}`, {
            credentials: 'include',
          });
          const sheetData = await sheetRes.json();
          const rows = Array.isArray(sheetData) ? sheetData : sheetData?.data || [];
          const first = rows[0];
          dataCounts[sheet] = {
            rowCount: rows.length,
            columns: first && typeof first === 'object' ? Object.keys(first) : [],
            error: sheetData?.error || null,
          };
        } catch (e) {
          dataCounts[sheet] = { rowCount: 0, columns: [], error: e.message };
        }
      }

      setStatus({
        connected: true,
        spreadsheetId: data.spreadsheet_id || '',
        sheets: MAIN_SHEET_NAMES,
        dataCounts,
        errors: [],
        loading: false,
      });
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        errors: [...prev.errors, error.message],
      }));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Database className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-800">تشخيص Google Sheets</h2>
      </div>
      <p className="text-sm text-slate-500">
        فحص الاتصال بملف Google Sheets وعرض عدد السجلات في كل تاب.
      </p>

      <button
        type="button"
        onClick={checkConnection}
        disabled={status.loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        <RefreshCw className={`w-5 h-5 ${status.loading ? 'animate-spin' : ''}`} />
        {status.loading ? 'جاري الفحص...' : 'فحص الاتصال وجميع التابات'}
      </button>

      {status.errors.length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {status.errors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}

      {status.connected && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>متصل بـ Google Sheets</span>
          </div>
          {status.spreadsheetId && (
            <p className="text-xs text-slate-500 font-mono truncate">ID: {status.spreadsheetId}</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-100 text-right">
                  <th className="p-3 border-b border-slate-200">اسم التاب</th>
                  <th className="p-3 border-b border-slate-200">عدد الصفوف</th>
                  <th className="p-3 border-b border-slate-200">عدد الأعمدة</th>
                  <th className="p-3 border-b border-slate-200">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(status.sheets.length ? status.sheets : MAIN_SHEET_NAMES).map((sheet) => {
                  const data = status.dataCounts[sheet] || {};
                  const hasError = !!data.error;
                  return (
                    <tr key={sheet} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium">{sheet}</td>
                      <td className="p-3">{data.rowCount ?? '—'}</td>
                      <td className="p-3">{data.columns?.length ?? '—'}</td>
                      <td className="p-3">
                        {hasError ? (
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> {data.error}
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> جاهز
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
