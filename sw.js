// Service Worker para gestionar notificaciones

const CACHE_NAME = 'todo-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './assets/css/styles.css',
  './assets/img/logo.png',
  './assets/img/favicon.png',
  './js/services/db-service.js',
  './js/services/notification-service.js',
  './js/components/reminder-editor.js',
  './js/components/reminder-list.js',
  './js/components/tag-manager.js',
  './js/utils/date-utils.js',
  './js/utils/export-import.js',
  './js/app.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
  'https://cdn.quilljs.com/1.3.6/quill.snow.css',
  'https://cdn.quilljs.com/1.3.6/quill.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (CACHE_NAME !== cacheName) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia de caché: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Manejo de notificaciones
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/img/notification-icon.png',
    badge: '/assets/img/badge-icon.png',
    data: {
      reminderId: data.reminderId,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'complete',
        title: 'Completar'
      },
      {
        action: 'snooze',
        title: 'Posponer 5 minutos'
      }
    ],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const reminderId = event.notification.data.reminderId;
  
  if (event.action === 'complete') {
    // Marcar como completado
    clients.openWindow(`/?complete=${reminderId}`);
  } else if (event.action === 'snooze') {
    // Posponer 5 minutos
    // La lógica para reprogramar la notificación está en el cliente
    clients.openWindow(`/?snooze=${reminderId}`);
  } else {
    // Abrir la aplicación
    clients.openWindow(event.notification.data.url);
  }
});

// Manejo de notificaciones cerradas
self.addEventListener('notificationclose', (event) => {
  // Se cierra la notificación sin interacción - reprogramar para 5 minutos después
  const reminderId = event.notification.data.reminderId;
  
  // La lógica para reprogramar está en el cliente, enviar mensaje a los clientes
  self.clients.matchAll().then(clients => {
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'reschedule',
        reminderId: reminderId
      });
    }
  });
});