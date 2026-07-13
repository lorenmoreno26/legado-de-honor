# LEGADO DE HONOR - Guia de Ventas

App local para gestionar audios, documentos y mensajes de venta.
Se despliega en tu computadora y otros dispositivos de tu WiFi pueden acceder desde el navegador.

---

## 1. Instalar Node.js (una sola vez)

Descarga e instala Node.js LTS desde: https://nodejs.org

Verifica que quedo instalado abriendo una terminal (CMD en Windows) y escribiendo:

```
node --version
```

Debe mostrar algo como `v20.x.x`.

---

## 2. Instalar la app (una sola vez)

1. Copia la carpeta `legado-de-honor` a donde quieras (por ejemplo, tu Escritorio).
2. Abre una terminal DENTRO de esa carpeta.
   - Windows: click derecho en la carpeta -> "Abrir en Terminal" (o `cd C:\ruta\legado-de-honor`)
   - Mac/Linux: `cd /ruta/legado-de-honor`
3. Instala las dependencias:

```
npm install
```

Espera a que termine (1-2 minutos).

---

## 3. Arrancar la app

En la misma terminal:

```
npm start
```

Veras algo como:

```
========================================
  LEGADO DE HONOR - Guia de Ventas
========================================
  Local:    http://localhost:3000
  WiFi:     http://192.168.1.10:3000
========================================
```

- La linea **Local** funciona solo en la computadora donde corre el servidor.
- La linea **WiFi** es la que debes compartir con tus vendedores para que la abran desde el celular o su computadora, siempre que esten conectados a la misma WiFi.

Para detener el servidor: `Ctrl + C` en la terminal.

---

## 4. Acceder desde otros dispositivos

En cualquier celular, tablet o PC conectado a la MISMA WiFi:

1. Abre el navegador (Chrome, Safari, Edge).
2. Escribe la direccion **WiFi** que aparecio al arrancar (ej: `http://192.168.1.10:3000`).
3. Listo, ya ven la app.

**Tip:** puedes crear un acceso directo en el celular ("Anadir a pantalla de inicio") para abrirla como si fuera app nativa.

---

## 5. Uso de la app

- **Pestanas** arriba: Audios / Documentos / Mensajes.
- **+ Nuevo**: agrega elementos con formulario.
- **Editar / Eliminar** en cada tarjeta.
- En Mensajes: boton **"Rellenar variables"** abre un formulario para reemplazar `[NOMBRE]`, `[FECHA]`, etc., y copiar el mensaje final listo para pegar en WhatsApp.
- Todo se guarda en el archivo `legado.db` (SQLite) dentro de la carpeta. Ese archivo ES tu base de datos: haz un respaldo cada tanto copiandolo a otra ubicacion.

---

## 6. Solucionar problemas

**"npm no se reconoce":** no instalaste Node.js. Vuelve al paso 1.

**No cargan otros dispositivos:** revisa el firewall de Windows. La primera vez que arrancas puede pedirte permitir a Node.js aceptar conexiones. Aceptar "Redes privadas".

**Cambiar puerto (si el 3000 esta ocupado):**
```
set PORT=8080 && npm start        (Windows CMD)
$env:PORT=8080; npm start         (Windows PowerShell)
PORT=8080 npm start               (Mac/Linux)
```

**Reiniciar datos originales del documento:**
```
npm run seed
```
Esto borra todo y recarga los audios/documentos/mensajes originales.

---

## 7. Estructura de archivos

```
legado-de-honor/
├── server.js          <- servidor Express
├── seed.js            <- datos iniciales del documento
├── package.json       <- dependencias
├── legado.db          <- base de datos (se crea sola)
├── public/            <- frontend
│   ├── index.html
│   ├── style.css
│   └── app.js
└── INSTRUCCIONES.md   <- este archivo
```
