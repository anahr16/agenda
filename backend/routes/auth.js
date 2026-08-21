const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

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
    .prepare('INSERT INTO usuarios (email, password_hash) VALUES (?, ?)')
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
  const token = jwt.sign({ id: usuario.id, email: usuario.email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
  res.json({ token });
});

router.put('/fcm-token', requireAuth, (req, res) => {
  const { fcm_token } = req.body || {};
  if (!fcm_token) {
    return res.status(400).json({ error: 'fcm_token es obligatorio' });
  }
  db.prepare('UPDATE usuarios SET fcm_token = ? WHERE id = ?').run(fcm_token, req.usuario.id);
  res.json({ ok: true });
});

module.exports = router;
