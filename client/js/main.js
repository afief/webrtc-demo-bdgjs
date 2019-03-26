const session = {}
const socket = io()
socket.on('reg-result', function (res) {
  console.log('@ reg result', res)
  switch(res.result) {
    case 1:
      start()
      break
    case 2:
      receive(res.host.desc)
      break
    default:
      window.alert(res.message || 'Something Wrong with register result')
      break
  }
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

startButton.addEventListener('click', register)
callButton.addEventListener('click', call)

let localStream
let pc1
let pc2

async function register () {
  socket.emit('register', '111')
}

async function start () {
  startButton.disabled = true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    localVideo.srcObject = stream
    localStream = stream
    callButton.disabled = false 
    call()
  } catch (e) {
    alert(`getUserMedia() error: ${e.name}`)
  }
}

async function call () {
  const configuration = {}
  pc1 = new RTCPeerConnection(configuration)
  pc2 = new RTCPeerConnection(configuration)
  
  pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e))
  pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e))

  pc1.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc1, e))
  pc2.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc2, e))

  pc2.addEventListener('track', gotRemoteStream)

  localStream.getTracks().forEach(track => pc1.addTrack(track, localStream))

  try {
    console.log('pc1 createOffer start');
    const offer = await pc1.createOffer({
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    });
    console.log('offer', offer)
    socket.emit('sdp', offer)
    await onCreateOfferSuccess(offer);
  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

async function onCreateOfferSuccess(desc) {
  console.log(`Offer from pc1\n${desc.sdp}`);
  console.log('pc1 setLocalDescription start');
  try {
    await pc1.setLocalDescription(desc);
    onSetLocalSuccess(pc1);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }

  console.log('pc2 setRemoteDescription start');
  try {
    await pc2.setRemoteDescription(desc);
    onSetRemoteSuccess(pc2);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }

  console.log('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  try {
    const answer = await pc2.createAnswer();
    await onCreateAnswerSuccess(answer);
  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

async function onCreateAnswerSuccess(desc) {
  console.log(`Answer from pc2:\n${desc.sdp}`);
  console.log('pc2 setLocalDescription start');
  try {
    await pc2.setLocalDescription(desc);
    onSetLocalSuccess(pc2);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }
  console.log('pc1 setRemoteDescription start');
  try {
    await pc1.setRemoteDescription(desc);
    onSetRemoteSuccess(pc1);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }
}

function onSetLocalSuccess(pc) {
  console.log(`${getName(pc)} setLocalDescription complete`);
}

function onSetRemoteSuccess(pc) {
  console.log(`${getName(pc)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
  console.log(`Failed to set session description: ${error.toString()}`);
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0]
    console.log('pc2 received remote stream')
  }
}

async function onIceCandidate(pc, event) {
  try {
    await (getOtherPc(pc).addIceCandidate(event.candidate));
    onAddIceCandidateSuccess(pc)
  } catch (e) {
    onAddIceCandidateError(pc, e);
  }
  console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
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