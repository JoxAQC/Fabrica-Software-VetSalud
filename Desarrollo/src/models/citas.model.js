const { createConnection } = require("../database/database.js");

function obtenerCitas(callback) {
  const connection = createConnection();

  connection.connect((error) => {
    if (error) {
      return callback(error, null);
    }

    connection.query("SELECT * FROM VW_DETALLESCONSULTA", (err, results) => {
      connection.end();
      if (err) {
        return callback(err, null);
      }

      return callback(null, results);
    });
  });
}

function registrarCita(cita, callback) {
  const connection = createConnection();

  connection.connect((connectionError) => {
    if (connectionError) {
      return callback(connectionError, null);
    }

    connection.query("INSERT INTO TB_CITAS SET ?", cita, (err, results) => {
      connection.end();
      if (err) {
        return callback(err, null);
      }

      return callback(null, results);
    });
  });
}

module.exports = { obtenerCitas, registrarCita };
