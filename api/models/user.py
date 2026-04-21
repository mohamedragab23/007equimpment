# -*- coding: utf-8 -*-
"""
نموذج المستخدم - نظام إدارة مخزون معدات طلبات - وكالة 007
"""


def user_to_dict(u):
    """تحويل مستخدم إلى قاموس (بدون كلمة المرور)."""
    if not u:
        return None
    d = dict(u)
    d.pop('password', None)
    return d


def get_default_permissions(role):
    """صلاحيات افتراضية حسب الدور (يُستورد من config إن وُجد)."""
    from api.config import get_default_module_permissions, get_admin_permissions
    if role == 'admin':
        return get_admin_permissions()
    return {'modules': get_default_module_permissions(role)}


def hash_password(plain: str) -> str:
    """تجزئة كلمة المرور (بسيط للتطوير - استخدم bcrypt في الإنتاج)."""
    import hashlib
    return hashlib.sha256(plain.encode('utf-8')).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed
