# -*- coding: utf-8 -*-
"""
مسارات المصادقة - تسجيل الدخول / الخروج / الجلسة
يدعم: مستخدمون (users.json) + مشرفون (Google Sheets أو data/supervisors.json)
كلمات المرور: bcrypt فقط للحفظ الجديد؛ التحقق يدعم bcrypt والهاش القديم SHA256.
"""
import os
import json
from flask import Blueprint, request, jsonify, session

from api.utils.password import check_password

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

USERS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'users.json')
SUPERVISORS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'supervisors.json')


def load_users():
    if os.path.isfile(USERS_FILE):
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def get_user_permissions(role):
    from api.config import get_admin_permissions, get_default_module_permissions
    if role == 'admin':
        return get_admin_permissions()
    return {'modules': get_default_module_permissions(role)}


def _load_supervisors_for_login():
    """جلب المشرفين للمصادقة: من Google Sheets أولاً، ثم من الملف المحلي."""
    try:
        from api.sync.google_sheets_service import get_sheets_service
        sheets = get_sheets_service()
        if sheets:
            rows = sheets.get_all_records('Supervisors')
            return [r for r in rows if (r.get('username') or r.get('code'))]
    except Exception:
        pass
    if os.path.isfile(SUPERVISORS_FILE):
        with open(SUPERVISORS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    if not username or not password:
        return jsonify({'ok': False, 'error': 'اسم المستخدم وكلمة المرور مطلوبان'}), 400

    # 1) البحث في المستخدمين (users.json)
    users = load_users()
    for u in users:
        if (u.get('username') or '').strip() == username:
            stored = u.get('password_hash') or ''
            if check_password(stored, password):
                session['user_id'] = u.get('id')
                session['username'] = u.get('username')
                session['role'] = u.get('role', 'supervisor')
                session['display_name'] = u.get('display_name') or u.get('username')
                session['zone'] = u.get('zone')
                session['supervisor_code'] = None
                perms = get_user_permissions(session['role'])
                session['permissions'] = perms
                return jsonify({
                    'ok': True,
                    'user': {
                        'id': u.get('id'),
                        'username': u.get('username'),
                        'role': session['role'],
                        'display_name': session['display_name'],
                        'zone': session.get('zone'),
                        'supervisor_code': None,
                        'permissions': perms,
                    }
                })
            break

    # 2) البحث في المشرفين (Sheets أو supervisors.json)
    supervisors = _load_supervisors_for_login()
    for s in supervisors:
        uname = (s.get('username') or '').strip()
        if uname != username:
            continue
        stored = s.get('password_hash') or ''
        if not stored:
            continue
        if check_password(stored, password):
            session['user_id'] = s.get('code') or s.get('id') or uname
            session['username'] = uname
            session['role'] = 'supervisor'
            session['display_name'] = s.get('name') or uname
            session['zone'] = s.get('zone')
            session['supervisor_code'] = s.get('code')
            perms = get_user_permissions('supervisor')
            session['permissions'] = perms
            return jsonify({
                'ok': True,
                'user': {
                    'id': session['user_id'],
                    'username': uname,
                    'role': 'supervisor',
                    'display_name': session['display_name'],
                    'zone': session.get('zone'),
                    'supervisor_code': session.get('supervisor_code'),
                    'permissions': perms,
                }
            })

    return jsonify({'ok': False, 'error': 'اسم المستخدم أو كلمة المرور غير صحيحة'}), 401


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'ok': True})


@auth_bp.route('/me', methods=['GET'])
def me():
    try:
        if 'user_id' not in session:
            return jsonify({'ok': False, 'user': None}), 401
        return jsonify({
            'ok': True,
            'user': {
                'id': session.get('user_id'),
                'username': session.get('username'),
                'role': session.get('role'),
                'display_name': session.get('display_name'),
                'zone': session.get('zone'),
                'supervisor_code': session.get('supervisor_code'),
                'permissions': session.get('permissions')
            }
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@auth_bp.route('/config', methods=['GET'])
def get_config():
    """إرجاع الإعدادات العامة (المناطق، الوحدات، الأدوار) للواجهة."""
    try:
        from api.config import config as app_config
        return jsonify({
            'ok': True,
            'zones': app_config.get('zones', []),
            'permission_modules': app_config.get('permission_modules', []),
            'roles': app_config.get('roles', {}),
            'equipment_types': app_config.get('equipment_types', []),
            'inactivity_timeout_minutes': app_config.get('session', {}).get('inactivity_timeout_minutes', 30),
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500
