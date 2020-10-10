const fs = require('fs');
const app = require('express')();
const https = require('https').createServer(
  { key: fs.readFileSync('server.key'), cert: fs.readFileSync('server.cert') },
  app
);
const io = require('socket.io')(https);

/**
 * { 123456: {
 *    lastSeen: [],
 *    seen: { 123456: 5, 1234766: 0}
 * }}
 * */

class User {
  constructor(id) {
    this.id = id;
    this.free = false;
    this.lastSeen = [];
    this.countPartners = {};
    users.push(this);
  }

  getAvailablePartners() {
    let available = [];
    users.forEach(user => {
      if (user !== this && user.free && !this.lastSeen.includes(user)) {
        available.push(user);
      }
    });
    return available;
  }
}

const users = [];

setInterval(() => {
  console.log(users);
}, 2000);

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

io.on('connection', socket => {
  let user = getUser(socket.id);
  if (!user) {
    user = new User(socket.id);
  }

  socket.on('ready', () => {
    let available = user.getAvailablePartners();

    if (available.length === 0) {
      user.free = true;
    } else {
      let partner = available[0];
      partner.free = false;
      socket.emit('next-partner', partner.id);
    }
  });

  socket.on('call-user', data => {
    socket.to(data.to).emit('call-made', {
      offer: data.offer,
      socket: socket.id,
    });
  });

  socket.on('make-answer', data => {
    socket.to(data.to).emit('answer-made', {
      answer: data.answer,
      socket: socket.id,
    });
  });

  socket.on('disconnect', reason => {
    deleteUser(socket.id);
  });
});

function deleteUser(id) {
  users.forEach((user, i) => {
    if (user.id === id) {
      users.splice(i, 1);
    }
  });
}

function getUser(id) {
  return users.find(user => user.id === id);
}

https.listen(443, () => {
  console.log('Server running on port 443 localhost');
});
