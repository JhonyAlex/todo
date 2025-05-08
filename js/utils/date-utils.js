/**
 * Utilidades para manejo de fechas
 */
const DateUtils = {
  /**
   * Formatea una fecha en formato legible
   * @param {string|Date} date - Fecha a formatear
   * @param {boolean} includeTime - Indica si incluir la hora
   * @returns {string} Fecha formateada
   */
  formatDate(date, includeTime = true) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const options = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return dateObj.toLocaleDateString(undefined, options);
  },
  
  /**
   * Comprueba si una fecha es hoy
   * @param {Date|string} date - Fecha a comprobar
   * @returns {boolean} true si es hoy
   */
  isToday(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    
    return dateObj.getDate() === today.getDate() &&
           dateObj.getMonth() === today.getMonth() &&
           dateObj.getFullYear() === today.getFullYear();
  },
  
  /**
   * Comprueba si una fecha ya ha pasado
   * @param {string|Date} date - Fecha a comprobar
   * @returns {boolean} true si la fecha ya ha pasado
   */
  isPast(date) {
    if (!date) return false;
    
    const dateObj = new Date(date);
    const now = new Date();
    
    return dateObj < now;
  },
  
  /**
   * Obtiene una fecha futura
   * @param {number} days - Días a sumar
   * @param {Date} [startDate=new Date()] - Fecha base
   * @returns {Date} Fecha futura
   */
  getFutureDate(days, startDate = new Date()) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    return date;
  },
  
  /**
   * Añade minutos a una fecha
   * @param {number} minutes - Minutos a sumar
   * @param {Date} [startDate=new Date()] - Fecha base
   * @returns {Date} Nueva fecha
   */
  addMinutes(minutes, startDate = new Date()) {
    const date = new Date(startDate);
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  },
  
  /**
   * Añade el número especificado de minutos a la fecha actual
   * @param {number} minutes - Minutos a añadir
   * @returns {Date} Nueva fecha
   */
  addMinutes(minutes) {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  },
  
  /**
   * Calcula el tiempo restante en formato legible
   * @param {string|Date} futureDate - Fecha futura
   * @returns {string} Tiempo restante en formato legible
   */
  getTimeRemaining(futureDate) {
    if (!futureDate) return '';
    
    const future = new Date(futureDate);
    const now = new Date();
    
    // Si ya pasó la fecha
    if (future <= now) return 'Vencido';
    
    const diffMs = future - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    }
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    
    return `${diffMinutes}m`;
  },
  
  /**
   * Obtiene el inicio del día actual
   * @returns {Date} Fecha con hora 00:00:00
   */
  startOfDay() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  },
  
  /**
   * Obtiene el final del día actual
   * @returns {Date} Fecha con hora 23:59:59
   */
  endOfDay() {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }
};