// این فایل موقتاً خالی شده تا تغییرات جدید سریع اعمال شوند
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));