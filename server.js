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
const skillsRoutes = require('./back/routes/routers.skills/skills.routers'); // Importando el router de skills

// Inicializar la aplicación Express
const app = express();

// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname, 'src')));  // Servir archivos estáticos del directorio src

// Middleware para parsear JSON
app.use(express.json());
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
app.use(express.json()); // Para parsear application/json
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

// Middleware para registrar las peticiones a la API
app.use('/api', (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

// Rutas de proyectos
app.use('/api/proyectos', proyectosRoutes);

// Rutas de skills
console.log('Registrando rutas de skills...');
app.use('/api/skills', skillsRoutes);

// Agregar un manejador de ruta para verificar que las rutas estén registradas
app._router.stack.forEach((layer) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
    console.log(`${methods.padEnd(7)} ${layer.route.path}`);
  } else if (layer.name === 'router') {
    // Para rutas montadas con app.use()
    if (layer.regexp.toString().includes('skills')) {
      console.log('Rutas de skills registradas:');
      layer.handle.stack.forEach(handler => {
        const route = handler.route;
        if (route) {
          const methods = Object.keys(route.methods).join(',').toUpperCase();
          console.log(`  ${methods.padEnd(7)} /api/skills${route.path}`);
        }
      });
    }
  }
});

// Ruta para servir la vista de skills
app.get('/Skills/viewS.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/Skills/viewS.html'));
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
