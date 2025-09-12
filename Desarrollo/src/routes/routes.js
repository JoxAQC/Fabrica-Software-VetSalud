const express = require("express");
const path = require("path");
const router = express.Router();
const bcrypt = require("bcrypt");
const { jwtVerify, SignJWT } = require("jose");
//Controller
const ClienteController = require("../controllers/cliente.controller");
const CitasController = require("../controllers/citas.controller");
const MascotaController = require("../controllers/mascota.controller");
const FichaMedicaController = require("../controllers/fichaMedica.controller");

const bodyParser = require("body-parser");
const { enviarCorreoElectronico } = require("../services/email.service");
const fs = require("fs");
const { formatoFecha } = require("../services/utilidades");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const { Script } = require("vm");

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage });

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use(cookieParser());

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "view", "index.html"));
});

router.get("/signUp", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "view", "signUp.html"));
});

router.post("/signUp.html", async (req, res) => {
  const { nombres, apellidos, direccion, dni, numero, correo, contrasena } =
    req.body;

  const nuevoUsuario = {
    DNI_USUARIO: dni,
    NOMBRES_USUARIO: nombres,
    APELLIDOS_USUARIO: apellidos,
    DIRECCION_USUARIO: direccion,
    CELULAR_USUARIO: numero,
    EMAIL_USUARIO: correo,
    PASSWORD_USUARIO: contrasena,
    ROL_USUARIO: "Cliente", // Asigna el rol
  };

  ClienteController.registrarUsuario(nuevoUsuario, (error, resultado) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: "Error al registrar usuario" });
    } else {
      enviarCorreoElectronico(correo);
      console.log("Usuario registrado correctamente");
    }
  });
});

router.get("/login", (req, res) => {
  res.render(path.join(__dirname, "..", "view", "login.ejs"));
});

router.post("/login.html", async (req, res) => {
  const { correo, contrasena } = req.body;
  // Buscar al usuario por su correo electrónico en la base de datos
  ClienteController.obtenerUsuarioPorCorreo(correo, async (error, usuario) => {
    if (error) {
      return res.status(500).json({ error: "Error al buscar usuario" });
    }
    if (!usuario) {
      return res
        .status(401)
        .json({ error: "Credenciales de correo incorrectas" });
    }
    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuario.PASSWORD_USUARIO
    );

    const contrasenaSinEncriptar = usuario.PASSWORD_USUARIO === contrasena;

    if (!contrasenaValida && !contrasenaSinEncriptar) {
      return res
        .status(401)
        .json({ error: "Credenciales de correo incorrectas" });
    } else {
      console.log("Inicio de sesion con exito, redireccionando ...");
      const payload = {
        sub: usuario.ID_USUARIO,
        rol: usuario.ROL_USUARIO,
        otroAtributo: "valor", // Puedes agregar más atributos
      };
      const jwtConstructor = new SignJWT({
        rol: usuario.ROL_USUARIO,
      }).setSubject(usuario.ID_USUARIO);

      const encoder = new TextEncoder();
      const token = await jwtConstructor
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(encoder.encode(process.env.JWT_PRIVATE_KEY));

      res.cookie("jwt", token);
      console.log(token);
      if (usuario.ROL_USUARIO === "Administrador") {
        res.redirect("/admin");
      } else {
        res.redirect("/user");
      }
    }
  });
});

const verificarTokenUser = async (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) {
    res.send(
      '<script>alert("Debes iniciar sesión para continuar"); window.location="/login";</script>'
    );
    return;
  }
  const encoder = new TextEncoder();
  try {
    const { payload } = await jwtVerify(
      token,
      encoder.encode(process.env.JWT_PRIVATE_KEY)
    );

    req.usuarioId = payload.sub;
    req.rol = payload.rol;
    if (req.rol === "Cliente") {
      next();
    } else {
      res.send(
        '<script>alert("Debes iniciar sesión como usuario registrado para continuar"); window.location="/login";</script>'
      );
      return;
    }
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

router.use(
  [
    "/user",
    "/registrarCita",
    "/perfil",
    "/registroMascota",
    "/registroMascota",
  ],
  verificarTokenUser
);

const verificarTokenAdmin = async (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) {
    res.send(
      '<script>alert("Debes iniciar sesión para continuar"); window.location="/login";</script>'
    );
    return;
  }
  const encoder = new TextEncoder();
  try {
    const { payload } = await jwtVerify(
      token,
      encoder.encode(process.env.JWT_PRIVATE_KEY)
    );

    req.usuarioId = payload.sub;
    req.rol = payload.rol;
    if (req.rol === "Administrador") {
      next();
    } else {
      res.send(
        '<script>alert("Acceso restringido."); window.location="/login";</script>'
      );
      return;
    }
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

router.use(
  ["/admin", "/clientes", "/clientes/info", "/citas", "/fichasMedicas"],
  verificarTokenAdmin
);

//admin

router.get("/admin", (req, res) => {
  res.render(path.join(__dirname, "..", "view", "admin"));
});

router.get("/clientes", ClienteController.obtenerClientes);

router.get("/clientes/info/:id", async (req, res) => {
  const usuarioId = req.params.id;
  console.log(usuarioId);
  ClienteController.obtenerUsuarioPorDni(usuarioId, async (error, usuario) => {
    if (error) {
      return res
        .status(500)
        .json({ error: "Error al obtener datos del usuario" });
    }

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    ClienteController.obtenerMascotasPorUsuario(
      usuario.ID_USUARIO,
      async (errorMascotas, mascotas) => {
        if (errorMascotas) {
          return res
            .status(500)
            .json({ error: "Error al obtener mascotas del usuario" });
        }
        const userType = "admin";
        const filePath = path.join(__dirname, "..", "view", "userInfo.ejs");
        res.render(filePath, {
          usuario,
          mascotas,
          formatoFecha,
          userType,
        });
      }
    );
  });
});

router.get("/citas", (req, res) => {
  res.render(path.join(__dirname, "..", "view", "citasProgramadas"));
});

router.get("/fichasMedicas", FichaMedicaController.obtenerFichasMedicas);

router.get("/citas", (req, res) => {
  res.render(path.join(__dirname, "..", "view", "citasProgramadas"));
});

// clientes

router.get("/user", (req, res) => {
  res.render(path.join(__dirname, "..", "view", "user"));
});

router.get("/perfil", async (req, res) => {
  const usuarioId = req.usuarioId;
  console.log(usuarioId);
  ClienteController.obtenerUsuarioPorId(usuarioId, async (error, usuario) => {
    if (error) {
      return res
        .status(500)
        .json({ error: "Error al obtener datos del usuario" });
    }

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    ClienteController.obtenerMascotasPorUsuario(
      usuarioId,
      async (errorMascotas, mascotas) => {
        if (errorMascotas) {
          return res
            .status(500)
            .json({ error: "Error al obtener mascotas del usuario" });
        }
        const userType = "user";
        const filePath = path.join(__dirname, "..", "view", "perfilUser.ejs");
        res.render(filePath, {
          usuario,
          mascotas,
          formatoFecha,
          userType,
        });
      }
    );
  });
});

router.get("/registroMascota", async (req, res) => {
  const usuarioId = req.usuarioId;
  console.log(usuarioId);
  ClienteController.obtenerUsuarioPorId(usuarioId, async (error, usuario) => {
    if (error) {
      return res
        .status(500)
        .json({ error: "Error al obtener datos del usuario" });
    }

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.render(path.join(__dirname, "..", "view", "registroMascota"));
  });
});

router.post(
  "/registroMascota",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "evidence", maxCount: 1 },
  ]),
  async (req, res) => {
    const usuarioId = req.usuarioId;
    console.log(usuarioId);
    const { nombre, tipo, raza, sexo, fecha } = req.body;

    const foto = req.files["photo"][0].path;
    const evidencia = req.files["evidence"][0].path;

    console.log("Datos recibidos:", {
      usuarioId,
      nombre,
      tipo,
      raza,
      sexo,
      fecha,
      foto,
      evidencia,
    });

    ClienteController.registrarMascota(
      usuarioId,
      nombre,
      tipo,
      raza,
      sexo,
      fecha,
      foto,
      evidencia,
      (error, resultado) => {
        if (error) {
          console.error("Error al registrar la mascota:", error);
          return res
            .status(500)
            .json({ error: "Error al registrar la mascota" });
        }
        console.log("Mascota registrada correctamente");
        res.redirect(`/perfil`);
      }
    );
  }
);

router.get("/registrarCita", async (req, res) => {
  const usuarioId = req.usuarioId;
  console.log(usuarioId);
  ClienteController.obtenerMascotasPorUsuario(
    usuarioId,
    async (errorMascotas, mascotas) => {
      if (errorMascotas) {
        return res
          .status(500)
          .json({ error: "Error al obtener mascotas del usuario" });
      }

      const filePath = path.join(__dirname, "..", "view", "registrarCita.ejs");
      res.render(filePath, {
        mascotas,
      });
    }
  );
});

router.post("/registrarCita", async (req, res) => {
  const usuarioId = req.usuarioId;
  console.log(usuarioId);
  const { motivo, mascotas, fecha } = req.body;

  if (!motivo || !mascotas || !fecha) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }
  CitasController.registrarCita(
    usuarioId,
    mascotas,
    fecha,
    motivo,
    (error, resultado) => {
      if (error) {
        res.send(
          '<script>alert("Error al registrar la cita. Intente nuevamente."); window.location="/registarCita";</script>'
        );
        return;
      }
      res.send(
        '<script>alert("¡Cita programada correctamente para tu mascota!"); window.location="/user";</script>'
      );
      return;
    }
  );
});

router.post("/registrarFicha", async (req, res) => {
  const { citaId, fecha, antc, diag, trat } = req.body;

  console.log("Datos recibidos:", { citaId, fecha, antc, diag, trat });

  FichaMedicaController.guardarFichaMedica(
    req,
    res,
    { citaId, fecha, antc, diag, trat },
    (error, resultado) => {
      if (error) {
        console.error("Error al registrar los datos:", error);
        return res.status(500).json({ error: "Error al registrar los datos" });
      }
      console.log("Datos registrados correctamente");
      res.redirect(`/fichasMedicas`);
    }
  );
});

router.get("/logout", (req, res) => {
  res.clearCookie("jwt");
  res.redirect("/login");
});

router.get("/obtener-usuarios", ClienteController.obtenerClientes);
router.get("/obtener-detalle", ClienteController.obtenerDetallesCliente);
router.get("/obtener-citas", CitasController.obtenerCitas);
router.get("/obtener-mascotas", MascotaController.obtenerMascotas);
router.get(
  "/obtener-detalle-mascotas",
  MascotaController.obtenerDetallesMascota
);
router.get(
  "/obtener-detalle-ficha",
  FichaMedicaController.obtenerDetallesFichaMedica
);

router.get("*", (req, res) => {
  const filePath = path.join(__dirname, "../view/e404.html");
  res.sendFile(filePath);
});

module.exports = router;
