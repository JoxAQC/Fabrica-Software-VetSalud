const CitasModel = require('../models/citas.model');
const ClienteController = require('./cliente.controller');

function formatearFecha(fecha) {
  const [day, month, year] = fecha.split("/");
  return `${year}-${month}-${day} 12:00:00`;
}

function obtenerCitas(req, res) {
  CitasModel.obtenerCitas((error, results) => {
    if (error) {
      res.status(500).json({ error: 'Error al obtener citas' });
    } else {
      res.json(results);
    }
  });
}

function registrarCita(usuarioId, mascotaId, fecha, motivo, callback) {
  const cita = {
    ID_MASCOTA: mascotaId,
    FECHA_HORA_CITA: fecha,
    MOTIVO_CITA: motivo,
  };

  CitasModel.registrarCita(cita, (error, resultado) => {
    if (error) {
      callback(error, null);
    } else {
      callback(null, resultado);
    }
  });
}

function registrarCitaAnonima(data, callback) {
  const { name, pet_name, specialty, species, appointment, sex } = data;

  // Step 1: Get anonymous user
  ClienteController.obtenerUsuarioPorDni("00000000", (error, usuario) => {
    if (error) {
      return callback(error, null);
    }

    if (!usuario) {
      return callback(new Error("Usuario anonimo no encontrado"), null);
    }

    const petName = `${pet_name} de ${name}`;
    const petSex = sex.includes("(M)") ? "M" : "F";

    // Step 2: Create pet for anonymous user
    ClienteController.registrarMascota(
      usuario.ID_USUARIO,
      petName,
      species,
      "",
      petSex,
      "2025/01/01",
      "https://picsum.photos/200",
      "https://picsum.photos/300",
      (error, resultadoMascota) => {
        if (error) {
          return callback(error, null);
        }

        // Step 3: Create appointment for the new pet
        const cita = {
          ID_MASCOTA: resultadoMascota.insertId,
          FECHA_HORA_CITA: formatearFecha(appointment),
          MOTIVO_CITA: specialty,
        };

        CitasModel.registrarCita(cita, (error, resultadoCita) => {
          if (error) {
            return callback(error, null);
          } else {
            return callback(null, {
              petId: resultadoMascota.insertId,
              appointmentId: resultadoCita.insertId,
              petName: petName,
              appointment: appointment,
              specialty: specialty,
            });
          }
        });
      }
    );
  });
}

module.exports = { obtenerCitas, registrarCita, registrarCitaAnonima };
