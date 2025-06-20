const express = require('express');
const cors = require('cors');
const path = require('path');
const { getConnection, sql } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200 // Algunos navegadores antiguos (IE11, varios SmartTVs) se ahogan con 204
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar preflight para todas las rutas

// Manejar preflight para todas las rutas
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Max-Age', '86400'); // 24 horas
        return res.status(200).json({});
    }
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'src')));
app.use('/file', express.static(path.join(__dirname, 'file'), {
    setHeaders: (res, path) => {
        // Establecer los encabezados CORS necesarios
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// Ruta para verificar que los archivos estáticos se están sirviendo correctamente
app.get('/check-files', (req, res) => {
    res.json({
        message: 'Servidor funcionando correctamente',
        rutas: {
            archivos: '/file',
            public: '/public',
            src: '/src'
        }
    });
});

// Middleware para logging de solicitudes
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Ruta raíz
app.get('/', (req, res) => {
    res.redirect('/DatosPersonales/viewDP.html');
});

// Configuración de rutas API
const router = express.Router();

// Middleware para el router de API
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Crear un nuevo registro
router.post('/datos-personales', async (req, res) => {
    try {
        const { nombre, profesion, descripcion, email, telefono, direccion } = req.body;
        
        // Validar campos requeridos
        if (!nombre || !email) {
            return res.status(400).json({ 
                error: 'Los campos nombre y email son obligatorios',
                camposRequeridos: ['nombre', 'email']
            });
        }
        
        const pool = await getConnection();
        const result = await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('profesion', sql.VarChar(100), profesion || null)
            .input('descripcion', sql.Text, descripcion || null)
            .input('email', sql.VarChar(100), email)
            .input('telefono', sql.VarChar(20), telefono || null)
            .input('direccion', sql.VarChar(200), direccion || null)
            .query(`
                INSERT INTO datos_personales (nombre, profesion, descripcion, email, telefono, direccion)
                OUTPUT INSERTED.id
                VALUES (@nombre, @profesion, @descripcion, @email, @telefono, @direccion)
            `);
            
        const newId = result.recordset[0].id;
        
        // Obtener el registro recién creado para devolverlo
        const newRecord = await pool.request()
            .input('id', sql.Int, newId)
            .query('SELECT id, nombre, profesion, descripcion, email, telefono, direccion FROM datos_personales WHERE id = @id');
            
        res.status(201).json(newRecord.recordset[0]);
    } catch (error) {
        console.error('Error al crear nuevo registro:', error);
        
        if (error.number === 2627) { // Violación de restricción única (email duplicado)
            return res.status(409).json({ 
                error: 'El correo electrónico ya está registrado',
                campo: 'email'
            });
        }
        
        res.status(500).json({ 
            error: 'Error al crear el registro',
            detalles: error.message 
        });
    }
});

// Obtener todos los registros
router.get('/datos-personales', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .query('SELECT id, nombre, profesion, descripcion, email, telefono, direccion FROM datos_personales');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener datos personales:', error);
        res.status(500).json({ error: 'Error al obtener los datos' });
    }
});

// Obtener un registro por ID
router.get('/datos-personales/:id', async (req, res) => {
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

// Actualizar un registro (solo campos de texto por ahora)
router.put('/datos-personales/:id', async (req, res) => {
    try {
        const { nombre, profesion, descripcion, email, telefono, direccion } = req.body;
        const id = parseInt(req.params.id);
        
        console.log(`[${new Date().toISOString()}] Actualizando registro ID: ${id}`, {
            nombre: nombre ? `${nombre.substring(0, 20)}...` : null,
            profesion: profesion || null,
            email: email || null,
            telefono: telefono || null,
            direccion: direccion ? `${direccion.substring(0, 30)}...` : null
        });
        
        // Validar que el ID sea un número válido
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ 
                error: 'ID de registro no válido',
                received: req.params.id
            });
        }
        
        // Validar que al menos un campo se esté actualizando
        const camposActualizables = { nombre, profesion, descripcion, email, telefono, direccion };
        const camposProporcionados = Object.entries(camposActualizables)
            .filter(([_, value]) => value !== undefined)
            .map(([key]) => key);
            
        if (camposProporcionados.length === 0) {
            return res.status(400).json({ 
                error: 'Se requiere al menos un campo para actualizar',
                camposDisponibles: ['nombre', 'profesion', 'descripcion', 'email', 'telefono', 'direccion']
            });
        }
        
        const pool = await getConnection();
        
        // Construir la consulta de actualización
        const setClauses = [];
        const params = { id: { value: id, type: sql.Int } };
        
        // Agregar solo los campos que se están actualizando
        if (nombre !== undefined) {
            setClauses.push('nombre = @nombre');
            params.nombre = { value: nombre, type: sql.VarChar(100) };
        }
        if (profesion !== undefined) {
            setClauses.push('profesion = @profesion');
            params.profesion = { value: profesion, type: sql.VarChar(100) };
        }
        if (descripcion !== undefined) {
            setClauses.push('descripcion = @descripcion');
            params.descripcion = { value: descripcion, type: sql.Text };
        }
        if (email !== undefined) {
            setClauses.push('email = @email');
            params.email = { value: email, type: sql.VarChar(100) };
        }
        if (telefono !== undefined) {
            setClauses.push('telefono = @telefono');
            params.telefono = { value: telefono, type: sql.VarChar(30) };
        }
        if (direccion !== undefined) {
            setClauses.push('direccion = @direccion');
            params.direccion = { value: direccion, type: sql.VarChar(200) };
        }
        
        // Construir la consulta final
        const query = `
            UPDATE datos_personales 
            SET ${setClauses.join(', ')}
            WHERE id = @id;
            
            SELECT id, nombre, profesion, descripcion, email, telefono, direccion
            FROM datos_personales 
            WHERE id = @id;
        `;
        
        console.log('Ejecutando consulta SQL:', query.replace(/\s+/g, ' ').trim());
        
        // Crear la solicitud
        const request = pool.request();
        
        // Agregar parámetros
        Object.entries(params).forEach(([name, { value, type }]) => {
            request.input(name, type, value);
        });
        
        // Ejecutar la consulta
        const result = await request.query(query);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'Registro no encontrado',
                id: id
            });
        }
        
        console.log(`Registro con ID ${id} actualizado correctamente`);
        
        res.json({ 
            success: true,
            message: 'Registro actualizado correctamente',
            data: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Error al actualizar datos personales:', {
            error: error.message,
            stack: error.stack,
            body: req.body,
            params: req.params
        });
        
        res.status(500).json({ 
            error: 'Error al actualizar el registro',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});



// Montar el router en la ruta /api
app.use('/api', router);

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
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
