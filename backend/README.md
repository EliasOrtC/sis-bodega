# Backend de Inventario

## Modo Offline/Online

Esta aplicación puede funcionar en modo offline usando una base de datos local SQLite, o en modo online usando Turso.

### Cambiar entre modos

En `db.js`, cambia la variable `USE_LOCAL_DB`:

- `const USE_LOCAL_DB = true;` // Modo offline (base de datos local)
- `const USE_LOCAL_DB = false;` // Modo online (Turso)

Reinicia el servidor después de cambiar la variable.

### Sincronización manual

Para sincronizar los datos de la base de datos local a Turso (cuando tengas conexión a internet):

```bash
npm run sync
```

Esto reemplazará los datos en Turso con los de la base de datos local.

**Nota:** Asegúrate de tener conexión a internet antes de ejecutar el comando de sincronización.

### Inicio del servidor

```bash
npm start
```

### Cómo usar:
Para modo offline: Asegúrate de que USE_LOCAL_DB = true en db.js y reinicia el servidor.
Para sincronizar con Turso: Ejecuta npm run sync en el directorio backend cuando tengas internet. Esto copiará todos los datos locales a Turso.