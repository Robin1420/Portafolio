const path = require('path');
const fs = require('fs');

// Función para manejar la subida de fotos
exports.uploadFoto = (req, res) => {
    console.log('Solicitud de subida de foto recibida');
    console.log('Archivo recibido:', req.file);
    
    try {
        if (!req.file) {
            console.error('No se recibió ningún archivo o el archivo no es válido');
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ningún archivo o el archivo no es una imagen válida',
                details: req.file ? 'Tipo de archivo no soportado' : 'Ningún archivo recibido'
            });
        }

        // Construir la URL del archivo
        const fileUrl = `/file/datos/foto/foto-personal.png?t=${Date.now()}`;
        
        console.log('Foto subida correctamente:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: fileUrl
        });
        
        res.status(200).json({
            success: true,
            message: 'Foto subida correctamente',
            fileUrl: fileUrl,
            nombre: 'foto-personal.png',
            size: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        console.error('Error al subir la foto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar la foto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Función para manejar la subida de CV
exports.uploadCV = (req, res) => {
    console.log('Solicitud de subida de CV recibida');
    console.log('Archivo recibido:', req.file);
    
    try {
        if (!req.file) {
            console.error('No se recibió ningún archivo o el archivo no es un PDF válido');
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ningún archivo o el archivo no es un PDF válido',
                details: req.file ? 'Tipo de archivo no soportado' : 'Ningún archivo recibido'
            });
        }

        // Construir la URL del archivo
        const fileUrl = `/file/datos/documento/cv-personal.pdf?t=${Date.now()}`;
        
        console.log('CV subido correctamente:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: fileUrl
        });
        
        res.status(200).json({
            success: true,
            message: 'CV subido correctamente',
            fileUrl: fileUrl,
            nombre: 'cv-personal.pdf',
            size: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        console.error('Error al subir el CV:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar el CV',
            details: error.message
        });
    }
};

// Función para obtener la URL de un archivo
exports.getFileUrl = (req, res) => {
    console.log(`Solicitud de archivo recibida. Tipo: ${req.params.tipo}`);
    
    try {
        const { tipo } = req.params;
        let filePath = '';
        let fileName = '';
        
        // Determinar la ruta del archivo según el tipo
        if (tipo === 'foto') {
            filePath = path.join(process.cwd(), 'file/datos/foto/foto-personal.png');
            fileName = 'foto-personal.png';
        } else if (tipo === 'cv') {
            filePath = path.join(process.cwd(), 'file/datos/documento/cv-personal.pdf');
            fileName = 'cv-personal.pdf';
        } else {
            console.error(`Tipo de archivo no válido: ${tipo}`);
            return res.status(400).json({ 
                success: false, 
                error: 'Tipo de archivo no válido',
                message: 'El tipo debe ser "foto" o "cv"',
                received: tipo
            });
        }
        
        console.log(`Buscando archivo en: ${filePath}`);
        
        // Verificar si el archivo existe
        if (!fs.existsSync(filePath)) {
            console.error(`Archivo no encontrado: ${filePath}`);
            return res.status(404).json({ 
                success: false, 
                error: 'Archivo no encontrado',
                path: filePath,
                message: `El archivo ${fileName} no existe en el servidor`
            });
        }
        
        console.log(`Enviando archivo: ${filePath}`);
        
        // Configurar las cabeceras para evitar el caché
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Enviar el archivo
        res.sendFile(filePath, {
            headers: {
                'Content-Type': tipo === 'foto' ? 'image/png' : 'application/pdf',
                'Content-Disposition': `inline; filename="${fileName}"`
            }
        });
    } catch (error) {
        console.error('Error al obtener el archivo:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener el archivo',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Ruta para verificar que los archivos estáticos se están sirviendo correctamente
exports.checkFiles = (req, res) => {
    res.json({
        message: 'Servidor funcionando correctamente',
        rutas: {
            archivos: '/file',
            public: '/public',
            src: '/src'
        }
    });
};