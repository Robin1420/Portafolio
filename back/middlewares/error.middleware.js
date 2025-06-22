// Middleware para manejo de errores
exports.errorHandler = (err, req, res, next) => {
    console.error('Error no manejado:', err);
    
    // Error de validación
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Error de validación',
            detalles: err.message,
            campos: err.errors
        });
    }
    
    // Error de duplicado (por ejemplo, email duplicado)
    if (err.code === 11000) {
        return res.status(409).json({
            error: 'Conflicto de datos',
            detalles: 'El registro ya existe',
            campo: Object.keys(err.keyPattern)[0]
        });
    }
    
    // Error de autenticación/autorización
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'No autorizado',
            detalles: err.message
        });
    }
    
    // Error de sintaxis JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'Error de sintaxis en la petición',
            detalles: 'El cuerpo de la petición no es un JSON válido'
        });
    }
    
    // Error interno del servidor (por defecto)
    res.status(500).json({
        error: 'Error interno del servidor',
        detalles: process.env.NODE_ENV === 'development' ? err.message : 'Ocurrió un error inesperado'
    });
};

// Middleware para manejar rutas no encontradas
exports.notFoundHandler = (req, res, next) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        ruta: req.originalUrl
    });
};