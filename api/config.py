# -*- coding: utf-8 -*-
"""
إعدادات نظام إدارة مخزون معدات طلبات - وكالة 007
"""

config = {
    'zones': [
        'القاهرة',
        'الإسكندرية',
        'أسيوط',
        'بورسعيد',
        'المنيا',
        'الغردقة',
        'دمنهور',
        'المحلة',
        'المنصورة'
    ],

    'equipment_types': [
        'باوتش دراجة نارية',
        'باوتش دراجة هوائية',
        'تيشرت',
        'جاكيت',
        'خوذه'
    ],

    'permission_modules': [
        'تسليم المعدات',
        'استرداد المعدات',
        'مخزون المشرف',
        'إدارة الخصومات',
        'الطلبيات',
        'تبديل الصناديق',
        'إثبات التسليم',
        'المخزون الرئيسي',
        'مخزون الزونات',
        'طلبات الاسترداد',
        'طلبات التبديل',
        'الحوافز',
        'إدارة الشقق',
        'إدارة الموتوسيكلات',
        'إدارة المشرفين والمناديب',  # الوحدة الحالية البسيطة
        'سجل التغييرات والأنشطة',
        'إدارة الصلاحيات'
    ],

    'roles': {
        'admin': 'المسؤول',
        'warehouse_manager': 'مدير المخازن',
        'accounts_manager': 'مدير الحسابات',
        'supervisor': 'مشرف'
    },

    'google_sheets': {
        'sync_interval': 300,  # 5 دقائق
        'backup_enabled': True,
        'versioning': True
    },

    'session': {
        'inactivity_timeout_minutes': 30,
        'secret_key_env': 'FLASK_SECRET_KEY'
    }
}

# صلاحيات المسؤول الافتراضية (كاملة)
def get_admin_permissions():
    modules = {}
    for mod in config['permission_modules']:
        modules[mod] = {'view': True, 'add': True, 'edit': True, 'delete': True}
    modules['إدارة الصلاحيات'] = modules.get('إدارة الصلاحيات', {})
    modules['سجل التغييرات والأنشطة'] = modules.get('سجل التغييرات والأنشطة', {})
    return {
        'userManagement': {'addUser': True, 'editUser': True, 'deleteUser': True, 'resetPassword': True},
        'permissionManagement': {'grantPermissions': True, 'revokePermissions': True, 'copyPermissions': True, 'hideModules': True},
        'viewAllData': True,
        'editAllRecords': True,
        'auditLog': True,
        'modules': modules
    }

# صلاحيات افتراضية لكل دور (بدون مسؤول)
def get_default_module_permissions(role):
    base = {mod: {'view': False, 'add': False, 'edit': False} for mod in config['permission_modules']}
    if role == 'warehouse_manager':
        for k in ['المخزون الرئيسي', 'مخزون المشرف', 'مخزون الزونات', 'الطلبيات', 'تبديل الصناديق', 'طلبات الاسترداد', 'طلبات التبديل', 'تسليم المعدات', 'استرداد المعدات', 'إثبات التسليم']:
            if k in base:
                base[k] = {'view': True, 'add': True, 'edit': True}
    elif role == 'accounts_manager':
        for k in ['إدارة الخصومات', 'الحوافز', 'إدارة الشقق', 'إدارة الموتوسيكلات']:
            if k in base:
                base[k] = {'view': True, 'add': True, 'edit': True}
    elif role == 'supervisor':
        for k in ['مخزون المشرف', 'تسليم المعدات', 'استرداد المعدات', 'إدارة الخصومات', 'الطلبيات', 'تبديل الصناديق', 'إثبات التسليم']:
            if k in base:
                base[k] = {'view': True, 'add': True, 'edit': False}
    return base
