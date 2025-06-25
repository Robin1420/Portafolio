const express = require('express');
const router = express.Router();
const proyectosController = require('../../controllers/controllers.proyectos/proyectos.controller');

// Obtener todos los registros
router.get('/', proyectosController.getallProyectos);

// Obtener un registro por ID
router.get('/:id', proyectosController.getallProyectosById);

// Crear un nuevo registro
router.post('/', proyectosController.createProyecto);

// Actualizar un registro existente
router.put('/:id', proyectosController.updateProyectos);

// Eliminar un registro
router.delete('/:id', proyectosController.deleteProyecto);

module.exports = router;