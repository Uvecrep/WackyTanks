//Server Side

var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var serv = require('http').Server(app);
var io = require('socket.io')(serv,{});

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb+srv://admin:verysecurepassword@wackytanks-tpejq.gcp.mongodb.net/WackyTanks?retryWrites=true&w=majority"

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))

var uname;

app.get('/',function(req, res){
  console.log("LogIn");
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

app.get('/signUp',function(req, res){
  console.log("SignUp");
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

app.post('/', function(req, res){
  console.log(req.body);

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;

    uname = req.body.name;
    var pword = req.body.password;

    var dbo = db.db("WackyTanks");
    var query = { username: `${uname}`, password: `${pword}` };
    dbo.collection("Logins").find(query).toArray(function(err, results){
      if (err) throw err
      console.log(results);
      if(results === undefined || results.length == 0){
        console.log("No Match");
        console.log("Login Failed");
        return;
      }else{
        console.log("Found Match");
        res.sendFile(__dirname + '/client/game.html');
      }
      db.close();
    });
  });
});

app.post('/signUp', function(req, res){
  uname = req.body.nameSignUp;
  var pword = req.body.passwordSignUp;

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;

    var dbo = db.db("WackyTanks");
    var query = { username: `${uname}` }
    var doc = { username: `${uname}`, password: `${pword}` };

    dbo.collection("Logins").find(query).toArray(function(err, results){
      if (err) throw err
      console.log(results);
      if(results === undefined || results.length == 0){
        dbo.collection("Logins").insertOne(doc, function(err, results){
          if (err) throw err;
          db.close();
        });
        res.sendFile(__dirname + '/client/game.html');
      }else{
        console.log("User Name Taken");
        return;
      }
      db.close();
    });
  });
});

app.get('/game',function(req, res){
  console.log("get3");
  res.sendFile(__dirname + '/client/game.html');
});

serv.listen(process.env.PORT || 2000);//listen to port 2000
console.log("Server started.");


var SOCKET_LIST = {};
var PLAYER_LIST = {};
var BULLET_LIST = {};
var WALL_LIST = {};

var mapSize = 1000;
var wallWidth = 100;


class Entity{

  constructor(){
    this.x = Math.floor(Math.random() * (mapSize - (3*wallWidth))) + wallWidth;//position
    this.y = Math.floor(Math.random() * (mapSize - (3*wallWidth))) + wallWidth;//position
    this.width = 0;//sizing
    this.height = 0;//sizing
    this.rot = 0;//angle of rotation
    this.maxSpd = 3;//movement speed
    this.rotSpd = 2;//rotation speed
   }
   getDistance(player,bullet){
     let playerX = player.x + (player.width/2);
     let playerY = player.y + (player.height/2);

     let Xnew = bullet.x - playerX;
     let Ynew = playerY - bullet.y;

     let theta = player.rot * (Math.PI / 180);

     let Xb = (Xnew * Math.cos(theta)) - (Ynew * Math.sin(theta));//Equation for a rotation matrix with column vectors
     let Yb = (Xnew * Math.sin(theta)) + (Ynew * Math.cos(theta));//new y rotated by a certain angle

     if (Math.abs(Xb) <= (player.width/2) + bullet.width && Math.abs(Yb) <= (player.height/2) + bullet.width){
       return true;
     } else {
       return false;
     }
   }

   checkCollisionWallBullet(wall, bullet){//this function detects collision between wall and bullet then returns which side of the wall the bullet hits (1-4)
     let xb = bullet.x;
     let yb = bullet.y;
     let radiusB = bullet.width;

     let xw = wall.x;
     let yw = wall.y;
     let width = wall.width;
     let height = wall.height;

     var dif1, dif2, dif3, dif4;
     //top: 1
     //right side: 2
     //bottom: 3
     //left side: 4
     //no collision: 0

     if (xb >= (xw - radiusB) && xb <= (xw + width + radiusB) && yb >= (yw - radiusB) && yb <= (yw + height + radiusB)){
       dif1 = Math.abs(yb - yw);
       dif2 = Math.abs(xb - (xw + width));
       dif3 = Math.abs(yb - (yw + height));
       dif4 = Math.abs(xb - xw);

       if (dif1 < dif2 && dif1 < dif3 && dif1 < dif4){
         //console.log('1');
         return 1;
       } else if (dif2 < dif1 && dif2 < dif3 && dif2 < dif4){
         //console.log('2');
         return 2;
       } else if (dif3 < dif1 && dif3 < dif2 && dif3 < dif4){
         //console.log('3');
         return 3;
       } else if (dif4 < dif1 && dif4 < dif2 && dif4 < dif3){
         //console.log('4');
         return 4;
       }
     }

     return 0;
   }

}

class Player extends Entity{

  constructor(id) {
    super();
    this.health = 3;
    this.id = id;
    this.name = uname,
    this.pressingRight = false;//variables to handle user input
    this.pressingLeft = false;
    this.pressingUp = false;
    this.pressingDown = false;
    this.rotatingCannonLeft = false;
    this.rotatingCannonRight = false;
    this.shooting = false;
    this.firstShot = true;


    this.height = 50;//sizing of tank
    this.width = 30;//sizing of tank
    this.rad = 0;//tank's intial angle of rotation

    this.killCount = 0;
    this.deathCount = 0;

    this.fireCount = 0;
    this.hitCount = 0;


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
      if (this.rot >= 360){
        this.rot = this.rot - 360;
      }
    if(this.pressingLeft)//rotate to the left
      this.rot -= this.rotSpd;//updates rotation angle
      if (this.rot < 0){
        this.rot = this.rot + 360;
      }
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
      //console.log('angle: ' + this.cannonAngle);
    }
    if (this.rotatingCannonLeft){//rotate cannon to left
      this.cannonAngle -= this.cannonSpeed;//updating cannon's angle of rotation
      //console.log('angle: ' + this.cannonAngle);
      //this.cannonAngle = 45;
    }
    if (this.shooting){
      if((this.framecount % 30 == 0 || this.firstShot == true) )
      {
        this.Fire();
        this.firstShot = false;
        this.framecount = 0;

      }
    }
    else if(this.shooting == false)
    {
      this.framecount = 0;
      this.firstShot = true;
    }
  }

  Fire(){
    var bulletID = Math.random();
    var bullet = new Bullet(bulletID,this);
    BULLET_LIST[bulletID] = bullet;
    //console.log('Angle: ' + this.cannonAngle);
    this.fireCount = this.fireCount + 1;
  }

  respawn(){
    //console.log("Player death: " + this.id);
    this.x = Math.floor(Math.random() * (mapSize - (3*wallWidth))) + wallWidth;//position
    this.y = Math.floor(Math.random() * (mapSize - (3*wallWidth))) + wallWidth;//position
    this.rot = 0;//angle of rotation
    this.maxSpd = 3;//movement speed
    this.rotSpd = 2;//rotation speed
    this.pressingRight = false;//variables to handle user input
    this.pressingLeft = false;
    this.pressingUp = false;
    this.pressingDown = false;
    this.rotatingCannonLeft = false;
    this.rotatingCannonRight = false;
    this.shooting = false;
    this.firstShot = true;
    this.rad = 0;//tank's intial angle of rotation

    this.cannonAngle = 180;//cannon's angle of rotation
    this.cannonSpeed = 2;//cannon's rotation speed
    this.attackSpeed = 1;

    this.killcount = 0;
    this.framecount = 0;

    for (var i in SOCKET_LIST){
      SOCKET_LIST[i].emit('addMsg', this.name + ' died.');
    }
  }

  update(){

    //if(BULLET_LIST.length > 0){
      for (var key in BULLET_LIST)
      {
        let colliding = this.getDistance(this,BULLET_LIST[key]);
        if(colliding == true && BULLET_LIST[key].parent != this)
        {
          //console.log("hit");
          //BULLET_LIST[key].isDead == true;

          this.health = this.health - BULLET_LIST[key].damage;
          if (this.health <= 0){
            this.deathCount = this.deathCount + 1;
            BULLET_LIST[key].parent.killCount = BULLET_LIST[key].parent.killCount + 1;
          }
          delete BULLET_LIST[key];

          break;
        }
      }
      if(this.health <= 0)
      {
        this.respawn();
        this.health = 3;
      }
    }
  //}
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
      while(this.rot < 0 || this.rot > 360){
        if (this.rot < 0){
          this.rot = this.rot + 360;
        } else if (this.rot > 360){
          this.rot = this.rot - 360;
        }
      }
      //console.log("Bullet angle: " + this.rot);
      this.x = parent.x + (parent.width / 2) + (Math.cos((this.rot * Math.PI) / 180) * parent.cannonHeight);
      this.y = parent.y + (parent.height / 2) + (Math.sin((this.rot * Math.PI) / 180) * parent.cannonHeight);
      this.maxSpd += 1;
      this.width = 3;
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



class Wall extends Entity{
    constructor(width, height, id, xPos, yPos){
      super();
      this.id = id;
      this.width = width;
      this.height = height;
      this.x = xPos;
      this.y = yPos;
    }

    update(){
      for (var key in BULLET_LIST)
      {
        //top: 1
        //right side: 2
        //bottom: 3
        //left side: 4
        //no collision: 0
        let colliding = this.checkCollisionWallBullet(this,BULLET_LIST[key]);
        if (colliding != 0){
          switch(colliding){//this switch statement calculates the new angle of each bullet after a collision
            case 1://collision with top of wall
              if (BULLET_LIST[key].rot > 90 && BULLET_LIST[key].rot < 180){
                BULLET_LIST[key].rot = 180 + (180 - BULLET_LIST[key].rot);
              } else if (BULLET_LIST[key].rot > 0 && BULLET_LIST[key].rot < 90){
                BULLET_LIST[key].rot = 360 - BULLET_LIST[key].rot;
              } else if (BULLET_LIST[key].rot == 90){
                BULLET_LIST[key].rot = 270;
              }
              break;
            case 2://collision with right side of wall
              if (BULLET_LIST[key].rot > 180 && BULLET_LIST[key].rot < 270){
                BULLET_LIST[key].rot = 270 + (270 - BULLET_LIST[key].rot);
              } else if (BULLET_LIST[key].rot > 90 && BULLET_LIST[key].rot < 180){
                BULLET_LIST[key].rot = 90 - (BULLET_LIST[key].rot - 90);
              } else if (BULLET_LIST[key].rot == 180){
                BULLET_LIST[key].rot = 0;
              }
              break;
            case 3://collision with bottom of wall
              if (BULLET_LIST[key].rot > 270 && BULLET_LIST[key].rot < 360){
                BULLET_LIST[key].rot = 360 - BULLET_LIST[key].rot;
              } else if (BULLET_LIST[key].rot > 180 && BULLET_LIST[key].rot < 270){
                BULLET_LIST[key].rot = 180 - (BULLET_LIST[key].rot - 180);
              } else if (BULLET_LIST[key].rot == 270){
                BULLET_LIST[key].rot = 90;
              }
              break;
            case 4://collision with left side of wall
              if (BULLET_LIST[key].rot > 270 && BULLET_LIST[key].rot < 360){
                BULLET_LIST[key].rot = 270 - (BULLET_LIST[key].rot - 270);
              } else if (BULLET_LIST[key].rot > 0 && BULLET_LIST[key].rot < 90){
                BULLET_LIST[key].rot = 90 + (90 - BULLET_LIST[key].rot);
              } else if (BULLET_LIST[key].rot == 0 || BULLET_LIST[key].rot == 360){
                BULLET_LIST[key].rot = 180;
              }
              break;
          }
        }
      }
    }
}

//creating map chatbox
// var mapSize = 1000;
// var wallWidth = 100;
//map size and width set above so we can use the numbers to determine spawn area, cant create the walls until down here bc the wall class is not defined where size and width are

var wall1 = new Wall(wallWidth, mapSize, 1, 0, 0);
var wall2 = new Wall(mapSize, wallWidth, 2, 0, 0);
var wall3 = new Wall(mapSize, wallWidth, 3, 0, (mapSize - wallWidth));
var wall4 = new Wall(wallWidth, mapSize, 4, (mapSize - wallWidth),0);


WALL_LIST[1] = wall1;
WALL_LIST[2] = wall2;
WALL_LIST[3] = wall3;
WALL_LIST[4] = wall4;


io.sockets.on('connection', function(socket){

  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;

  var player = new Player(socket.id);
  PLAYER_LIST[socket.id] = player;

  SOCKET_LIST[socket.id].emit('setID', socket.id);

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
    for (var i in SOCKET_LIST){
      SOCKET_LIST[i].emit('addMsg', uname + ': ' + data);
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

socket.on('mouseMove', function(data){//function to track movement of the mouse
  if (data.rotatePointX != 0 && data.rotatePointY != 0){
    var changeX, changeY, theta;
    changeX = data.mousePosX - data.rotatePointX;
    changeY = data.rotatePointY - data.mousePosY;
    theta = Math.atan(changeY / changeX);
    theta = theta * 180 / Math.PI;
    if (changeX < 0){
      theta = theta + 180;
    }
    theta = theta * (-1);
    theta = theta - 90;
    player.cannonAngle = theta;
  }
});

  console.log('Player connection');
  for (var i in SOCKET_LIST){
    SOCKET_LIST[i].emit('addMsg', uname + ' has joined the game.');
  }
});

setInterval(function(){
  var pack = [];
  var bulletPack = [];
  var wallPack = [];

  for(var i in PLAYER_LIST){
    var player = PLAYER_LIST[i];
    player.updatePosition();
    player.update();
    pack.push({
    id: i,
    x:player.x,
    y:player.y,
    rot:player.rot,
    name:player.name,
    width:player.width,
    height:player.height,
    cannonAngle:player.cannonAngle,
    cannonWidth:player.cannonWidth,
    cannonHeight:player.cannonHeight,
    isWall:false,
    isBullet:false,
    kills:player.killCount,
    deaths:player.deathCount
    });
  }

  for(var i in BULLET_LIST){
    var bullet = BULLET_LIST[i];
    bullet.update();
    pack.push({
      id:bullet.parent.id,
      x:bullet.x,
      y:bullet.y,
      rot:bullet.rot,
      width:bullet.width,
      height:bullet.height,
      isWall:false,
      isBullet:true
    });
  }

  for(var i in WALL_LIST){
    var wall = WALL_LIST[i];
    wall.update();
    pack.push({
      wallId:wall.id,
      wallX:wall.x,
      wallY:wall.y,
      wallWidth:wall.width,
      wallHeight:wall.height,
      isWall:true,
      isBullet:false
    });
  }

  for (var i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    socket.emit('newPosition',pack);

  }
}, 1000/60);
