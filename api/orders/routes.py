# -*- coding: utf-8 -*-
"""
وحدة الطلبيات - إنشاء طلبية من المشرف، موافقة/رفض من مدير المخازن، تحديث مخزون المشرف عند الموافقة
"""
from datetime import datetime
from flask import Blueprint, request, jsonify, session

from api.utils.sheets_config import SHEET_HEADERS
from api.sync.google_sheets_service import get_sheets_service

orders_bp = Blueprint('orders', __name__, url_prefix='/api/orders')


def _int(val, default=0):
    try:
        return int(val) if val not in (None, '') else default
    except (TypeError, ValueError):
        return default


@orders_bp.route('', methods=['POST'])
def create_order():
    """إنشاء طلبية جديدة من المشرف (معلقة حتى موافقة مدير المخازن)."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    data = request.get_json() or {}
    supervisor_code = (data.get('supervisor_code') or session.get('supervisor_code') or '').strip()
    zone = (data.get('zone') or '').strip()
    notes = (data.get('notes') or '').strip()
    priority = (data.get('priority') or 'عادي').strip()

    pouch_m = _int(data.get('pouch_motorcycle'))
    pouch_b = _int(data.get('pouch_bicycle'))
    tshirt = _int(data.get('tshirt'))
    jacket = _int(data.get('jacket'))
    helmet = _int(data.get('helmet'))

    if pouch_m + pouch_b + tshirt + jacket + helmet == 0:
        return jsonify({'ok': False, 'error': 'يجب تحديد كمية واحدة على الأقل'}), 400
    if not supervisor_code:
        return jsonify({'ok': False, 'error': 'كود المشرف مطلوب أو يجب الدخول كمشرف'}), 400

    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل'}), 503

    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    order_id = f'order_{datetime.utcnow().strftime("%Y%m%d%H%M%S")}_{supervisor_code}'
    row = {
        'id': order_id,
        'type': 'order',
        'supervisor_code': supervisor_code,
        'zone': zone,
        'status': 'pending',
        'rider_code': '',
        'rider_name': '',
        'vehicle_type': '',
        'pouch_motorcycle': pouch_m,
        'pouch_bicycle': pouch_b,
        'tshirt': tshirt,
        'jacket': jacket,
        'helmet': helmet,
        'photo_url': '',
        'priority': priority,
        'created_at': now,
        'approved_at': '',
        'approved_by': '',
        'notes': notes,
    }
    headers = SHEET_HEADERS['Orders']
    values = [row.get(h, '') for h in headers]
    sheets.append_row('Orders', values)

    return jsonify({
        'ok': True,
        'message': 'تم إنشاء الطلبية. بانتظار موافقة مدير المخازن.',
        'order_id': order_id,
    }), 201


@orders_bp.route('', methods=['GET'])
def list_orders():
    """قائمة الطلبيات (نوع order فقط)."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    status_filter = request.args.get('status', '')
    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': True, 'orders': [], 'source': 'none'})

    rows = sheets.get_all_records('Orders')
    orders_list = [r for r in rows if (r.get('type') or '').strip() == 'order']
    if status_filter:
        orders_list = [r for r in orders_list if (r.get('status') or '').strip() == status_filter]
    return jsonify({'ok': True, 'orders': orders_list, 'source': 'sheets'})


@orders_bp.route('/<order_id>/approve', methods=['POST'])
def approve_order(order_id):
    """موافقة مدير المخازن: إضافة الكميات لمخزون المشرف وتحديث الحالة."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401
    if session.get('role') not in ('admin', 'warehouse_manager'):
        return jsonify({'ok': False, 'error': 'الموافقة على الطلبيات لمدير المخازن أو المسؤول فقط'}), 403

    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل'}), 503

    headers = SHEET_HEADERS['Orders']
    ws = sheets._sheet('Orders')
    all_rows = ws.get_all_values()
    if len(all_rows) < 2:
        return jsonify({'ok': False, 'error': 'لا توجد طلبيات'}), 404

    id_col = headers.index('id') if 'id' in headers else 0
    status_col_idx = headers.index('status') if 'status' in headers else 4
    supervisor_col = headers.index('supervisor_code') if 'supervisor_code' in headers else 2
    inv_cols = ['pouch_motorcycle', 'pouch_bicycle', 'tshirt', 'jacket', 'helmet']
    col_indices = {k: headers.index(k) for k in inv_cols if k in headers}

    row_index = None
    amounts = {}
    supervisor_code = None
    for i in range(1, len(all_rows)):
        if (all_rows[i][id_col] or '').strip() == (order_id or '').strip():
            row_index = i + 1
            current_status = (all_rows[i][status_col_idx] or '').strip()
            if current_status == 'approved':
                return jsonify({'ok': False, 'error': 'تمت الموافقة على هذه الطلبية مسبقاً'}), 400
            if current_status == 'rejected':
                return jsonify({'ok': False, 'error': 'الطلبية مرفوضة ولا يمكن الموافقة عليها'}), 400
            supervisor_code = (all_rows[i][supervisor_col] or '').strip()
            for k, ci in col_indices.items():
                try:
                    amounts[k] = int(all_rows[i][ci] or 0)
                except (TypeError, ValueError):
                    amounts[k] = 0
            break

    if row_index is None or not supervisor_code:
        return jsonify({'ok': False, 'error': 'الطلبية غير موجودة'}), 404

    ok, err = sheets.add_supervisor_inventory(supervisor_code, amounts)
    if not ok:
        return jsonify({'ok': False, 'error': err}), 400

    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    ws.update_cell(row_index, status_col_idx + 1, 'approved')
    approved_by_col = headers.index('approved_by') + 1 if 'approved_by' in headers else None
    approved_at_col = headers.index('approved_at') + 1 if 'approved_at' in headers else None
    if approved_by_col:
        ws.update_cell(row_index, approved_by_col, session.get('username') or '')
    if approved_at_col:
        ws.update_cell(row_index, approved_at_col, now)

    return jsonify({
        'ok': True,
        'message': 'تمت الموافقة على الطلبية وتمت إضافة المعدات لمخزون المشرف.',
    })


@orders_bp.route('/<order_id>/reject', methods=['POST'])
def reject_order(order_id):
    """رفض الطلبية من مدير المخازن."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401
    if session.get('role') not in ('admin', 'warehouse_manager'):
        return jsonify({'ok': False, 'error': 'رفض الطلبيات لمدير المخازن أو المسؤول فقط'}), 403

    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل'}), 503

    headers = SHEET_HEADERS['Orders']
    ws = sheets._sheet('Orders')
    all_rows = ws.get_all_values()
    if len(all_rows) < 2:
        return jsonify({'ok': False, 'error': 'لا توجد طلبيات'}), 404

    id_col = headers.index('id') if 'id' in headers else 0
    status_col_idx = headers.index('status') if 'status' in headers else 4
    row_index = None
    for i in range(1, len(all_rows)):
        if (all_rows[i][id_col] or '').strip() == (order_id or '').strip():
            row_index = i + 1
            current = (all_rows[i][status_col_idx] or '').strip()
            if current == 'rejected':
                return jsonify({'ok': False, 'error': 'الطلبية مرفوضة مسبقاً'}), 400
            if current == 'approved':
                return jsonify({'ok': False, 'error': 'لا يمكن رفض طلبية تمت الموافقة عليها'}), 400
            break

    if row_index is None:
        return jsonify({'ok': False, 'error': 'الطلبية غير موجودة'}), 404

    ws.update_cell(row_index, status_col_idx + 1, 'rejected')
    return jsonify({'ok': True, 'message': 'تم رفض الطلبية.'})
