//Server Side

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
    this.x = 250;//position
    this.y = 250;//position
    this.width = 0;//sizing
    this.height = 0;//sizing
    this.rot = 0;//angle of rotation
    this.maxSpd = 3;//movement speed
    this.rotSpd = 2;//rotation speed


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
    this.pressingRight = false;//variables to handle user input
    this.pressingLeft = false;
    this.pressingUp = false;
    this.pressingDown = false;
    this.rotatingCannonLeft = false;
    this.rotatingCannonRight = false;


    this.height = 50;//sizing of tank
    this.width = 30;//sizing of tank
    this.rad = 0;//tank's intial angle of rotation


    this.cannonWidth = 5;//sizing of cannon
    this.cannonHeight = 40;//sizing of cannon
    this.cannonAngle = 180;//cannon's angle of rotation
    this.cannonSpeed = 2;//cannon's rotation speed
  }

  updatePosition(){
    if(this.pressingRight)//rotate to the right
      this.rot += this.rotSpd;//updates direction of tank
    if(this.pressingLeft)//rotate to the left
      this.rot -= this.rotSpd;//updates rotation angle
    if(this.pressingUp){//move forward
      this.rad = ((this.rot + 90) * Math.PI) / 180;//angle of rotation + 90 degrees and converted to radians
      this.y -= (this.maxSpd * Math.sin(this.rad));//updating y position (y = max speed * sin(rotation angle))
      this.x -= (this.maxSpd * Math.cos(this.rad));//updating x position (x = max speed * cos(rotation angle))
    }
    if(this.pressingDown){//move backward
      this.rad = ((this.rot + 90) * Math.PI) / 180;//angle of rotation + 90 degrees and converted to radians
      this.y += (this.maxSpd * Math.sin(this.rad));//updating y position (y speed = max speed * sin(rotation angle))
      this.x += (this.maxSpd * Math.cos(this.rad));//updating x position (x speed = max speed * cos(rotation angle))
    }
    if (this.rotatingCannonRight){//rotate cannon to right
      this.cannonAngle += this.cannonSpeed;//updating cannon's angle of rotation
    }
    if (this.rotatingCannonLeft){//rotate cannon to left
      this.cannonAngle -= this.cannonSpeed;//updating cannon's angle of rotation
    }
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
    else if(data.inputId === 'cannonRight')
      player.rotatingCannonRight = data.state;
    else if(data.inputId === 'cannonLeft')
      player.rotatingCannonLeft = data.state;
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
      rot:player.rot,
      width:player.width,
      height:player.height,
      number:player.number,
      cannonAngle:player.cannonAngle,
      cannonWidth:player.cannonWidth,
      cannonHeight:player.cannonHeight

    });
  }
  for (var i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    socket.emit('newPosition',pack);
  }
}, 1000/60)
