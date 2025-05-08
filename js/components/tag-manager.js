/**
 * Componente para gestión de etiquetas
 */
class TagManager {
  constructor() {
    this.tags = [];
    this.tagListElement = null;
    this.activeTagFilter = null;
  }

  /**
   * Inicializa el gestor de etiquetas
   */
  async init() {
    // Referencias DOM
    this.tagListElement = document.getElementById('tag-list');
    this.addTagButton = document.getElementById('btn-add-tag');
    
    // Evento para añadir nueva etiqueta
    this.addTagButton.addEventListener('click', this.handleAddTagClick.bind(this));
    
    // Cargar etiquetas
    await this.loadTags();
  }

  /**
   * Carga las etiquetas desde la base de datos
   */
  async loadTags() {
    try {
      this.tags = await dbService.getTags();
      this.renderTags();
    } catch (error) {
      console.error('Error al cargar etiquetas:', error);
    }
  }

  /**
   * Renderiza la lista de etiquetas
   */
  renderTags() {
    if (!this.tagListElement) return;
    
    // Limpiar lista actual
    this.tagListElement.innerHTML = '';
    
    // Opción "Todas las etiquetas"
    const allTagsItem = document.createElement('li');
    allTagsItem.className = `list-group-item d-flex justify-content-between align-items-center ${!this.activeTagFilter ? 'active' : ''}`;
    allTagsItem.innerHTML = `
      <span>Todas las etiquetas</span>
      <span class="badge bg-secondary rounded-pill">${this.tags.length}</span>
    `;
    allTagsItem.addEventListener('click', () => this.filterByTag(null));
    this.tagListElement.appendChild(allTagsItem);
    
    // Renderizar etiquetas
    this.tags.forEach(tag => {
      const tagItem = document.createElement('li');
      tagItem.className = `list-group-item d-flex justify-content-between align-items-center ${this.activeTagFilter === tag.id ? 'active' : ''}`;
      tagItem.setAttribute('data-id', tag.id);
      
      tagItem.innerHTML = `
        <div class="d-flex align-items-center">
          <span class="color-dot me-2" style="background-color: ${tag.color}; width: 12px; height: 12px; border-radius: 50%;"></span>
          <span>${tag.name}</span>
        </div>
        <div class="tag-actions">
          <button class="btn btn-sm p-0 edit-tag" title="Editar etiqueta">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm p-0 ms-2 delete-tag" title="Eliminar etiqueta">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      `;
      
      // Configurar eventos
      tagItem.addEventListener('click', (e) => {
        // Ignorar clic si se hace en los botones
        if (e.target.closest('.tag-actions')) return;
        this.filterByTag(tag.id);
      });
      
      const editButton = tagItem.querySelector('.edit-tag');
      editButton.addEventListener('click', () => this.editTag(tag.id));
      
      const deleteButton = tagItem.querySelector('.delete-tag');
      deleteButton.addEventListener('click', () => this.deleteTag(tag.id));
      
      this.tagListElement.appendChild(tagItem);
    });
  }

  /**
   * Filtra recordatorios por etiqueta
   * @param {number|null} tagId - ID de la etiqueta para filtrar
   */
  filterByTag(tagId) {
    this.activeTagFilter = tagId;
    
    // Actualizar UI para mostrar la etiqueta activa
    if (this.tagListElement) {
      const items = this.tagListElement.querySelectorAll('.list-group-item');
      items.forEach(item => {
        const itemTagId = item.getAttribute('data-id');
        if ((tagId === null && !itemTagId) || (itemTagId && parseInt(itemTagId) === tagId)) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
    
    // Aplicar filtro en la lista de recordatorios
    if (reminderList) {
      reminderList.setFilter({ tag: tagId });
    }
  }

  /**
   * Maneja clic en botón para añadir etiqueta
   */
  handleAddTagClick() {
    const name = prompt('Nombre de la nueva etiqueta:');
    if (!name || !name.trim()) return;
    
    // Generar color aleatorio
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    
    // Guardar etiqueta
    this.saveTag({
      name: name.trim(),
      color: randomColor
    });
  }

  /**
   * Edita una etiqueta
   * @param {number} id - ID de la etiqueta a editar
   */
  async editTag(id) {
    try {
      const tag = this.getTagById(id);
      if (!tag) return;
      
      const newName = prompt('Editar nombre de la etiqueta:', tag.name);
      if (!newName || !newName.trim() || newName === tag.name) return;
      
      // Actualizar etiqueta
      const updatedTag = {
        ...tag,
        name: newName.trim()
      };
      
      await this.saveTag(updatedTag);
    } catch (error) {
      console.error('Error al editar etiqueta:', error);
      alert('Error al editar la etiqueta');
    }
  }

  /**
   * Elimina una etiqueta
   * @param {number} id - ID de la etiqueta a eliminar
   */
  async deleteTag(id) {
    try {
      const confirmDelete = confirm('¿Estás seguro de que quieres eliminar esta etiqueta?');
      if (!confirmDelete) return;
      
      await dbService.deleteTag(id);
      
      // Recargar etiquetas
      await this.loadTags();
      
      // Si estaba filtrando por esta etiqueta, quitar filtro
      if (this.activeTagFilter === id) {
        this.filterByTag(null);
      } else {
        // Solo recargar recordatorios para reflejar la eliminación de la etiqueta
        if (reminderList) {
          reminderList.loadReminders();
        }
      }
    } catch (error) {
      console.error('Error al eliminar etiqueta:', error);
      alert('Error al eliminar la etiqueta');
    }
  }

  /**
   * Guarda una etiqueta en la base de datos
   * @param {Object} tag - Datos de la etiqueta
   */
  async saveTag(tag) {
    try {
      await dbService.saveTag(tag);
      
      // Recargar etiquetas
      await this.loadTags();
      
      // Actualizar lista de recordatorios para reflejar los cambios
      if (reminderList) {
        reminderList.loadReminders();
      }
    } catch (error) {
      console.error('Error al guardar etiqueta:', error);
      
      if (error.message === 'Ya existe una etiqueta con este nombre') {
        alert('Ya existe una etiqueta con este nombre');
      } else {
        alert('Error al guardar la etiqueta');
      }
    }
  }

  /**
   * Obtiene una etiqueta por su ID
   * @param {number} id - ID de la etiqueta
   * @returns {Object|null} Etiqueta encontrada o null
   */
  getTagById(id) {
    return this.tags.find(tag => tag.id === id);
  }
}

// Crear instancia del gestor de etiquetas
const tagManager = new TagManager();