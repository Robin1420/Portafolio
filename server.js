const express = require('express');
const cors = require('cors');
const path = require('path');
const { getConnection, sql } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
const corsOptions = {
    origin: '*', // En producción, reemplaza con el dominio de tu frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar preflight para todas las rutas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'src')));

// Middleware para logging de solicitudes
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Ruta raíz
app.get('/', (req, res) => {
    res.redirect('/DatosPersonales/viewDP.html');
});

// Rutas API
const router = express.Router();

// Obtener todos los registros
router.get('/api/datos-personales', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .query('SELECT * FROM datos_personales');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener datos personales:', error);
        res.status(500).json({ error: 'Error al obtener los datos' });
    }
});

// Obtener un registro por ID
router.get('/api/datos-personales/:id', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT id, nombre, profesion, descripcion, email, telefono, direccion FROM datos_personales WHERE id = @id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error(`Error al obtener datos personales con ID ${req.params.id}:`, error);
        res.status(500).json({ error: 'Error al obtener el registro' });
    }
});

// Obtener la foto de perfil
router.get('/api/datos-personales/:id/foto', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT foto_perfil FROM datos_personales WHERE id = @id');
        
        if (result.recordset.length === 0 || !result.recordset[0].foto_perfil) {
            console.log('No se encontró la foto para el ID:', req.params.id);
            return res.status(404).send('Foto no encontrada');
        }
        
        // Obtener el buffer de la imagen
        const fotoBuffer = result.recordset[0].foto_perfil;
        
        // Verificar si el buffer es válido
        if (!fotoBuffer || fotoBuffer.length === 0) {
            console.log('El buffer de la foto está vacío para el ID:', req.params.id);
            return res.status(404).send('La foto no tiene datos');
        }
        
        // Configurar los encabezados para una imagen
        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': fotoBuffer.length,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        });
        
        // Enviar la imagen
        res.end(fotoBuffer);
    } catch (error) {
        console.error(`Error al obtener la foto de perfil con ID ${req.params.id}:`, error);
        res.status(500).send('Error al obtener la foto de perfil');
    }
});

// Obtener el CV
router.get('/api/datos-personales/:id/cv', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT cv FROM datos_personales WHERE id = @id');
        
        if (result.recordset.length === 0 || !result.recordset[0].cv) {
            return res.status(404).json({ error: 'CV no encontrado' });
        }
        
        // Configurar los encabezados para un PDF
        const cvBuffer = result.recordset[0].cv;
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename=CV.pdf',
            'Content-Length': cvBuffer.length
        });
        res.end(cvBuffer);
    } catch (error) {
        console.error(`Error al obtener el CV con ID ${req.params.id}:`, error);
        res.status(500).json({ error: 'Error al obtener el CV' });
    }
});

// Crear un nuevo registro
router.post('/api/datos-personales', async (req, res) => {
    try {
        const { nombre, profesion, descripcion, email, telefono, direccion } = req.body;
        
        const pool = await getConnection();
        const result = await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('profesion', sql.VarChar(100), profesion)
            .input('descripcion', sql.Text, descripcion)
            .input('email', sql.VarChar(100), email)
            .input('telefono', sql.VarChar(30), telefono)
            .input('direccion', sql.VarChar(200), direccion)
            .query(`INSERT INTO datos_personales 
                   (nombre, profesion, descripcion, email, telefono, direccion) 
                   VALUES (@nombre, @profesion, @descripcion, @email, @telefono, @direccion);
                   SELECT SCOPE_IDENTITY() as id`);
        
        res.status(201).json({ id: result.recordset[0].id });
    } catch (error) {
        console.error('Error al crear datos personales:', error);
        res.status(500).json({ error: 'Error al crear el registro' });
    }
});

// Actualizar un registro
router.put('/api/datos-personales/:id', async (req, res) => {
    try {
        const { nombre, profesion, descripcion, email, telefono, direccion } = req.body;
        
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('nombre', sql.VarChar(100), nombre)
            .input('profesion', sql.VarChar(100), profesion)
            .input('descripcion', sql.Text, descripcion)
            .input('email', sql.VarChar(100), email)
            .input('telefono', sql.VarChar(30), telefono)
            .input('direccion', sql.VarChar(200), direccion)
            .query(`UPDATE datos_personales 
                   SET nombre = @nombre, 
                       profesion = @profesion, 
                       descripcion = @descripcion, 
                       email = @email, 
                       telefono = @telefono, 
                       direccion = @direccion 
                   WHERE id = @id`);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        
        res.json({ message: 'Registro actualizado correctamente' });
    } catch (error) {
        console.error(`Error al actualizar datos personales con ID ${req.params.id}:`, error);
        res.status(500).json({ error: 'Error al actualizar el registro' });
    }
});

// Eliminar un registro
router.delete('/api/datos-personales/:id', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM datos_personales WHERE id = @id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        
        res.json({ message: 'Registro eliminado correctamente' });
    } catch (error) {
        console.error(`Error al eliminar datos personales con ID ${req.params.id}:`, error);
        res.status(500).json({ error: 'Error al eliminar el registro' });
    }
});

app.use(router);

// Servir la aplicación React en producción
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
}

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);n});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
