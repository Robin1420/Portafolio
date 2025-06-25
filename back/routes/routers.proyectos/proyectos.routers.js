const express = require('express');
const router = express.Router();
const proyectosController = require('../../controllers/controllers.proyectos/proyectos.controller');
const { upload, handleUploadErrors } = require('../../config/multer.proyectos/multer.config');
const path = require('path');
const fs = require('fs').promises;

// Obtener todos los registros
router.get('/', proyectosController.getallProyectos);

// Obtener un registro por ID
router.get('/:id', proyectosController.getallProyectosById);

// Crear un nuevo registro con o sin imagen
router.post('/', 
    upload.single('imagen'), 
    handleUploadErrors,
    proyectosController.createProyecto
);

// Actualizar un registro existente con o sin imagen
router.put('/:id', 
    upload.single('imagen'),
    handleUploadErrors,
    proyectosController.updateProyectos
);

// Eliminar un registro
router.delete('/:id', proyectosController.deleteProyecto);

// Ruta para obtener la imagen de un proyecto
router.get('/:id/imagen', async (req, res) => {
    try {
        const { id } = req.params;
        const proyecto = await proyectosController.getProyectoConImagen(id);
        
        if (!proyecto || !proyecto.imagen) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }
        
        const imagePath = path.join(__dirname, `../../../file/proyectos/${proyecto.imagen}`);
        
        // Verificar si el archivo existe
        try {
            await fs.access(imagePath);
            res.sendFile(imagePath);
        } catch (error) {
            res.status(404).json({ error: 'Archivo de imagen no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener la imagen:', error);
        res.status(500).json({ error: 'Error al obtener la imagen' });
    }
});

module.exports = router;