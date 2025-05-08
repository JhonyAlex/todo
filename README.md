# Recordatorios App

Una aplicación web para gestionar recordatorios con notificaciones persistentes.

## Características

- Creación y gestión de recordatorios con título, descripción, fecha y hora
- Editor de texto enriquecido (estilo Notion) para las descripciones
- Notificaciones en el navegador para recordatorios pendientes
- Sistema de notificaciones persistentes (vuelven a aparecer si no son respondidas)
- Organización con etiquetas personalizables
- Filtrado y búsqueda de recordatorios
- Exportación e importación de datos (respaldos)
- Interfaz adaptativa para dispositivos móviles
- Almacenamiento local mediante IndexedDB

## Uso

1. Haz clic en "Nuevo recordatorio" para crear un recordatorio
2. Establece un título, destinatario, fecha y hora
3. Usa el editor para añadir detalles al recordatorio
4. Asigna etiquetas al recordatorio para organizarlo
5. Guarda el recordatorio

Cuando llegue la fecha y hora del recordatorio, recibirás una notificación en el navegador. Si no interactúas con la notificación, volverá a aparecer a los 5 minutos.

## Tecnologías utilizadas

- HTML5, CSS3, JavaScript
- IndexedDB para almacenamiento local
- Service Workers para notificaciones en segundo plano
- Bootstrap 5 para la interfaz
- Quill.js para el editor de texto enriquecido

## Instalación

1. Clona este repositorio
2. Abre index.html en un navegador moderno
3. Permite las notificaciones cuando se te solicite

También puedes acceder a la aplicación en línea a través de GitHub Pages: [URL de la aplicación]

## Licencia

[MIT License]