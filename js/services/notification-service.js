/**
 * Servicio para manejar las notificaciones
 */
class NotificationService {
  constructor() {
    this.hasPermission = false;
    this.notificationsQueue = [];
    this.checkingPermissions = false;
    this.timers = {}; // Para mantener los timers de notificaciones reprogramadas
  }

  /**
   * Inicializa el servicio de notificaciones
   */
  async init() {
    // Comprobar si las notificaciones están disponibles
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio');
      return false;
    }

    // Comprobar los permisos actuales
    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    } else if (Notification.permission === 'denied') {
      console.warn('El usuario ha denegado los permisos de notificaciones');
      return false;
    }

    return this.requestPermission();
  }

  /**
   * Solicita permiso para mostrar notificaciones
   * @returns {Promise<boolean>} true si el permiso fue concedido
   */
  async requestPermission() {
    if (this.checkingPermissions) return false;
    this.checkingPermissions = true;

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error al solicitar permisos de notificación:', error);
      return false;
    } finally {
      this.checkingPermissions = false;
    }
  }

  /**
   * Programa una notificación para un recordatorio
   * @param {Object} reminder - El recordatorio para el que se quiere programar una notificación
   */
  scheduleNotification(reminder) {
    if (!this.hasPermission) return;

    // Si ya existe un timer para este recordatorio, eliminarlo
    if (this.timers[reminder.id]) {
      clearTimeout(this.timers[reminder.id]);
    }

    const now = new Date();
    const reminderTime = new Date(reminder.date);
    
    // Si la fecha del recordatorio ya ha pasado, mostrar la notificación inmediatamente
    if (reminderTime <= now) {
      this.showNotification(reminder);
      return;
    }
    
    // Calcular el tiempo hasta la notificación
    const timeToNotification = reminderTime.getTime() - now.getTime();
    
    // Programar la notificación
    this.timers[reminder.id] = setTimeout(() => {
      this.showNotification(reminder);
    }, timeToNotification);

    console.log(`Notificación programada para ${reminder.title} en ${timeToNotification / 1000} segundos`);
  }

  /**
   * Reprograma una notificación para que aparezca 5 minutos después
   * @param {Object} reminder - El recordatorio a reprogramar
   */
  rescheduleNotification(reminder) {
    if (!this.hasPermission) return;
    
    // Si ya existe un timer para este recordatorio, eliminarlo
    if (this.timers[reminder.id]) {
      clearTimeout(this.timers[reminder.id]);
    }
    
    // Programar para 5 minutos después
    const fiveMinutes = 5 * 60 * 1000; // 5 minutos en milisegundos
    
    this.timers[reminder.id] = setTimeout(() => {
      this.showNotification(reminder);
    }, fiveMinutes);

    console.log(`Notificación reprogramada para ${reminder.title} en 5 minutos`);
  }

  /**
   * Muestra una notificación para un recordatorio
   * @param {Object} reminder - El recordatorio para el que se quiere mostrar una notificación
   */
  async showNotification(reminder) {
    if (!this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return;
    }
    
    try {
      // Comprobar si el Service Worker está activo
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Usar el Service Worker para mostrar la notificación
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification(reminder.title, {
          body: this.getNotificationBody(reminder),
          icon: '/assets/img/notification-icon.png',
          badge: '/assets/img/badge-icon.png',
          data: {
            reminderId: reminder.id,
            url: window.location.origin
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
        });
      } else {
        // Fallback a notificaciones nativas
        const notification = new Notification(reminder.title, {
          body: this.getNotificationBody(reminder),
          icon: '/assets/img/notification-icon.png'
        });
        
        // Manejar clics en la notificación
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        
        // Si la notificación se cierra sin interacción, reprogramarla
        notification.onclose = () => {
          this.rescheduleNotification(reminder);
        };
      }
    } catch (error) {
      console.error('Error al mostrar la notificación:', error);
    }
  }

  /**
   * Cancela una notificación programada
   * @param {number} reminderId - ID del recordatorio
   */
  cancelNotification(reminderId) {
    if (this.timers[reminderId]) {
      clearTimeout(this.timers[reminderId]);
      delete this.timers[reminderId];
    }
  }

  /**
   * Formatea el cuerpo de la notificación
   * @param {Object} reminder - El recordatorio
   * @returns {string} Texto formateado para la notificación
   */
  getNotificationBody(reminder) {
    let body = '';
    
    if (reminder.assignee) {
      body += `Para: ${reminder.assignee}\n`;
    }
    
    // Extraer texto plano de la descripción HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reminder.description;
    const textOnly = tempDiv.textContent || tempDiv.innerText || '';
    
    // Limitar el texto a 100 caracteres
    const shortText = textOnly.length > 100 ? 
      textOnly.substring(0, 97) + '...' : 
      textOnly;
      
    body += shortText;
    
    return body;
  }

  /**
   * Comprueba y muestra las notificaciones pendientes
   */
  async checkPendingNotifications() {
    try {
      const pendingReminders = await dbService.getPendingReminders();
      
      pendingReminders.forEach(reminder => {
        this.showNotification(reminder);
      });
    } catch (error) {
      console.error('Error al comprobar notificaciones pendientes:', error);
    }
  }
}

// Exportar una instancia del servicio
const notificationService = new NotificationService();