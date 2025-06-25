require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getConnection } = require('./back/config/db.config');
const proyectosRoutes = require('./back/routes/routers.proyectos/proyectos.routers');
const datosPersonalesRoutes = require('./back/routes/routers.datosPerosnales/datosPersonales.routes');
const { errorHandler, notFoundHandler } = require('./back/middlewares/error.middleware');
const { logger, errorLogger } = require('./back/middlewares/logger.middleware');

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware básico
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use(logger);

// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'src')));

// Ruta específica para los archivos de proyectos
app.use('/Proyectos', express.static(path.join(__dirname, 'src/Proyectos'), {
    index: 'viewP.html',
    extensions: ['html']
}));

// Ruta alternativa para proyectos
app.get('/proyectos', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/Proyectos/viewP.html'));
});

// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'src')));
app.use('/file', express.static(path.join(__dirname, 'file'), {
    setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// Montar las rutas de la API
// Las rutas de datos personales estarán en /api/datos-personales
app.use('/api/datos-personales', datosPersonalesRoutes);

// Las rutas de proyectos estarán en /api/proyectos
app.use('/api/proyectos', proyectosRoutes);

// Ruta de bienvenida
app.get('/', (req, res) => {
    res.redirect('/DatosPersonales/viewDP.html');
});

// Manejador para rutas no encontradas (debe ir al final)
app.use((req, res) => {
    console.log(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method
    });
});

// Middleware de manejo de errores
app.use(errorLogger);

// Crear directorios necesarios
const requiredDirs = [
    'file/datos/foto',
    'file/datos/documento'
];

requiredDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// Manejadores de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar el servidor
const startServer = async () => {
    try {
        // Probar la conexión a la base de datos
        const pool = await getConnection();
        await pool.request().query('SELECT 1');
        console.log('Conexión a la base de datos establecida correctamente');
        
        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en el puerto ${PORT}`);
            console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        process.exit(1);
    }
};

// Iniciar la aplicación
startServer();

// Manejadores de cierre
process.on('SIGINT', () => {
    console.log('\nCerrando servidor...');
    process.exit(0);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});
