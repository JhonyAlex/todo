/**
 * Componente para la lista de recordatorios
 */
class ReminderList {
  constructor() {
    this.reminders = [];
    this.currentFilter = {};
    this.listElement = null;
    this.deleteModal = null;
    this.reminderToDelete = null;
  }

  /**
   * Inicializa la lista de recordatorios
   */
  init() {
    // Referencias DOM
    this.listElement = document.getElementById('reminders-list');
    this.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    this.confirmDeleteBtn = document.getElementById('confirm-delete');
    this.searchInput = document.getElementById('search-input');
    this.navAll = document.getElementById('nav-all');
    this.navToday = document.getElementById('nav-today');
    this.navUpcoming = document.getElementById('nav-upcoming');
    this.newReminderBtn = document.getElementById('btn-new-reminder');
    this.viewTitle = document.getElementById('current-view-title');
    
    // Configurar eventos
    this.searchInput.addEventListener('input', this.handleSearch.bind(this));
    this.navAll.addEventListener('click', () => this.setView('all'));
    this.navToday.addEventListener('click', () => this.setView('today'));
    this.navUpcoming.addEventListener('click', () => this.setView('upcoming'));
    this.newReminderBtn.addEventListener('click', () => reminderEditor.openNew());
    this.confirmDeleteBtn.addEventListener('click', this.confirmDelete.bind(this));
    
    // Escuchar eventos de la aplicación
    window.addEventListener('reminders-updated', this.loadReminders.bind(this));
    
    // Cargar recordatorios iniciales
    this.loadReminders();
  }

  /**
   * Carga los recordatorios desde la base de datos
   */
  async loadReminders() {
    try {
      this.reminders = await dbService.getReminders(this.currentFilter);
      this.renderReminders();
    } catch (error) {
      console.error('Error al cargar recordatorios:', error);
    }
  }

  /**
   * Renderiza la lista de recordatorios
   */
  renderReminders() {
    if (!this.listElement) return;
    
    // Limpiar lista actual
    this.listElement.innerHTML = '';
    
    // Mostrar mensaje si no hay recordatorios
    if (this.reminders.length === 0) {
      this.listElement.innerHTML = `
        <div class="alert alert-info">
          No hay recordatorios que mostrar. ¡Crea uno nuevo!
        </div>
      `;
      return;
    }
    
    // Renderizar cada recordatorio
    this.reminders.forEach(reminder => {
      const card = this.createReminderCard(reminder);
      this.listElement.appendChild(card);
    });
  }

  /**
   * Crea un elemento de tarjeta para un recordatorio
   * @param {Object} reminder - Datos del recordatorio
   * @returns {HTMLElement} Elemento DOM de la tarjeta
   */
  createReminderCard(reminder) {
    const card = document.createElement('div');
    card.className = 'card reminder-card';
    card.setAttribute('data-id', reminder.id);
    
    // Añadir clases según el estado del recordatorio
    if (reminder.completed) {
      card.classList.add('completed');
    } else {
      const reminderDate = new Date(reminder.date);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (reminderDate < now && !reminder.completed) {
        card.classList.add('overdue');
      } else if (reminderDate >= today && reminderDate < tomorrow) {
        card.classList.add('today');
      }
    }
    
    // Formatear fecha y hora
    const reminderDate = new Date(reminder.date);
    const dateOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const dateStr = reminderDate.toLocaleDateString(undefined, dateOptions);
    const timeStr = reminderDate.toLocaleTimeString(undefined, timeOptions);
    
    // Crear contenido HTML de la tarjeta
    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0 ${reminder.completed ? 'text-decoration-line-through' : ''}">
            ${reminder.title}
          </h5>
          <div class="form-check form-switch">
            <input class="form-check-input toggle-complete" type="checkbox" ${reminder.completed ? 'checked' : ''}>
          </div>
        </div>
        
        <div class="card-text mt-2">
          <p class="mb-1"><i class="bi bi-clock"></i> ${dateStr}, ${timeStr}</p>
          ${reminder.assignee ? `<p class="mb-1"><i class="bi bi-person"></i> ${reminder.assignee}</p>` : ''}
        </div>
        
        ${this.renderReminderTags(reminder)}
        
        <div class="mt-3 d-flex reminder-actions">
          <button class="btn btn-sm btn-outline-primary me-2 view-reminder">
            <i class="bi bi-eye"></i> Ver
          </button>
          <button class="btn btn-sm btn-outline-secondary me-2 edit-reminder">
            <i class="bi bi-pencil"></i> Editar
          </button>
          <button class="btn btn-sm btn-outline-danger delete-reminder">
            <i class="bi bi-trash"></i> Eliminar
          </button>
        </div>
      </div>
    `;
    
    // Configurar eventos
    const toggleComplete = card.querySelector('.toggle-complete');
    toggleComplete.addEventListener('change', () => {
      this.toggleComplete(reminder.id, toggleComplete.checked);
    });
    
    const viewBtn = card.querySelector('.view-reminder');
    viewBtn.addEventListener('click', () => {
      this.viewReminder(reminder.id);
    });
    
    const editBtn = card.querySelector('.edit-reminder');
    editBtn.addEventListener('click', () => {
      this.editReminder(reminder.id);
    });
    
    const deleteBtn = card.querySelector('.delete-reminder');
    deleteBtn.addEventListener('click', () => {
      this.deleteReminder(reminder.id);
    });
    
    return card;
  }

  /**
   * Renderiza las etiquetas de un recordatorio
   * @param {Object} reminder - Datos del recordatorio
   * @returns {string} HTML para las etiquetas
   */
  renderReminderTags(reminder) {
    if (!reminder.tags || reminder.tags.length === 0) {
      return '';
    }
    
    const tagsHTML = reminder.tags.map(tagId => {
      const tag = tagManager.tags.find(t => t.id === tagId);
      if (!tag) return '';
      return `
        <span class="badge tag-badge" style="background-color: ${tag.color}">
          ${tag.name}
        </span>
      `;
    }).join('');
    
    return `
      <div class="tags-container mt-2">
        ${tagsHTML}
      </div>
    `;
  }

  /**
   * Cambia el estado de completado de un recordatorio
   * @param {number} id - ID del recordatorio
   * @param {boolean} completed - Si está completado o no
   */
  async toggleComplete(id, completed) {
    try {
      const reminder = await dbService.getReminder(id);
      if (!reminder) {
        throw new Error('Recordatorio no encontrado');
      }
      
      reminder.completed = completed;
      reminder.modified = new Date().toISOString();
      
      await dbService.saveReminder(reminder);
      
      // Si se ha completado, cancelar las notificaciones pendientes
      if (completed) {
        notificationService.cancelNotification(id);
      }
      
      await this.loadReminders();
    } catch (error) {
      console.error('Error al cambiar estado del recordatorio:', error);
    }
  }

  /**
   * Muestra un recordatorio
   * @param {number} id - ID del recordatorio
   */
  async viewReminder(id) {
    try {
      const reminder = await dbService.getReminder(id);
      if (!reminder) {
        throw new Error('Recordatorio no encontrado');
      }
      
      // Abrir en modo de edición pero deshabilitando campos
      reminderEditor.openEdit(reminder);
      // TODO: Implementar una vista de solo lectura
    } catch (error) {
      console.error('Error al cargar recordatorio:', error);
    }
  }

  /**
   * Abre el editor para modificar un recordatorio
   * @param {number} id - ID del recordatorio
   */
  async editReminder(id) {
    try {
      const reminder = await dbService.getReminder(id);
      if (!reminder) {
        throw new Error('Recordatorio no encontrado');
      }
      
      reminderEditor.openEdit(reminder);
    } catch (error) {
      console.error('Error al cargar recordatorio para editar:', error);
    }
  }

  /**
   * Muestra el diálogo de confirmación para eliminar un recordatorio
   * @param {number} id - ID del recordatorio
   */
  deleteReminder(id) {
    this.reminderToDelete = id;
    this.deleteModal.show();
  }

  /**
   * Confirma la eliminación de un recordatorio
   */
  async confirmDelete() {
    if (!this.reminderToDelete) return;
    
    try {
      await dbService.deleteReminder(this.reminderToDelete);
      notificationService.cancelNotification(this.reminderToDelete);
      this.deleteModal.hide();
      this.reminderToDelete = null;
      await this.loadReminders();
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
    }
  }

  /**
   * Maneja la búsqueda de recordatorios
   */
  handleSearch() {
    const searchTerm = this.searchInput.value.trim();
    this.setFilter({ search: searchTerm || undefined });
  }

  /**
   * Establece un filtro para la lista de recordatorios
   * @param {Object} filter - Filtros a aplicar
   */
  setFilter(filter) {
    this.currentFilter = { ...this.currentFilter, ...filter };
    this.loadReminders();
  }

  /**
   * Cambia la vista actual
   * @param {string} view - Vista a mostrar (all, today, upcoming)
   */
  setView(view) {
    // Actualizar navegación
    [this.navAll, this.navToday, this.navUpcoming].forEach(nav => {
      nav.classList.remove('active');
    });
    
    let title = '';
    let filter = {};
    
    switch (view) {
      case 'today': {
        this.navToday.classList.add('active');
        title = 'Recordatorios de hoy';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        filter = { date: today.toISOString().split('T')[0] };
        break;
      }
      case 'upcoming': {
        this.navUpcoming.classList.add('active');
        title = 'Próximos recordatorios';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        filter = { 
          completed: false,
          sortBy: 'date',
          sortDir: 'asc'
        };
        break;
      }
      default: {
        this.navAll.classList.add('active');
        title = 'Todos los recordatorios';
        filter = {};
      }
    }
    
    this.viewTitle.textContent = title;
    this.setFilter(filter);
  }
}

// Crear instancia de la lista de recordatorios
const reminderList = new ReminderList();