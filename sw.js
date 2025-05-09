// Service Worker para gestionar notificaciones

const CACHE_NAME = 'todo-cache-v2'; // Updated cache version
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
  'https://cdn.tiny.cloud/1/kwdd2a5zlx9q50f5f9ajwrqyrbls42q47p54m6jbj2ui6oa9/tinymce/6/tinymce.min.js',
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
  // Mejorar el manejo de fetch para evitar errores de canal de mensajes
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request).then(response => {
          return response || Promise.reject('no-match');
        });
      })
  );
});

// Manejo de notificaciones
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
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
  } catch (error) {
    console.error('Error al procesar notificación push:', error);
  }
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const reminderId = event.notification.data.reminderId;
  
  // Usar clientId para referencias específicas a la ventana del cliente
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true})
      .then(clientList => {
        // Si hay una ventana abierta, usarla
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if (event.action === 'complete') {
              client.navigate(`/?complete=${reminderId}`);
              return;
            } else if (event.action === 'snooze') {
              client.navigate(`/?snooze=${reminderId}`);
              return;
            } else {
              client.navigate(event.notification.data.url || '/');
              return;
            }
          }
        }
        
        // Si no hay ventanas abiertas, abrir una nueva
        if (clients.openWindow) {
          let url = event.notification.data.url || '/';
          if (event.action === 'complete') {
            url = `/?complete=${reminderId}`;
          } else if (event.action === 'snooze') {
            url = `/?snooze=${reminderId}`;
          }
          return clients.openWindow(url);
        }
      })
  );
});

// Manejo de notificaciones cerradas
self.addEventListener('notificationclose', (event) => {
  // Se cierra la notificación sin interacción - reprogramar para 5 minutos después
  const reminderId = event.notification.data.reminderId;
  
  // La lógica para reprogramar está en el cliente, enviar mensaje a los clientes
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true})
      .then(clientList => {
        if (clientList.length > 0) {
          // Enviar mensaje solo al cliente activo
          return clientList[0].postMessage({
            type: 'reschedule',
            reminderId: reminderId
          });
        }
      })
      .catch(err => {
        console.error('Error al reprogramar notificación:', err);
      })
  );
});