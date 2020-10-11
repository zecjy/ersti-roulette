// lots taken from here: https://blog.logrocket.com/webrtc-over-websocket-in-node-js/

// initialize some stuff for WebRTC
const { RTCPeerConnection, RTCSessionDescription } = window;
const peerConnection = new RTCPeerConnection();

// initialize socket.io
const socket = io();

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
