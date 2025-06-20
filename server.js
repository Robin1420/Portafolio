const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { getConnection, sql } = require('./config/db');

// Configuración de Multer para subir archivos
// Configuración de almacenamiento para multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'file/datos/foto');
        // Crear el directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Sobrescribir archivos existentes con los mismos nombres
        cb(null, 'foto-personal.png');
    }
});

// Configuración de multer para la foto
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        // Esta ruta se usa para subir fotos, solo permitir imágenes
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, etc.)'));
        }
    }
});

// Configuración de multer para el CV (si es necesario)
const cvStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'file/datos/documento');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'cv-personal.pdf');
    }
});

const uploadCV = multer({
    storage: cvStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        // Esta ruta se usa para subir CVs, solo permitir PDFs
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'));
        }
    }
});

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

// Ruta para subir la foto personal
app.post('/api/upload/foto', upload.single('foto'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ningún archivo o el archivo no es una imagen válida'
            });
        }

        // Devolver la URL del archivo con un timestamp para evitar el caché
        const fileUrl = `/file/datos/foto/foto-personal.png?t=${Date.now()}`;
        
        res.status(200).json({
            success: true,
            message: 'Foto subida correctamente',
            fileUrl: fileUrl,
            nombre: 'foto-personal.png',
            size: req.file.size
        });
    } catch (error) {
        console.error('Error al subir la foto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar la foto',
            details: error.message
        });
    }
});

// Ruta para subir el CV
app.post('/api/upload/cv', uploadCV.single('cv'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ningún archivo o el archivo no es un PDF válido'
            });
        }

        // Devolver la URL del archivo con un timestamp para evitar el caché
        const fileUrl = `/file/datos/documento/cv-personal.pdf?t=${Date.now()}`;
        
        res.status(200).json({
            success: true,
            message: 'CV subido correctamente',
            fileUrl: fileUrl,
            nombre: 'cv-personal.pdf',
            size: req.file.size
        });
    } catch (error) {
        console.error('Error al subir el CV:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar el CV',
            details: error.message
        });
    }
});

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

// Ruta para subir archivos (foto o CV) - Ruta obsoleta, usar /api/upload/foto o /api/upload/cv
router.post('/upload/:tipo', (req, res) => {
    return res.status(400).json({
        success: false,
        error: 'Ruta obsoleta. Usa /api/upload/foto para fotos o /api/upload/cv para CVs'
    });
            return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
        }

        const fileUrl = `/file/datos/${req.file.filename}`;
        const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;
        
        res.status(200).json({
            mensaje: 'Archivo subido correctamente',
            url: fullUrl,
            nombre: req.file.filename,
            tipo: req.file.mimetype,
            size: req.file.size
        });
    } catch (error) {
        console.error('Error al subir el archivo:', error);
        res.status(500).json({ 
            error: 'Error al subir el archivo',
            detalles: error.message 
        });
    }
});

// Ruta para obtener la URL de la foto o CV
router.get('/archivo/:tipo', async (req, res) => {
    try {
        const tipo = req.params.tipo;
        const filename = tipo === 'foto' ? 'foto-personal.png' : 'cv-personal.pdf';
        const filePath = path.join(__dirname, 'file', 'datos', filename);
        
        // Verificar si el archivo existe
        if (fs.existsSync(filePath)) {
            const fileUrl = `/file/datos/${filename}`;
            const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;
            res.json({ url: fullUrl, existe: true });
        } else {
            res.json({ url: null, existe: false });
        }
    } catch (error) {
        console.error('Error al obtener la URL del archivo:', error);
        res.status(500).json({ 
            error: 'Error al obtener la URL del archivo',
            detalles: error.message 
        });
    }
});

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



// Ruta para subir la foto de perfil
// Ruta duplicada eliminada

// Ruta para subir el CV
app.post('/api/upload/cv', uploadCV.single('archivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ningún archivo o el archivo no es un PDF válido'
            });
        }
        
        // Construir la URL completa del archivo
        const fileUrl = `/file/datos/documento/cv-personal.pdf?t=${Date.now()}`;
        
        res.json({
            success: true,
            message: 'CV subido correctamente',
            fileUrl: fileUrl,
            nombre: 'cv-personal.pdf',
            size: req.file.size
        });
    } catch (error) {
        console.error('Error al subir el CV:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al subir el CV',
            details: error.message 
        });
    }
});

// Asegurarse de que los directorios existan al iniciar el servidor
const ensureDirectories = () => {
    const dirs = [
        path.join(__dirname, 'file/datos/foto'),
        path.join(__dirname, 'file/datos/documento')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Directorio creado: ${dir}`);
        } else {
            console.log(`El directorio ya existe: ${dir}`);
        }
    });
};

// Crear directorios al iniciar
ensureDirectories();

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
