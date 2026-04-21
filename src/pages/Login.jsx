import React, { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">نظام إدارة مخزون معدات طلبات</h1>
            <p className="text-indigo-200 text-sm">وكالة 007</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-2">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300/70 focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  placeholder="أدخل اسم المستخدم"
                  required
                  autoComplete="username"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300/70 focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  placeholder="أدخل كلمة المرور"
                  required
                  autoComplete="current-password"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              {submitting ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <p className="mt-6 text-center text-indigo-300/80 text-xs">
            تسجيل الخروج تلقائياً بعد 30 دقيقة من عدم النشاط
          </p>
        </div>
      </div>
    </div>
  );
}
