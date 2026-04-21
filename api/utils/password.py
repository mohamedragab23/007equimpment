# -*- coding: utf-8 -*-
"""
تشفير كلمات المرور بـ bcrypt - لا يُحفظ أي كلمة مرور كنص صريح أبداً.
يدعم التحقق من الهاش القديم (SHA256) للتوافق مع المستخدمين الحاليين.
"""
import hashlib


def hash_password(plain: str) -> str:
    """تجزئة كلمة المرور بـ bcrypt قبل الحفظ. يُرجع سلسلة جاهزة للتخزين."""
    try:
        import bcrypt
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(plain.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    except ImportError:
        # fallback إذا لم يُثبت bcrypt (لتشغيل التطبيق فقط - يُفضّل تثبيت bcrypt)
        return _legacy_hash(plain)


def check_password(stored_hash: str, plain_password: str) -> bool:
    """
    التحقق من كلمة المرور.
    إذا كان الهاش المخزّن بصيغة bcrypt ($2...) يُستخدم bcrypt،
    وإلا يُعتبر هاش SHA256 قديم للتوافق.
    """
    if not stored_hash or not plain_password:
        return False
    stored = (stored_hash or '').strip()
    if stored.startswith('$2') or stored.startswith('$2a') or stored.startswith('$2b'):
        try:
            import bcrypt
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                stored.encode('utf-8'),
            )
        except (ImportError, ValueError):
            return False
    # هاش قديم SHA256 (64 حرف hex) للتوافق مع المستخدمين الحاليين
    if len(stored) == 64 and all(c in '0123456789abcdef' for c in stored.lower()):
        return _legacy_hash(plain_password) == stored
    return False


def _legacy_hash(plain: str) -> str:
    """لا تستخدم للحفظ الجديد - للتوافق مع البيانات القديمة فقط."""
    return hashlib.sha256(plain.encode('utf-8')).hexdigest()
