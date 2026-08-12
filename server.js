const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static('public'));

const db = new sqlite3.Database('chat.db');

db.run(`
  CREATE TABLE IF NOT EXISTS mesajlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici TEXT,
    mesaj TEXT,
    zaman INTEGER
  )
`);

const onlineKullanicilar = new Set();

io.on('connection', (socket) => {

  socket.on('katil', (kullanici) => {
    socket.kullanici = kullanici;
    onlineKullanicilar.add(kullanici);
    io.emit('online', Array.from(onlineKullanicilar));
    db.all('SELECT * FROM mesajlar ORDER BY zaman ASC', (err, rows) => {
      socket.emit('gecmis', rows);
    });
    io.emit('sistem', kullanici + ' odaya katıldı');
  });

  socket.on('mesaj', (data) => {
    db.run('INSERT INTO mesajlar (kullanici, mesaj, zaman) VALUES (?, ?, ?)',
      [data.kullanici, data.mesaj, Date.now()]);
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
    io.emit('sistem', 'Mesajlar sıfırlandı. Yeni gün başladı.');
    io.emit('gecmis', []);
    geceyarisisiSifirla();
  }, kalan);
}

geceyarisisiSifirla();

server.listen(3000, () => {
  console.log('Sunucu 3000 portunda çalışıyor');
});