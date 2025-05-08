/**
 * Servicio para manejar la base de datos IndexedDB
 */
class DBService {
  constructor() {
    this.DB_NAME = 'RemindersApp';
    this.DB_VERSION = 1;
    this.db = null;
    
    this.STORES = {
      REMINDERS: 'reminders',
      TAGS: 'tags',
      SETTINGS: 'settings'
    };
  }

  /**
   * Inicializa la conexión con la base de datos
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = (event) => {
        console.error('Error al abrir la base de datos:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('Base de datos abierta correctamente');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Almacén para recordatorios
        if (!db.objectStoreNames.contains(this.STORES.REMINDERS)) {
          const store = db.createObjectStore(this.STORES.REMINDERS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('completed', 'completed', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        }
        
        // Almacén para etiquetas
        if (!db.objectStoreNames.contains(this.STORES.TAGS)) {
          const store = db.createObjectStore(this.STORES.TAGS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('name', 'name', { unique: true });
        }
        
        // Almacén para configuración
        if (!db.objectStoreNames.contains(this.STORES.SETTINGS)) {
          db.createObjectStore(this.STORES.SETTINGS, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Obtiene todos los recordatorios de la base de datos
   * @param {Object} [options] - Opciones para filtrar los resultados
   * @returns {Promise<Array>} Lista de recordatorios
   */
  async getReminders(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('La base de datos no está inicializada'));
      }
      
      const transaction = this.db.transaction(this.STORES.REMINDERS, 'readonly');
      const store = transaction.objectStore(this.STORES.REMINDERS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        let results = request.result;
        
        // Aplicar filtros si se especifican
        if (options.completed !== undefined) {
          results = results.filter(item => item.completed === options.completed);
        }
        
        if (options.tag) {
          results = results.filter(item => item.tags && item.tags.includes(options.tag));
        }
        
        if (options.date) {
          const startDate = new Date(options.date);
          startDate.setHours(0, 0, 0, 0);
          
          const endDate = new Date(options.date);
          endDate.setHours(23, 59, 59, 999);
          
          results = results.filter(item => {
            const reminderDate = new Date(item.date);
            return reminderDate >= startDate && reminderDate <= endDate;
          });
        }
        
        if (options.search) {
          const searchLower = options.search.toLowerCase();
          results = results.filter(item => 
            item.title.toLowerCase().includes(searchLower) || 
            item.description.toLowerCase().includes(searchLower) ||
            (item.assignee && item.assignee.toLowerCase().includes(searchLower))
          );
        }
        
        // Ordenar resultados
        if (options.sortBy) {
          results.sort((a, b) => {
            if (options.sortDir === 'desc') {
              return b[options.sortBy] > a[options.sortBy] ? 1 : -1;
            }
            return a[options.sortBy] > b[options.sortBy] ? 1 : -1;
          });
        } else {
          // Por defecto ordenar por fecha
          results.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        
        resolve(results);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Obtiene un recordatorio por su ID
   * @param {number} id - ID del recordatorio
   * @returns {Promise<Object>} Recordatorio
   */
  async getReminder(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('La base de datos no está inicializada'));
      }
      
      const transaction = this.db.transaction(this.STORES.REMINDERS, 'readonly');
      const store = transaction.objectStore(this.STORES.REMINDERS);
      const request = store.get(Number(id));
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Guarda un recordatorio en la base de datos
   * @param {Object} reminder - Datos del recordatorio
   * @returns {Promise<number>} ID del recordatorio guardado
   */
  async saveReminder(reminder) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('La base de datos no está inicializada'));
      }
      
      const transaction = this.db.transaction(this.STORES.REMINDERS, 'readwrite');
      const store = transaction.objectStore(this.STORES.REMINDERS);
      
      // Si el recordatorio ya existe (tiene ID), actualizarlo
      const request = reminder.id ? 
        store.put(reminder) : 
        store.add(reminder);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Elimina un recordatorio por su ID
   * @param {number} id - ID del recordatorio a eliminar
   * @returns {Promise<void>}
   */
  async deleteReminder(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('La base de datos no está inicializada'));
      }
      
      const transaction = this.db.transaction(this.STORES.REMINDERS, 'readwrite');
      const store = transaction.objectStore(this.STORES.REMINDERS);
      const request = store.delete(Number(id));
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Obtiene todas las etiquetas de la base de datos
   * @returns {Promise<Array>} Lista de etiquetas
   */
  async getTags() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('La base de datos no está inicializada'));
      }
      
      const transaction = this.db.transaction(this.STORES.TAGS, 'readonly');
      const store = transaction.objectStore(this.STORES.TAGS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Guarda una etiqueta en la base de datos
   * @param {Object} tag - Datos de la etiqueta
   * @returns {Promise<number>} ID de la etiqueta guardada
   */
  async saveTag(tag) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('La base de datos no está inicializada'));
      }
      
      const transaction = this.db.transaction(this.STORES.TAGS, 'readwrite');
      const store = transaction.objectStore(this.STORES.TAGS);
      
      // Comprobar si ya existe una etiqueta con el mismo nombre
      const index = store.index('name');
      const nameRequest = index.get(tag.name);
      
      nameRequest.onsuccess = () => {
        if (nameRequest.result && (!tag.id || nameRequest.result.id !== tag.id)) {
          return reject(new Error('Ya existe una etiqueta con este nombre'));
        }
        
        // Si la etiqueta ya existe (tiene ID), actualizarla
        const request = tag.id ? 
          store.put(tag) : 
          store.add(tag);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      };
      
      nameRequest.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Elimina una etiqueta por su ID
   * @param {number} id - ID de la etiqueta a eliminar
   * @returns {Promise<void>}
   */
  async deleteTag(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('La base de datos no está inicializada'));
      }
      
      const transaction = this.db.transaction(this.STORES.TAGS, 'readwrite');
      const store = transaction.objectStore(this.STORES.TAGS);
      const request = store.delete(Number(id));
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Exporta todos los datos de la base de datos
   * @returns {Promise<Object>} Datos de la base de datos
   */
  async exportData() {
    try {
      const reminders = await this.getReminders();
      const tags = await this.getTags();
      
      return {
        reminders,
        tags,
        exportDate: new Date().toISOString(),
        version: this.DB_VERSION
      };
    } catch (error) {
      console.error('Error al exportar datos:', error);
      throw error;
    }
  }

  /**
   * Importa datos a la base de datos
   * @param {Object} data - Datos a importar
   * @returns {Promise<void>}
   */
  async importData(data) {
    if (!data || !data.reminders || !data.tags) {
      throw new Error('Los datos a importar no son válidos');
    }
    
    try {
      // Eliminar datos existentes
      await this.clearAllData();
      
      // Importar etiquetas primero
      for (const tag of data.tags) {
        await this.saveTag(tag);
      }
      
      // Importar recordatorios
      for (const reminder of data.reminders) {
        await this.saveReminder(reminder);
      }
      
      return true;
    } catch (error) {
      console.error('Error al importar datos:', error);
      throw error;
    }
  }

  /**
   * Elimina todos los datos de la base de datos
   * @returns {Promise<void>}
   */
  async clearAllData() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('La base de datos no está inicializada'));
      }
      
      const transaction = this.db.transaction([this.STORES.REMINDERS, this.STORES.TAGS], 'readwrite');
      
      transaction.objectStore(this.STORES.REMINDERS).clear();
      transaction.objectStore(this.STORES.TAGS).clear();
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Obtiene los próximos recordatorios pendientes para notificaciones
   * @returns {Promise<Array>} Lista de recordatorios pendientes
   */
  async getPendingReminders() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('La base de datos no está inicializada'));
      }
      
      const transaction = this.db.transaction(this.STORES.REMINDERS, 'readonly');
      const store = transaction.objectStore(this.STORES.REMINDERS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const now = new Date();
        const pendingReminders = request.result.filter(reminder => {
          // Comprobar si el recordatorio no está completado y su fecha ya ha pasado
          return !reminder.completed && new Date(reminder.date) <= now;
        });
        
        resolve(pendingReminders);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
}

// Exportar una instancia del servicio
const dbService = new DBService();