# -*- coding: utf-8 -*-
"""
مسارات المزامنة مع Google Sheets - التحقق من الاتصال والحالة + سجل التدقيق + مزامنة كاملة
"""
import os
from flask import Blueprint, jsonify, session, request
from api.sync.google_sheets_service import get_sheets_service, get_last_sheets_error
from api.sync.bidirectional_sync import (
    GoogleSheetsBidirectionalSync,
    load_project_data,
    save_project_data,
)
from api.utils.sheets_config import SHEET_HEADER_ROW

sync_bp = Blueprint('sync', __name__, url_prefix='/api/sync')
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')


@sync_bp.route('/audit-log', methods=['GET'])
def audit_log():
    """سجل التغييرات والأنشطة (PermissionsLog) - للمسؤول أو من لديه صلاحية auditLog."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401
    perms = session.get('permissions') or {}
    if not perms.get('auditLog') and session.get('role') != 'admin':
        return jsonify({'ok': False, 'error': 'غير مصرح بعرض سجل التدقيق'}), 403
    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': True, 'entries': [], 'source': 'none'})
    try:
        rows = sheets.get_all_records('PermissionsLog')
        entries = list(reversed(rows)) if rows else []
        limit = min(int(request.args.get('limit', 500) or 500), 1000)
        return jsonify({'ok': True, 'entries': entries[:limit], 'source': 'sheets'})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@sync_bp.route('/status', methods=['GET'])
def status():
    """حالة الاتصال بـ Google Sheets."""
    svc = get_sheets_service()
    if svc is None:
        err = get_last_sheets_error()
        return jsonify({
            'ok': True,
            'connected': False,
            'message': err or 'Google Sheets غير مُعد (انظر SETUP_GOOGLE_SHEETS.md)',
            'error': err,
        })
    try:
        svc._ensure_spreadsheet()
        sheet_titles = [ws.title for ws in svc._spreadsheet.worksheets()] if svc._spreadsheet else []
        return jsonify({
            'ok': True,
            'connected': True,
            'spreadsheet_id': svc._spreadsheet_id,
            'sheets': sheet_titles,
        })
    except Exception as e:
        return jsonify({
            'ok': True,
            'connected': False,
            'error': str(e),
        })


@sync_bp.route('/sheet/<sheet_name>', methods=['GET'])
def get_sheet_data(sheet_name):
    """جلب بيانات تاب معين (للتشخيص وعرض حالة المزامنة)."""
    sheets = get_sheets_service()
    if not sheets:
        return jsonify({'ok': False, 'error': 'Google Sheets غير متصل', 'data': []}), 200
    try:
        header_row = SHEET_HEADER_ROW.get(sheet_name, 1)
        rows = sheets.get_all_records(sheet_name, header_row=header_row)
        return jsonify(rows if isinstance(rows, list) else [])
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e), 'data': []}), 200


@sync_bp.route('/full-sync', methods=['POST'])
def full_sync():
    """مزامنة كاملة: سحب من Google Sheets → المشروع، ثم حفظ محلياً. للمسؤول فقط."""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'يجب تسجيل الدخول'}), 401
    if session.get('role') != 'admin':
        return jsonify({'ok': False, 'error': 'غير مصرح (المسؤول فقط)'}), 403
    try:
        sync_system = GoogleSheetsBidirectionalSync()
        project_data = load_project_data(DATA_DIR)
        mode = (request.get_json() or {}).get('mode', 'sheets_to_project')
        if mode == 'sheets_to_project':
            project_data = sync_system.sync_from_sheets_to_project(project_data)
            save_project_data(DATA_DIR, project_data)
        elif mode == 'project_to_sheets':
            sync_system.sync_from_project_to_sheets(project_data)
        elif mode == 'bidirectional':
            synced = sync_system.bidirectional_sync(project_data)
            save_project_data(DATA_DIR, synced)
        else:
            return jsonify({'ok': False, 'error': 'وضع غير صالح (sheets_to_project | project_to_sheets | bidirectional)'}), 400
        report = sync_system.get_sync_report()
        return jsonify({'ok': True, 'message': 'تمت المزامنة', 'report': report})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500
