const ClienteModel = require('../models/cliente.model');
const path = require('path');
const fs = require('fs');
const { createConnection } = require('../database/database.js');
const bcrypt = require('bcrypt');

function obtenerClientes(req, res) {
  ClienteModel.obtenerClientes((error, usuario) => {
    if (error) {
      res.status(500).json({ error: 'Error al obtener usuarios' });
    } else {
      res.render(path.join(__dirname, '..','view', 'clientlist'), { usuario } );
    }
  });
}

function obtenerDetallesCliente(req, res) {
  const { dni } = req.query;

  if (!dni) {
    return res.status(400).json({ error: 'DNI no proporcionado.' });
  }

  ClienteModel.obtenerDetallesCliente(dni, (error, datosCliente) => {
    if (error) {
      return res.status(500).json({ error: 'Error al obtener datos del cliente', details: error.message });
    }

    return res.json(datosCliente);
  });
}

function registrarUsuario (usuario, callback) {
  ClienteModel.registrarUsuario(usuario, (error, resultado) => {
    if (error) {
      callback(error, null);
    } else {
      callback(null, resultado);
    }
  });
}

function obtenerUsuarioPorCorreo(correo, callback) {
  const connection = createConnection();

  connection.connect((error) => {
    if (error) {
      return callback(error, null);
    }

      connection.query('SELECT * FROM TB_USUARIO WHERE EMAIL_USUARIO = ?', [correo], (err, results) => {
        connection.end();
        if (err) {
          return callback(err, null);
        }

        if (results.length === 0) {
          return callback(null, null); // Usuario no encontrado
        }

        const usuario = results[0];
        return callback(null, usuario);
      });
  });
}

function obtenerUsuarioPorId(usuarioId, callback) {
  const connection = createConnection();

  connection.connect((error) => {
    if (error) {
      return callback(error, null);
    }

      connection.query('SELECT * FROM TB_USUARIO WHERE ID_USUARIO = ?', [usuarioId], (err, results) => {
        connection.end();
        if (err) {
          return callback(err, null);
        }

        if (results.length === 0) {
          return callback(null, null);
        }

        const usuario = results[0];
        return callback(null, usuario);
      });
  });
}

function obtenerUsuarioPorDni(usuarioId, callback) {
  const connection = createConnection();

  connection.connect((error) => {
    if (error) {
      return callback(error, null);
    }

      connection.query('SELECT * FROM TB_USUARIO WHERE DNI_USUARIO = ?', [usuarioId], (err, results) => {
        connection.end();
        if (err) {
          return callback(err, null);
        }

        if (results.length === 0) {
          return callback(null, null);
        }

        const usuario = results[0];
        return callback(null, usuario);
      });
  });
}

function registrarMascota(usuarioId, nombre, tipo, raza, sexo, fecha, foto, evidencia, callback) {
  const connection = createConnection();

  const petPic = typeof foto === 'string' ? foto : fs.readFileSync(foto);
  const petEvidence =
    typeof evidencia === 'string' ? evidencia : fs.readFileSync(evidencia);

  const mascota = {
    ID_USUARIO: usuarioId,
    NOMBRE_MASCOTA: nombre,
    ESPECIE_MASCOTA: tipo,
    RAZA_MASCOTA: raza,
    SEXO_MASCOTA: sexo,
    FECHA_NACIMIENTO_MASCOTA: fecha,
    IMAGEN_MASCOTA: petPic,
    EVIDENCIA_MASCOTA: petEvidence,
  };

  connection.connect((connectionError) => {
    if (connectionError) {
      return callback(connectionError, null);
    }

    connection.query('INSERT INTO TB_MASCOTAS SET ?', mascota, (err, results) => {
        connection.end();
        if (err) {
          return callback(err, null);
        }

        return callback(null, results);
    });
  });
}

function obtenerMascotasPorUsuario(usuarioId, callback) {
  const connection = createConnection();

  connection.connect((error) => {
    if (error) {
      return callback(error, null);
    }

    connection.query('SELECT * FROM TB_MASCOTAS WHERE ID_USUARIO = ?', [usuarioId], (err, results) => {
        connection.end();
        if (err) {
          return callback(err, null);
        }

        return callback(null, results);
    });
  });
}

module.exports = { obtenerDetallesCliente, obtenerClientes, registrarUsuario, obtenerUsuarioPorCorreo, obtenerUsuarioPorId, registrarMascota, obtenerMascotasPorUsuario, obtenerUsuarioPorDni };
