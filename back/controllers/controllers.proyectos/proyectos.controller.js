const { pool } = require('mssql');
const { getConnection, sql } = require('../../config/db.config');
const path = require('path');
const fs = require('fs').promises;

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
    console.log('\n=== INICIO CREACIÓN DE PROYECTO ===');
    console.log('Hora:', new Date().toISOString());
    console.log('Cuerpo de la solicitud:', JSON.stringify(req.body, null, 2));
    console.log('Archivo recibido:', req.file ? 'Sí' : 'No');
    if (req.file) {
        console.log('Detalles del archivo:', {
            originalname: req.file.originalname,
            encoding: req.file.encoding,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });
    }
    
    let pool;
    let transaction;
    let tempFilePath = req.file ? req.file.path : null;
    let nombreImagen = null;
    
    try {
        // Obtener datos del cuerpo de la solicitud
        const { titulo, descripcion, tecnologias, enlace_demo, enlace_codigo, fecha, visible } = req.body;
        
        console.log('Datos recibidos:', { 
            titulo, 
            descripcion, 
            tecnologias, 
            enlace_demo, 
            enlace_codigo, 
            fecha, 
            visible,
            file: req.file ? req.file.originalname : 'No file'
        });
        
        // Validar campos obligatorios
        if (!titulo) {
            return res.status(400).json({ 
                success: false, 
                error: 'El título es obligatorio' 
            });
        }
        
        // Verificar si se ha subido un archivo
        if (req.file) {
            console.log('Archivo temporal recibido en:', req.file.path);
            tempFilePath = req.file.path;
            
            // Validar que sea una imagen
            const extension = path.extname(req.file.originalname).toLowerCase();
            const extensionesPermitidas = ['.jpg', '.jpeg', '.png', '.gif'];
            
            if (!extensionesPermitidas.includes(extension)) {
                throw new Error('Formato de archivo no permitido. Use JPG, JPEG, PNG o GIF.');
            }
            
            console.log('Archivo válido recibido:', {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.path
            });
        }
        
        // Obtener la conexión
        pool = await getConnection();
        console.log('Conexión a la base de datos establecida');
        
        // Iniciar transacción
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        console.log('Transacción iniciada');
        
        try {
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
            
            // Crear la solicitud dentro de la transacción
            const request = new sql.Request(transaction);
            
            // Agregar parámetros
            request.input('titulo', sql.VarChar(100), titulo);
            request.input('descripcion', sql.Text, descripcion || null);
            request.input('tecnologias', sql.VarChar(255), tecnologias || null);
            request.input('enlace_demo', sql.VarChar(255), enlace_demo || null);
            request.input('enlace_codigo', sql.VarChar(255), enlace_codigo || null);
            request.input('fecha', sql.Date, fecha || new Date());
            request.input('visible', sql.Bit, visible === 'true' || visible === true ? 1 : 0);
            
            // Ejecutar la consulta de inserción
            const result = await request.query(insertQuery);
            const proyectoId = result.recordset[0].id;
            
            // Si se subió un archivo, procesarlo
            if (req.file) {
                try {
                    const extension = path.extname(req.file.originalname).toLowerCase();
                    nombreImagen = `proyecto${proyectoId}${extension}`;
                    const uploadDir = path.join(__dirname, '../../../file/proyectos');
                    const nuevoPath = path.join(uploadDir, nombreImagen);
                    
                    console.log('=== INFORMACIÓN DE RUTAS ===');
                    console.log('Directorio actual de trabajo:', process.cwd());
                    console.log('Ruta del directorio de carga:', uploadDir);
                    console.log('Ruta completa del archivo destino:', nuevoPath);
                    console.log('Ruta temporal del archivo:', req.file.path);
                    console.log('============================');
                    
                    // Verificar si el directorio existe y es accesible
                    try {
                        const stats = await fs.stat(uploadDir);
                        console.log(`El directorio ${uploadDir} existe y es ${stats.isDirectory() ? 'un directorio' : 'un archivo'}`);
                        console.log(`Permisos del directorio: ${(stats.mode & 0o777).toString(8)}`);
                    } catch (error) {
                        console.error(`Error al acceder al directorio ${uploadDir}:`, error);
                    }
                    
                    // Listar archivos en el directorio
                    try {
                        const files = await fs.readdir(uploadDir);
                        console.log(`Archivos en ${uploadDir}:`, files);
                    } catch (error) {
                        console.error(`Error al listar archivos en ${uploadDir}:`, error);
                    }
                    
                    // Asegurarse de que el directorio exista
                    await fs.mkdir(uploadDir, { recursive: true });
                    console.log('Directorio verificado/creado:', uploadDir);
                    
                    // Verificar si el archivo temporal existe
                    try {
                        await fs.access(req.file.path);
                        console.log('Archivo temporal encontrado, procediendo a moverlo...');
                        
                        // Mover el archivo usando copyFile y luego eliminar el original
                        await fs.copyFile(req.file.path, nuevoPath);
                        console.log('Archivo copiado exitosamente a:', nuevoPath);
                        
                        // Verificar que el archivo se copió correctamente
                        try {
                            const stats = await fs.stat(nuevoPath);
                            console.log(`Archivo de destino verificado. Tamaño: ${stats.size} bytes`);
                            
                            // Eliminar el archivo temporal
                            await fs.unlink(req.file.path);
                            console.log('Archivo temporal eliminado');
                        } catch (error) {
                            console.error('Error al verificar el archivo copiado:', error);
                            throw error;
                        }
                        
                        // Actualizar el proyecto con el nombre de la imagen
                        const updateRequest = new sql.Request(transaction);
                        await updateRequest
                            .input('id', sql.Int, proyectoId)
                            .input('imagen', sql.VarChar(255), nombreImagen)
                            .query('UPDATE proyectos SET imagen = @imagen WHERE id = @id');
                            
                        console.log('Campo de imagen actualizado en la base de datos');
                    } catch (error) {
                        console.error('Error al procesar el archivo:', error);
                        throw error;
                    }
                } catch (error) {
                    console.error('Error en el procesamiento del archivo:', error);
                    // Limpiar archivo temporal si existe
                    if (req.file && req.file.path) {
                        try {
                            await fs.unlink(req.file.path);
                            console.log('Archivo temporal eliminado después del error');
                        } catch (unlinkError) {
                            console.error('Error al eliminar el archivo temporal:', unlinkError);
                        }
                    }
                    throw new Error(`Error al procesar el archivo: ${error.message}`);
                }
                
                // La imagen ya se actualizó en el paso anterior, no es necesario hacerlo de nuevo
            }
            
            // Confirmar la transacción
            await transaction.commit();
            console.log('Transacción confirmada');
            
            console.log('=== RESUMEN DE LA OPERACIÓN ===');
            console.log('Proyecto creado exitosamente con ID:', proyectoId);
            console.log('Nombre de la imagen guardada:', nombreImagen || 'Ninguna');
            console.log('==============================');
            
            // Enviar respuesta exitosa
            const response = {
                success: true,
                message: 'Proyecto creado exitosamente',
                id: proyectoId,
                imagen: nombreImagen || null
            };
            
            console.log('Enviando respuesta:', response);
            res.status(201).json(response);
        } catch (error) {
            console.error('Error en la transacción:', error);
            
            // Si hay un error, hacer rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Rollback de la transacción realizado');
                } catch (rollbackError) {
                    console.error('Error al hacer rollback:', rollbackError);
                }
            }
            
            // Eliminar el archivo temporal si existe
            if (tempFilePath) {
                try {
                    await fs.unlink(tempFilePath);
                    console.log('Archivo temporal eliminado después del error');
                } catch (unlinkError) {
                    console.error('Error al eliminar el archivo temporal:', unlinkError);
                }
            }
            
            // Enviar respuesta de error
            const errorResponse = {
                success: false,
                error: 'Error al crear el proyecto',
                message: error.message
            };
            
            if (process.env.NODE_ENV === 'development') {
                errorResponse.stack = error.stack;
            }
            
            console.error('Error al crear el proyecto:', errorResponse);
            res.status(500).json(errorResponse);
        }
    } catch (error) {
        console.error('Error al crear el proyecto:', error);
        
        // Si hay un error, limpiar y devolver el error
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('Rollback de la transacción realizado');
            } catch (rollbackError) {
                console.error('Error al hacer rollback:', rollbackError);
            }
        }
        
        // Eliminar el archivo temporal si existe
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
                console.log('Archivo temporal eliminado después del error');
            } catch (unlinkError) {
                console.error('Error al eliminar el archivo temporal:', unlinkError);
            }
        }
        
        res.status(500).json({
            success: false,
            error: 'Error al crear el proyecto',
            details: error.message
        });
    } finally {
        // Cerrar la conexión solo si existe y está conectada
        if (pool && typeof pool.close === 'function') {
            try {
                await pool.close();
                console.log('Conexión cerrada correctamente');
            } catch (error) {
                console.error('Error al cerrar la conexión:', error);
            }
        } else {
            console.log('No se pudo cerrar la conexión: pool no está disponible o no tiene el método close');
        }
    }
};

// Eliminar un registro
exports.deleteProyecto = async (req, res) => {
    console.log('=== INICIO ELIMINACIÓN DE PROYECTO ===');
    console.log('Hora:', new Date().toISOString());
    console.log('ID del proyecto a eliminar:', req.params.id);
    
    let pool;
    let transaction;
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
        console.error('ID de proyecto no válido:', req.params.id);
        return res.status(400).json({ 
            success: false,
            error: 'ID de proyecto no válido' 
        });
    }
    
    try {
        // 1. Obtener conexión a la base de datos
        console.log('Obteniendo conexión a la base de datos...');
        pool = await getConnection();
        console.log('Conexión a la base de datos establecida');
        
        // 2. Verificar si el proyecto existe y obtener información de la imagen
        console.log(`Buscando proyecto con ID: ${id}`);
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id, imagen FROM proyectos WHERE id = @id');
            
        if (checkResult.recordset.length === 0) {
            console.error(`No se encontró el proyecto con ID: ${id}`);
            return res.status(404).json({ 
                success: false,
                error: 'Proyecto no encontrado' 
            });
        }
        
        const proyecto = checkResult.recordset[0];
        console.log('Proyecto encontrado:', proyecto);
        
        // 3. Iniciar transacción
        console.log('Iniciando transacción...');
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        console.log('Transacción iniciada');
        
        try {
            // 4. Eliminar el proyecto de la base de datos
            console.log('Eliminando proyecto de la base de datos...');
            const deleteResult = await transaction.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM proyectos WHERE id = @id');
                
            if (deleteResult.rowsAffected[0] === 0) {
                throw new Error('No se pudo eliminar el proyecto');
            }
            
            console.log('Proyecto eliminado de la base de datos');
            
            // 5. Si el proyecto tenía una imagen, eliminarla del sistema de archivos
            if (proyecto.imagen) {
                const uploadDir = path.join(__dirname, '..', '..', '..', 'file', 'proyectos');
                const imagePath = path.join(uploadDir, proyecto.imagen);
                
                console.log('Ruta completa de la imagen:', imagePath);
                
                try {
                    // Verificar si el archivo existe antes de intentar eliminarlo
                    await fs.access(imagePath);
                    console.log('Imagen encontrada, procediendo a eliminar...');
                    
                    // Eliminar el archivo
                    await fs.unlink(imagePath);
                    console.log(`Imagen ${proyecto.imagen} eliminada correctamente`);
                } catch (fsError) {
                    if (fsError.code === 'ENOENT') {
                        console.warn(`La imagen ${proyecto.imagen} no existe en el sistema de archivos`);
                    } else {
                        console.warn(`Error al eliminar la imagen ${proyecto.imagen}:`, fsError.message);
                        // No fallar la operación si no se puede eliminar la imagen
                    }
                }
            } else {
                console.log('El proyecto no tiene imagen asociada');
            }
            
            // 6. Confirmar la transacción
            console.log('Confirmando transacción...');
            await transaction.commit();
            console.log('Transacción confirmada');
            
            // 7. Enviar respuesta exitosa
            console.log('Enviando respuesta exitosa');
            return res.json({ 
                success: true,
                message: 'Proyecto eliminado correctamente' 
            });
            
        } catch (error) {
            console.error('Error durante la transacción:', error);
            
            // Revertir la transacción en caso de error
            if (transaction && transaction._aborted === false) {
                console.log('Intentando hacer rollback...');
                try {
                    await transaction.rollback();
                    console.log('Rollback completado');
                } catch (rollbackError) {
                    console.error('Error al hacer rollback:', rollbackError.message);
                }
            }
            
            // Relanzar el error para que sea manejado por el catch externo
            throw error;
        }
    } catch (error) {
        console.error('Error general al eliminar el proyecto:', error);
        
        // Determinar el código de estado adecuado
        const statusCode = error.number === 547 ? 409 : 500; // 409 Conflict para restricciones de clave foránea
        
        // Mensaje de error más descriptivo
        let errorMessage = 'Error al eliminar el proyecto';
        if (error.number === 547) {
            errorMessage = 'No se puede eliminar el proyecto porque tiene registros relacionados';
        }
        
        return res.status(statusCode).json({ 
            success: false,
            error: errorMessage,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                code: error.number,
                state: error.state,
                class: error.class,
                server: error.serverName,
                proc: error.procName,
                lineNumber: error.lineNumber,
                stack: error.stack
            } : undefined
        });
    } finally {
        // Cerrar la conexión si existe
        if (pool && typeof pool.close === 'function') {
            try {
                console.log('Cerrando conexión a la base de datos...');
                await pool.close();
                console.log('Conexión cerrada');
            } catch (error) {
                console.error('Error al cerrar la conexión:', error.message);
            }
        }
        console.log('=== FIN ELIMINACIÓN DE PROYECTO ===');
    }
};

// Obtener un proyecto con su información de imagen
exports.getProyectoConImagen = async (id) => {
    let pool;
    
    try {
        pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id, imagen FROM proyectos WHERE id = @id');
            
        return result.recordset[0] || null;
    } catch (error) {
        console.error('Error al obtener el proyecto con imagen:', error);
        throw error;
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

// Actualizar un registro existente
exports.updateProyectos = async (req, res) => {
    let pool;
    let transaction;
    
    try {
        const { titulo, descripcion, tecnologias, enlace_demo, enlace_codigo, fecha, visible } = req.body;
        const id = parseInt(req.params.id);
        let nombreImagen = null;
        
        // Verificar si se ha subido un archivo
        if (req.file) {
            const extension = path.extname(req.file.originalname).toLowerCase();
            nombreImagen = `proyecto${id}${extension}`;
        }
        
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
            // Verificar si el registro existe y obtener la imagen actual
            const checkRequest = new sql.Request(transaction);
            const checkResult = await checkRequest
                .input('id', sql.BigInt, id)
                .query('SELECT id, imagen FROM proyectos WHERE id = @id');

            if (checkResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Registro no encontrado'
                });
            }
            
            const proyectoActual = checkResult.recordset[0];
            
            // Si se subió un archivo, procesarlo
            if (req.file) {
                const uploadDir = path.join(__dirname, '../../../file/proyectos');
                const nuevoPath = path.join(uploadDir, nombreImagen);
                
                // Asegurarse de que el directorio exista
                try {
                    await fs.mkdir(uploadDir, { recursive: true });
                } catch (error) {
                    if (error.code !== 'EEXIST') throw error;
                }
                
                // Si ya existe una imagen anterior, eliminarla
                if (proyectoActual.imagen) {
                    const imagenAnterior = path.join(uploadDir, proyectoActual.imagen);
                    try {
                        await fs.unlink(imagenAnterior);
                    } catch (error) {
                        if (error.code !== 'ENOENT') throw error; // Ignorar si el archivo no existe
                    }
                }
                
                // Mover el archivo temporal al destino final
                await fs.rename(req.file.path, nuevoPath);
            }

            console.log('Actualizando registro con ID:', id);

            // Construir la consulta de actualización dinámicamente
            const setClauses = [];
            const params = { id: { value: id, type: sql.BigInt } };
            
            if (titulo !== undefined) {
                setClauses.push('titulo = @titulo');
                params.titulo = { value: titulo, type: sql.VarChar(100) };
            }
            
            // Si se subió una imagen, agregarla a la actualización
            if (nombreImagen) {
                setClauses.push('imagen = @imagen');
                params.imagen = { value: nombreImagen, type: sql.VarChar(255) };
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
