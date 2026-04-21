# -*- coding: utf-8 -*-
"""
هيكل أوراق Google Sheets الـ 11 - نظام إدارة مخزون معدات طلبات - وكالة 007
ترتيب الأوراق وأسماء الأعمدة لكل ورقة.
"""

# أسماء الأوراق بالترتيب (كما طُلبت)
SHEET_NAMES = [
    'Users',
    'Supervisors',
    'Zones',
    'MainInventory',
    'ZoneInventory',
    'Deductions',
    'Orders',
    'EquipmentExchange',
    'Apartments',
    'Motorcycles',
    'PermissionsLog',
]

# صف الرؤوس في كل ورقة (1-based: الصف الذي فيه الرؤوس؛ البيانات تبدأ من الصف التالي)
# للورقة التي رؤوسها في صف 20 (مثل Supervisors) نضع 20 وبيانات من 21
SHEET_HEADER_ROW = {
    'Supervisors': 20,
    'Orders': 1,
    'Deductions': 1,
    'EquipmentExchange': 1,
    'Apartments': 1,
    'Motorcycles': 1,
    'MainInventory': 1,
    'ZoneInventory': 1,
    'Users': 1,
    'Zones': 1,
    'PermissionsLog': 1,
}

# رؤوس أعمدة ثابتة للقراءة (لتجنب duplicate/unknown headers في gspread)
# إن وُجدت للتاب نستخدم القراءة اليدوية بدل get_all_records
SHEET_EXPECTED_HEADERS = {
    'Supervisors': None,  # يُملأ أدناه من SUPERVISORS_SHEET_WRITE_COLUMNS
}

# أسماء بديلة (عربي أو أسماء التابات الفعلية في الشيت) - للبحث في ملف موجود مسبقاً
# التاب الفعلي قد يكون مختلفاً (مثلاً Box_Exchanges بدل EquipmentExchange)
SHEET_NAME_ALIASES = {
    'Users': ['Users', 'المستخدمون'],
    'Supervisors': ['Supervisors', 'المشرفين', 'المشرفين والاداريين', 'المشرفين والإداريين'],
    'Zones': ['Zones', 'المناطق', 'الزونات'],
    'MainInventory': ['MainInventory', 'المخزون الرئيسي', 'المخزون', 'Inventory'],
    'ZoneInventory': ['ZoneInventory', 'مخزون المناطق', 'مخزون الزونات'],
    'Deductions': ['Deductions', 'الخصومات'],
    'Orders': ['Orders', 'الطلبيات', 'الطلبات'],
    'EquipmentExchange': ['EquipmentExchange', 'Box_Exchanges', 'تبديل الصناديق', 'طلبات التبديل', 'Box_Exchange_Requests', 'Exchanges'],
    'Apartments': ['Apartments', 'الشقق', 'إدارة الشقق'],
    'Motorcycles': ['Motorcycles', 'الموتوسيكلات', 'إدارة الموتوسيكلات'],
    'PermissionsLog': ['PermissionsLog', 'سجل التغييرات', 'سجل الصلاحيات', 'Permissions Log'],
}

# رؤوس الأعمدة لكل ورقة (الصف الأول)
SHEET_HEADERS = {
    'Users': [
        'id', 'username', 'password_hash', 'role', 'display_name', 'zone',
        'created_at', 'updated_at', 'active'
    ],
    'Supervisors': [
        'code', 'name', 'phone', 'zone', 'email',
        'job_title', 'start_date', 'base_salary', 'work_hours', 'daily_rate',
        'card_number', 'emergency_contact', 'company_line', 'bank_client_number', 'bank_account',
        'username', 'password_hash',
        'pouch_motorcycle', 'pouch_bicycle', 'tshirt', 'jacket', 'helmet',
        'created_at', 'updated_at', 'notes'
    ],
    'Zones': [
        'name', 'display_name', 'created_at'
    ],
    'MainInventory': [
        'date', 'pouch_motorcycle', 'pouch_bicycle', 'tshirt', 'jacket', 'helmet',
        'updated_at', 'updated_by'
    ],
    'ZoneInventory': [
        'zone', 'date', 'pouch_motorcycle', 'pouch_bicycle', 'tshirt', 'jacket', 'helmet',
        'supervisor_codes', 'updated_at'
    ],
    'Deductions': [
        'Date', 'Time', 'Rider Code', 'Rider Name', 'Supervisor Code', 'Supervisor Name',
        'Deduction Type', 'Amount', 'Reason', 'Cycle', 'Notes', 'Added By', 'Actor', 'Operation Type'
    ],
    'Orders': [
        'id', 'type', 'supervisor_code', 'zone', 'status', 'rider_code', 'rider_name', 'vehicle_type',
        'pouch_motorcycle', 'pouch_bicycle', 'tshirt', 'jacket', 'helmet',
        'photo_url', 'priority', 'created_at', 'approved_at', 'approved_by', 'notes'
    ],
    'EquipmentExchange': [
        'id', 'rider_code', 'rider_name', 'zone', 'old_pouch_details', 'reason',
        'photo_url', 'status', 'requested_at', 'approved_at', 'approved_by', 'new_pouch_details'
    ],
    'Apartments': [
        'id', 'owner_name', 'address', 'zone', 'rent', 'contract_duration',
        'payment_method', 'owner_phone', 'rider_code', 'move_in_date', 'created_at', 'updated_at'
    ],
    'Motorcycles': [
        'id', 'license_plate', 'rental_price', 'model', 'year', 'rider_code',
        'start_date', 'end_date', 'created_at', 'updated_at'
    ],
    'PermissionsLog': [
        'timestamp', 'action_type', 'user_id', 'username', 'target_type', 'target_id',
        'details', 'success', 'ip_address'
    ],
}

# تعيين رؤوس أعمدة عربية -> إنجليزي لورقة المشرفين (عند قراءة جدول موجود برؤوس عربية)
SUPERVISORS_HEADER_ALIASES = {
    'code': 'code',
    'كود المشرف': 'code',
    'كود': 'code',
    'name': 'name',
    'الاسم': 'name',
    'phone': 'phone',
    'رقم الهاتف': 'phone',
    'zone': 'zone',
    'المنطقة': 'zone',
    'email': 'email',
    'البريد الإلكتروني': 'email',
    'job_title': 'job_title',
    'المسمى الوظيفي': 'job_title',
    'start_date': 'start_date',
    'تاريخ التعيين': 'start_date',
    'base_salary': 'base_salary',
    'الراتب الأساسي': 'base_salary',
    'work_hours': 'work_hours',
    'ساعات العمل': 'work_hours',
    'daily_rate': 'daily_rate',
    'المعدل اليومي': 'daily_rate',
    'card_number': 'card_number',
    'رقم الهوية الوطنية': 'card_number',
    'emergency_contact': 'emergency_contact',
    'رقم قريب الدرجة الأولى': 'emergency_contact',
    'company_line': 'company_line',
    'رقم خط الشركة': 'company_line',
    'bank_client_number': 'bank_client_number',
    'رقم عميل البنك': 'bank_client_number',
    'bank_account': 'bank_account',
    'رقم الحساب البنكي': 'bank_account',
    'username': 'username',
    'اسم المستخدم': 'username',
    'password_hash': 'password_hash',
    'كلمة المرور': 'password_hash',
    'pouch_motorcycle': 'pouch_motorcycle',
    'ح دراجات': 'pouch_motorcycle',
    'pouch_bicycle': 'pouch_bicycle',
    'ح هوائية': 'pouch_bicycle',
    'tshirt': 'tshirt',
    'تيشيرت': 'tshirt',
    'تيشرت': 'tshirt',
    'jacket': 'jacket',
    'جاكيت': 'jacket',
    'helmet': 'helmet',
    'خوذة': 'helmet',
    'created_at': 'created_at',
    'updated_at': 'updated_at',
    'notes': 'notes',
    'ملاحظات': 'notes',
    # أعمدة الشيت الحالي (إنجليزي): Date, Time, Supervisor Code, Supervisor Name, ...
    'Date': 'created_at',
    'Time': 'updated_at',
    'Supervisor Code': 'code',
    'Supervisor Name': 'name',
    'Username': 'username',
    'Phone': 'phone',
    'Email': 'email',
    'Region': 'zone',
    'Job Title': 'job_title',
    'Appointment Date': 'start_date',
    'Basic Salary': 'base_salary',
    'Working Hours': 'work_hours',
    'Daily Rate': 'daily_rate',
    'National ID': 'card_number',
}

# ترتيب أعمدة ورقة المشرفين عند الكتابة (مطابق للشيت الموجود = مزامنة ثنائية)
SUPERVISORS_SHEET_WRITE_COLUMNS = [
    'Date', 'Time', 'Supervisor Code', 'Supervisor Name', 'Username', 'Phone', 'Email',
    'Region', 'Job Title', 'Appointment Date', 'Basic Salary', 'Working Hours', 'Daily Rate', 'National ID',
]
# رؤوس متوقعة لورقة المشرفين (لقراءة يدوية بدون خطأ duplicate headers)
SHEET_EXPECTED_HEADERS['Supervisors'] = SUPERVISORS_SHEET_WRITE_COLUMNS
# باقي التابات: استخدام رؤوس SHEET_HEADERS للقراءة اليدوية
for _sn in ['Orders', 'Deductions', 'EquipmentExchange', 'Apartments', 'Motorcycles',
            'MainInventory', 'ZoneInventory', 'Users', 'Zones', 'PermissionsLog']:
    if _sn in SHEET_HEADERS and _sn not in SHEET_EXPECTED_HEADERS:
        SHEET_EXPECTED_HEADERS[_sn] = SHEET_HEADERS[_sn]
# تحويل الحقل الداخلي -> اسم العمود في الشيت (للكتابة)
SUPERVISORS_INTERNAL_TO_SHEET = {
    'created_at': 'Date',
    'updated_at': 'Time',
    'code': 'Supervisor Code',
    'name': 'Supervisor Name',
    'username': 'Username',
    'phone': 'Phone',
    'email': 'Email',
    'zone': 'Region',
    'job_title': 'Job Title',
    'start_date': 'Appointment Date',
    'base_salary': 'Basic Salary',
    'work_hours': 'Working Hours',
    'daily_rate': 'Daily Rate',
    'card_number': 'National ID',
}

# تعيين أعمدة Excel للخصومات (استيراد من ملف)
DEDUCTIONS_EXCEL_MAPPING = {
    'كود المندوب': 'Rider Code',
    'اسم المندوب': 'Rider Name',
    'المبلغ': 'Amount',
    'الدورات': 'Cycle',
    'ملاحظات': 'Notes',
    'الزون': 'Reason',  # Zone → Reason field
}
