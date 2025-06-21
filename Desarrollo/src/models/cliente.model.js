const { createConnection } = require("../database/database.js");
const bcrypt = require("bcrypt");

function obtenerClientes(callback) {
  const connection = createConnection();

  connection.connect((error) => {
    if (error) {
      return callback(error, null);
    }

    connection.query("SELECT * FROM VW_DATOSCLIENTE", (err, results) => {
      connection.end();
      if (err) {
        return callback(err, null);
      }
      return callback(null, results);
    });
  });
}

function obtenerDetallesCliente(idCliente, callback) {
  const connection = createConnection();

  connection.connect((error) => {
    if (error) {
      return callback(error, null);
    }
    const query = `
      SELECT ID_USUARIO AS ID, NOMBRES_USUARIO AS Nombres, APELLIDOS_USUARIO AS Apellidos, DNI_USUARIO AS DNI, CELULAR_USUARIO AS Celular, DIRECCION_USUARIO AS Direccion 
      FROM tb_usuario WHERE DNI_USUARIO = ?;`;
    connection.query(query, [idCliente], (err, results) => {
      connection.end();

      if (err) {
        return callback(err, null);
      }

      if (results.length === 0) {
        return callback({ message: "Cliente no encontrado" }, null);
      }

      const datosCliente = results[0];
      return callback(null, datosCliente);
    });
  });
}

function registrarUsuario(usuario, callback) {
  const connection = createConnection();

  // Hash de la contraseña antes de almacenarla en la base de datos
  bcrypt.hash(usuario.PASSWORD_USUARIO, 10, (hashError, hash) => {
    if (hashError) {
      return callback(hashError, null);
    }
    // Almacenar la contraseña hasheada en el objeto del usuario
    usuario.PASSWORD_USUARIO = hash;
    connection.connect((connectionError) => {
      if (connectionError) {
        return callback(connectionError, null);
      }
      connection.query(
        "INSERT INTO TB_USUARIO SET ?",
        usuario,
        (err, results) => {
          connection.end();
          if (err) {
            return callback(err, null);
          }
          return callback(null, results);
        }
      );
    });
  });
}

module.exports = { obtenerDetallesCliente, obtenerClientes, registrarUsuario };
