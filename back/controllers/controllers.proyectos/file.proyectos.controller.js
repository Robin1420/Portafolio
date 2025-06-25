const path = require('path');
const fs = require('fs');
const { getConnection, sql } = require('../../../config/db.config');

// Obtener la ruta de la imagen de un proyecto
exports.getImagenProyecto = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener el nombre del archivo de la base de datos
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT imagen FROM proyectos WHERE id = @id');
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        const imagen = result.recordset[0].imagen;
        if (!imagen) {
            return res.status(404).json({ error: 'El proyecto no tiene imagen' });
        }
        
        const imagePath = path.join(__dirname, `../../../file/proyectos/${imagen}`);
        
        // Verificar si el archivo existe
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: 'Archivo de imagen no encontrado' });
        }
        
        // Enviar el archivo
        res.sendFile(imagePath);
    } catch (error) {
        console.error('Error al obtener la imagen del proyecto:', error);
        res.status(500).json({ error: 'Error al obtener la imagen del proyecto' });
    }
};

// Eliminar la imagen de un proyecto
exports.eliminarImagenProyecto = async (req, res) => {
    let pool;
    
    try {
        const { id } = req.params;
        
        // Obtener el nombre del archivo de la base de datos
        pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT imagen FROM proyectos WHERE id = @id');
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        const imagen = result.recordset[0].imagen;
        if (!imagen) {
            return res.json({ message: 'El proyecto no tiene imagen para eliminar' });
        }
        
        const imagePath = path.join(__dirname, `../../../file/proyectos/${imagen}`);
        
        // Eliminar el archivo si existe
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        
        // Actualizar la base de datos
        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE proyectos SET imagen = NULL WHERE id = @id');
            
        res.json({ message: 'Imagen eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar la imagen del proyecto:', error);
        res.status(500).json({ error: 'Error al eliminar la imagen del proyecto' });
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (error) {
                console.error('Error al cerrar la conexión:', error);
            }
        }
    }
};