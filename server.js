const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static('public'));

const onlineKullanicilar = new Set();

io.on('connection', (socket) => {

  socket.on('katil', (kullanici) => {
    socket.kullanici = kullanici;
    onlineKullanicilar.add(kullanici);
    io.emit('online', Array.from(onlineKullanicilar));
    io.emit('sistem', kullanici + ' odaya katıldı');
  });

  socket.on('mesaj', (data) => {
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

server.listen(3000, () => {
  console.log('Sunucu 3000 portunda çalışıyor');
});