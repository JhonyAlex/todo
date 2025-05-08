/**
 * Utilidades para exportación e importación de datos
 */
const exportImportUtils = {
  /**
   * Inicializa los eventos de exportación/importación
   */
  init() {
    this.exportBtn = document.getElementById('btn-export');
    this.importBtn = document.getElementById('btn-import');
    this.importFile = document.getElementById('import-file');
    this.exportImportModal = new bootstrap.Modal(document.getElementById('exportImportModal'));
    this.exportImportTitle = document.getElementById('exportImportTitle');
    this.exportImportBody = document.getElementById('exportImportBody');
    this.exportImportAction = document.getElementById('exportImportAction');
    
    this.exportBtn.addEventListener('click', this.handleExport.bind(this));
    this.importBtn.addEventListener('click', this.handleImportClick.bind(this));
    this.importFile.addEventListener('change', this.handleImportFile.bind(this));
  },
  
  /**
   * Maneja el evento de exportación
   */
  async handleExport() {
    try {
      const data = await dbService.exportData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      this.exportImportTitle.textContent = 'Exportar datos';
      this.exportImportBody.innerHTML = `
        <p>Los datos han sido preparados para la exportación. Haz clic en el botón "Descargar" para guardar el archivo.</p>
        <p class="text-muted">Fecha de exportación: ${new Date().toLocaleString()}</p>
        <p class="text-muted">Número de recordatorios: ${data.reminders.length}</p>
        <p class="text-muted">Número de etiquetas: ${data.tags.length}</p>
      `;
      this.exportImportAction.textContent = 'Descargar';
      this.exportImportAction.onclick = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `recordatorios-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.exportImportModal.hide();
      };
      
      this.exportImportModal.show();
    } catch (error) {
      console.error('Error al exportar datos:', error);
      alert('Error al exportar los datos');
    }
  },
  
  /**
   * Maneja el clic en el botón de importación
   */
  handleImportClick() {
    this.importFile.click();
  },
  
  /**
   * Maneja la selección de archivo para importar
   * @param {Event} event - Evento de cambio de archivo
   */
  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        this.exportImportTitle.textContent = 'Importar datos';
        this.exportImportBody.innerHTML = `
          <div class="alert alert-warning">
            <h5>¡Atención!</h5>
            <p>Estás a punto de importar datos que reemplazarán los datos existentes.</p>
            <p><strong>Esta acción no se puede deshacer.</strong></p>
          </div>
          <p>Información del archivo:</p>
          <ul>
            <li>Fecha de exportación: ${new Date(data.exportDate || Date.now()).toLocaleString()}</li>
            <li>Recordatorios: ${data.reminders ? data.reminders.length : 'No disponible'}</li>
            <li>Etiquetas: ${data.tags ? data.tags.length : 'No disponible'}</li>
          </ul>
          <p>¿Estás seguro de que deseas continuar?</p>
        `;
        this.exportImportAction.textContent = 'Importar';
        this.exportImportAction.onclick = () => {
          this.confirmImport(data);
        };
        
        this.exportImportModal.show();
      } catch (error) {
        console.error('Error al leer el archivo:', error);
        alert('El archivo seleccionado no es válido');
      }
      
      // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
      event.target.value = '';
    };
    
    reader.readAsText(file);
  },
  
  /**
   * Confirma la importación de datos
   * @param {Object} data - Datos a importar
   */
  async confirmImport(data) {
    try {
      await dbService.importData(data);
      
      // Actualizar componentes
      if (window.tagManager) {
        await tagManager.loadTags();
      }
      
      if (window.reminderList) {
        await reminderList.loadReminders();
      }
      
      this.exportImportModal.hide();
      alert('Datos importados correctamente');
    } catch (error) {
      console.error('Error al importar datos:', error);
      alert('Error al importar los datos: ' + error.message);
    }
  }
};