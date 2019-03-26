const session = {}
const socket = io()

let isHost = false

socket.on('reg-result', function (res) {
  console.log('@ reg result', res)
  switch(res.result) {
    case 1:
      isHost = true
      createPeer ()
      call()
      break
    case 2:
      createPeer ()
      if (res.host.desc) {
        receive(res.host.desc).then(function() {
          if (res.host.ice) {
            receiveIce(res.host.ice)
          }
        })
      }
      break
    default:
      window.alert(res.message || 'Something Wrong with register result')
      break
  }
})

socket.on('sdp', function (desc) {
  receive(desc)
})

socket.on('ice-new', function (ice) {
  receiveIce(ice)
})

const startButton = document.getElementById('startButton')
const callButton = document.getElementById('callButton')

const localVideo = document.getElementById('localVideo')
const remoteVideo = document.getElementById('remoteVideo')

localVideo.addEventListener('loadedmetadata', function() {
  console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
})

remoteVideo.addEventListener('loadedmetadata', function() {
  console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
})

startButton.addEventListener('click', start)
callButton.addEventListener('click', call)

let localStream
let peer

function createPeer () {
  peer = new RTCPeerConnection({})  
  peer.addEventListener('icecandidate', onIceCandidate)
  // peer.addEventListener('iceconnectionstatechange', e => onIceStateChange(peer, e))
  peer.addEventListener('track', gotRemoteStream)

  localStream.getTracks().forEach(track => peer.addTrack(track, localStream))
}

function register () {
  socket.emit('register', '111')
}

function start () {
  startButton.disabled = true
  navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (stream) {
    localVideo.srcObject = stream
    localStream = stream
    callButton.disabled = false 
    register()
  }).catch(function (e) {
    alert(`getUserMedia() error: ${e.name}`)
  })
}

function call () {
  console.log('# call')

  return peer.createOffer().then(function (offer) {
    return peer.setLocalDescription(offer);
  }).then(function () {
    socket.emit('sdp', peer.localDescription)
  }).catch(function (error) {
    console.log(`Failed to create session description: ${error.toString()}`);
  })
}

function receive (desc) {
  console.log('# receive')

  if (isHost) {
    return peer.setRemoteDescription(desc)
  }

  return peer.setRemoteDescription(desc).then(function() {
    return peer.createAnswer()
  }).then(function(answer) {
    return peer.setLocalDescription(answer)
  }).then(function () {
    socket.emit('sdp', peer.localDescription)
  }).catch(function (error) {
    console.log('Receive Offer Error', error.toString())
  })
}

function receiveIce (ice) {
  console.log('# receive ice', ice)
  const candidate = new RTCIceCandidate(ice)
  return peer.addIceCandidate(candidate).catch(function (err) {
    console.log('! failed to add ice candidate', err.toString())
  })
}

function gotRemoteStream(e) {
  console.log('### got remote stream')
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0]
    console.log('pc2 received remote stream')
  }
}

async function onIceCandidate(event) {
  if (event.candidate) {
    console.log('* send ice', event.candidate)
    socket.emit('ice-new', event.candidate)
  }
}

function onAddIceCandidateSuccess(pc) {
  console.log(`${getName(pc)} addIceCandidate success`);
}

function onIceStateChange(pc, event) {
  if (pc) {
    console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
    console.log('ICE state change event: ', event);
  }
}

function onAddIceCandidateError(pc, error) {
  console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

function getName (pc) {
  return (pc === pc1) ? 'pc1' : 'pc2'
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}