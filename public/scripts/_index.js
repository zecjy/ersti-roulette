// initialize some stuff for WebRTC
const { RTCPeerConnection, RTCSessionDescription } = window;

function initName() {
  const name = document.getElementById('input-modal-name').value;
  if (name != '') {
    $('#name-modal').modal('hide');
    connect(name);
  }
}

async function init(name) {
  // get media streams and set locally
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  document.getElementById('local-video').srcObject = stream;

  let isInCall = false;

  // initialize socket.io with name parameter
  const socket = io({
    query: {
      name: name,
    },
  });

  // we receive an id that we can call, yay
  socket.on('next-partner', partner => {
    callUser(partner.id);
  });

  async function callUser(id) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit('call-user', {
      offer,
      to: socketId,
    });
  }
}

function createPeerConnection(stream) {
  const peerConnection = new RTCPeerConnection();

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
    //if (peerConnection.connectionState == 'disconnected') ready();
  };

  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  return peerConnection;
}
