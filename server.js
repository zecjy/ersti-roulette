const fs = require('fs');
const app = require('express')();

// https with good certificates? nginx?
const https = require('https').createServer(
  {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert'),
  },
  app
);

const io = require('socket.io')(https);

/**
 * Class representing an active User, always refers to an active socket
 */
class User {
  constructor(id) {
    /**
     * id referring to an active socket
     * @type {string}
     */
    this.id = id;
    /**
     * display name, if not set its the same as the id
     */
    this.name = id;
    /**
     * if the user is ready to begin a new call
     * @type {boolean}
     */
    this.free = false;
    /**
     * x entries with ids that were last connected to prevent connection to the same user again
     * @type {string[]}
     */
    this.lastSeen = [];
    /**
     * counts how many connections to each other user this user had
     * @type {Object.<string, int>}
     */
    this.countPartners = {};
    // push this new user to the users array
    users.push(this);
  }

  /**
   * updates the name of the user
   * @param {string} name displayname
   */
  setName(name) {
    this.name = name;
  }

  /**
   * users that are available as partner right now
   * @returns {User[]}
   */
  getAvailablePartners() {
    const available = [];
    users.forEach(user => {
      // some checks if the partner is free etc...
      if (user !== this && user.free && !this.lastSeen.includes(user)) {
        available.push(user);
      }
    });
    return available;
  }
}

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
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

// Event is fired on each new socket connecting
io.on('connection', socket => {
  // create new user object with corresponding id
  const user = new User(socket.id);

  // user sends us that he is ready to start chatting
  socket.on('ready', () => {
    const available = user.getAvailablePartners();

    // check for potential partners, if not set this user to free state and emit waiting
    if (available.length === 0) {
      user.free = true;
      socket.emit('waiting');
    } else {
      // take available partner and begin connection process by sending the partner id to this user
      const partner = available[0];
      partner.free = false;
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
    socket.to(data.to).emit('answer-made', {
      answer: data.answer,
      socket: socket.id,
      name: user.name,
    });
  });

  // updates the username
  socket.on('name', name => {
    user.setName(name);
  });

  // when the socket connection is closed we remove the associated user
  socket.on('disconnect', reason => {
    deleteUser(socket.id);
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

// start webserver
https.listen(443, () => {
  console.log('Server running on port 443 localhost');
});
