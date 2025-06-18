// Verificar si estamos en el servidor (Node.js) o en el navegador
const isServer = typeof window === 'undefined';

let sql = null;
let dbSettings = null;

if (isServer) {
  // Solo requerir mssql en el servidor
  sql = require('mssql');
  
  dbSettings = {
    user: 'Robinzon1420_SQLLogin_1',
    password: '9wjwgl3kvp',
    server: 'portafolio.mssql.somee.com',
    database: 'portafolio',
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  };
}

const getConnection = async () => {
  if (!isServer) {
    throw new Error('No se puede acceder a la base de datos directamente desde el navegador');
  }
  
  try {
    const pool = await sql.connect(dbSettings);
    return pool;
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    throw error;
  }
};

// Exportar solo en el servidor
const exportsObj = {
  getConnection,
  sql: isServer ? sql : null
};

module.exports = exportsObj;
