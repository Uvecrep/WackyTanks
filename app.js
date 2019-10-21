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
var BULLET_LIST = {};


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
   getDistance(x1,y1,x2,y2){
     let xDist = x2 - x1;
     let yDist = y2 - y1;

     return Math.sqrt(Math.pow(xDist,2) + Math.pow(yDist,2));
   }

}

class Player extends Entity{
  constructor(id) {
    super();
    this.health = 10;
    this.id = id;
    this.number = " "+ Math.floor(10*Math.random());
    this.pressingRight = false;//variables to handle user input
    this.pressingLeft = false;
    this.pressingUp = false;
    this.pressingDown = false;
    this.rotatingCannonLeft = false;
    this.rotatingCannonRight = false;
    this.shooting = false;


    this.height = 50;//sizing of tank
    this.width = 30;//sizing of tank
    this.rad = 0;//tank's intial angle of rotation


    this.cannonWidth = 5;//sizing of cannon
    this.cannonHeight = 40;//sizing of cannon
    this.cannonAngle = 180;//cannon's angle of rotation
    this.cannonSpeed = 2;//cannon's rotation speed
    this.attackSpeed = 1;

    this.framecount = 0;
  }

  updatePosition(){
    this.framecount++;
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
    if (this.shooting){
      if(this.framecount % 50 == 0)
      {
        this.Fire();
      }
    }
  }
  Fire(){
    var bulletID = Math.random();
    var bullet = new Bullet(bulletID,this);
    BULLET_LIST[bulletID] = bullet;
  }
  update(){
    for (var key in BULLET_LIST)
    {
      if(getDistance(key.x,key.y,this.x,this.y) == 0 && key.parent != this)
      {
        this.setHealth(this.getHealth - key.damage);
        key.setisDead(true);
        break;
      }
    }
    if(key.getisDead() == true){
      delete BULLET_LIST[key];
    }
    if(this.health <= 0)
    {
      delete PLAYER_LIST[this.id];
    }
  }
}

class Bullet extends Entity{
  constructor(id,parent){
      super();
      this.id = id;
      this.parent = parent;
      this.speed = 0;
      this.damage = 1;
      this.lifeSpan = 100;
      this.isDead = false;
      this.rot = parent.cannonAngle+90;
      this.x = parent.x + (parent.width / 2) + (Math.cos((this.rot * Math.PI) / 180) * parent.cannonHeight);
      this.y = parent.y + (parent.height / 2) + (Math.sin((this.rot * Math.PI) / 180) * parent.cannonHeight);

      this.width = 5;
      this.height = 5;
  }
  settoRad(angle){
    angle = (angle/180 * Math.PI)
  }
  update(){
    this.lifeSpan -= 1;
    if (this.lifeSpan <= 0)
    {
      this.isDead = true;
    }
    if(this.isDead){
      delete BULLET_LIST[this.id];
    }
    this.x += (Math.cos((this.rot * Math.PI) / 180) * this.maxSpd);
    this.y += (Math.sin((this.rot * Math.PI) / 180) * this.maxSpd);
  }
}

(this.rot * Math.PI) / 180

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){

  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;

  var player = new Player(socket.id);
  PLAYER_LIST[socket.id] = player;

  socket.on('disconnect', function(){
    for(var i in BULLET_LIST){
      if (BULLET_LIST[i].parent === PLAYER_LIST[socket.id]){
        delete BULLET_LIST[i];
      }
    }
    delete SOCKET_LIST[socket.id];
    delete PLAYER_LIST[socket.id];
    console.log("Player disconnection");
  });

  socket.on('sendMsgToServer', function(data){
    var playerName = ("" + socket.id).slice(2,7);
    for (var i in SOCKET_LIST){
      SOCKET_LIST[i].emit('addMsg', playerName + ': ' + data);
    }
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
    else if(data.inputId === 'shoot')
      player.shooting = data.state;
    else if(data.inputId === 'cannonRight')
      player.rotatingCannonRight = data.state;
    else if(data.inputId === 'cannonLeft')
      player.rotatingCannonLeft = data.state;
  });
    console.log('Player connection');
});

setInterval(function(){
  var pack = [];
  var bulletPack = [];
  for(var i in PLAYER_LIST){
    var player = PLAYER_LIST[i];
    player.updatePosition();
    pack.push({
      id: i,
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
  for(var i in BULLET_LIST){
    var bullet = BULLET_LIST[i];
    bullet.update();
    bulletPack.push({
      x:bullet.x,
      y:bullet.y,
      rot:bullet.rot,
      width:bullet.width,
      height:bullet.height
    });
  }
  for (var i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    socket.emit('newPosition',pack);
    socket.emit('drawBullets',bulletPack);
  }
}, 1000/60)
