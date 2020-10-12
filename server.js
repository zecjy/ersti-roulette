const fs = require('fs');
const express = require('express');
const https = require('https');
const socketio = require('socket.io');
const User = require('./User.js');

const app = express();
// https with good certificates? nginx?
const server = https.createServer(
  {
    key: fs.readFileSync('certs/server.key'),
    cert: fs.readFileSync('certs/server.cert'),
  },
  app
);
const io = socketio(server);

/**
 * Array of the connected users
 * @type {User[]}
 */
const users = [];

// just for debugging
setInterval(() => {
  console.log(users);
}, 2000);

// Serving static index file at root path
app.use(
  express.static('public', {
    etag: false,
  })
);

// Event is fired on each new socket connecting
io.on('connection', socket => {
  let user = getUser(socket.id);
  if (!user) {
    // create new user object with corresponding id
    user = new User(socket.id, socket.handshake.query.name);
    users.push(user);
  }

  // send new user too all except current user
  socket.broadcast.emit('new-user', user);

  // send all users to current user
  socket.emit('all-users', users);

  // user sends us that he is ready to start chatting
  socket.on('ready', () => {
    const available = getAvailablePartners(user);

    // check for potential partners, if not set this user to free state and emit waiting
    if (available.length === 0) {
      user.free = true;
      socket.emit('waiting');
      io.emit('update-user', user);
    } else {
      // take available partner and begin connection process by sending the partner id to this user
      const partner = available[0];
      socket.emit('next-partner', {
        id: partner.id,
        name: partner.name,
      });
    }
  });

  // our user trys to call a user directly with his WebRTC offer so we just forward it to the corresponding socket
  socket.on('call-user', data => {
    socket.to(data.to).emit('call-made', {
      offer: data.offer,
      socket: socket.id,
      name: user.name,
    });
  });

  // user received a call and wants to answer so we forward the answer to the original caller
  socket.on('make-answer', data => {
    user.free = false;
    io.emit('update-user', user);
    socket.to(data.to).emit('answer-made', {
      answer: data.answer,
      socket: socket.id,
      name: user.name,
    });
  });

  // updates the username
  socket.on('name', name => {
    user.setName(name);
    io.emit('update-user', user);
  });

  // when the socket connection is closed we remove the associated user
  socket.on('disconnect', reason => {
    deleteUser(socket.id);
    socket.broadcast.emit('remove-user', user.id);
  });
});

/**
 * removes an user by its id
 * @param {string} id id of the user and its socket
 */
function deleteUser(id) {
  users.forEach((user, i) => {
    if (user.id === id) {
      users.splice(i, 1);
    }
  });
}

/**
 * Finds an active user by its id
 * @param {string} id id of the user and its socket
 * @returns {User|null}
 */
function getUser(id) {
  return users.find(user => user.id === id);
}

/**
 * users that are available as partner right now
 * @param {User} user the user that we are looking for partners
 * @returns {User[]}
 */
function getAvailablePartners(user) {
  const available = [];
  users.forEach(partner => {
    // some checks if the partner is free etc...
    if (user !== partner && partner.free && !user.lastSeen.includes(partner)) {
      available.push(partner);
    }
  });
  return available;
}

// start webserver
server.listen(443, () => {
  console.log('Server running on port 443 localhost');
});
