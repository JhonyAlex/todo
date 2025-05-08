            <button class="btn btn-sm btn-outline-primary edit-reminder">
              <i class="bi bi-pencil"></i> Editar
            </button>
            <button class="btn btn-sm btn-outline-danger delete-reminder">
              <i class="bi bi-trash"></i> Eliminar
            </button>
          </div>
        </div>
      </div>
      <div class="card-footer reminder-tags d-flex flex-wrap gap-1">
        <!-- Tags will be inserted dynamically -->
      </div>
    `;
    
    // Configurar eventos
    const checkbox = cardElement.querySelector(`.form-check-input`);
    checkbox.addEventListener('change', () => this.toggleComplete(reminder.id, checkbox.checked));
    
    const editButton = cardElement.querySelector('.edit-reminder');
    editButton.addEventListener('click', () => this.editReminder(reminder.id));
    
    const deleteButton = cardElement.querySelector('.delete-reminder');
    deleteButton.addEventListener('click', () => this.showDeleteConfirmation(reminder.id));
    
    return cardElement;
  }

  /**
   * Devuelve la clase de badge según el estado
   * @param {string} status - Estado del recordatorio
   * @returns {string} Clase CSS para el badge
   */
  getStatusBadgeClass(status) {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'overdue': return 'bg-danger';
      case 'today': return 'bg-warning';
      default: return 'bg-primary';
    }
  }

  /**
   * Maneja el cambio de estado de un recordatorio
   * @param {number} id - ID del recordatorio
   * @param {boolean} completed - Indica si está completado
   */
  async toggleComplete(id, completed) {
    try {
      // Obtener recordatorio
      const reminder = await dbService.getReminder(id);
      
      if (!reminder) {
        console.error('Recordatorio no encontrado:', id);
        return;
      }
      
      // Actualizar estado
      reminder.completed = completed;
      reminder.modified = new Date().toISOString();
      
      // Si se completa, cancelar notificaciones pendientes
      if (completed) {
        notificationService.cancelNotification(id);
      } else {
        // Si se desmarca como completado y la fecha es futura, reprogramar notificación
        const reminderDate = new Date(reminder.date);
        if (reminderDate > new Date()) {
          notificationService.scheduleNotification(reminder);
        }
      }
      
      // Guardar cambios
      await dbService.saveReminder(reminder);
      
      // Recargar lista
      this.loadReminders();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar el estado del recordatorio');
    }
  }

  /**
   * Abre el editor para editar un recordatorio
   * @param {number} id - ID del recordatorio a editar
   */
  async editReminder(id) {
    try {
      const reminder = await dbService.getReminder(id);
      
      if (!reminder) {
        console.error('Recordatorio no encontrado:', id);
        return;
      }
      
      reminderEditor.openEdit(reminder);
    } catch (error) {
      console.error('Error al editar recordatorio:', error);
      alert('Error al abrir el recordatorio para editar');
    }
  }

  /**
   * Muestra confirmación para eliminar recordatorio
   * @param {number} id - ID del recordatorio a eliminar
   */
  showDeleteConfirmation(id) {
    this.reminderToDelete = id;
    this.deleteModal.show();
  }

  /**
   * Maneja confirmación de eliminación
   */
  async handleDeleteConfirm() {
    if (!this.reminderToDelete) return;
    
    try {
      // Cancelar notificaciones pendientes
      notificationService.cancelNotification(this.reminderToDelete);
      
      // Eliminar recordatorio
      await dbService.deleteReminder(this.reminderToDelete);
      
      // Cerrar modal
      this.deleteModal.hide();
      
      // Recargar lista
      this.loadReminders();
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
      alert('Error al eliminar el recordatorio');
    } finally {
      this.reminderToDelete = null;
    }
  }
}

// Crear instancia de la lista
const reminderList = new ReminderList();