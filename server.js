const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static('public'));

const onlineKullanicilar = new Set();
const mesajGecmisi = [];

io.on('connection', (socket) => {

  socket.on('katil', (kullanici) => {
    socket.kullanici = kullanici;
    onlineKullanicilar.add(kullanici);
    io.emit('online', Array.from(onlineKullanicilar));
    socket.emit('gecmis', mesajGecmisi);
    io.emit('sistem', kullanici + ' odaya katıldı');
  });

  socket.on('mesaj', (data) => {
    mesajGecmisi.push(data);
    if (mesajGecmisi.length > 50) mesajGecmisi.shift();
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
    mesajGecmisi.length = 0;
    io.emit('sistem', 'Mesajlar sıfırlandı. Yeni gün başladı.');
    io.emit('gecmis', []);
    geceyarisisiSifirla();
  }, kalan);
}

geceyarisisiSifirla();

server.listen(3000, () => {
  console.log('Sunucu 3000 portunda çalışıyor');
});