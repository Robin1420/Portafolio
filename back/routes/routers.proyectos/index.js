const express = require('express');
const router = express.Router();
const proyectosRouter = require('./proyectos.routers');

// Middleware para el router de API
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] API Proyectos Request: ${req.method} ${req.originalUrl}`);
    next();
});

// Montar las rutas de proyectos bajo /proyectos
router.use('/proyectos', proyectosRouter);

// Ruta de prueba
router.get('/test', (req, res) => {
    res.json({ message: 'Proyectos API is working!' });
});

// Ruta raíz de la API de proyectos
router.get('/', (req, res) => {
    res.json({
        message: 'Bienvenido a la API de Proyectos',
        endpoints: {
            proyectos: '/api/proyectos',
            proyectoById: '/api/proyectos/:id'
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
