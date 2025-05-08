/**
 * Utilidades para exportación e importación de datos
 */
class ExportImportUtils {
  constructor() {
    // Referencias DOM
    this.exportBtn = document.getElementById('btn-export');
    this.importBtn = document.getElementById('btn-import');
    this.importFileInput = document.getElementById('import-file');
    this.exportImportModal = new bootstrap.Modal(document.getElementById('exportImportModal'));
    this.exportImportTitle = document.getElementById('exportImportTitle');
    this.exportImportBody = document.getElementById('exportImportBody');
    this.exportImportAction = document.getElementById('exportImportAction');
  }

  /**
   * Inicializa las utilidades de exportación/importación
   */
  init() {
    // Configurar eventos
    this.exportBtn.addEventListener('click', this.handleExport.bind(this));
    this.importBtn.addEventListener('click', () => this.importFileInput.click());
    this.importFileInput.addEventListener('change', this.handleImportFileSelect.bind(this));
  }

  /**
   * Maneja la exportación de datos
   */
  async handleExport() {
    try {
      // Obtener todos los datos
      const data = await dbService.exportData();
      
      // Convertir a JSON
      const jsonData = JSON.stringify(data, null, 2);
      
      // Crear blob
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Crear URL para descargar
      const url = URL.createObjectURL(blob);
      
      // Mostrar modal con opciones
      this.exportImportTitle.textContent = 'Exportar datos';
      this.exportImportBody.innerHTML = `
        <p>Estás a punto de descargar un archivo con todos tus recordatorios y etiquetas.</p>
        <p>Este archivo te permitirá restaurar tus datos en cualquier momento.</p>
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i> Se exportarán ${data.reminders.length} recordatorios y ${data.tags.length} etiquetas.
        </div>
      `;
      
      this.exportImportAction.textContent = 'Descargar';
      this.exportImportAction.onclick = () => {
        // Crear enlace de descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = `reminders-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Cerrar modal
        this.exportImportModal.hide();
      };
      
      this.exportImportModal.show();
    } catch (error) {
      console.error('Error al exportar datos:', error);
      alert('Error al exportar los datos');
    }
  }

  /**
   * Maneja la selección de archivo para importar
   * @param {Event} event - Evento de selección de archivo
   */
  async handleImportFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      // Leer archivo
      const fileContent = await this.readFileAsText(file);
      
      // Parsear JSON
      const data = JSON.parse(fileContent);
      
      // Validar datos
      if (!data || !data.reminders || !data.tags) {
        throw new Error('El archivo no contiene datos válidos');
      }
      
      // Mostrar modal de confirmación
      this.exportImportTitle.textContent = 'Importar datos';
      this.exportImportBody.innerHTML = `
        <p>Estás a punto de importar datos de un archivo de respaldo.</p>
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle"></i> <strong>Atención:</strong> Esta acción reemplazará todos tus datos actuales.
        </div>
        <p class="mb-0">El archivo contiene:</p>
        <ul>
          <li>${data.reminders.length} recordatorios</li>
          <li>${data.tags.length} etiquetas</li>
          <li>Fecha de exportación: ${new Date(data.exportDate).toLocaleDateString('es-ES')}</li>
        </ul>
        <p>¿Deseas continuar?</p>
      `;
      
      this.exportImportAction.textContent = 'Importar';
      this.exportImportAction.onclick = async () => {
        try {
          await dbService.importData(data);
          
          // Cerrar modal
          this.exportImportModal.hide();
          
          // Recargar datos
          if (tagManager) await tagManager.loadTags();
          if (reminderList) await reminderList.loadRecords;
          
          // Programar notificaciones para recordatorios importados
          data.reminders.forEach(reminder => {
            if (!reminder.completed && new Date(reminder.date) > new Date()) {
              notificationService.scheduleNotification(reminder);
            }
          });
          
          alert('Datos importados correctamente');
          
          // Limpiar input de archivo
          this.importFileInput.value = '';
          
        } catch (error) {
          console.error('Error al importar datos:', error);
          alert(`Error al importar datos: ${error.message}`);
        }
      };
      
      this.exportImportModal.show();
    } catch (error) {
      console.error('Error al leer archivo:', error);
      alert(`Error al leer el archivo: ${error.message}`);
    }
  }

  /**
   * Lee un archivo como texto
   * @param {File} file - Archivo a leer
   * @returns {Promise<string>} Contenido del archivo
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = (e) => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsText(file);
    });
  }
}

// Crear instancia de utilidades
const exportImportUtils = new ExportImportUtils();