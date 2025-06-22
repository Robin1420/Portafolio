const express = require('express');
const router = express.Router();
const datosPersonalesController = require('../controllers/datosPersonales.controller');

// Obtener todos los registros
router.get('/', datosPersonalesController.getAllDatosPersonales);

// Obtener un registro por ID
router.get('/:id', datosPersonalesController.getDatosPersonalesById);

// Actualizar un registro existente
router.put('/:id', datosPersonalesController.updateDatosPersonales);

module.exports = router;