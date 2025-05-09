/**
 * Componente para el editor de recordatorios
 */
class ReminderEditor {
  constructor() {
    this.editor = null;
    this.currentReminderId = null;
    this.modal = null;
    this.tags = [];
    this.triggerElement = null;
  }

  /**
   * Inicializa el editor
   */
  init() {
    // Inicializar el editor TinyMCE
    tinymce.init({
      selector: '#editor-container',
      height: 300,
      menubar: false,
      plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'help', 'wordcount'
      ],
      toolbar: 'undo redo | formatselect | ' +
        'bold italic backcolor | alignleft aligncenter ' +
        'alignright alignjustify | bullist numlist outdent indent | ' +
        'removeformat | help',
      content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; }',
      setup: (editor) => {
        // Guardar referencia al editor
        this.editor = editor;
        
        // Detectar cambios en el contenido
        editor.on('keyup', () => {
          this.handleTextChange();
        });
      }
    });

    // Referencias DOM
    const modalElement = document.getElementById('reminderModal');
    this.modalElement = modalElement;
    this.modal = new bootstrap.Modal(modalElement);
    this.reminderForm = document.getElementById('reminder-form');
    this.saveButton = document.getElementById('save-reminder');
    this.titleInput = document.getElementById('reminder-title');
    this.assigneeInput = document.getElementById('reminder-assignee');
    this.dateInput = document.getElementById('reminder-date');
    this.timeInput = document.getElementById('reminder-time');
    this.tagSelection = document.getElementById('tag-selection');
    this.newTagInput = document.getElementById('new-tag-input');
    this.addTagButton = document.getElementById('add-tag-btn');

    // Eventos
    this.saveButton.addEventListener('click', this.handleSave.bind(this));
    this.addTagButton.addEventListener('click', this.handleAddTag.bind(this));
    this.newTagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleAddTag();
      }
    });
    
    // Manejar el foco correctamente cuando el modal se muestra/oculta
    modalElement.addEventListener('shown.bs.modal', () => {
      // Darle foco al primer campo al abrir el modal
      this.titleInput.focus();
    });

    modalElement.addEventListener('hidden.bs.modal', () => {
      // Devolver el foco al elemento que abrió el modal
      if (this.triggerElement && this.triggerElement.focus) {
        this.triggerElement.focus();
      }
      this.triggerElement = null;
    });
  }

  /**
   * Abre el editor para crear un nuevo recordatorio
   * @param {HTMLElement} [triggerElement] - Elemento que abrió el modal
   */
  openNew(triggerElement) {
    this.triggerElement = triggerElement || document.activeElement;
    this.currentReminderId = null;
    document.getElementById('modal-title').textContent = 'Nuevo recordatorio';
    
    // Limpiar formulario
    this.reminderForm.reset();
    
    // Limpiar el contenido del editor
    if (this.editor) {
      this.editor.setContent('');
    }
    
    // Establecer fecha y hora predeterminadas (hoy, hora actual + 1)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    let hours = now.getHours() + 1;
    const minutes = now.getMinutes();
    if (hours > 23) hours = 23;
    
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    this.dateInput.value = dateStr;
    this.timeInput.value = timeStr;
    
    // Cargar etiquetas
    this.loadTags();
    
    this.modal.show();
  }

  /**
   * Abre el editor para editar un recordatorio existente
   * @param {Object} reminder - Recordatorio a editar
   * @param {HTMLElement} [triggerElement] - Elemento que abrió el modal
   */
  async openEdit(reminder, triggerElement) {
    this.triggerElement = triggerElement || document.activeElement;
    
    try {
      this.currentReminderId = reminder.id;
      document.getElementById('modal-title').textContent = 'Editar recordatorio';
      
      // Cargar datos del recordatorio
      this.titleInput.value = reminder.title;
      this.assigneeInput.value = reminder.assignee || '';
      
      // Formatear fecha y hora
      const reminderDate = new Date(reminder.date);
      const dateStr = reminderDate.toISOString().split('T')[0];
      const hours = reminderDate.getHours().toString().padStart(2, '0');
      const minutes = reminderDate.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      this.dateInput.value = dateStr;
      this.timeInput.value = timeStr;
      
      // Cargar contenido al editor
      if (this.editor) {
        this.editor.setContent(reminder.description || '');
      }
      
      // Cargar etiquetas
      await this.loadTags(reminder.tags || []);
      
      this.modal.show();
    } catch (error) {
      console.error('Error al abrir edición:', error);
      alert('Error al cargar el recordatorio');
    }
  }

  /**
   * Carga las etiquetas disponibles
   * @param {Array} selectedTags - Etiquetas seleccionadas
   */
  async loadTags(selectedTags = []) {
    try {
      this.tags = await dbService.getTags();
      this.tagSelection.innerHTML = '';
      
      this.tags.forEach(tag => {
        const isSelected = selectedTags.includes(tag.id);
        
        const tagElement = document.createElement('div');
        tagElement.classList.add('tag-badge', 'badge');
        tagElement.style.backgroundColor = tag.color || '#6c757d';
        if (isSelected) {
          tagElement.classList.add('active');
          tagElement.setAttribute('data-selected', 'true');
        }
        tagElement.setAttribute('data-id', tag.id);
        tagElement.textContent = tag.name;
        
        tagElement.addEventListener('click', () => {
          tagElement.classList.toggle('active');
          const isNowSelected = tagElement.classList.contains('active');
          tagElement.setAttribute('data-selected', isNowSelected.toString());
        });
        
        this.tagSelection.appendChild(tagElement);
      });
    } catch (error) {
      console.error('Error al cargar etiquetas:', error);
    }
  }

  /**
   * Maneja el evento de texto cambiado en el editor
   */
  handleTextChange() {
    try {
      if (!this.editor) return;
      
      // Obtener el contenido como texto plano
      const content = this.editor.getContent({ format: 'text' });
      
      // Obtener la primera línea del texto
      const firstLine = content.split('\n')[0].trim();
      
      // Si hay contenido en la primera línea y el título está vacío, usarlo como título
      if (firstLine && !this.titleInput.value) {
        this.titleInput.value = firstLine;
      }
    } catch (error) {
      console.error('Error al procesar cambio de texto:', error);
    }
  }

  /**
   * Maneja el guardado de un recordatorio
   */
  async handleSave() {
    try {
      // Validar formulario
      if (!this.reminderForm.checkValidity()) {
        this.reminderForm.reportValidity();
        return;
      }
      
      // Construir objeto de recordatorio
      const title = this.titleInput.value.trim();
      const description = this.editor ? this.editor.getContent() : '';
      const date = this.dateInput.value;
      const time = this.timeInput.value;
      const assignee = this.assigneeInput.value.trim();
      
      // Combinar fecha y hora
      const reminderDate = new Date(`${date}T${time}`);
      
      // Recopilar etiquetas seleccionadas
      const selectedTags = Array.from(this.tagSelection.querySelectorAll('[data-selected="true"]'))
        .map(el => parseInt(el.getAttribute('data-id')));
      
      const reminder = {
        title,
        description,
        date: reminderDate.toISOString(),
        assignee: assignee || null,
        tags: selectedTags,
        completed: false,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      // Si es una edición, incluir el ID
      if (this.currentReminderId) {
        reminder.id = this.currentReminderId;
      }
      
      // Guardar recordatorio
      const id = await dbService.saveReminder(reminder);
      
      // Si es un nuevo recordatorio, actualizar el ID
      if (!this.currentReminderId) {
        reminder.id = id;
      }
      
      // Programar notificación
      notificationService.scheduleNotification(reminder);
      
      // Cerrar modal y actualizar lista
      this.modal.hide();
      
      // Disparar evento para actualizar la lista
      window.dispatchEvent(new CustomEvent('reminders-updated'));
      
    } catch (error) {
      console.error('Error al guardar recordatorio:', error);
      alert('Error al guardar el recordatorio');
    }
  }

  /**
   * Maneja la adición de una nueva etiqueta
   */
  async handleAddTag() {
    const tagName = this.newTagInput.value.trim();
    if (!tagName) return;
    
    try {
      // Generar un color aleatorio para la etiqueta
      const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
      
      // Guardar la etiqueta
      const tag = {
        name: tagName,
        color: randomColor
      };
      
      const tagId = await dbService.saveTag(tag);
      
      // Limpiar input
      this.newTagInput.value = '';
      
      // Recargar etiquetas
      const selectedTags = Array.from(this.tagSelection.querySelectorAll('[data-selected="true"]'))
        .map(el => parseInt(el.getAttribute('data-id')));
      
      await this.loadTags([...selectedTags, tagId]);
      
    } catch (error) {
      console.error('Error al añadir etiqueta:', error);
      
      if (error.message === 'Ya existe una etiqueta con este nombre') {
        alert('Ya existe una etiqueta con este nombre');
      } else {
        alert('Error al añadir la etiqueta');
      }
    }
  }
}

// Crear instancia del editor
const reminderEditor = new ReminderEditor();