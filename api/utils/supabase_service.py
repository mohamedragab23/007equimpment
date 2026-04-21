# -*- coding: utf-8 -*-
"""
خدمة Supabase اختيارية - رفع الصور وجلب الطيارين
يعمل فقط عند تعيين SUPABASE_URL و SUPABASE_KEY (أو SUPABASE_SERVICE_ROLE_KEY للـ Storage)
"""
import os
from typing import Optional, List, Dict, Any

_SUPABASE_CLIENT = None


def _get_client():
    global _SUPABASE_CLIENT
    if _SUPABASE_CLIENT is not None:
        return _SUPABASE_CLIENT
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        return None
    try:
        from supabase import create_client
        _SUPABASE_CLIENT = create_client(url, key)
        return _SUPABASE_CLIENT
    except ImportError:
        return None
    except Exception:
        return None


def is_configured() -> bool:
    return _get_client() is not None


def upload_image(file_data: bytes, content_type: str, path: str) -> Optional[str]:
    """
    رفع صورة إلى Supabase Storage.
    path مثال: equipment_delivery/{supervisor_code}/{rider_code}_{timestamp}.jpg
    يُرجع الرابط العام إن نجح، وإلا None.
    """
    client = _get_client()
    if not client:
        return None
    try:
        bucket = os.environ.get('SUPABASE_STORAGE_BUCKET', 'equipment')
        result = client.storage.from_(bucket).upload(
            path,
            file_data,
            file_options={'content-type': content_type}
        )
        public_url = client.storage.from_(bucket).get_public_url(path)
        return public_url
    except Exception:
        return None


def get_riders_list(zone: Optional[str] = None) -> List[Dict[str, Any]]:
    """جلب الطيارين من Supabase (إن كان مربوطاً)."""
    client = _get_client()
    if not client:
        return []
    try:
        table = os.environ.get('SUPABASE_RIDERS_TABLE', 'riders')
        q = client.table(table).select('*')
        if zone:
            q = q.eq('zone', zone)
        r = q.execute()
        return list(r.data) if r.data else []
    except Exception:
        return []


def insert_supervisor(data: Dict[str, Any]) -> Optional[Dict]:
    """إدراج مشرف في جدول supervisors إن وُجد."""
    client = _get_client()
    if not client:
        return None
    try:
        table = os.environ.get('SUPABASE_SUPERVISORS_TABLE', 'supervisors')
        r = client.table(table).insert(data).execute()
        return r.data[0] if r.data else None
    except Exception:
        return None
