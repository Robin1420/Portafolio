const express = require('express');
const router = express.Router();
const skillsController = require('../../controllers/controllers.skills/skills.controllers.js');

// Obtener todas las skills
router.get('/', skillsController.getallSkills);

// Obtener una skill por ID
router.get('/:id', skillsController.getallSkillsById);

module.exports = router;