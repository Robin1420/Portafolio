const express = require('express');
const router = express.Router();
const fileController = require('../../controllers/controllers.datosPersonales/file.datosPersonales.controller');
const { upload, uploadCV } = require('../../config/multer.datosPersonales/multer.config');

// Ruta para subir la foto personal
router.post('/foto', upload.single('foto'), fileController.uploadFoto);

// Ruta para subir el CV
router.post('/cv', uploadCV.single('cv'), fileController.uploadCV);

// Ruta para obtener la URL de un archivo (foto o CV)
router.get('/archivo/:tipo', fileController.getFileUrl);

// Ruta para verificar que los archivos estáticos se están sirviendo correctamente
router.get('/check-files', fileController.checkFiles);

module.exports = router;