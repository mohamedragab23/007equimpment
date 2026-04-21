# -*- coding: utf-8 -*-
"""
سجل التدقيق - تسجيل العمليات في ورقة PermissionsLog
"""
from datetime import datetime
from typing import Optional


def log_action(
    action_type: str,
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[str] = None,
    success: bool = True,
    request=None,
):
    """تسجيل عملية في PermissionsLog (Google Sheets)."""
    try:
        from api.sync.google_sheets_service import get_sheets_service
        from api.utils.sheets_config import SHEET_HEADERS

        sheets = get_sheets_service()
        if not sheets:
            return
        ip_address = ''
        if request and hasattr(request, 'remote_addr'):
            ip_address = request.remote_addr or ''
        now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        row = {
            'timestamp': now,
            'action_type': action_type or '',
            'user_id': user_id or '',
            'username': username or '',
            'target_type': target_type or '',
            'target_id': target_id or '',
            'details': details or '',
            'success': 'yes' if success else 'no',
            'ip_address': ip_address,
        }
        headers = SHEET_HEADERS.get('PermissionsLog', [])
        values = [row.get(h, '') for h in headers]
        sheets.append_row('PermissionsLog', values)
    except Exception:
        pass
