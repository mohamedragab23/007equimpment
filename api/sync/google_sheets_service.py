# -*- coding: utf-8 -*-
"""
خدمة Google Sheets - الاتصال والمزامنة للقراءة/الكتابة
نظام إدارة مخزون معدات طلبات - وكالة 007
"""
import os
from typing import List, Dict, Any, Optional

from api.utils.sheets_config import (
    SHEET_NAMES,
    SHEET_HEADERS,
    SHEET_NAME_ALIASES,
    SHEET_HEADER_ROW,
    SHEET_EXPECTED_HEADERS,
)

# مسار ملف الاعتماد (من متغير بيئة أو المسار الافتراضي)
CREDENTIALS_PATH = os.environ.get(
    'GOOGLE_APPLICATION_CREDENTIALS',
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'credentials.json')
)
SPREADSHEET_ID_ENV = 'GOOGLE_SHEETS_SPREADSHEET_ID'


class GoogleSheetsService:
    """اتصال واحد بملف Google Sheets وإدارة الأوراق الـ 11."""

    def __init__(self, credentials_path: Optional[str] = None, spreadsheet_id: Optional[str] = None):
        self._credentials_path = credentials_path or CREDENTIALS_PATH
        self._spreadsheet_id = spreadsheet_id or os.environ.get(SPREADSHEET_ID_ENV)
        self._client = None
        self._spreadsheet = None

    def _ensure_client(self):
        if self._client is not None:
            return
        if not os.path.isfile(self._credentials_path):
            raise FileNotFoundError(
                f'ملف الاعتماد غير موجود: {self._credentials_path}\n'
                'راجع SETUP_GOOGLE_SHEETS.md لإنشاء credentials.json من Google Cloud.'
            )
        import gspread
        self._client = gspread.service_account(filename=self._credentials_path)

    def _ensure_spreadsheet(self):
        self._ensure_client()
        if self._spreadsheet is not None:
            return
        if not self._spreadsheet_id:
            raise ValueError(
                f'لم يتم تعيين معرف الملف. ضع متغير البيئة {SPREADSHEET_ID_ENV} أو مرّر spreadsheet_id عند الإنشاء.'
            )
        self._spreadsheet = self._client.open_by_key(self._spreadsheet_id)
        self._ensure_worksheets()

    def _find_worksheet_by_name_or_alias(self, sheet_name: str):
        """البحث عن ورقة بالاسم الإنجليزي أو أحد الأسماء البديلة (مثل العربي)."""
        aliases = SHEET_NAME_ALIASES.get(sheet_name, [sheet_name])
        for candidate in aliases:
            try:
                return self._spreadsheet.worksheet(candidate)
            except Exception:
                continue
        return None

    def _ensure_worksheets(self):
        """التأكد من وجود الأوراق الـ 11؛ استخدام ورقة موجودة (باسم إنجليزي أو عربي) أو إنشاء ورقة جديدة."""
        for name in SHEET_NAMES:
            ws = self._find_worksheet_by_name_or_alias(name)
            if ws is None:
                ws = self._spreadsheet.add_worksheet(title=name, rows=500, cols=30)
                headers = SHEET_HEADERS.get(name, [])
                if headers:
                    row1 = [str(h) for h in headers]
                    ws.update('A1', [row1], value_input_option='RAW')

    def connect(self, spreadsheet_id: Optional[str] = None) -> 'GoogleSheetsService':
        """فتح الاتصال بملف معيّن (إن وُجد)."""
        if spreadsheet_id:
            self._spreadsheet_id = spreadsheet_id
            self._spreadsheet = None
        self._ensure_spreadsheet()
        return self

    def _sheet(self, name: str):
        self._ensure_spreadsheet()
        ws = self._find_worksheet_by_name_or_alias(name)
        if ws is not None:
            return ws
        return self._spreadsheet.worksheet(name)

    # ---- قراءة ----
    def get_all_records(
        self,
        sheet_name: str,
        header_row: Optional[int] = None,
        expected_headers: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """قراءة كل الصفوف كقائمة قاموس. header_row: صف الرؤوس (1-indexed). عند وجود fixed_headers نستخدم القراءة اليدوية."""
        fixed = SHEET_EXPECTED_HEADERS.get(sheet_name)
        if fixed:
            h = header_row if header_row is not None else SHEET_HEADER_ROW.get(sheet_name, 1)
            return self.get_all_records_fixed_headers(sheet_name, h, fixed)
        ws = self._sheet(sheet_name)
        head = header_row if header_row is not None else SHEET_HEADER_ROW.get(sheet_name, 1)
        return ws.get_all_records(head=head)

    def get_all_records_fixed_headers(
        self,
        sheet_name: str,
        header_row_1based: int,
        column_headers: List[str],
    ) -> List[Dict[str, Any]]:
        """قراءة الصفوف باستخدام رؤوس أعمدة ثابتة (بدون استدعاء get_all_records في gspread لتجنب duplicate/unknown headers)."""
        ws = self._sheet(sheet_name)
        all_values = ws.get_all_values()
        if not all_values:
            return []
        data_start = header_row_1based
        out = []
        for row in all_values[data_start:]:
            padded = (row + [''] * len(column_headers))[:len(column_headers)]
            out.append(dict(zip(column_headers, padded)))
        return out

    def get_all_values(self, sheet_name: str) -> List[List[Any]]:
        """قراءة كل الخلايا كقوائم."""
        ws = self._sheet(sheet_name)
        return ws.get_all_values()

    def get_row(self, sheet_name: str, row: int) -> List[Any]:
        ws = self._sheet(sheet_name)
        return ws.row_values(row)

    def get_cell(self, sheet_name: str, row: int, col: int) -> Any:
        ws = self._sheet(sheet_name)
        return ws.cell(row, col).value

    # ---- كتابة ----
    def append_row(self, sheet_name: str, values: List[Any]) -> None:
        """إضافة صف في نهاية الورقة."""
        ws = self._sheet(sheet_name)
        ws.append_row(values, value_input_option='USER_ENTERED')

    def append_rows(self, sheet_name: str, rows: List[List[Any]]) -> None:
        """إضافة عدة صفوف."""
        if not rows:
            return
        ws = self._sheet(sheet_name)
        ws.append_rows(rows, value_input_option='USER_ENTERED')

    def update_cell(self, sheet_name: str, row: int, col: int, value: Any) -> None:
        ws = self._sheet(sheet_name)
        ws.update_cell(row, col, value)

    def update_range(self, sheet_name: str, range_name: str, values: List[List[Any]]) -> None:
        """مثال: update_range('Users', 'A2:D2', [[1,2,3,4]])"""
        ws = self._sheet(sheet_name)
        ws.update(range_name, values, value_input_option='USER_ENTERED')

    def update_row_by_header(self, sheet_name: str, row_index: int, row_dict: Dict[str, Any]) -> None:
        """تحديث صف حسب رؤوس الأعمدة (القاموس)."""
        headers = SHEET_HEADERS.get(sheet_name, [])
        if not headers:
            return
        values = [row_dict.get(h, '') for h in headers]
        range_str = f'A{row_index}:{self._col_letter(len(values))}{row_index}'
        self.update_range(sheet_name, range_str, [values])

    def _col_letter(self, n: int) -> str:
        s = ''
        while n > 0:
            n, r = divmod(n - 1, 26)
            s = chr(65 + r) + s
        return s or 'A'

    # ---- دوال مخصصة لكل ورقة (لتسهيل الاستخدام) ----
    def users_all(self) -> List[Dict]:
        return self.get_all_records('Users')

    def users_append(self, row: Dict) -> None:
        headers = SHEET_HEADERS['Users']
        self.append_row('Users', [row.get(h, '') for h in headers])

    def supervisors_all(self) -> List[Dict]:
        return self.get_all_records('Supervisors')

    def supervisors_append(self, row: Dict) -> None:
        headers = SHEET_HEADERS['Supervisors']
        self.append_row('Supervisors', [row.get(h, '') for h in headers])

    def get_supervisor_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """جلب مشرف بحسب الكود."""
        rows = self.get_all_records('Supervisors')
        for r in rows:
            if (r.get('code') or '').strip() == (code or '').strip():
                return r
        return None

    def deduct_supervisor_inventory(
        self, supervisor_code: str,
        amounts: Dict[str, int],
    ) -> tuple[bool, str]:
        """
        خصم كميات من مخزون المشرف. amounts مثل: {pouch_motorcycle: 1, tshirt: 2}.
        يُرجع (True, '') عند النجاح أو (False, رسالة_خطأ).
        """
        headers = SHEET_HEADERS['Supervisors']
        inv_cols = ['pouch_motorcycle', 'pouch_bicycle', 'tshirt', 'jacket', 'helmet']
        code_col = headers.index('code') if 'code' in headers else 0
        ws = self._sheet('Supervisors')
        all_rows = ws.get_all_values()
        if len(all_rows) < 2:
            return False, 'لا توجد بيانات مشرفين'
        header_row = all_rows[0]
        try:
            col_indices = {k: header_row.index(k) for k in inv_cols if k in header_row}
        except ValueError:
            return False, 'هيكل ورقة المشرفين غير متطابق'
        row_index = None
        for i in range(1, len(all_rows)):
            if (all_rows[i][code_col] or '').strip() == (supervisor_code or '').strip():
                row_index = i + 1
                break
        if row_index is None:
            return False, 'المشرف غير موجود'
        for key, deduct in amounts.items():
            if deduct <= 0 or key not in col_indices:
                continue
            col = col_indices[key] + 1
            current = ws.cell(row_index, col).value
            try:
                current = int(current or 0)
            except (TypeError, ValueError):
                current = 0
            if current < deduct:
                return False, f'لا يوجد مخزون كافٍ من {key} (المتاح: {current})'
            ws.update_cell(row_index, col, current - deduct)
        return True, ''

    def add_supervisor_inventory(
        self, supervisor_code: str,
        amounts: Dict[str, int],
    ) -> tuple[bool, str]:
        """إضافة كميات لمخزون المشرف (مثل استرداد معدات). يُرجع (True, '') أو (False, رسالة_خطأ)."""
        headers = SHEET_HEADERS['Supervisors']
        inv_cols = ['pouch_motorcycle', 'pouch_bicycle', 'tshirt', 'jacket', 'helmet']
        code_col = headers.index('code') if 'code' in headers else 0
        ws = self._sheet('Supervisors')
        all_rows = ws.get_all_values()
        if len(all_rows) < 2:
            return False, 'لا توجد بيانات مشرفين'
        header_row = all_rows[0]
        try:
            col_indices = {k: header_row.index(k) for k in inv_cols if k in header_row}
        except ValueError:
            return False, 'هيكل ورقة المشرفين غير متطابق'
        row_index = None
        for i in range(1, len(all_rows)):
            if (all_rows[i][code_col] or '').strip() == (supervisor_code or '').strip():
                row_index = i + 1
                break
        if row_index is None:
            return False, 'المشرف غير موجود'
        for key, add_val in amounts.items():
            if add_val <= 0 or key not in col_indices:
                continue
            col = col_indices[key] + 1
            current = ws.cell(row_index, col).value
            try:
                current = int(current or 0)
            except (TypeError, ValueError):
                current = 0
            ws.update_cell(row_index, col, current + add_val)
        return True, ''

    def zones_all(self) -> List[Dict]:
        return self.get_all_records('Zones')

    def main_inventory_get(self) -> List[Dict]:
        return self.get_all_records('MainInventory')

    def main_inventory_append(self, row: Dict) -> None:
        headers = SHEET_HEADERS['MainInventory']
        self.append_row('MainInventory', [row.get(h, '') for h in headers])

    def zone_inventory_all(self) -> List[Dict]:
        return self.get_all_records('ZoneInventory')

    def deduct_zone_inventory(
        self, zone_name: str,
        amounts: Dict[str, int],
    ) -> tuple[bool, str]:
        """
        خصم كميات من مخزون المنطقة في ورقة ZoneInventory.
        يُحدّث أول صف يطابق اسم المنطقة. إن لم يوجد صف للمنطقة يُرجع (True, '') ولا يفشل التسليم.
        """
        if not (zone_name or '').strip():
            return True, ''
        headers = SHEET_HEADERS['ZoneInventory']
        inv_cols = ['pouch_motorcycle', 'pouch_bicycle', 'tshirt', 'jacket', 'helmet']
        zone_col = headers.index('zone') if 'zone' in headers else 0
        ws = self._sheet('ZoneInventory')
        all_rows = ws.get_all_values()
        if len(all_rows) < 2:
            return True, ''
        header_row = all_rows[0]
        try:
            col_indices = {k: header_row.index(k) for k in inv_cols if k in header_row}
        except ValueError:
            return True, ''
        row_index = None
        for i in range(1, len(all_rows)):
            if (all_rows[i][zone_col] or '').strip() == (zone_name or '').strip():
                row_index = i + 1
                break
        if row_index is None:
            return True, ''
        for key, deduct in amounts.items():
            if deduct <= 0 or key not in col_indices:
                continue
            col = col_indices[key] + 1
            current = ws.cell(row_index, col).value
            try:
                current = int(current or 0)
            except (TypeError, ValueError):
                current = 0
            if current < deduct:
                return False, f'مخزون المنطقة لا يكفي من {key} (المتاح: {current})'
            ws.update_cell(row_index, col, current - deduct)
        return True, ''

    def zone_inventory_append(self, row: Dict) -> None:
        headers = SHEET_HEADERS['ZoneInventory']
        self.append_row('ZoneInventory', [row.get(h, '') for h in headers])

    def deductions_all(self) -> List[Dict]:
        return self.get_all_records('Deductions')

    def deductions_append(self, row: Dict) -> None:
        headers = SHEET_HEADERS['Deductions']
        self.append_row('Deductions', [row.get(h, '') for h in headers])

    def deductions_append_batch(self, rows: List[Dict]) -> None:
        headers = SHEET_HEADERS['Deductions']
        self.append_rows('Deductions', [[r.get(h, '') for h in headers] for r in rows])

    def orders_all(self) -> List[Dict]:
        return self.get_all_records('Orders')

    def orders_append(self, row: Dict) -> None:
        headers = SHEET_HEADERS['Orders']
        self.append_row('Orders', [row.get(h, '') for h in headers])

    def equipment_exchange_all(self) -> List[Dict]:
        return self.get_all_records('EquipmentExchange')

    def equipment_exchange_append(self, row: Dict) -> None:
        headers = SHEET_HEADERS['EquipmentExchange']
        self.append_row('EquipmentExchange', [row.get(h, '') for h in headers])

    def apartments_all(self) -> List[Dict]:
        return self.get_all_records('Apartments')

    def apartments_append(self, row: Dict) -> None:
        headers = SHEET_HEADERS['Apartments']
        self.append_row('Apartments', [row.get(h, '') for h in headers])

    def motorcycles_all(self) -> List[Dict]:
        return self.get_all_records('Motorcycles')

    def motorcycles_append(self, row: Dict) -> None:
        headers = SHEET_HEADERS['Motorcycles']
        self.append_row('Motorcycles', [row.get(h, '') for h in headers])

    def permissions_log_append(self, row: Dict) -> None:
        headers = SHEET_HEADERS['PermissionsLog']
        self.append_row('PermissionsLog', [row.get(h, '') for h in headers])


# نسخة واحدة قابلة لإعادة الاستخدام (تُملأ عند أول طلب)
_singleton: Optional[GoogleSheetsService] = None
_last_sheets_error: Optional[str] = None


def get_sheets_service(
    credentials_path: Optional[str] = None,
    spreadsheet_id: Optional[str] = None,
    force_new: bool = False
) -> Optional[GoogleSheetsService]:
    """
    إرجاع خدمة Google Sheets. إن لم يكن credentials.json أو spreadsheet_id متوفرين، يُرجع None.
    """
    global _singleton, _last_sheets_error
    if force_new:
        _singleton = None
        _last_sheets_error = None
    if _singleton is not None:
        return _singleton
    path = credentials_path or CREDENTIALS_PATH
    if not os.path.isfile(path):
        _last_sheets_error = f'ملف الاعتماد غير موجود: {path}'
        return None
    sid = spreadsheet_id or os.environ.get(SPREADSHEET_ID_ENV)
    if not sid:
        _last_sheets_error = f'لم يتم تعيين {SPREADSHEET_ID_ENV} (في .env أو متغير البيئة)'
        return None
    try:
        _singleton = GoogleSheetsService(credentials_path=path, spreadsheet_id=sid)
        _singleton.connect()
        _last_sheets_error = None
        return _singleton
    except Exception as e:
        _last_sheets_error = str(e)
        return None


def get_last_sheets_error() -> Optional[str]:
    """آخر رسالة خطأ عند فشل الاتصال بـ Google Sheets (لعرضها في /api/sync/status)."""
    return _last_sheets_error
