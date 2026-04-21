# -*- coding: utf-8 -*-
"""
نظام المزامنة الثنائية مع Google Sheets - سحب ودفع البيانات مع حل التعارضات
يستخدم الخدمة الحالية (gspread + google-auth) وملف الاعتماد credentials.json
"""
import json
import hashlib
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

from api.sync.google_sheets_service import get_sheets_service
from api.utils.sheets_config import (
    SHEET_NAMES,
    SHEET_HEADERS,
    SHEET_HEADER_ROW,
    SUPERVISORS_SHEET_WRITE_COLUMNS,
    SUPERVISORS_INTERNAL_TO_SHEET,
)


# عمود المعرف الفريد لكل تاب (للدمج وإزالة التكرار)
SHEET_ID_COLUMN = {
    'Users': 'id',
    'Supervisors': 'code',
    'Orders': 'id',
    'EquipmentExchange': 'id',
    'Apartments': 'id',
    'Motorcycles': 'id',
    'Deductions': None,  # دمج بالكامل
    'Zones': 'name',
    'MainInventory': None,
    'ZoneInventory': 'zone',
    'PermissionsLog': None,
}


class GoogleSheetsBidirectionalSync:
    """
    مزامنة ثنائية الاتجاه مع Google Sheets.
    يستخدم credentials.json و GOOGLE_SHEETS_SPREADSHEET_ID من البيئة أو .env
    """

    def __init__(self, credentials_path: Optional[str] = None, spreadsheet_id: Optional[str] = None):
        self._credentials_path = credentials_path
        self._spreadsheet_id = spreadsheet_id
        self._sheets = None
        self.change_log: Dict[str, List[Dict]] = {}

    def _get_sheets(self):
        if self._sheets is None:
            self._sheets = get_sheets_service(
                credentials_path=self._credentials_path,
                spreadsheet_id=self._spreadsheet_id,
                force_new=True,
            )
        return self._sheets

    def get_all_sheets_data(self) -> Dict[str, List[Dict]]:
        """سحب جميع البيانات من التابات الـ 11 الرئيسية."""
        sheets_data = {}
        svc = self._get_sheets()
        if not svc:
            return sheets_data
        for sheet_name in SHEET_NAMES:
            try:
                header_row = SHEET_HEADER_ROW.get(sheet_name, 1)
                rows = svc.get_all_records(sheet_name, header_row=header_row)
                sheets_data[sheet_name] = rows if isinstance(rows, list) else []
            except Exception as e:
                sheets_data[sheet_name] = []
                self._log_change(sheet_name, 'pull_error', 0, str(e))
        return sheets_data

    def get_sheet_data(self, sheet_name: str) -> List[Dict]:
        """سحب بيانات تاب محدد."""
        svc = self._get_sheets()
        if not svc:
            return []
        try:
            header_row = SHEET_HEADER_ROW.get(sheet_name, 1)
            rows = svc.get_all_records(sheet_name, header_row=header_row)
            return rows if isinstance(rows, list) else []
        except Exception:
            return []

    def update_sheet(self, sheet_name: str, data: List[Dict]) -> bool:
        """تحديث ورقة كاملة ببيانات جديدة (رؤوس + صفوف)."""
        svc = self._get_sheets()
        if not svc:
            return False
        if sheet_name not in SHEET_HEADERS:
            return False
        try:
            if sheet_name == 'Supervisors':
                headers = SUPERVISORS_SHEET_WRITE_COLUMNS
                internal_for_sheet = {v: k for k, v in SUPERVISORS_INTERNAL_TO_SHEET.items()}
                rows = []
                for row in data:
                    vals = []
                    for col in headers:
                        internal_key = internal_for_sheet.get(col, '')
                        val = row.get(col) or row.get(internal_key) or ''
                        vals.append(str(val))
                    rows.append(vals)
            else:
                headers = SHEET_HEADERS[sheet_name]
                rows = [[str(row.get(h, '')) for h in headers] for row in data]
            values = [headers] + rows
            ws = svc._sheet(sheet_name)
            ws.clear()
            if values:
                ws.update('A1', values, value_input_option='USER_ENTERED')
            self._log_change(sheet_name, 'update', len(data))
            return True
        except Exception as e:
            self._log_change(sheet_name, 'update_error', 0, str(e))
            return False

    def append_to_sheet(self, sheet_name: str, row: Dict) -> bool:
        """إضافة صف واحد في نهاية الورقة."""
        svc = self._get_sheets()
        if not svc:
            return False
        try:
            if sheet_name == 'Supervisors':
                internal_for_sheet = {v: k for k, v in SUPERVISORS_INTERNAL_TO_SHEET.items()}
                values = [str(row.get(internal_for_sheet.get(col, ''), '')) for col in SUPERVISORS_SHEET_WRITE_COLUMNS]
            else:
                headers = SHEET_HEADERS.get(sheet_name, [])
                values = [str(row.get(h, '')) for h in headers]
            svc.append_row(sheet_name, values)
            self._log_change(sheet_name, 'append', 1)
            return True
        except Exception:
            return False

    def sync_from_sheets_to_project(self, project_data: Dict[str, List[Dict]]) -> Dict[str, List[Dict]]:
        """مزامنة من Google Sheets إلى المشروع (البيانات المحلية)."""
        svc = self._get_sheets()
        if not svc:
            return project_data
        sheets_data = self.get_all_sheets_data()
        for sheet_name, data in sheets_data.items():
            if sheet_name in project_data or data:
                merged = self._resolve_conflicts(project_data.get(sheet_name, []), data, f'{sheet_name}_to_project')
                project_data[sheet_name] = merged
        return project_data

    def sync_from_project_to_sheets(self, project_data: Dict[str, List[Dict]]) -> None:
        """مزامنة من المشروع إلى Google Sheets (تحديث التابات)."""
        for sheet_name, data in project_data.items():
            if sheet_name not in SHEET_NAMES:
                continue
            try:
                existing = self.get_sheet_data(sheet_name)
                merged = self._resolve_conflicts(existing, data, f'{sheet_name}_to_sheets')
                self.update_sheet(sheet_name, merged)
            except Exception as e:
                self._log_change(sheet_name, 'push_error', 0, str(e))

    def bidirectional_sync(self, project_data: Dict[str, List[Dict]]) -> Dict[str, List[Dict]]:
        """مزامنة ثنائية كاملة: دمج البيانات من الشيت والمشروع ثم تحديث الشيت وإرجاع النتيجة للمشروع."""
        svc = self._get_sheets()
        if not svc:
            return project_data
        sheets_data = self.get_all_sheets_data()
        synced = {}
        for sheet_name in SHEET_NAMES:
            proj = project_data.get(sheet_name, [])
            sheet = sheets_data.get(sheet_name, [])
            merged = self._advanced_merge(proj, sheet, sheet_name)
            synced[sheet_name] = merged
            self.update_sheet(sheet_name, merged)
        return synced

    def _advanced_merge(self, data1: List[Dict], data2: List[Dict], sheet_name: str) -> List[Dict]:
        """دمج قائمتين من القواميس مع حل التعارضات (الأحدث يفوز أو إزالة تكرار)."""
        if not data1:
            return data2
        if not data2:
            return data1
        id_col = SHEET_ID_COLUMN.get(sheet_name)
        if id_col:
            by_id = {}
            for row in data1 + data2:
                key = row.get(id_col) or row.get(str(id_col))
                if key is not None and str(key).strip():
                    by_id[key] = row
            return list(by_id.values())
        seen = set()
        out = []
        for row in data2 + data1:
            h = self._row_hash(row)
            if h not in seen:
                seen.add(h)
                out.append(row)
        return out

    def _resolve_conflicts(self, project_items: List[Dict], sheets_items: List[Dict], context: str) -> List[Dict]:
        """حل التعارضات: تفضيل بيانات الشيت وإضافة الفريد من المشروع."""
        if not sheets_items:
            return project_items
        if not project_items:
            return sheets_items
        id_col = None
        for sn in SHEET_NAMES:
            if sn in context:
                id_col = SHEET_ID_COLUMN.get(sn)
                break
        if id_col:
            by_id = {str(row.get(id_col, '')): row for row in sheets_items if row.get(id_col)}
            for row in project_items:
                key = str(row.get(id_col, ''))
                if key and key not in by_id:
                    by_id[key] = row
            return list(by_id.values())
        set_sheets = {self._row_hash(r) for r in sheets_items}
        out = list(sheets_items)
        for row in project_items:
            if self._row_hash(row) not in set_sheets:
                out.append(row)
        return out

    def _row_hash(self, row: Dict) -> str:
        """hash للصف لتجنب التكرار."""
        data_str = json.dumps(row, sort_keys=True, default=str)
        return hashlib.md5(data_str.encode()).hexdigest()

    def _log_change(self, sheet_name: str, action: str, count: int, error: Optional[str] = None):
        if sheet_name not in self.change_log:
            self.change_log[sheet_name] = []
        self.change_log[sheet_name].append({
            'timestamp': datetime.now().isoformat(),
            'action': action,
            'count': count,
            'error': error,
        })

    def get_sync_report(self) -> Dict:
        """تقرير المزامنة."""
        return {
            'timestamp': datetime.now().isoformat(),
            'sheets_synced': list(self.change_log.keys()),
            'change_log': self.change_log,
            'total_entries': sum(len(logs) for logs in self.change_log.values()),
        }


def load_project_data(data_dir: str) -> Dict[str, List[Dict]]:
    """تحميل بيانات المشروع من مجلد data (ملفات JSON)."""
    # تعيين اسم التاب -> اسم الملف
    sheet_to_file = {
        'Users': 'users.json',
        'Supervisors': 'supervisors.json',
        'Zones': 'zones.json',
        'MainInventory': 'main_inventory.json',
        'ZoneInventory': 'zone_inventory.json',
        'Deductions': 'deductions.json',
        'Orders': 'orders.json',
        'EquipmentExchange': 'equipment_exchange.json',
        'Apartments': 'apartments.json',
        'Motorcycles': 'motorcycles.json',
        'PermissionsLog': 'permissions_log.json',
    }
    out = {}
    for sheet_name, filename in sheet_to_file.items():
        path = os.path.join(data_dir, filename)
        if os.path.isfile(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                out[sheet_name] = data if isinstance(data, list) else []
            except Exception:
                out[sheet_name] = []
        else:
            out[sheet_name] = []
    return out


def save_project_data(data_dir: str, project_data: Dict[str, List[Dict]]) -> None:
    """حفظ بيانات المشروع في مجلد data."""
    sheet_to_file = {
        'Users': 'users.json',
        'Supervisors': 'supervisors.json',
        'Zones': 'zones.json',
        'MainInventory': 'main_inventory.json',
        'ZoneInventory': 'zone_inventory.json',
        'Deductions': 'deductions.json',
        'Orders': 'orders.json',
        'EquipmentExchange': 'equipment_exchange.json',
        'Apartments': 'apartments.json',
        'Motorcycles': 'motorcycles.json',
        'PermissionsLog': 'permissions_log.json',
    }
    os.makedirs(data_dir, exist_ok=True)
    for sheet_name, data in project_data.items():
        filename = sheet_to_file.get(sheet_name)
        if not filename:
            continue
        path = os.path.join(data_dir, filename)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
