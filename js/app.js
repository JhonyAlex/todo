/**
 * Archivo principal de la aplicación
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Inicializar servicios y componentes
    await dbService.init();
    await notificationService.init();

    // Inicializar componentes de la UI
    reminderEditor.init();
    reminderList.init();
    tagManager.init();
    exportImportUtils.init();
    
    // Configurar escuchadores para accesibilidad
    setupAccessibilityHandlers();

    // Comprobar notificaciones pendientes
    notificationService.checkPendingNotifications();

    // Comprobar parámetros de URL (para manejar acciones desde notificaciones)
    handleURLParameters();

    console.log('Aplicación inicializada correctamente');

  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
    showAppError(error);
  }
});

/**
 * Configura manejadores de eventos para mejorar la accesibilidad
 */
function setupAccessibilityHandlers() {
  // Manejar tecla Escape para cerrar modales
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Comprobar si hay algún modal abierto y cerrarlo
      const openModals = document.querySelectorAll('.modal.show');
      if (openModals.length > 0) {
        const modalId = openModals[0].id;
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modalInstance) {
          modalInstance.hide();
        }
      }
    }
  });
  
  // Asegurarse de que los modales no bloquean la accesibilidad por teclado
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.addEventListener('shown.bs.modal', () => {
      // Asegurarse de que el modal es el único contenedor interactivo
      document.querySelectorAll('body > *:not(.modal):not(.modal-backdrop)').forEach(el => {
        if (!el.hasAttribute('aria-hidden')) {
          el.setAttribute('aria-hidden', 'true');
        }
      });
    });
    
    modal.addEventListener('hidden.bs.modal', () => {
      // Restaurar la accesibilidad de los demás elementos
      document.querySelectorAll('body > *[aria-hidden="true"]').forEach(el => {
        if (el.classList && !el.classList.contains('modal') && !el.classList.contains('modal-backdrop')) {
          el.removeAttribute('aria-hidden');
        }
      });
    });
  });
}

/**
 * Maneja parámetros de URL para acciones desde notificaciones
 */
function handleURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Manejar acción de completar desde notificación
  const completeParam = urlParams.get('complete');
  if (completeParam) {
    reminderList.toggleComplete(Number(completeParam), true)
      .then(() => {
        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch(console.error);
  }
  
  // Manejar acción de posponer desde notificación
  const snoozeParam = urlParams.get('snooze');
  if (snoozeParam) {
    dbService.getReminder(Number(snoozeParam))
      .then(reminder => {
        if (reminder) {
          // Posponer 5 minutos
          reminder.date = DateUtils.addMinutes(5).toISOString();
          return dbService.saveReminder(reminder).then(() => {
            notificationService.scheduleNotification(reminder);
            // Limpiar URL
            window.history.replaceState({}, document.title, window.location.pathname);
          });
        }
      })
      .catch(console.error);
  }
}

/**
 * Muestra un error de la aplicación
 * @param {Error} error - Error a mostrar
 */
function showAppError(error) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'alert alert-danger m-3';
  errorDiv.innerHTML = `
    <h4 class="alert-heading">Error en la aplicación</h4>
    <p>Se ha producido un error al inicializar la aplicación:</p>
    <pre class="mb-0">${error.message}</pre>
  `;
  
  // Insertar al principio del contenido
  const container = document.querySelector('.container');
  if (container) {
    container.prepend(errorDiv);
  } else {
    document.body.prepend(errorDiv);
  }
}

// Escuchar mensajes del Service Worker
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    try {
      const data = event.data;
      
      if (data.type === 'reschedule' && data.reminderId) {
        // Reprogramar notificación que fue cerrada sin interacción
        dbService.getReminder(data.reminderId)
          .then(reminder => {
            if (reminder && !reminder.completed) {
              notificationService.rescheduleNotification(reminder);
            }
          })
          .catch(error => console.error('Error al reprogramar recordatorio:', error));
      }
    } catch (error) {
      console.error('Error al procesar mensaje del Service Worker:', error);
    }
  });
}

// Comprobar recordatorios periódicamente (cada 60 segundos)
setInterval(() => {
  notificationService.checkPendingNotifications();
}, 60000);