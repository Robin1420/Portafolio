const express = require('express');
const router = express.Router();
const skillsController = require('../../controllers/controllers.skills/skills.controllers.js');

// Middleware para registrar todas las peticiones
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Obtener todas las skills
router.get('/', skillsController.getallSkills);

// Crear una nueva skill
router.post('/', express.json(), skillsController.createSkill);

// Obtener una skill por ID
router.get('/:id', skillsController.getallSkillsById);

// Eliminar una skill
router.delete('/:id', (req, res, next) => {
    console.log('DELETE /api/skills/:id - ID recibido:', req.params.id);
    next();
}, skillsController.deleteSkill);

// Ruta de prueba
router.get('/test/route', (req, res) => {
    console.log('Ruta de prueba accedida');
    res.json({ message: 'Ruta de prueba funcionando' });
});

console.log('Rutas de skills registradas:');
router.stack.forEach(layer => {
    if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        console.log(`  ${methods.padEnd(7)} /api/skills${layer.route.path}`);
    }
});

module.exports = router;