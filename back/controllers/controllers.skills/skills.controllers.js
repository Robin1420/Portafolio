const { pool } = require('mssql');
const { getConnection, sql } = require('../../config/db.config');
const path = require('path');
const fs = require('fs').promises;

//obtener todos los skills
exports.getallSkills = async (req, res) => {
    console.log('Entrando a getAllSkills');
    try{
        console.log('Obteniendo conexion a la base de datos...')
        const pool = await getConnection();
        console.log('Conexión establecida, ejecutando consulta...');
        const result = await pool.request()
            .query('SELECT id, nombre, categoria FROM skills');
        
        console.log('Consulta ejecutada, resultados:', result.recordset);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener datos personales:', error);
        res.status(500).json({ 
            error: 'Error al obtener los datos',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

// Crear una nueva habilidad
exports.createSkill = async (req, res) => {
    console.log('Solicitud POST recibida en /api/skills');
    console.log('Cuerpo de la petición:', req.body);
    
    try {
        const { nombre, categoria } = req.body;
        
        console.log('Datos recibidos - Nombre:', nombre, 'Categoría:', categoria);
        
        if (!nombre || !categoria) {
            console.log('Error: Faltan campos requeridos');
            return res.status(400).json({ error: 'Nombre y categoría son campos requeridos' });
        }
        
        console.log('Conectando a la base de datos...');
        const pool = await getConnection();
        console.log('Conexión a la base de datos establecida');
        
        console.log('Ejecutando consulta SQL...');
        const result = await pool.request()
            .input('nombre', sql.NVarChar, nombre)
            .input('categoria', sql.NVarChar, categoria)
            .query('INSERT INTO skills (nombre, categoria) OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.categoria VALUES (@nombre, @categoria)');
            
        console.log('Habilidad creada exitosamente:', result.recordset[0]);
        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('Error al crear la habilidad:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Error al crear la habilidad',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Obtener un registro por ID
exports.getallSkillsById = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT id, nombre, categoria FROM skills WHERE id = @id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error(`Error al obtener el proyecto con ID ${req.params.id}:`, error);
        res.status(500).json({ error: 'Error al obtener el registro' });
    }
};

// Eliminar una habilidad
exports.deleteSkill = async (req, res) => {
    try {
        const pool = await getConnection();
        
        // Primero verificamos que la habilidad exista
        const checkResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT id FROM skills WHERE id = @id');
            
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Habilidad no encontrada' });
        }
        
        // Si existe, la eliminamos
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM skills WHERE id = @id');
            
        res.status(200).json({ message: 'Habilidad eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar la habilidad:', error);
        res.status(500).json({ 
            error: 'Error al eliminar la habilidad',
            message: error.message
        });
    }
};

