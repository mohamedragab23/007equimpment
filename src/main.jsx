import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import './styles/globals.css';

// PWA / Service Worker
// - في التطوير: نُلغي أي Service Worker لتجنب كاش قديم
// - في الإنتاج: نسجّل `sw.js` مع آلية تحديث آمنة
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const isProd = import.meta?.env?.PROD;
      if (!isProd) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        return;
      }

      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      const reg = await navigator.serviceWorker.register(swUrl);

      // لو فيه نسخة جديدة جاهزة، اطلب منها تفعيل نفسها فوراً
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // بعد تفعيل SW جديد، نعمل reload مرة واحدة لتطبيق النسخة الجديدة
      let refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshed) return;
        refreshed = true;
        window.location.reload();
      });
    } catch (_) {
      // ignore
    }
  });
}

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui', direction: 'rtl', maxWidth: 600 }}>
          <h2 style={{ color: '#b91c1c' }}>حدث خطأ في التطبيق</h2>
          <pre style={{ background: '#fef2f2', padding: 16, overflow: 'auto' }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (!root) {
  document.body.innerHTML = '<p style="padding:20px;font-family:system-ui">عنصر #root غير موجود.</p>';
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}