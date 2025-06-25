const { pool } = require('mssql');
const {getConnection, sql} =require ('../../config/db.config');

//obtener todos los proyectos
exports.getallProyectos = async (req, res) => {
    console.log('Entrando a getAllProyectos');
    try{
        console.log('Obteniendo conexion a la base de datos...')
        const pool = await getConnection();
        console.log('Conexión establecida, ejecutando consulta...');
        const result = await pool.request()
            .query('SELECT id, titulo, descripcion, tecnologias, enlace_demo, enlace_codigo, fecha, visible, imagen FROM proyectos');
        
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
exports.getallProyectosById = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT id, titulo, descripcion, tecnologias, enlace_demo, enlace_codigo, fecha, visible FROM proyectos WHERE id = @id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error(`Error al obtener el proyecto con ID ${req.params.id}:`, error);
        res.status(500).json({ error: 'Error al obtener el registro' });
    }
};

// Crear un nuevo registro
exports.createProyecto = async (req, res) => {
    let pool;
    
    try {
        const { titulo, descripcion, tecnologias, enlace_demo, enlace_codigo, fecha, visible } = req.body;
        
        // Validaciones básicas
        if (!titulo) {
            return res.status(400).json({
                success: false,
                error: 'El título del proyecto es obligatorio'
            });
        }
        
        // Obtener la conexión
        pool = await getConnection();
        
        // Crear la consulta de inserción
        const insertQuery = `
            INSERT INTO proyectos (
                titulo, 
                descripcion, 
                tecnologias, 
                enlace_demo, 
                enlace_codigo, 
                fecha, 
                visible
            ) 
            VALUES (
                @titulo, 
                @descripcion, 
                @tecnologias, 
                @enlace_demo, 
                @enlace_codigo, 
                @fecha, 
                @visible
            );
            SELECT SCOPE_IDENTITY() AS id;
        `;
        
        // Crear la solicitud
        const request = new sql.Request(pool);
        
        // Agregar parámetros
        request.input('titulo', sql.VarChar(100), titulo);
        request.input('descripcion', sql.Text, descripcion || '');
        request.input('tecnologias', sql.VarChar(100), tecnologias || '');
        request.input('enlace_demo', sql.VarChar(100), enlace_demo || '');
        request.input('enlace_codigo', sql.VarChar(100), enlace_codigo || '');
        request.input('fecha', sql.Date, fecha || new Date());
        request.input('visible', sql.Bit, visible !== undefined ? visible : 1);
        
        // Ejecutar la consulta
        const result = await request.query(insertQuery);
        const newId = result.recordset[0].id;
        
        // Obtener el registro recién creado
        const selectRequest = new sql.Request(pool);
        const newRecord = await selectRequest
            .input('id', sql.Int, newId)
            .query('SELECT id, titulo, descripcion, tecnologias, enlace_demo, enlace_codigo, fecha, visible FROM proyectos WHERE id = @id');
        
        res.status(201).json({
            success: true,
            data: newRecord.recordset[0]
        });
        
    } catch (error) {
        console.error('Error en createProyecto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear el proyecto',
            detalles: error.message
        });
    } finally {
        // Cerrar la conexión si es necesario
        if (pool) {
            try {
                await pool.close();
            } catch (error) {
                console.error('Error al cerrar la conexión:', error);
            }
        }
    }
};

// Eliminar un registro
exports.deleteProyecto = async (req, res) => {
    let pool;
    
    try {
        const { id } = req.params;
        
        // Validar que el ID sea un número válido
        if (isNaN(parseInt(id, 10))) {
            return res.status(400).json({ error: 'ID de proyecto no válido' });
        }
        
        // Obtener conexión a la base de datos
        pool = await getConnection();
        
        // Verificar si el proyecto existe antes de intentar eliminarlo
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id FROM proyectos WHERE id = @id');
            
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        // Iniciar transacción
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Eliminar el proyecto
            await transaction.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM proyectos WHERE id = @id');
                
            // Confirmar la transacción
            await transaction.commit();
            
            res.json({ message: 'Proyecto eliminado correctamente' });
        } catch (error) {
            // Revertir la transacción en caso de error
            if (transaction._aborted === false) {
                await transaction.rollback();
            }
            throw error;
        }
    } catch (error) {
        console.error('Error al eliminar el proyecto:', error);
        res.status(500).json({ 
            error: 'Error al eliminar el proyecto',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        // Cerrar la conexión si existe
        if (pool) {
            try {
                await pool.close();
            } catch (error) {
                console.error('Error al cerrar la conexión:', error);
            }
        }
    }
};

// Actualizar un registro existente
exports.updateProyectos = async (req, res) => {
    let pool;
    let transaction;
    
    try {
        const { titulo, descripcion, tecnologias, enlace_demo, enlace_codigo, fecha, visible } = req.body;
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

        // Obtener la conexión
        pool = await getConnection();
        transaction = new sql.Transaction(pool);
        
        // Iniciar transacción
        await transaction.begin();

        try {
            // Verificar si el registro existe
            const checkRequest = new sql.Request(transaction);
            const checkResult = await checkRequest
                .input('id', sql.BigInt, id)
                .query('SELECT id FROM proyectos WHERE id = @id');

            if (checkResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Registro no encontrado'
                });
            }

            console.log('Actualizando registro con ID:', id);

            // Construir la consulta de actualización dinámicamente
            const setClauses = [];
            const params = { id: { value: id, type: sql.BigInt } };
            
            if (titulo !== undefined) {
                setClauses.push('titulo = @titulo');
                params.titulo = { value: titulo, type: sql.VarChar(100) };
            }
            if (descripcion !== undefined) {
                setClauses.push('descripcion = @descripcion');
                params.descripcion = { value: descripcion, type: sql.Text };
            }
            if (tecnologias !== undefined) {
                setClauses.push('tecnologias = @tecnologias');
                params.tecnologias = { value: tecnologias, type: sql.VarChar(100) };
            }
            if (enlace_demo !== undefined) {
                setClauses.push('enlace_demo = @enlace_demo');
                params.enlace_demo = { value: enlace_demo, type: sql.VarChar(100) };
            }
            if (enlace_codigo !== undefined) {
                setClauses.push('enlace_codigo = @enlace_codigo');
                params.enlace_codigo = { value: enlace_codigo, type: sql.VarChar(100) };
            }
            if (fecha !== undefined) {
                setClauses.push('fecha = @fecha');
                params.fecha = { value: fecha, type: sql.Date };
            }
            if (visible !== undefined) {
                setClauses.push('visible = @visible');
                params.visible = { value: visible, type: sql.Bit };
            }
            
            // Si no hay campos para actualizar
            if (setClauses.length === 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'No se proporcionaron campos para actualizar',
                    camposDisponibles: ['titulo', 'descripcion', 'tecnologias', 'enlace_demo', 'enlace_codigo', 'fecha', 'visible']
                });
            }

            // Construir la consulta SQL de actualización
            const updateQuery = `
                UPDATE proyectos
                SET ${setClauses.join(', ')}
                WHERE id = @id;
            `;

            console.log('Query de actualización:', updateQuery);
            console.log('Parámetros:', params);

            // Crear y ejecutar la consulta de actualización
            const updateRequest = new sql.Request(transaction);
            
            // Agregar parámetros a la solicitud
            Object.entries(params).forEach(([key, { value, type }]) => {
                updateRequest.input(key, type, value);
            });
            
            // Ejecutar la actualización
            await updateRequest.query(updateQuery);
            
            // Obtener el registro actualizado
            const selectRequest = new sql.Request(transaction);
            const result = await selectRequest
                .input('id', sql.BigInt, id)
                .query('SELECT id, titulo, descripcion, tecnologias, enlace_demo, enlace_codigo, fecha, visible FROM proyectos WHERE id = @id');
            
            // Si todo salió bien, hacer commit de la transacción
            await transaction.commit();
            
            if (result.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No se pudo recuperar el registro actualizado'
                });
            }
            
            return res.json({
                success: true,
                data: result.recordset[0]
            });
            
        } catch (error) {
            console.error(`Error al actualizar registro con ID ${id}:`, error);
            if (transaction) {
                await transaction.rollback();
            }
            throw error; // Re-lanzar el error para manejarlo en el catch externo
        }
        
    } catch (error) {
        console.error('Error en updateProyectos:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al actualizar el registro',
            detalles: error.message
        });
    } finally {
        // Cerrar la conexión si es necesario
        if (pool) {
            try {
                await pool.close();
            } catch (error) {
                console.error('Error al cerrar la conexión:', error);
            }
        }
    }
};
