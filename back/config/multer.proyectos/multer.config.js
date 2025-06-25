const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Directorio base para las cargas
const UPLOAD_DIR = path.join(__dirname, '../../../file/proyectos');

// Asegurarse de que el directorio de carga exista
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`Directorio de carga creado: ${UPLOAD_DIR}`);
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Generar un nombre de archivo único
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `temp_${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

// Filtro para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB
    }
});

// Middleware para manejar errores de carga
const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Un error de Multer al cargar
        return res.status(400).json({
            success: false,
            error: `Error al cargar el archivo: ${err.message}`
        });
    } else if (err) {
        // Un error desconocido
        return res.status(400).json({
            success: false,
            error: err.message || 'Error al procesar el archivo'
        });
    }
    // Si no hay errores, continuar
    next();
};

module.exports = {
    upload,
    handleUploadErrors,
    UPLOAD_DIR
};
