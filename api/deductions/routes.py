# -*- coding: utf-8 -*-
"""
وحدة إدارة الخصومات - خصم فردي + استيراد من Excel
الربط: أعمدة Excel (كود المندوب، اسم المندوب، المبلغ، الدورات، ملاحظات، الزون) → ورقة Deductions
عند عدم اتصال Google Sheets: حفظ محلي في data/deductions.json
"""
import io
import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, session

from api.utils.sheets_config import SHEET_HEADERS, DEDUCTIONS_EXCEL_MAPPING
from api.sync.google_sheets_service import get_sheets_service

deductions_bp = Blueprint('deductions', __name__, url_prefix='/api/deductions')

DEDUCTION_HEADERS = SHEET_HEADERS['Deductions']

DEDUCTIONS_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    'data', 'deductions.json'
)


def _load_local_deductions():
    if os.path.isfile(DEDUCTIONS_FILE):
        try:
            with open(DEDUCTIONS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _save_local_deductions(rows):
    os.makedirs(os.path.dirname(DEDUCTIONS_FILE), exist_ok=True)
    with open(DEDUCTIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)


def _int(val, default=0):
    try:
        return int(val) if val not in (None, '') else default
    except (TypeError, ValueError):
        return default


def _float(val, default=0):
    try:
        return float(val) if val not in (None, '') else default
    except (TypeError, ValueError):
        return default


@deductions_bp.route('', methods=['POST'])
def add_deduction():
    """إضافة خصم فردي."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    data = request.get_json() or {}
    rider_code = (data.get('rider_code') or data.get('Rider Code') or '').strip()
    rider_name = (data.get('rider_name') or data.get('Rider Name') or '').strip()
    supervisor_code = (data.get('supervisor_code') or session.get('supervisor_code') or '').strip()
    supervisor_name = (data.get('supervisor_name') or '').strip()
    amount = _float(data.get('amount') or data.get('Amount'))
    reason = (data.get('reason') or data.get('Reason') or '').strip()
    cycle = (data.get('cycle') or data.get('Cycle') or '').strip()
    notes = (data.get('notes') or data.get('Notes') or '').strip()
    deduction_type = (data.get('deduction_type') or data.get('Deduction Type') or 'خصم').strip()

    if not rider_code or not rider_name:
        return jsonify({'ok': False, 'error': 'كود المندوب واسم المندوب مطلوبان'}), 400
    if amount <= 0:
        return jsonify({'ok': False, 'error': 'المبلغ يجب أن يكون أكبر من صفر'}), 400

    now = datetime.utcnow()
    row = {
        'Date': now.strftime('%Y-%m-%d'),
        'Time': now.strftime('%H:%M:%S'),
        'Rider Code': rider_code,
        'Rider Name': rider_name,
        'Supervisor Code': supervisor_code,
        'Supervisor Name': supervisor_name,
        'Deduction Type': deduction_type,
        'Amount': amount,
        'Reason': reason,
        'Cycle': cycle,
        'Notes': notes,
        'Added By': session.get('username') or '',
        'Actor': session.get('username') or '',
        'Operation Type': 'add',
    }

    sheets = get_sheets_service()
    if sheets:
        try:
            values = [row.get(h, '') for h in DEDUCTION_HEADERS]
            sheets.append_row('Deductions', values)
            source = 'sheets'
        except Exception as e:
            source = 'local'
            local_rows = _load_local_deductions()
            local_rows.append(row)
            _save_local_deductions(local_rows)
            message = f'تمت إضافة الخصم (محلياً - فشل Sheets: {e})'
    else:
        source = 'local'
        local_rows = _load_local_deductions()
        local_rows.append(row)
        _save_local_deductions(local_rows)
        message = 'تمت إضافة الخصم بنجاح (محفوظ محلياً - Google Sheets غير متصل).'

    if source == 'sheets':
        message = 'تمت إضافة الخصم بنجاح'
    return jsonify({
        'ok': True,
        'message': message,
        'source': source,
        'deduction': {k: v for k, v in row.items()},
    }), 201


def _parse_excel_rows(file_data, filename):
    """قراءة ملف Excel وإرجاع قائمة صفوف مخطوطة حسب DEDUCTIONS_EXCEL_MAPPING."""
    try:
        import openpyxl
    except ImportError:
        return None, 'تثبيت openpyxl مطلوب لاستيراد Excel: pip install openpyxl'

    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_data), read_only=True, data_only=True)
        ws = wb.active
        rows_iter = ws.iter_rows(values_only=True)
        header_row = next(rows_iter, None)
        if not header_row:
            return None, 'الملف فارغ أو لا يحتوي على رؤوس أعمدة'

        header_row = [str(c).strip() if c is not None else '' for c in header_row]
        excel_to_sheet = DEDUCTIONS_EXCEL_MAPPING
        col_indices = {}
        for excel_col, sheet_col in excel_to_sheet.items():
            for i, h in enumerate(header_row):
                if (h or '').strip() == (excel_col or '').strip():
                    col_indices[sheet_col] = i
                    break

        if 'Rider Code' not in col_indices or 'Amount' not in col_indices:
            return None, 'الملف يجب أن يحتوي على أعمدة: كود المندوب (أو Rider Code)، المبلغ (أو Amount)'

        now = datetime.utcnow()
        date_str = now.strftime('%Y-%m-%d')
        time_str = now.strftime('%H:%M:%S')
        added_by = session.get('username') or ''

        rows_out = []
        for row in rows_iter:
            if not row:
                continue
            row = list(row)
            rider_code = str(row[col_indices.get('Rider Code', -1)] or '').strip() if col_indices.get('Rider Code', -1) < len(row) else ''
            rider_name = str(row[col_indices.get('Rider Name', -1)] or '').strip() if col_indices.get('Rider Name', -1) < len(row) else ''
            amount = _float(row[col_indices.get('Amount', -1)]) if col_indices.get('Amount', -1) < len(row) else 0
            if not rider_code and not rider_name and amount <= 0:
                continue
            if amount <= 0:
                amount = 0
            reason = str(row[col_indices.get('Reason', -1)] or '').strip() if col_indices.get('Reason', -1) < len(row) else ''
            cycle = str(row[col_indices.get('Cycle', -1)] or '').strip() if col_indices.get('Cycle', -1) < len(row) else ''
            notes = str(row[col_indices.get('Notes', -1)] or '').strip() if col_indices.get('Notes', -1) < len(row) else ''

            rows_out.append({
                'Date': date_str,
                'Time': time_str,
                'Rider Code': rider_code,
                'Rider Name': rider_name,
                'Supervisor Code': session.get('supervisor_code') or '',
                'Supervisor Name': '',
                'Deduction Type': 'خصم',
                'Amount': amount,
                'Reason': reason,
                'Cycle': cycle,
                'Notes': notes,
                'Added By': added_by,
                'Actor': added_by,
                'Operation Type': 'import_excel',
            })
        wb.close()
        return rows_out, None
    except Exception as e:
        return None, str(e)


@deductions_bp.route('/import-excel', methods=['POST'])
def import_excel():
    """استيراد خصومات من ملف Excel. الأعمدة: كود المندوب، اسم المندوب، المبلغ، الدورات، ملاحظات، الزون."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    if 'file' not in request.files and 'excel' not in request.files:
        return jsonify({'ok': False, 'error': 'يجب رفع ملف Excel (حقل file أو excel)'}), 400

    file = request.files.get('file') or request.files.get('excel')
    if not file or not file.filename:
        return jsonify({'ok': False, 'error': 'لم يتم اختيار ملف'}), 400

    file_data = file.read()
    if not file_data:
        return jsonify({'ok': False, 'error': 'الملف فارغ'}), 400

    rows_out, err = _parse_excel_rows(file_data, file.filename)
    if err:
        return jsonify({'ok': False, 'error': err}), 400

    if not rows_out:
        return jsonify({'ok': False, 'error': 'لم يتم العثور على صفوف صالحة في الملف'}), 400

    sheets = get_sheets_service()
    if sheets:
        try:
            values_matrix = [[r.get(h, '') for h in DEDUCTION_HEADERS] for r in rows_out]
            sheets.append_rows('Deductions', values_matrix)
            return jsonify({
                'ok': True,
                'message': f'تم استيراد {len(rows_out)} خصم بنجاح',
                'imported_count': len(rows_out),
                'source': 'sheets',
            }), 201
        except Exception as e:
            pass
    local_rows = _load_local_deductions()
    local_rows.extend(rows_out)
    _save_local_deductions(local_rows)
    return jsonify({
        'ok': True,
        'message': f'تم استيراد {len(rows_out)} خصم (محفوظ محلياً - Google Sheets غير متصل)',
        'imported_count': len(rows_out),
        'source': 'local',
    }), 201


@deductions_bp.route('', methods=['GET'])
def list_deductions():
    """قائمة الخصومات مع تصفية اختيارية."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    rider_code = request.args.get('rider_code', '').strip()
    limit = request.args.get('limit', '100')
    try:
        limit = min(int(limit), 500)
    except (TypeError, ValueError):
        limit = 100

    sheets = get_sheets_service()
    if sheets:
        try:
            rows = sheets.get_all_records('Deductions')
            if rider_code:
                rows = [r for r in rows if (r.get('Rider Code') or '').strip() == rider_code]
            rows = rows[-limit:]
            return jsonify({'ok': True, 'deductions': rows, 'source': 'sheets'})
        except Exception:
            pass
    rows = _load_local_deductions()
    if rider_code:
        rows = [r for r in rows if (r.get('Rider Code') or '').strip() == rider_code]
    rows = rows[-limit:]
    return jsonify({'ok': True, 'deductions': rows, 'source': 'local'})
