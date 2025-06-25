const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getConnection, sql } = require('../../../config/db.config');
const fileProyectosController = require('../../controllers/controllers.proyectos/file.proyectos.controller');
const upload = require('../../config/multer.proyectos/multer.config');

// Obtener la imagen de un proyecto
router.get('/:id/imagen', fileProyectosController.getImagenProyecto);

// Subir imagen de un proyecto
router.post('/:id/imagen', upload.single('imagen'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
        }

        const { id } = req.params;
        const extension = path.extname(req.file.originalname).toLowerCase();
        const nombreArchivo = `proyecto${id}${extension}`;
        const nuevoPath = path.join(__dirname, `../../../file/proyectos/${nombreArchivo}`);
        
        // Renombrar el archivo temporal al nombre definitivo
        fs.renameSync(req.file.path, nuevoPath);
        
        // Actualizar la base de datos con el nombre del archivo
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('imagen', sql.VarChar, nombreArchivo)
            .query('UPDATE proyectos SET imagen = @imagen WHERE id = @id');
        
        res.json({ 
            message: 'Imagen subida correctamente',
            imagen: nombreArchivo
        });
    } catch (error) {
        console.error('Error al subir la imagen:', error);
        res.status(500).json({ error: 'Error al subir la imagen' });
    }
});

// Eliminar imagen de un proyecto
router.delete('/:id/imagen', fileProyectosController.eliminarImagenProyecto);

module.exports = router;
