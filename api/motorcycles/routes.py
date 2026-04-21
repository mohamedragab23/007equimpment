# -*- coding: utf-8 -*-
"""وحدة إدارة الموتوسيكلات - إضافة وعرض من ورقة Motorcycles"""
from flask import Blueprint, request, jsonify, session

from api.sync.google_sheets_service import get_sheets_service
from api.utils.sheets_config import SHEET_HEADERS
from api.utils.audit import log_action

motorcycles_bp = Blueprint('motorcycles', __name__, url_prefix='/api/motorcycles')

HEADERS = SHEET_HEADERS['Motorcycles']


def _next_id(sheets):
    rows = sheets.get_all_records('Motorcycles')
    ids = []
    for r in rows:
        try:
            ids.append(int(r.get('id') or 0))
        except (TypeError, ValueError):
            pass
    return str(max(ids, default=0) + 1)


@motorcycles_bp.route('', methods=['GET'])
def list_motorcycles():
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401
    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': True, 'motorcycles': [], 'source': 'none'})
    rows = sheets.motorcycles_all()
    return jsonify({'ok': True, 'motorcycles': rows, 'source': 'sheets'})


@motorcycles_bp.route('', methods=['POST'])
def add_motorcycle():
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401
    data = request.get_json() or {}
    license_plate = (data.get('license_plate') or '').strip()
    rental_price = data.get('rental_price')
    try:
        rental_price = float(rental_price) if rental_price not in (None, '') else 0
    except (TypeError, ValueError):
        rental_price = 0
    model = (data.get('model') or '').strip()
    year = (data.get('year') or '').strip()
    rider_code = (data.get('rider_code') or '').strip()
    start_date = (data.get('start_date') or '').strip()
    end_date = (data.get('end_date') or '').strip()

    if not license_plate:
        return jsonify({'ok': False, 'error': 'رقم اللوحة مطلوب'}), 400

    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل'}), 503

    from datetime import datetime
    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    m_id = _next_id(sheets)
    row = {
        'id': m_id,
        'license_plate': license_plate,
        'rental_price': rental_price,
        'model': model,
        'year': year,
        'rider_code': rider_code,
        'start_date': start_date,
        'end_date': end_date,
        'created_at': now,
        'updated_at': now,
    }
    values = [row.get(h, '') for h in HEADERS]
    sheets.append_row('Motorcycles', values)

    log_action(
        'motorcycle_add',
        user_id=session.get('user_id'),
        username=session.get('username'),
        target_type='motorcycle',
        target_id=m_id,
        details=f'{license_plate} - {model}',
        success=True,
        request=request,
    )
    return jsonify({'ok': True, 'message': 'تمت إضافة الموتوسيكل بنجاح', 'motorcycle': row}), 201
