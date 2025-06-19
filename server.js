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
            .query('SELECT *, CASE WHEN cv IS NOT NULL THEN 1 ELSE 0 END as has_cv FROM datos_personales');
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

// Endpoint para obtener el CV
router.get('/api/datos-personales/:id/cv', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT cv, nombre FROM datos_personales WHERE id = @id');
        
        if (result.recordset.length === 0 || !result.recordset[0].cv) {
            return res.status(404).json({ error: 'CV no encontrado' });
        }
        
        const cvBuffer = result.recordset[0].cv;
        const nombre = (result.recordset[0].nombre || 'CV').trim();
        const apellido = (result.recordset[0].apellido || '').trim();
        const nombreArchivo = `${nombre}${apellido ? '_' + apellido : ''}_CV.pdf`;
        
        // Configurar los encabezados para la visualización en el navegador
        res.setHeader('Content-Type', 'application/pdf');
        
        // Si hay un parámetro 'download', forzar la descarga
        if (req.query.download) {
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
        }
        
        res.setHeader('Content-Length', cvBuffer.length);
        
        // Enviar el archivo
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
        const { nombre, profesion, descripcion, email, telefono, direccion, foto_perfil, cv } = req.body;
        
        // Iniciar la construcción de la consulta SQL
        let query = 'UPDATE datos_personales SET ';
        const inputs = [];
        
        // Agregar campos básicos
        const fields = [
            { name: 'nombre', value: nombre, type: sql.VarChar(100) },
            { name: 'profesion', value: profesion, type: sql.VarChar(100) },
            { name: 'descripcion', value: descripcion, type: sql.Text },
            { name: 'email', value: email, type: sql.VarChar(100) },
            { name: 'telefono', value: telefono, type: sql.VarChar(30) },
            { name: 'direccion', value: direccion, type: sql.VarChar(200) }
        ];
        
        // Filtrar solo los campos que tienen valor
        const validFields = fields.filter(field => field.value !== undefined && field.value !== null);
        
        // Construir la parte SET de la consulta SQL
        const setClauses = [];
        validFields.forEach((field, index) => {
            const paramName = `param${index}`;
            setClauses.push(`${field.name} = @${paramName}`);
            inputs.push({ name: paramName, value: field.value, type: field.type });
        });
        
        // Manejar la foto de perfil si está presente
        if (foto_perfil) {
            // Convertir base64 a buffer
            const matches = foto_perfil.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const buffer = Buffer.from(matches[2], 'base64');
                setClauses.push('foto_perfil = @fotoParam');
                inputs.push({ name: 'fotoParam', value: buffer, type: sql.VarBinary(sql.MAX) });
            }
        }
        
        // Manejar el CV si está presente
        if (cv) {
            // Convertir base64 a buffer
            const matches = cv.match(/^data:application\/pdf;base64,(.+)$/);
            if (matches && matches.length === 2) {
                const buffer = Buffer.from(matches[1], 'base64');
                setClauses.push('cv = @cvParam');
                inputs.push({ name: 'cvParam', value: buffer, type: sql.VarBinary(sql.MAX) });
            }
        }
        
        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
        }
        
        // Agregar la cláusula WHERE
        query += setClauses.join(', ') + ' WHERE id = @id';
        
        // Agregar el ID a los inputs
        inputs.push({ name: 'id', value: parseInt(req.params.id), type: sql.Int });
        
        // Construir la solicitud
        const pool = await getConnection();
        const request = pool.request();
        
        // Agregar todos los parámetros a la solicitud
        inputs.forEach(input => {
            request.input(input.name, input.type, input.value);
        });
        
        // Ejecutar la consulta
        const result = await request.query(query);
        
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
