# -*- coding: utf-8 -*-
"""وحدة إدارة الشقق - إضافة وعرض من ورقة Apartments"""
from flask import Blueprint, request, jsonify, session

from api.sync.google_sheets_service import get_sheets_service
from api.utils.sheets_config import SHEET_HEADERS
from api.utils.audit import log_action

apartments_bp = Blueprint('apartments', __name__, url_prefix='/api/apartments')

HEADERS = SHEET_HEADERS['Apartments']


def _next_id(sheets):
    rows = sheets.get_all_records('Apartments')
    ids = []
    for r in rows:
        try:
            ids.append(int(r.get('id') or 0))
        except (TypeError, ValueError):
            pass
    return str(max(ids, default=0) + 1)


@apartments_bp.route('', methods=['GET'])
def list_apartments():
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401
    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': True, 'apartments': [], 'source': 'none'})
    rows = sheets.apartments_all()
    return jsonify({'ok': True, 'apartments': rows, 'source': 'sheets'})


@apartments_bp.route('', methods=['POST'])
def add_apartment():
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401
    data = request.get_json() or {}
    owner_name = (data.get('owner_name') or data.get('owner_name') or '').strip()
    address = (data.get('address') or '').strip()
    zone = (data.get('zone') or '').strip()
    rent = data.get('rent')
    try:
        rent = float(rent) if rent not in (None, '') else 0
    except (TypeError, ValueError):
        rent = 0
    contract_duration = (data.get('contract_duration') or '').strip()
    payment_method = (data.get('payment_method') or '').strip()
    owner_phone = (data.get('owner_phone') or '').strip()
    rider_code = (data.get('rider_code') or '').strip()
    move_in_date = (data.get('move_in_date') or '').strip()

    if not owner_name or not address:
        return jsonify({'ok': False, 'error': 'اسم المالك والعنوان مطلوبان'}), 400

    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل'}), 503

    from datetime import datetime
    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    apt_id = _next_id(sheets)
    row = {
        'id': apt_id,
        'owner_name': owner_name,
        'address': address,
        'zone': zone,
        'rent': rent,
        'contract_duration': contract_duration,
        'payment_method': payment_method,
        'owner_phone': owner_phone,
        'rider_code': rider_code,
        'move_in_date': move_in_date,
        'created_at': now,
        'updated_at': now,
    }
    values = [row.get(h, '') for h in HEADERS]
    sheets.append_row('Apartments', values)

    log_action(
        'apartment_add',
        user_id=session.get('user_id'),
        username=session.get('username'),
        target_type='apartment',
        target_id=apt_id,
        details=f'{owner_name} - {address}',
        success=True,
        request=request,
    )
    return jsonify({'ok': True, 'message': 'تمت إضافة الشقة بنجاح', 'apartment': row}), 201
