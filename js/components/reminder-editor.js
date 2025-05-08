/**
 * Componente para el editor de recordatorios
 */
class ReminderEditor {
  constructor() {
    this.quill = null;
    this.currentReminderId = null;
    this.modal = null;
    this.tags = [];
  }

  /**
   * Inicializa el editor
   */
  init() {
    // Inicializar el editor Quill
    this.quill = new Quill('#editor-container', {
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'color': [] }, { 'background': [] }],
          ['image', 'link'],
          [{ 'table': {} }],
          ['clean']
        ],
        table: true
      },
      placeholder: '¿Qué necesitas recordar?',
      theme: 'snow'
    });

    // Referencias DOM
    this.modal = new bootstrap.Modal(document.getElementById('reminderModal'));
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
    
    // Usar la primera línea como título
    this.quill.on('text-change', this.handleTextChange.bind(this));
  }

  /**
   * Abre el editor para crear un nuevo recordatorio
   */
  openNew() {
    this.currentReminderId = null;
    document.getElementById('modal-title').textContent = 'Nuevo recordatorio';
    
    // Limpiar formulario
    this.reminderForm.reset();
    this.quill.root.innerHTML = '';
    
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
   */
  async openEdit(reminder) {
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
      this.quill.root.innerHTML = reminder.description || '';
      
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
  handleTextChange(delta, oldContents, source) {
    if (source !== 'user') return;
    
    try {
      // Obtener la primera línea del texto
      const text = this.quill.getText();
      const firstLine = text.split('\n')[0].trim();
      
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
      const description = this.quill.root.innerHTML;
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