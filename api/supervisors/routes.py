# -*- coding: utf-8 -*-
"""
مسارات إدارة المشرفين - إضافة وعرض مع الربط بـ Google Sheets و Supabase
"""
import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify

from api.utils.sheets_config import (
    SHEET_HEADERS,
    SHEET_HEADER_ROW,
    SUPERVISORS_HEADER_ALIASES,
    SUPERVISORS_SHEET_WRITE_COLUMNS,
    SUPERVISORS_INTERNAL_TO_SHEET,
)
from api.utils.password import hash_password
from api.sync.google_sheets_service import get_sheets_service
from api.utils.supabase_service import is_configured as supabase_configured, insert_supervisor as supabase_insert_supervisor

supervisors_bp = Blueprint('supervisors', __name__, url_prefix='/api/supervisors')

SUPERVISORS_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    'data', 'supervisors.json'
)


def _load_local_supervisors():
    if os.path.isfile(SUPERVISORS_FILE):
        with open(SUPERVISORS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def _save_local_supervisors(data):
    os.makedirs(os.path.dirname(SUPERVISORS_FILE), exist_ok=True)
    with open(SUPERVISORS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _normalize_supervisor_dict(d):
    """تحويل قاموس برؤوس عربية أو إنجليزية إلى رؤوس إنجليزية موحدة."""
    out = {}
    for key, value in d.items():
        key_str = (key or '').strip()
        en_key = SUPERVISORS_HEADER_ALIASES.get(key_str) or SUPERVISORS_HEADER_ALIASES.get(key_str.replace(' ', ''))
        if en_key:
            out[en_key] = value
        elif key_str in SHEET_HEADERS.get('Supervisors', []):
            out[key_str] = value
    return out


def _row_to_supervisor(row):
    """تحويل صف من Sheets أو قاموس إلى شكل موحد (بدون كلمة المرور)."""
    if isinstance(row, dict):
        d = _normalize_supervisor_dict(row)
        if not d:
            d = dict(row)
    else:
        headers = SHEET_HEADERS['Supervisors']
        d = dict(zip(headers, row)) if len(row) >= len(headers) else {}
    d.pop('password_hash', None)
    for k in ('pouch_motorcycle', 'pouch_bicycle', 'tshirt', 'jacket', 'helmet'):
        try:
            d[k] = int(d.get(k) or 0)
        except (TypeError, ValueError):
            d[k] = 0
    return d


@supervisors_bp.route('', methods=['GET'])
def list_supervisors():
    """جلب قائمة المشرفين من Google Sheets أو من الملف المحلي."""
    sheets = get_sheets_service()
    if sheets:
        try:
            header_row = SHEET_HEADER_ROW.get('Supervisors', 1)
            rows = sheets.get_all_records('Supervisors', header_row=header_row)
            out = []
            for r in rows:
                nr = _row_to_supervisor(r)
                if not nr.get('code') and not nr.get('name'):
                    continue
                out.append(nr)
            return jsonify({'ok': True, 'supervisors': out, 'source': 'sheets'})
        except Exception as e:
            return jsonify({'ok': False, 'error': str(e)}), 500
    local = _load_local_supervisors()
    return jsonify({'ok': True, 'supervisors': [_row_to_supervisor(s) for s in local], 'source': 'local'})


REQUIRED_FIELDS = [
    'code', 'name', 'phone', 'zone', 'email',
    'job_title', 'start_date', 'base_salary', 'work_hours', 'daily_rate',
    'card_number', 'emergency_contact', 'company_line', 'bank_client_number', 'bank_account',
    'username', 'password',
]


@supervisors_bp.route('', methods=['POST'])
def add_supervisor():
    """إضافة مشرف جديد - حفظ في Google Sheets و/أو Supabase والملف المحلي."""
    data = request.get_json() or {}
    code = (data.get('code') or '').strip()
    name = (data.get('name') or '').strip()
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not code or not name:
        return jsonify({'ok': False, 'error': 'كود المشرف والاسم مطلوبان'}), 400
    if not username:
        return jsonify({'ok': False, 'error': 'اسم المستخدم مطلوب'}), 400
    if not password or len(password) < 4:
        return jsonify({'ok': False, 'error': 'كلمة المرور مطلوبة (4 أحرف على الأقل)'}), 400

    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    row = {
        'code': code,
        'name': name,
        'phone': (data.get('phone') or '').strip(),
        'zone': (data.get('zone') or '').strip(),
        'email': (data.get('email') or '').strip(),
        'job_title': (data.get('job_title') or '').strip(),
        'start_date': (data.get('start_date') or '').strip(),
        'base_salary': (data.get('base_salary') or '').strip(),
        'work_hours': (data.get('work_hours') or '').strip(),
        'daily_rate': (data.get('daily_rate') or '').strip(),
        'card_number': (data.get('card_number') or '').strip(),
        'emergency_contact': (data.get('emergency_contact') or '').strip(),
        'company_line': (data.get('company_line') or '').strip(),
        'bank_client_number': (data.get('bank_client_number') or '').strip(),
        'bank_account': (data.get('bank_account') or '').strip(),
        'username': username,
        'password_hash': hash_password(password),
        'pouch_motorcycle': int(data.get('pouch_motorcycle') or 0),
        'pouch_bicycle': int(data.get('pouch_bicycle') or 0),
        'tshirt': int(data.get('tshirt') or 0),
        'jacket': int(data.get('jacket') or 0),
        'helmet': int(data.get('helmet') or 0),
        'created_at': now,
        'updated_at': now,
        'notes': (data.get('notes') or '').strip(),
    }

    # 1) Google Sheets (مزامنة ثنائية: نفس ترتيب أعمدة الشيت)
    sheets = get_sheets_service()
    if sheets:
        try:
            internal_for_sheet = {v: k for k, v in SUPERVISORS_INTERNAL_TO_SHEET.items()}
            values = []
            for col in SUPERVISORS_SHEET_WRITE_COLUMNS:
                key = internal_for_sheet.get(col, '')
                val = row.get(key, '')
                values.append(val if val is not None else '')
            sheets.append_row('Supervisors', values)
        except Exception as e:
            return jsonify({'ok': False, 'error': f'فشل الحفظ في Google Sheets: {e}'}), 500

    # 2) Supabase (اختياري)
    if supabase_configured():
        try:
            supabase_insert_supervisor({k: v for k, v in row.items() if k != 'password_hash'})
        except Exception:
            pass

    # 3) ملف محلي (للنسخ الاحتياطي أو عند عدم وجود Sheets)
    local = _load_local_supervisors()
    saved_source = 'sheets' if sheets else 'local'
    if not sheets:
        local.append(row)
        _save_local_supervisors(local)
    else:
        local.append(row)
        _save_local_supervisors(local)

    message = 'تمت إضافة المشرف بنجاح.'
    if saved_source == 'local':
        message = 'تمت إضافة المشرف بنجاح (محفوظ محلياً - Google Sheets غير متصل).'
    return jsonify({
        'ok': True,
        'message': message,
        'source': saved_source,
        'supervisor': _row_to_supervisor(row),
    }), 201
