const session = {}

let socket
let isHost = false
let localStream
let peer

const startButton = document.getElementById('startButton')
const hangupButton = document.getElementById('hangupButton')
const localVideo = document.getElementById('localVideo')
const remoteVideo = document.getElementById('remoteVideo')
const loginPage = document.getElementById('loginPage')
const callPage = document.getElementById('callPage')

startButton.addEventListener('click', start)
hangupButton.addEventListener('click', stopCall)

function createPeer () {
  peer = new RTCPeerConnection({})  
  peer.addEventListener('icecandidate', onIceCandidate)
  peer.addEventListener('iceconnectionstatechange', onIceStateChange)
  peer.addEventListener('track', gotRemoteStream)

  localStream.getTracks().forEach(track => peer.addTrack(track, localStream))
}

function register () {
  connectWebSocket().then(() => {
    console.log('success')
    socket.emit('register', '111')
  }).catch(() => {
    window.alert('failed to connect to websocket.')
  })
}

function start () {
  startButton.disabled = true
  navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (stream) {
    localVideo.srcObject = stream
    localStream = stream
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
    console.log('### set remote stream')
  }
}

async function onIceCandidate(event) {
  if (event.candidate) {
    console.log('* send ice', event.candidate)
    socket.emit('ice-new', event.candidate)
  }
}

function onIceStateChange() {
  if (!peer) return

  const state = peer.iceConnectionState
  console.log('^ ice state changed', state)
  switch(state) {
    case 'closed':
    case 'failed':
    case 'disconnected':
      // closeVideoCall()
      break
  }
}

function showLogin (val) {
  if (val) {
    loginPage.style.display = 'table'
    callPage.style.display = 'none'
  } else {
    loginPage.style.display = 'none'
    callPage.style.display = 'block'
  }
}

function stopCall () {
  peer.close()
  socket.close()
  peer = null
  isHost = false
  localVideo.srcObject = null
  remoteVideo.srcObject = null
  startButton.disabled = false
  localStream = false
  showLogin(true)
}


/* Socket */
function connectWebSocket () {
  socket = io()

  socket.on('reg-result', function (res) {
    console.log('@ reg result', res)
    switch(res.result) {
      case 1:
        isHost = true
        showLogin(false)
        createPeer ()
        call()
        break
      case 2:
        showLogin(false)
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
  
  socket.on('partner-disconnected', function () {
    console.log('- partner disconnected')
    stopCall()
  })

  return new Promise((resolve, reject) => {
    socket.on('connect', function () {
      resolve(1)
    })
    socket.on('connect_error', function () {
      reject(1)
    })
    socket.on('connect_timeout', function () {
      reject(1)
    })
  })
}