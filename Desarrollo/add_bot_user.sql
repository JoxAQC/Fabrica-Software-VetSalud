-- Anonymous user for bot appointments
USE bd_veterinaria;

-- Insert anonymous user 
INSERT INTO TB_USUARIO(DNI_USUARIO, NOMBRES_USUARIO, APELLIDOS_USUARIO, DIRECCION_USUARIO, CELULAR_USUARIO,
                       EMAIL_USUARIO, PASSWORD_USUARIO, ROL_USUARIO)
VALUES('00000000', 'Bot', 'de Citas', 'Direccion Anonima', 000000000, 
       'anonimo@vetsalud.com', 'anonimo123', 'Administrador');

-- update TB_USUARIO set ROL_USUARIO = 'Administrador' where EMAIL_USUARIO = 'anonimo@vetsalud.com';