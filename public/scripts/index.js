// lots taken from here: https://blog.logrocket.com/webrtc-over-websocket-in-node-js/

// initialize some stuff for WebRTC
const { RTCPeerConnection, RTCSessionDescription } = window;

let socket;
let peerConnection = new RTCPeerConnection();

$(window).on('load', () => {
  $('#name-modal').modal({
    backdrop: 'static',
    keyboard: false,
  });
});

function initName() {
  const name = document.getElementById('input-modal-name').value;
  if (name != '') {
    $('#name-modal').modal('hide');
    initSocket(name);
  }
}

function initSocket(name) {
  // initialize socket.io with name parameter
  socket = io({
    query: {
      name: name,
    },
  });

  // we receive an id that we can call, yay
  socket.on('next-partner', partner => {
    callUser(partner.id);
  });

  // WebRTC stuff idk pasted...
  // so when someone is calling us,
  socket.on('call-made', async data => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    socket.emit('make-answer', {
      answer,
      to: data.socket,
    });
  });

  // ... yep
  socket.on('answer-made', async data => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));

    if (!isAlreadyCalling) {
      callUser(data.socket);
      isAlreadyCalling = true;
    }
  });

  // add user to userlist
  socket.on('new-user', user => {
    addUser(user);
  });

  // add all users that are connected
  socket.on('all-users', users => {
    users.forEach(user => {
      addUser(user);
    });
  });

  socket.on('update-user', user => {
    const userinfo = document.getElementById(`userinfo-${user.id}`);
    const name = userinfo.getElementsByClassName('userinfo-name')[0];
    name.textContent = user.name;
    const status = userinfo.getElementsByClassName('dot')[0];
    status.className = user.free ? 'dot dot-green' : 'dot dot-red';
  });

  // remove user from list
  socket.on('remove-user', id => {
    const element = document.getElementById(`userinfo-${id}`);
    element.parentElement.removeChild(element);
  });
}

// calling state
let isAlreadyCalling = false;

// really messy here...
setLocalCam();
async function setLocalCam() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  document.getElementById('local-video').srcObject = stream;
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
}

// when we receive the stream from the peerConnection, set it as video source
peerConnection.ontrack = ({ streams: [stream] }) => {
  const remoteVideo = document.getElementById('remote-video');
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

// when the peerConnection is disconnected, send our ready state
peerConnection.onconnectionstatechange = () => {
  console.log(peerConnection.connectionState);
  if (peerConnection.connectionState == 'disconnected') ready();
};

// call a user directly by its id
async function callUser(socketId) {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

  socket.emit('call-user', {
    offer,
    to: socketId,
  });
}

function addUser(user) {
  const container = document.createElement('div');
  const name = document.createElement('span');
  const status = document.createElement('span');
  status.className = user.free ? 'dot dot-green' : 'dot dot-red';
  name.textContent = user.name;
  name.className = 'userinfo-name';
  container.appendChild(status);
  container.appendChild(name);
  container.id = `userinfo-${user.id}`;
  document.getElementById('userlist').appendChild(container);
}

// basically we are ready
function ready() {
  isAlreadyCalling = false;
  socket.emit('ready');
}

// sends the new username
function updateName() {
  const name = document.getElementById('input-name').value;
  socket.emit('name', name);
}
