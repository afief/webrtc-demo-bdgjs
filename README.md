# webrtc-demo-bdgjs

startup
```
yarn install
yarn start
```

### Deploy to heroku
enable [http-session-affinity](https://blog.heroku.com/session-affinity-ga) first
```
heroku features:enable http-session-affinity
```

create app
```
heroku create
```
deploy
```
git push heroku master
```
open on the browser
```
heroku open
```

### TURN Server
You can try it on the same local network between 2 peers.
If it is on different network, you may need [`TURN server`](https://en.wikipedia.org/wiki/Traversal_Using_Relays_around_NAT) to relay media.
