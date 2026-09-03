const fs = require('fs');
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { encriptar } = require('../encriptado');
const { TRIAL_DIAS } = require('../suscripcion');

const router = express.Router();

const CARPETA_UPLOADS = path.join(__dirname, '..', 'uploads', 'perfil');
fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });

const storageFoto = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CARPETA_UPLOADS),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname) || '.jpg';
    cb(null, `usuario-${req.usuario.id}-${Date.now()}${extension}`);
  },
});

const subirFoto = multer({
  storage: storageFoto,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('El archivo tiene que ser una imagen'));
    }
    cb(null, true);
  },
});

function firmarToken(usuario) {
  return jwt.sign({ id: usuario.id, email: usuario.email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
}

router.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }
  const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existente) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const resultado = db
    .prepare(`INSERT INTO usuarios (email, password_hash, fecha_fin_prueba) VALUES (?, ?, datetime('now', '+${TRIAL_DIAS} days'))`)
    .run(email, passwordHash);
  const usuario = db.prepare('SELECT id, email, creado_en FROM usuarios WHERE id = ?').get(resultado.lastInsertRowid);
  res.status(201).json(usuario);
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }
  const token = firmarToken(usuario);
  res.json({ token });
});

router.put('/fcm-token', requireAuth, (req, res) => {
  const { fcm_token } = req.body || {};
  if (fcm_token === undefined) {
    return res.status(400).json({ error: 'fcm_token es obligatorio' });
  }
  db.prepare('UPDATE usuarios SET fcm_token = ? WHERE id = ?').run(fcm_token, req.usuario.id);
  res.json({ ok: true });
});

router.get('/perfil', requireAuth, (req, res) => {
  const usuario = db
    .prepare(
      `SELECT id, nombre, email, foto_perfil, idioma, tema, notificaciones_activas, perfil_cv,
              computrabajo_email, (computrabajo_password_enc IS NOT NULL) AS computrabajo_conectado,
              (computrabajo_cookies_enc IS NOT NULL) AS computrabajo_sesion_conectada,
              imap_email, (imap_password_enc IS NOT NULL) AS imap_conectado
       FROM usuarios WHERE id = ?`
    )
    .get(req.usuario.id);
  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  res.json(usuario);
});

router.put('/perfil-cv', requireAuth, (req, res) => {
  const { perfil_cv } = req.body || {};
  if (typeof perfil_cv !== 'string') {
    return res.status(400).json({ error: 'perfil_cv es obligatorio (string)' });
  }
  db.prepare('UPDATE usuarios SET perfil_cv = ? WHERE id = ?').run(perfil_cv, req.usuario.id);
  res.json({ perfil_cv });
});

router.put('/perfil', requireAuth, (req, res) => {
  const { nombre, idioma, tema, notificaciones_activas } = req.body || {};
  if (idioma !== undefined && !['es', 'en'].includes(idioma)) {
    return res.status(400).json({ error: "idioma tiene que ser 'es' o 'en'" });
  }
  if (tema !== undefined && !['claro', 'oscuro'].includes(tema)) {
    return res.status(400).json({ error: "tema tiene que ser 'claro' u 'oscuro'" });
  }

  const actual = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
  db.prepare(
    'UPDATE usuarios SET nombre = ?, idioma = ?, tema = ?, notificaciones_activas = ? WHERE id = ?'
  ).run(
    nombre !== undefined ? nombre : actual.nombre,
    idioma !== undefined ? idioma : actual.idioma,
    tema !== undefined ? tema : actual.tema,
    notificaciones_activas !== undefined ? (notificaciones_activas ? 1 : 0) : actual.notificaciones_activas,
    req.usuario.id
  );

  const usuario = db
    .prepare('SELECT id, nombre, email, foto_perfil, idioma, tema, notificaciones_activas FROM usuarios WHERE id = ?')
    .get(req.usuario.id);
  res.json(usuario);
});

router.put('/email', requireAuth, (req, res) => {
  const { email, password_actual } = req.body || {};
  if (!email || !password_actual) {
    return res.status(400).json({ error: 'email y password_actual son obligatorios' });
  }
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!bcrypt.compareSync(password_actual, usuario.password_hash)) {
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  }
  const enUso = db.prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?').get(email, req.usuario.id);
  if (enUso) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
  }
  db.prepare('UPDATE usuarios SET email = ? WHERE id = ?').run(email, req.usuario.id);
  // El JWT lleva el email embebido -- hay que remitir uno nuevo para que el
  // frontend no se quede con el email viejo hasta que expire el token.
  const token = firmarToken({ id: req.usuario.id, email });
  res.json({ token });
});

router.put('/password', requireAuth, (req, res) => {
  const { password_actual, password_nueva } = req.body || {};
  if (!password_actual || !password_nueva) {
    return res.status(400).json({ error: 'password_actual y password_nueva son obligatorios' });
  }
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!bcrypt.compareSync(password_actual, usuario.password_hash)) {
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  }
  const passwordHash = bcrypt.hashSync(password_nueva, 10);
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(passwordHash, req.usuario.id);
  res.json({ ok: true });
});

router.post('/foto-perfil', requireAuth, subirFoto.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Falta el archivo de la foto (campo "foto")' });
  }
  const actual = db.prepare('SELECT foto_perfil FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (actual.foto_perfil) {
    fs.unlink(path.join(CARPETA_UPLOADS, path.basename(actual.foto_perfil)), () => {});
  }
  const fotoPerfil = `/uploads/perfil/${req.file.filename}`;
  db.prepare('UPDATE usuarios SET foto_perfil = ? WHERE id = ?').run(fotoPerfil, req.usuario.id);
  res.json({ foto_perfil: fotoPerfil });
});

// Credenciales de Computrabajo para computrabajoScraper.js -- la contraseña
// se guarda encriptada (encriptado.js), nunca en texto plano ni se vuelve a
// devolver en ningun GET (ver /auth/perfil, que solo manda
// computrabajo_conectado: true/false). Se borran las cookies de sesion
// guardadas al reconectar, para que el proximo scrape haga login limpio con
// la contraseña nueva en vez de reusar una sesion vieja.
router.put('/computrabajo', requireAuth, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }
  db.prepare(
    'UPDATE usuarios SET computrabajo_email = ?, computrabajo_password_enc = ?, computrabajo_cookies_enc = NULL WHERE id = ?'
  ).run(email, encriptar(password), req.usuario.id);
  res.json({ ok: true });
});

router.delete('/computrabajo', requireAuth, (req, res) => {
  db.prepare(
    'UPDATE usuarios SET computrabajo_email = NULL, computrabajo_password_enc = NULL, computrabajo_cookies_enc = NULL WHERE id = ?'
  ).run(req.usuario.id);
  res.json({ ok: true });
});

// Alternativa a usuario+contraseña para cuentas de Computrabajo con login
// federado (Google/Outlook/etc.) -- en vez de automatizar el login del
// proveedor externo (mucho mas sensible y propenso a bloqueos), la usuaria
// exporta las cookies de una sesion ya logueada en SU PROPIO navegador (ej.
// con la extension Cookie-Editor) y las pega acá. `cookies` es el JSON tal
// cual lo exporta la extension -- se valida que sea JSON antes de guardar,
// pero no se reinterpreta su forma (eso lo hace computrabajoScraper.js al
// usarlas).
router.put('/computrabajo-cookies', requireAuth, (req, res) => {
  const { cookies } = req.body || {};
  if (!cookies || typeof cookies !== 'string') {
    return res.status(400).json({ error: 'cookies es obligatorio (JSON como texto)' });
  }
  try {
    JSON.parse(cookies);
  } catch {
    return res.status(400).json({ error: 'cookies no es JSON válido' });
  }
  db.prepare('UPDATE usuarios SET computrabajo_cookies_enc = ? WHERE id = ?').run(encriptar(cookies), req.usuario.id);
  res.json({ ok: true });
});

// Servidores IMAP de los proveedores mas comunes -- si el dominio del email
// no esta acá, la usuaria tiene que escribir el host a mano (campo opcional
// en el frontend). Generaliza emailSync.js, antes fijo a una sola casilla
// (la dueña, por variable de entorno).
const IMAP_HOST_POR_DOMINIO = {
  'gmail.com': 'imap.gmail.com',
  'googlemail.com': 'imap.gmail.com',
  'outlook.com': 'outlook.office365.com',
  'hotmail.com': 'outlook.office365.com',
  'live.com': 'outlook.office365.com',
  'msn.com': 'outlook.office365.com',
  'yahoo.com': 'imap.mail.yahoo.com',
  'ymail.com': 'imap.mail.yahoo.com',
  'icloud.com': 'imap.mail.me.com',
  'me.com': 'imap.mail.me.com',
};

function imapHostDe(email, hostManual) {
  if (hostManual) return hostManual;
  const dominio = email.split('@')[1]?.toLowerCase();
  return IMAP_HOST_POR_DOMINIO[dominio] || null;
}

// Contraseña de aplicacion, no la contraseña real de la cuenta de correo --
// se aclara en el frontend (con link a como generarla en Gmail/Outlook). Se
// guarda encriptada, igual que computrabajo_password_enc. Ver emailSync.js
// para como se usa (recorre todas las cuentas con imap_email cargado).
router.put('/imap', requireAuth, (req, res) => {
  const { email, password, host } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }
  const imapHost = imapHostDe(email, host);
  if (!imapHost) {
    return res.status(400).json({ error: 'No reconocemos el servidor IMAP de ese dominio -- especificalo a mano.' });
  }
  db.prepare('UPDATE usuarios SET imap_email = ?, imap_host = ?, imap_password_enc = ? WHERE id = ?').run(
    email,
    imapHost,
    encriptar(password),
    req.usuario.id
  );
  res.json({ ok: true });
});

router.delete('/imap', requireAuth, (req, res) => {
  db.prepare('UPDATE usuarios SET imap_email = NULL, imap_host = NULL, imap_password_enc = NULL WHERE id = ?').run(
    req.usuario.id
  );
  res.json({ ok: true });
});

module.exports = router;
