const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const sessions = {}

app.use(express.static('client'))

app.get('/', function(req, res){
  res.sendFile(__dirname + '/client/index.html')
})

io.on('connection', function (socket) {
  console.log('#connect')
  socket.user = {}

  socket.on('register', function (id) {
    console.log('@ register', id)
    if (!id || id.length < 3) {
      return socket.emit('reg-result', { result: 0, message: 'id must be at least 3 character' })
    }
    socket.user.id = id

    // check existing connection
    if (!sessions[id]) { // host
      socket.user.isHost = true
      sessions[id] = { host: socket.user, hostSocket: socket }
      socket.emit('reg-result', { result: 1 })
    } else { // client
      socket.user.isHost = false
      sessions[id].remote = socket.user
      sessions[id].remoteSocket = socket
      socket.emit('reg-result', { result: 2, host: sessions[id].host })
    }
  })

  socket.on('sdp', function (desc) {
    console.log('% sdp', socket.user.id, !!desc)
    socket.user.desc = desc
    if (socket.user.isHost && sessions[socket.user.id].remoteSocket) {
      sessions[socket.user.id].remoteSocket.emit('sdp', desc)
    } else if (!socket.user.isHost && sessions[socket.user.id].hostSocket) {
      sessions[socket.user.id].hostSocket.emit('sdp', desc)
    }
  })

  socket.on('ice-new', function (ice) {
    console.log('% ice', socket.user.id, !!ice)
    socket.user.ice = ice
    if (socket.user.isHost && sessions[socket.user.id].remoteSocket) {
      sessions[socket.user.id].remoteSocket.emit('ice-new', ice)
    } else if (!socket.user.isHost && sessions[socket.user.id].hostSocket) {
      sessions[socket.user.id].hostSocket.emit('ice-new', ice)
    }
  })

  socket.on('disconnect', function () {
    console.log('* disconnect', socket.user)
  })
})

const port = process.env.PORT || 3000
http.listen(port, function(){
  console.log(`listening on *:${port}`)
})
