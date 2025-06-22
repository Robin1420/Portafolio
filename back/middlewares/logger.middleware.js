const logger = (req, res, next) => {
    const start = Date.now();
    
    // Capturar el final de la respuesta
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} ${duration}ms`);
    });
    
    next();
};

const errorLogger = (err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
    console.error('Stack:', err.stack);
    next(err);
};

module.exports = {
    logger,
    errorLogger
};