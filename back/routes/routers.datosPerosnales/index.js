const express = require('express');
const router = express.Router();
const fileRoutes = require('./file.datosPersonales.routes');
const datosPersonalesRoutes = require('./datosPersonales.routes');

// Middleware para el router de API
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] API Request: ${req.method} ${req.originalUrl}`);
    next();
});

// Montar las rutas de archivos bajo /api/upload
router.use('/upload', fileRoutes);

// Montar las rutas de datos personales bajo /api
router.use('/datos-personales', datosPersonalesRoutes);

// Ruta de prueba
router.get('/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// Ruta raíz de la API
router.get('/', (req, res) => {
    res.json({
        message: 'Bienvenido a la API del Portafolio',
        endpoints: {
            datosPersonales: '/api/datos-personales',
            files: '/api/file'
        }
    });
});

// Manejador para rutas no encontradas en la API
router.use((req, res) => {
    console.log(`[${new Date().toISOString()}] Ruta no encontrada: ${req.originalUrl}`);
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method
    });
});

module.exports = router;    