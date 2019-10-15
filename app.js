//hello

var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.use(express.json());

app.get('/',function(req, res){
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

app.post('/', function(req, res){
  // instead of print data, we could make a call out to our database to save the form data.
  console.log(req.body);
  res.sendFile(__dirname + '/client/game.html');
});

app.get('/game',function(req, res){
  res.sendFile(__dirname + '/client/game.html');
});

serv.listen(process.env.PORT || 2000);//listen to port 2000
console.log("Server started.");

var SOCKET_LIST = {};
var PLAYER_LIST = {};

/*var Player = function(id){
  var self = {
    x:250,
    y:250,
    id:id,
    number:"" + Math.floor(10 * Math.random()),
    pressingRight:false,
    pressingLeft:false,
    pressingUp:false,
    pressingDown:false,
    maxSpd:10
  }
  self.updatePosition = function(){
    if(self.pressingRight)
      self.x += self.maxSpd;
    if(self.pressingLeft)
      self.x -= self.maxSpd;
    if(self.pressingUp)
      self.y -= self.maxSpd;
    if(self.pressingDown)
      self.y += self.maxSpd;
  }
  return self;
}
*/
class Entity{
  constructor(){
    this.x = 250;
    this.y = 250;
    this.rot = 0;
    this.maxSpd = 10;

   }
   getPosX(){
     return this.x;
   }
   getPosY(){
     return this.y;
   }
   getRot(){
     return this.rot;
   }
   getMaxSpd(){
     return this.maxSpd;
   }
   setRot(nRotation)
   {
     this.rot = nRotation;
   }
   setMaxSpd(nSpeed){
     this.maxSpd = nSpeed;
   }
   getDistance(x1,y1,x2,y2){
     let xDist = x2 - x1;
     let yDist = y2 - y1;

     return Math.sqrt(Math.pow(xDist,2) + Math.pow(yDist,2));
   }

}
class Player extends Entity{
  constructor(id) {
    super();
    this.id = id;
    this.number = " "+ Math.floor(10*Math.random());
    this.pressingRight = false;
    this.pressingLeft = false;
    this.pressingUp = false;
    this.pressingDown = false;
  }

  updatePosition(){
    if(this.pressingRight)
      this.x += this.maxSpd;
    if(this.pressingLeft)
      this.x -= this.maxSpd;
    if(this.pressingUp)
      this.y -= this.maxSpd;
    if(this.pressingDown)
      this.y += this.maxSpd;
  }

}
class Bullet extends Entity{
  constructor(id){
      super();
      this.id = id;
      this.speed = 0;
      this.damage = 0;
  }
}
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){

  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;

  var player = new Player(socket.id);
  PLAYER_LIST[socket.id] = player;

  socket.on('disconnect', function(){
    delete SOCKET_LIST[socket.id];
    delete PLAYER_LIST[socket.id];
    console.log("Player disconnection");
  });

  socket.on('keyPress', function(data){
    if(data.inputId === 'left')
      player.pressingLeft = data.state;
    else if(data.inputId === 'right')
      player.pressingRight = data.state;
    else if(data.inputId === 'up')
      player.pressingUp = data.state;
    else if(data.inputId === 'down')
      player.pressingDown = data.state;
  });

    console.log('Player connection');
});

setInterval(function(){
  var pack = [];
  for(var i in PLAYER_LIST){
    var player = PLAYER_LIST[i];
    player.updatePosition();
    pack.push({
      x:player.x,
      y:player.y,
      number:player.number
    });
  }
  for (var i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    socket.emit('newPosition',pack);
  }
}, 1000/60)
