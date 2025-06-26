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

// obtener un registro por ID
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

