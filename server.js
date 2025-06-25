require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getConnection } = require('./back/config/db.config');
const proyectosRoutes = require('./back/routes/routers.proyectos/proyectos.routers');
const datosPersonalesRoutes = require('./back/routes/routers.datosPerosnales');
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
    extensions: ['html'],
    setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// Ruta específica para Datos Personales
app.use('/DatosPersonales', express.static(path.join(__dirname, 'src/DatosPersonales'), {
    index: 'viewDP.html',
    extensions: ['html'],
    setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// Ruta alternativa para proyectos
app.get('/proyectos', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/Proyectos/viewP.html'));
});

// Ruta alternativa para datos personales
app.get('/datos-personales', (req, res) => {
    res.redirect('/DatosPersonales/viewDP.html');
});

// Configuración de archivos estáticos para archivos subidos
app.use('/file', express.static(path.join(__dirname, 'file'), {
    setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    },
    index: false
}));

// Importar las rutas de archivos de datos personales
const fileDatosPersonalesRoutes = require('./back/routes/routers.datosPerosnales/file.datosPersonales.routes');

// Montar las rutas de la API
// Rutas de archivos de datos personales
app.use('/api/upload', fileDatosPersonalesRoutes);

// Rutas de datos personales
app.use('/api/datos-personales', require('./back/routes/routers.datosPerosnales/datosPersonales.routes'));

// Rutas de proyectos
app.use('/api/proyectos', proyectosRoutes);

// Ruta de bienvenida
app.get('/', (req, res) => {
    // Puedes redirigir a un dashboard o página de inicio
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Portafolio - Inicio</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                    background-color: #f5f5f5;
                }
                .container { 
                    text-align: center; 
                    padding: 2rem; 
                    background: white; 
                    border-radius: 8px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { 
                    color: #333; 
                    margin-bottom: 2rem;
                }
                .nav-links { 
                    display: flex; 
                    gap: 1rem; 
                    justify-content: center;
                }
                .nav-link { 
                    display: inline-block; 
                    padding: 0.8rem 1.5rem; 
                    background-color: #4CAF50; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 4px; 
                    transition: background-color 0.3s;
                }
                .nav-link:hover { 
                    background-color: #45a049; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Bienvenido al Portafolio</h1>
                <div class="nav-links">
                    <a href="/DatosPersonales/viewDP.html" class="nav-link">Datos Personales</a>
                    <a href="/Proyectos/viewP.html" class="nav-link">Proyectos</a>
                </div>
            </div>
        </body>
        </html>
    `);
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
