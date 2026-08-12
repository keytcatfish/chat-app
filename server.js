const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const initSqlJs = require('sql.js');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static('public'));

const onlineKullanicilar = new Set();
let db;
const DB_PATH = './chat.db';

initSqlJs().then((SQL) => {
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS mesajlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici TEXT,
      mesaj TEXT,
      zaman INTEGER
    )
  `);

  function kaydet() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  io.on('connection', (socket) => {

    socket.on('katil', (kullanici) => {
      socket.kullanici = kullanici;
      onlineKullanicilar.add(kullanici);
      io.emit('online', Array.from(onlineKullanicilar));
      const rows = db.exec('SELECT kullanici, mesaj FROM mesajlar ORDER BY zaman ASC');
      const mesajlar = rows.length > 0 ? rows[0].values.map(r => ({ kullanici: r[0], mesaj: r[1] })) : [];
      socket.emit('gecmis', mesajlar);
      io.emit('sistem', kullanici + ' odaya katıldı');
    });

    socket.on('mesaj', (data) => {
      db.run('INSERT INTO mesajlar (kullanici, mesaj, zaman) VALUES (?, ?, ?)',
        [data.kullanici, data.mesaj, Date.now()]);
      kaydet();
      io.emit('mesaj', data);
    });

    socket.on('disconnect', () => {
      if (socket.kullanici) {
        onlineKullanicilar.delete(socket.kullanici);
        io.emit('online', Array.from(onlineKullanicilar));
        io.emit('sistem', socket.kullanici + ' ayrıldı');
      }
    });

  });

  function geceyarisisiSifirla() {
    const simdi = new Date();
    const geceyarisi = new Date();
    geceyarisi.setHours(24, 0, 0, 0);
    const kalan = geceyarisi - simdi;
    setTimeout(() => {
      db.run('DELETE FROM mesajlar');
      kaydet();
      io.emit('sistem', 'Mesajlar sıfırlandı. Yeni gün başladı.');
      io.emit('gecmis', []);
      geceyarisisiSifirla();
    }, kalan);
  }

  geceyarisisiSifirla();

  server.listen(3000, () => {
    console.log('Sunucu 3000 portunda çalışıyor');
  });
});