const { getConnection, sql } = require('../config/db.config');

// Obtener todos los registros
exports.getAllDatosPersonales = async (req, res) => {
    console.log('Entrando a getAllDatosPersonales');
    try {
        console.log('Obteniendo conexión a la base de datos...');
        const pool = await getConnection();
        console.log('Conexión establecida, ejecutando consulta...');
        const result = await pool.request()
            .query('SELECT id, nombre, profesion, descripcion, email, telefono, direccion FROM datos_personales');
        
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
};

// Obtener un registro por ID
exports.getDatosPersonalesById = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT id, nombre, profesion, descripcion, email, telefono, direccion FROM datos_personales WHERE id = @id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error(`Error al obtener datos personales con ID ${req.params.id}:`, error);
        res.status(500).json({ error: 'Error al obtener el registro' });
    }
};

// Actualizar un registro existente
exports.updateDatosPersonales = async (req, res) => {
    try {
        console.log('Solicitud de actualización recibida:', req.body);
        
        const { nombre, profesion, descripcion, email, telefono, direccion } = req.body;
        const id = parseInt(req.params.id);
        
        // Validar que el ID sea un número válido
        if (isNaN(id) || id <= 0) {
            console.error('ID de registro no válido:', req.params.id);
            return res.status(400).json({ 
                success: false,
                error: 'ID de registro no válido',
                received: req.params.id
            });
        }
        
        const pool = await getConnection();
        
        // Verificar si el registro existe
        const recordExists = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id FROM datos_personales WHERE id = @id');
            
        if (recordExists.recordset.length === 0) {
            console.error('Registro no encontrado con ID:', id);
            return res.status(404).json({ 
                success: false,
                error: 'Registro no encontrado' 
            });
        }
        
        console.log('Actualizando registro con ID:', id);
        
        // Construir la consulta de actualización dinámicamente
        const setClauses = [];
        const params = { id: { value: id, type: sql.Int } };
        
        // Agregar solo los campos que se están actualizando
        if (nombre !== undefined) {
            setClauses.push('nombre = @nombre');
            params.nombre = { value: nombre, type: sql.VarChar(100) };
        }
        if (profesion !== undefined) {
            setClauses.push('profesion = @profesion');
            params.profesion = { value: profesion, type: sql.VarChar(100) };
        }
        if (descripcion !== undefined) {
            setClauses.push('descripcion = @descripcion');
            params.descripcion = { value: descripcion, type: sql.Text };
        }
        if (email !== undefined) {
            setClauses.push('email = @email');
            params.email = { value: email, type: sql.VarChar(100) };
        }
        if (telefono !== undefined) {
            setClauses.push('telefono = @telefono');
            params.telefono = { value: telefono, type: sql.VarChar(30) };
        }
        if (direccion !== undefined) {
            setClauses.push('direccion = @direccion');
            params.direccion = { value: direccion, type: sql.VarChar(200) };
        }
        
        // Si no hay campos para actualizar
        if (setClauses.length === 0) {
            return res.status(400).json({ 
                error: 'No se proporcionaron campos para actualizar',
                camposDisponibles: ['nombre', 'profesion', 'descripcion', 'email', 'telefono', 'direccion']
            });
        }
        
        // Construir la consulta SQL
        const query = `
            UPDATE datos_personales 
            SET ${setClauses.join(', ')}
            WHERE id = @id;
            
            SELECT id, nombre, profesion, descripcion, email, telefono, direccion 
            FROM datos_personales 
            WHERE id = @id;
        `;
        
        // Preparar la solicitud
        const request = pool.request();
        
        // Agregar parámetros a la solicitud
        Object.entries(params).forEach(([key, { value, type }]) => {
            request.input(key, type, value);
        });
        
        // Ejecutar la consulta de actualización
        await request.query(query);
        
        // Obtener el registro actualizado para devolverlo
        const updatedRecord = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id, nombre, profesion, descripcion, email, telefono, direccion FROM datos_personales WHERE id = @id');
            
        if (updatedRecord.recordset.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'No se pudo recuperar el registro actualizado' 
            });
        }
        
        res.json({
            success: true,
            data: updatedRecord.recordset[0]
        });
    } catch (error) {
        console.error(`Error al actualizar registro con ID ${req.params.id}:`, error);
        
        if (error.number === 2627) { // Violación de restricción única (email duplicado)
            return res.status(409).json({ 
                success: false,
                error: 'El correo electrónico ya está registrado',
                campo: 'email'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el registro',
            detalles: error.message
        });
    }
};
