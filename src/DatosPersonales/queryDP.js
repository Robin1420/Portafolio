const { getConnection, sql } = require('../../config/db/db.js');

// Obtener todos los registros
export const obtenerDatosPersonales = async () => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .query('SELECT * FROM datos_personales');
        return result.recordset;
    } catch (error) {
        console.error('Error al obtener datos personales:', error);
        throw error;
    }
};

// Obtener un registro por ID
export const obtenerDatosPersonalesPorId = async (id) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM datos_personales WHERE id = @id');
        return result.recordset[0];
    } catch (error) {
        console.error(`Error al obtener datos personales con ID ${id}:`, error);
        throw error;
    }
};

// Insertar un nuevo registro
export const crearDatosPersonales = async (datos) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('nombre', sql.VarChar(100), datos.nombre)
            .input('profesion', sql.VarChar(100), datos.profesion)
            .input('descripcion', sql.Text, datos.descripcion)
            .input('email', sql.VarChar(100), datos.email)
            .input('telefono', sql.VarChar(30), datos.telefono)
            .input('direccion', sql.VarChar(200), datos.direccion)
            .input('foto_perfil', sql.VarBinary, datos.foto_perfil)
            .input('cv', sql.VarBinary, datos.cv)
            .query(`INSERT INTO datos_personales 
                   (nombre, profesion, descripcion, email, telefono, direccion, foto_perfil, cv) 
                   VALUES (@nombre, @profesion, @descripcion, @email, @telefono, @direccion, @foto_perfil, @cv);
                   SELECT SCOPE_IDENTITY() as id`);
        
        return result.recordset[0].id; // Retorna el ID del nuevo registro
    } catch (error) {
        console.error('Error al crear datos personales:', error);
        throw error;
    }
};

// Actualizar un registro existente
export const actualizarDatosPersonales = async (id, datos) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar(100), datos.nombre)
            .input('profesion', sql.VarChar(100), datos.profesion)
            .input('descripcion', sql.Text, datos.descripcion)
            .input('email', sql.VarChar(100), datos.email)
            .input('telefono', sql.VarChar(30), datos.telefono)
            .input('direccion', sql.VarChar(200), datos.direccion)
            .input('foto_perfil', sql.VarBinary, datos.foto_perfil)
            .input('cv', sql.VarBinary, datos.cv)
            .query(`UPDATE datos_personales 
                   SET nombre = @nombre, 
                       profesion = @profesion, 
                       descripcion = @descripcion, 
                       email = @email, 
                       telefono = @telefono, 
                       direccion = @direccion, 
                       foto_perfil = @foto_perfil, 
                       cv = @cv 
                   WHERE id = @id`);
        
        return result.rowsAffected[0]; // Retorna el número de filas afectadas
    } catch (error) {
        console.error(`Error al actualizar datos personales con ID ${id}:`, error);
        throw error;
    }
};

// Eliminar un registro
export const eliminarDatosPersonales = async (id) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM datos_personales WHERE id = @id');
        
        return result.rowsAffected[0]; // Retorna el número de filas afectadas
    } catch (error) {
        console.error(`Error al eliminar datos personales con ID ${id}:`, error);
        throw error;
    }
};

// Obtener solo la foto de perfil
export const obtenerFotoPerfil = async (id) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT foto_perfil FROM datos_personales WHERE id = @id');
        return result.recordset[0]?.foto_perfil;
    } catch (error) {
        console.error(`Error al obtener foto de perfil con ID ${id}:`, error);
        throw error;
    }
};

// Obtener solo el CV
export const obtenerCV = async (id) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT cv FROM datos_personales WHERE id = @id');
        return result.recordset[0]?.cv;
    } catch (error) {
        console.error(`Error al obtener CV con ID ${id}:`, error);
        throw error;
    }
};
