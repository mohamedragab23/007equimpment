# -*- coding: utf-8 -*-
"""
وحدة تسليم المعدات واسترداد المعدات - رفع صورة إلزامي، خصم/إضافة مخزون المشرف، حفظ في Orders
"""
import os
from datetime import datetime
from flask import Blueprint, request, jsonify, session

from api.utils.sheets_config import SHEET_HEADERS
from api.sync.google_sheets_service import get_sheets_service
from api.utils.supabase_service import upload_image as supabase_upload_image
from api.utils.audit import log_action

equipment_bp = Blueprint('equipment', __name__, url_prefix='/api/equipment')


def _int(val, default=0):
    try:
        return int(val) if val not in (None, '') else default
    except (TypeError, ValueError):
        return default


@equipment_bp.route('/deliver', methods=['POST'])
def deliver():
    """
    تسليم معدات للطيار.
    متطلبات: rider_code, rider_name, zone, vehicle_type, أعداد المعدات، صورة إلزامية.
    """
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    # دعم multipart/form-data و JSON (للصور نستخدم form فقط)
    if request.is_json:
        data = request.get_json() or {}
        photo_url = (data.get('photo_url') or '').strip()
        if not photo_url:
            return jsonify({'ok': False, 'error': 'يجب رفع صورة الطيار بالمعدات أو إرسال رابط الصورة'}), 400
    else:
        data = request.form.to_dict()
        files = request.files
        photo_url = (data.get('photo_url') or '').strip()

        if 'delivery_photo' in files and files['delivery_photo'].filename:
            photo = files['delivery_photo']
            file_data = photo.read()
            content_type = photo.content_type or 'image/jpeg'
            supervisor_code = data.get('supervisor_code') or session.get('supervisor_code') or 'unknown'
            rider_code = (data.get('rider_code') or 'unknown').strip()
            ts = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            path = f'equipment_delivery/{supervisor_code}/{rider_code}_{ts}.jpg'
            url = supabase_upload_image(file_data, content_type, path)
            if url:
                photo_url = url
            else:
                # حفظ محلي عند عدم وجود Supabase
                uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads', 'equipment_delivery')
                os.makedirs(os.path.join(uploads_dir, supervisor_code), exist_ok=True)
                ext = 'jpg' if 'jpeg' in content_type or 'jpg' in content_type else 'png'
                local_path = os.path.join(uploads_dir, supervisor_code, f'{rider_code}_{ts}.{ext}')
                with open(local_path, 'wb') as f:
                    f.write(file_data)
                photo_url = f'/uploads/equipment_delivery/{supervisor_code}/{rider_code}_{ts}.{ext}'
        if not photo_url:
            return jsonify({'ok': False, 'error': 'يجب رفع صورة الطيار بالمعدات (إلزامي)'}), 400

    rider_code = (data.get('rider_code') or '').strip()
    rider_name = (data.get('rider_name') or '').strip()
    zone = (data.get('zone') or '').strip()
    vehicle_type = (data.get('vehicle_type') or 'دراجة نارية').strip()
    supervisor_code = (data.get('supervisor_code') or session.get('supervisor_code') or '').strip()

    if not rider_code or not rider_name:
        return jsonify({'ok': False, 'error': 'كود الطيار واسم الطيار مطلوبان'}), 400
    if not supervisor_code:
        return jsonify({'ok': False, 'error': 'كود المشرف مطلوب أو يجب الدخول كمشرف'}), 400

    pouch_m = _int(data.get('pouch_motorcycle'))
    pouch_b = _int(data.get('pouch_bicycle'))
    tshirt = _int(data.get('tshirt'))
    jacket = _int(data.get('jacket'))
    helmet = _int(data.get('helmet'))

    if pouch_m + pouch_b + tshirt + jacket + helmet == 0:
        return jsonify({'ok': False, 'error': 'يجب تحديد كمية واحدة على الأقل من المعدات'}), 400

    amounts = {
        'pouch_motorcycle': pouch_m,
        'pouch_bicycle': pouch_b,
        'tshirt': tshirt,
        'jacket': jacket,
        'helmet': helmet,
    }

    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل. لا يمكن تنفيذ التسليم.'}), 503

    supervisor = sheets.get_supervisor_by_code(supervisor_code)
    if not supervisor:
        return jsonify({'ok': False, 'error': 'المشرف غير موجود'}), 404

    ok, err = sheets.deduct_supervisor_inventory(supervisor_code, amounts)
    if not ok:
        return jsonify({'ok': False, 'error': err}), 400

    if zone:
        ok_zone, err_zone = sheets.deduct_zone_inventory(zone, amounts)
        if not ok_zone:
            sheets.add_supervisor_inventory(supervisor_code, amounts)
            return jsonify({'ok': False, 'error': err_zone}), 400

    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    order_row = {
        'id': f'delivery_{datetime.utcnow().strftime("%Y%m%d%H%M%S")}_{rider_code}',
        'type': 'delivery',
        'supervisor_code': supervisor_code,
        'zone': zone,
        'status': 'delivered',
        'rider_code': rider_code,
        'rider_name': rider_name,
        'vehicle_type': vehicle_type,
        'pouch_motorcycle': pouch_m,
        'pouch_bicycle': pouch_b,
        'tshirt': tshirt,
        'jacket': jacket,
        'helmet': helmet,
        'photo_url': photo_url,
        'priority': '',
        'created_at': now,
        'approved_at': now,
        'approved_by': session.get('username') or supervisor_code,
        'notes': (data.get('notes') or '').strip(),
    }
    headers = SHEET_HEADERS['Orders']
    values = [order_row.get(h, '') for h in headers]
    sheets.append_row('Orders', values)

    log_action(
        'equipment_deliver',
        user_id=session.get('user_id'),
        username=session.get('username'),
        target_type='rider',
        target_id=rider_code,
        details=f'تسليم معدات لـ {rider_name} | المنطقة: {zone} | المشرف: {supervisor_code}',
        success=True,
        request=request,
    )

    return jsonify({
        'ok': True,
        'message': 'تم تسليم المعدات بنجاح',
        'delivery': {k: v for k, v in order_row.items() if k != 'photo_url'},
    }), 201


# ---- استرداد المعدات (مع موافقة مدير المخازن) ----

@equipment_bp.route('/return', methods=['POST'])
def create_return():
    """إنشاء طلب استرداد معدات من الطيار. يُحفظ بحالة pending حتى موافقة مدير المخازن."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    data = request.get_json() or request.form.to_dict() or {}
    rider_code = (data.get('rider_code') or '').strip()
    rider_name = (data.get('rider_name') or '').strip()
    zone = (data.get('zone') or '').strip()
    supervisor_code = (data.get('supervisor_code') or session.get('supervisor_code') or '').strip()
    return_reason = (data.get('return_reason') or '').strip()

    pouch_m = _int(data.get('pouch_motorcycle'))
    pouch_b = _int(data.get('pouch_bicycle'))
    tshirt = _int(data.get('tshirt'))
    jacket = _int(data.get('jacket'))
    helmet = _int(data.get('helmet'))

    if pouch_m + pouch_b + tshirt + jacket + helmet == 0:
        return jsonify({'ok': False, 'error': 'يجب تحديد كمية واحدة على الأقل من المعدات المستردة'}), 400
    if not rider_code or not rider_name:
        return jsonify({'ok': False, 'error': 'كود الطيار واسم الطيار مطلوبان'}), 400
    if not supervisor_code:
        return jsonify({'ok': False, 'error': 'كود المشرف مطلوب أو يجب الدخول كمشرف'}), 400

    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل'}), 503

    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    return_id = f'return_{datetime.utcnow().strftime("%Y%m%d%H%M%S")}_{rider_code}'
    row = {
        'id': return_id,
        'type': 'return',
        'supervisor_code': supervisor_code,
        'zone': zone,
        'status': 'pending',
        'rider_code': rider_code,
        'rider_name': rider_name,
        'vehicle_type': (data.get('vehicle_type') or '').strip(),
        'pouch_motorcycle': pouch_m,
        'pouch_bicycle': pouch_b,
        'tshirt': tshirt,
        'jacket': jacket,
        'helmet': helmet,
        'photo_url': '',
        'priority': '',
        'created_at': now,
        'approved_at': '',
        'approved_by': '',
        'notes': return_reason,
    }
    headers = SHEET_HEADERS['Orders']
    values = [row.get(h, '') for h in headers]
    sheets.append_row('Orders', values)

    return jsonify({
        'ok': True,
        'message': 'تم تسجيل طلب الاسترداد. بانتظار موافقة مدير المخازن.',
        'return_id': return_id,
    }), 201


@equipment_bp.route('/returns', methods=['GET'])
def list_returns():
    """قائمة طلبات الاسترداد (pending أو كلها)."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    status_filter = request.args.get('status', 'pending')
    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': True, 'returns': [], 'source': 'none'})

    rows = sheets.get_all_records('Orders')
    returns_list = [r for r in rows if (r.get('type') or '').strip() == 'return']
    if status_filter:
        returns_list = [r for r in returns_list if (r.get('status') or '').strip() == status_filter]
    return jsonify({'ok': True, 'returns': returns_list, 'source': 'sheets'})


@equipment_bp.route('/return/<return_id>/approve', methods=['POST'])
def approve_return(return_id):
    """موافقة مدير المخازن على استرداد المعدات: إضافة الكميات لمخزون المشرف وتحديث الحالة."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    role = session.get('role')
    if role not in ('admin', 'warehouse_manager'):
        return jsonify({'ok': False, 'error': 'الموافقة على الاسترداد للمسؤول أو مدير المخازن فقط'}), 403

    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل'}), 503

    headers = SHEET_HEADERS['Orders']
    ws = sheets._sheet('Orders')
    all_rows = ws.get_all_values()
    if len(all_rows) < 2:
        return jsonify({'ok': False, 'error': 'لا توجد طلبات'}), 404

    id_col = headers.index('id') if 'id' in headers else 0
    status_col = headers.index('status') if 'status' in headers else 4
    supervisor_col = headers.index('supervisor_code') if 'supervisor_code' in headers else 2
    inv_cols = ['pouch_motorcycle', 'pouch_bicycle', 'tshirt', 'jacket', 'helmet']
    col_indices = {k: headers.index(k) for k in inv_cols if k in headers}

    row_index = None
    amounts = {}
    supervisor_code = None
    for i in range(1, len(all_rows)):
        if (all_rows[i][id_col] or '').strip() == (return_id or '').strip():
            row_index = i + 1
            supervisor_code = (all_rows[i][supervisor_col] or '').strip()
            for k, ci in col_indices.items():
                try:
                    amounts[k] = int(all_rows[i][ci] or 0)
                except (TypeError, ValueError):
                    amounts[k] = 0
            break

    if row_index is None or not supervisor_code:
        return jsonify({'ok': False, 'error': 'طلب الاسترداد غير موجود'}), 404

    current_status = ws.cell(row_index, status_col + 1).value
    if (current_status or '').strip() == 'approved':
        return jsonify({'ok': False, 'error': 'تمت الموافقة على هذا الطلب مسبقاً'}), 400

    ok, err = sheets.add_supervisor_inventory(supervisor_code, amounts)
    if not ok:
        return jsonify({'ok': False, 'error': err}), 400

    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    ws.update_cell(row_index, status_col + 1, 'approved')
    approved_by_col = headers.index('approved_by') + 1 if 'approved_by' in headers else None
    approved_at_col = headers.index('approved_at') + 1 if 'approved_at' in headers else None
    if approved_by_col:
        ws.update_cell(row_index, approved_by_col, session.get('username') or '')
    if approved_at_col:
        ws.update_cell(row_index, approved_at_col, now)

    return jsonify({
        'ok': True,
        'message': 'تمت الموافقة على الاسترداد وتمت إضافة المعدات لمخزون المشرف.',
    })


# ---- تبديل الصناديق (طلب + صورة + موافقة مدير المخازن) ----

EXCHANGE_HEADERS = [
    'id', 'rider_code', 'rider_name', 'zone', 'old_pouch_details', 'reason',
    'photo_url', 'status', 'requested_at', 'approved_at', 'approved_by', 'new_pouch_details'
]


@equipment_bp.route('/exchange', methods=['POST'])
def create_exchange():
    """إنشاء طلب تبديل صناديق. صورة إلزامية."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    if request.is_json:
        data = request.get_json() or {}
        photo_url = (data.get('photo_url') or '').strip()
        if not photo_url:
            return jsonify({'ok': False, 'error': 'يجب رفع صورة أو إرسال رابط الصورة'}), 400
    else:
        data = request.form.to_dict()
        files = request.files
        photo_url = (data.get('photo_url') or '').strip()
        if 'exchange_photo' in files and files['exchange_photo'].filename:
            photo = files['exchange_photo']
            file_data = photo.read()
            content_type = photo.content_type or 'image/jpeg'
            rider_code = (data.get('rider_code') or 'unknown').strip()
            ts = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            path = f'equipment_exchange/{rider_code}_{ts}.jpg'
            url = supabase_upload_image(file_data, content_type, path)
            if url:
                photo_url = url
            else:
                uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads', 'equipment_exchange')
                os.makedirs(uploads_dir, exist_ok=True)
                ext = 'jpg' if 'jpeg' in (content_type or '') or 'jpg' in (content_type or '') else 'png'
                local_path = os.path.join(uploads_dir, f'{rider_code}_{ts}.{ext}')
                with open(local_path, 'wb') as f:
                    f.write(file_data)
                photo_url = f'/uploads/equipment_exchange/{rider_code}_{ts}.{ext}'
        if not photo_url:
            return jsonify({'ok': False, 'error': 'يجب رفع صورة الطلب (إلزامي)'}), 400

    rider_code = (data.get('rider_code') or '').strip()
    rider_name = (data.get('rider_name') or '').strip()
    zone = (data.get('zone') or '').strip()
    old_pouch_details = (data.get('old_pouch_details') or '').strip()
    reason = (data.get('reason') or '').strip()

    if not rider_code or not rider_name:
        return jsonify({'ok': False, 'error': 'كود الطيار واسم الطيار مطلوبان'}), 400

    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل'}), 503

    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    exchange_id = f'exchange_{datetime.utcnow().strftime("%Y%m%d%H%M%S")}_{rider_code}'
    row = {
        'id': exchange_id,
        'rider_code': rider_code,
        'rider_name': rider_name,
        'zone': zone,
        'old_pouch_details': old_pouch_details,
        'reason': reason,
        'photo_url': photo_url,
        'status': 'pending',
        'requested_at': now,
        'approved_at': '',
        'approved_by': '',
        'new_pouch_details': (data.get('new_pouch_details') or '').strip(),
    }
    values = [row.get(h, '') for h in EXCHANGE_HEADERS]
    sheets.append_rows('EquipmentExchange', [values])

    return jsonify({
        'ok': True,
        'message': 'تم تسجيل طلب التبديل. بانتظار موافقة مدير المخازن.',
        'exchange_id': exchange_id,
    }), 201


@equipment_bp.route('/exchanges', methods=['GET'])
def list_exchanges():
    """قائمة طلبات تبديل الصناديق."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401

    status_filter = request.args.get('status', 'pending')
    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': True, 'exchanges': [], 'source': 'none'})

    rows = sheets.get_all_records('EquipmentExchange')
    if status_filter:
        rows = [r for r in rows if (r.get('status') or '').strip() == status_filter]
    return jsonify({'ok': True, 'exchanges': rows, 'source': 'sheets'})


@equipment_bp.route('/exchange/<exchange_id>/approve', methods=['POST'])
def approve_exchange(exchange_id):
    """موافقة مدير المخازن على طلب التبديل."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401
    if session.get('role') not in ('admin', 'warehouse_manager'):
        return jsonify({'ok': False, 'error': 'الموافقة لمدير المخازن أو المسؤول فقط'}), 403

    data = request.get_json() or {}
    new_pouch_details = (data.get('new_pouch_details') or '').strip()

    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل'}), 503

    ws = sheets._sheet('EquipmentExchange')
    all_rows = ws.get_all_values()
    if len(all_rows) < 2:
        return jsonify({'ok': False, 'error': 'لا توجد طلبات'}), 404

    id_col = 0
    status_col = EXCHANGE_HEADERS.index('status') if 'status' in EXCHANGE_HEADERS else 7
    new_col = EXCHANGE_HEADERS.index('new_pouch_details') if 'new_pouch_details' in EXCHANGE_HEADERS else 11
    approved_by_col = EXCHANGE_HEADERS.index('approved_by') + 1 if 'approved_by' in EXCHANGE_HEADERS else None
    approved_at_col = EXCHANGE_HEADERS.index('approved_at') + 1 if 'approved_at' in EXCHANGE_HEADERS else None

    row_index = None
    for i in range(1, len(all_rows)):
        if (all_rows[i][id_col] or '').strip() == (exchange_id or '').strip():
            row_index = i + 1
            current = (all_rows[i][status_col] or '').strip()
            if current == 'approved':
                return jsonify({'ok': False, 'error': 'تمت الموافقة مسبقاً'}), 400
            break

    if row_index is None:
        return jsonify({'ok': False, 'error': 'طلب التبديل غير موجود'}), 404

    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    ws.update_cell(row_index, status_col + 1, 'approved')
    if new_pouch_details and new_col is not None:
        ws.update_cell(row_index, new_col + 1, new_pouch_details)
    if approved_by_col:
        ws.update_cell(row_index, approved_by_col, session.get('username') or '')
    if approved_at_col:
        ws.update_cell(row_index, approved_at_col, now)

    return jsonify({'ok': True, 'message': 'تمت الموافقة على طلب التبديل.'})
