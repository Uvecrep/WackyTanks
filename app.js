//Server Side

var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var serv = require('http').Server(app);
var io = require('socket.io')(serv,{});

// PostgreSQL client for Supabase
const { Client } = require('pg');

// Import Database Manager for protection and cleanup
const DatabaseManager = require('./database-manager');
const dbManager = new DatabaseManager();

// Import Security Manager for enhanced protection
const SecurityManager = require('./security-manager');
const securityManager = new SecurityManager();

// Import bad-words for chat censoring
const Filter = require('bad-words');
const filter = new Filter();

// Chat censoring function
function censorMessage(message) {
  if (!message || typeof message !== 'string') {
    return message;
  }
  
  // Clean the message using bad-words
  let censored = filter.clean(message);
  
  // Additional custom censoring rules
  // Block attempts to share personal information patterns
  censored = censored.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE REDACTED]'); // Phone numbers
  censored = censored.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL REDACTED]'); // Email addresses
  censored = censored.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP REDACTED]'); // IP addresses
  
  // Block discord/social media invites
  censored = censored.replace(/discord\.gg\/\w+/gi, '[INVITE REDACTED]');
  censored = censored.replace(/\b(discord|skype|telegram|whatsapp)\b.*?\b(add|join|invite)\b/gi, '[SOCIAL REDACTED]');
  
  // Limit message length
  if (censored.length > 200) {
    censored = censored.substring(0, 200) + '...';
  }
  
  return censored;
}

// Chat rate limiting and spam detection
const chatHistory = new Map(); // Store recent messages per player
const RATE_LIMIT_WINDOW = 5000; // 5 seconds
const MAX_MESSAGES_PER_WINDOW = 3; // Max 3 messages per 5 seconds
const SPAM_THRESHOLD = 0.8; // Similarity threshold for spam detection

// Function to check if message is spam or rate limited
function isMessageAllowed(playerId, message) {
  const now = Date.now();
  const playerHistory = chatHistory.get(playerId) || { messages: [], timestamps: [] };
  
  // Clean old messages outside the rate limit window
  const recentIndices = [];
  for (let i = playerHistory.timestamps.length - 1; i >= 0; i--) {
    if (now - playerHistory.timestamps[i] <= RATE_LIMIT_WINDOW) {
      recentIndices.unshift(i);
    }
  }
  
  const recentMessages = recentIndices.map(i => playerHistory.messages[i]);
  const recentTimestamps = recentIndices.map(i => playerHistory.timestamps[i]);
  
  // Check rate limiting
  if (recentMessages.length >= MAX_MESSAGES_PER_WINDOW) {
    return { allowed: false, reason: 'Rate limited: Too many messages' };
  }
  
  // Check for spam (similar messages)
  for (const recentMsg of recentMessages) {
    if (calculateSimilarity(message.toLowerCase(), recentMsg.toLowerCase()) > SPAM_THRESHOLD) {
      return { allowed: false, reason: 'Spam detected: Similar message recently sent' };
    }
  }
  
  // Add current message to history
  playerHistory.messages.push(message);
  playerHistory.timestamps.push(now);
  
  // Keep only recent data
  if (playerHistory.messages.length > MAX_MESSAGES_PER_WINDOW) {
    playerHistory.messages = playerHistory.messages.slice(-MAX_MESSAGES_PER_WINDOW);
    playerHistory.timestamps = playerHistory.timestamps.slice(-MAX_MESSAGES_PER_WINDOW);
  }
  
  chatHistory.set(playerId, playerHistory);
  return { allowed: true };
}

// Simple string similarity calculation
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Levenshtein distance calculation for string similarity
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Supabase connection configuration
// Create a 'supabase-config.js' file based on 'supabase-config.example.js'
let dbConfig;
try {
  dbConfig = require('./supabase-config.js');
} catch (error) {
  console.error('Please create supabase-config.js file based on supabase-config.example.js');
  console.error('You can find your Supabase connection details in your project settings under "Database" > "Connection info"');
  process.exit(1);
}

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))

// Trust proxy for accurate IP detection
app.set('trust proxy', true);

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

app.post('/', async function(req, res){
  console.log(req.body);

  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  try {
    uname = req.body.name;
    const pword = req.body.password;

    // Use secure authentication
    const user = await securityManager.authenticateUser(uname, pword, clientIP);
    
    console.log("Found Match");
    res.sendFile(__dirname + '/client/game.html');
    
  } catch (err) {
    console.log("Authentication failed:", err.message);
    res.sendFile(__dirname + '/client/index.html');
  }
});

app.post('/signUp', async function(req, res){
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  try {
    uname = req.body.nameSignUp;
    const pword = req.body.passwordSignUp;

    // Check if we're near the user limit and cleanup if needed
    const currentCount = await dbManager.checkTableRowCount('users');
    if (currentCount >= dbManager.tableLimits.users * 0.9) {
      console.log('🔄 Approaching user limit, performing preemptive cleanup...');
      await dbManager.enforceTableLimit('users');
    }

    // Use secure user creation (includes all validations and protections)
    const newUser = await securityManager.createSecureUser(uname, pword, clientIP);
    
    console.log("New secure user created successfully:", newUser.id);
    res.sendFile(__dirname + '/client/game.html');
    
  } catch (err) {
    console.error('Secure signup failed:', err.message);
    res.sendFile(__dirname + '/client/index.html');
  }
});

app.get('/game',function(req, res){
  console.log("get3");
  res.sendFile(__dirname + '/client/game.html');
});

app.get('/admin', function(req, res){
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  // Check admin access rate limiting
  const accessCheck = securityManager.checkAdminAccess(clientIP);
  if (!accessCheck.allowed) {
    return res.status(429).json({
      error: accessCheck.message
    });
  }
  
  securityManager.recordAdminAccess(clientIP);
  res.sendFile(__dirname + '/client/admin.html');
});

// Security Management Endpoints
app.get('/security-status', function(req, res) {
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  // Check admin access rate limiting
  const accessCheck = securityManager.checkAdminAccess(clientIP);
  if (!accessCheck.allowed) {
    return res.status(429).json({
      error: accessCheck.message
    });
  }
  
  try {
    const securityStatus = securityManager.getSecurityStatus();
    res.json({
      success: true,
      security_status: securityStatus
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post('/security-unblock-ip', function(req, res) {
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  try {
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required'
      });
    }
    
    securityManager.unblockIP(ip);
    res.json({
      success: true,
      message: `IP ${ip} has been unblocked`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Database Management Endpoints
app.get('/db-status', async function(req, res) {
  try {
    const status = await dbManager.getDatabaseStatus();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      database_status: status
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post('/db-cleanup', async function(req, res) {
  try {
    await dbManager.manualCleanup();
    const status = await dbManager.getDatabaseStatus();
    res.json({
      success: true,
      message: 'Manual cleanup completed successfully',
      database_status: status
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post('/db-update-limit', async function(req, res) {
  try {
    const { tableName, newLimit } = req.body;
    if (!tableName || !newLimit) {
      return res.status(400).json({
        success: false,
        error: 'tableName and newLimit are required'
      });
    }
    
    const limit = parseInt(newLimit);
    if (limit < 1 || limit > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 50,000'
      });
    }
    
    dbManager.updateTableLimit(tableName, limit);
    res.json({
      success: true,
      message: `Limit updated for table ${tableName} to ${limit}`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Add keep-alive routes for Render deployment
const keepAlive = require('./keep-alive');
app.use('/', keepAlive);

serv.listen(process.env.PORT || 2000);//listen to port 2000
console.log("Server started.");


var SOCKET_LIST = {};
var PLAYER_LIST = {};
var BULLET_LIST = {};
var WALL_LIST = {};

var mapSize = 1000;
var wallWidth = 100;
//const jsdom = require("jsdom");
//const { JSDOM } = jsdom;
//const dom = new JSDOM(document.getElementById('damage').style.visibility = 'hidden');


/*
Entity object
basis for every single object in game
each object has an x,y,height,width
*/
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

   checkCollisionWallPlayer(wall, xp, yp){

     let xw = wall.x;
     let yw = wall.y;
     let width = wall.width;
     let height = wall.height;

     var dif1, dif2, dif3, dif4;

     if (xp >= xw && xp <= (xw + width) && yp >= yw && yp <= (yw + height)){
       dif1 = Math.abs(yp - yw);
       dif2 = Math.abs(xp - (xw + width));
       dif3 = Math.abs(yp - (yw + height));
       dif4 = Math.abs(xp - xw);

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
    this.damage = 1;
    this.score = 0;
    this.clip = 5;

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

    this.canRotateRight = true;
    this.canRotateLeft = true;
    this.canMoveForward = true;
    this.canMoveBackward = true;

    this.isCollidingWithWall = false;

    this.framecount = 0;
  }

  PowerUp(){
    //console.log('here');
    //dmg.style.display = "none";

    for(var i in PLAYER_LIST){
      var player = PLAYER_LIST[i];
      if(player.score > 5){
        if(player.damage >= 2){
          break;
        }
        player.damage++;
        for (var i in SOCKET_LIST){
          SOCKET_LIST[i].emit('addMsg', this.name +'s damage has increased');
        }
      }
    }
  }

  updatePosition(){
    this.framecount++;

    if(this.pressingRight && this.canRotateRight){//rotate to the right
    //console.log('can rotate right: ' + this.canRotateRight);
      this.rot += this.rotSpd;//updates direction of tank
      if (this.rot >= 360){
        this.rot = this.rot - 360;
      }
    }
    if(this.pressingLeft && this.canRotateLeft){//rotate to the left
    //console.log('can rotate left: ' + this.canRotateLeft);
      this.rot -= this.rotSpd;//updates rotation angle
      if (this.rot < 0){
        this.rot = this.rot + 360;
      }
    }
    if(this.pressingUp && this.canMoveForward){//move forward
      //console.log('can move forward: ' + this.canMoveForward);
      this.rad = ((this.rot + 90) * Math.PI) / 180;//angle of rotation + 90 degrees and converted to radians
      this.y -= (this.maxSpd * Math.sin(this.rad));//updating y position (y = max speed * sin(rotation angle))
      this.x -= (this.maxSpd * Math.cos(this.rad));//updating x position (x = max speed * cos(rotation angle))
    }
    if(this.pressingDown && this.canMoveBackward){//move backward
      //console.log('can move back: ' + this.canMoveBackward);
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
    if(this.clip > 0){
      var bulletID = Math.random();
      var bullet = new Bullet(bulletID,this);
      BULLET_LIST[bulletID] = bullet;
      this.fireCount = this.fireCount + 1;
      this.clip--;

    }
  }

  respawn(killername){
    //console.log("Player death: " + this.id);
    for (var i in BULLET_LIST){
      if (BULLET_LIST[i].parent == this){
        delete BULLET_LIST[i];
      }
    }
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
    this.clip = 5;//tank's amount of bullets it can fire

    this.cannonAngle = 180;//cannon's angle of rotation
    this.cannonSpeed = 2;//cannon's rotation speed
    this.attackSpeed = 1;

    this.killcount = 0;
    this.framecount = 0;

    if (killername == 'suicide'){
      for (var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('addMsg', this.name + ' respawned.');
      }
    } else {
      for (var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('addMsg', this.name + ' was killed by ' + killername + '.');
      }
    }
  }

  update(){
    var killername = '';
      for (var key in BULLET_LIST)
      {
        let colliding = this.getDistance(this,BULLET_LIST[key]);
        if(colliding == true && BULLET_LIST[key].parent != this)
        {
          BULLET_LIST[key].parent.score++;
          this.health = this.health - BULLET_LIST[key].parent.damage;
          BULLET_LIST[key].parent.PowerUp();

          if (this.health <= 0){
            killername = BULLET_LIST[key].parent.name;
            this.deathCount = this.deathCount + 1;
            BULLET_LIST[key].parent.killCount = BULLET_LIST[key].parent.killCount + 1;
          }
          if(BULLET_LIST[key].parent.clip < 5){
            BULLET_LIST[key].parent.clip += 1;
          }
          delete BULLET_LIST[key];

          break;
        }

      }
      if(this.health <= 0)
      {
        this.respawn(killername);
        this.health = 3;
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
      if(this.parent.clip < 5){
        this.parent.clip+=1;
      }
      else{
        this.parent.clip = 5;
      }

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
      for (var player in PLAYER_LIST){
        var pwidth = PLAYER_LIST[player].width;
        var pheight = PLAYER_LIST[player].height;
        var theta = PLAYER_LIST[player].rot;
        theta = theta * Math.PI / 180;

        var new0x = PLAYER_LIST[player].x + (pwidth / 2);
        var new0y = PLAYER_LIST[player].y + (pheight / 2);

        var pULX = PLAYER_LIST[player].x - new0x;//upper left x
        var pULY = new0y - PLAYER_LIST[player].y;//upper left y

        var pURX = PLAYER_LIST[player].x + pwidth - new0x;//upper right x
        var pURY = new0y - PLAYER_LIST[player].y;//upper right y

        var pBLX = PLAYER_LIST[player].x - new0x;//bottom left x
        var pBLY = new0y - (PLAYER_LIST[player].y + pheight);//bottom left y

        var pBRX = PLAYER_LIST[player].x + pwidth - new0x;//bpottom right
        var pBRY = new0y - (PLAYER_LIST[player].y + pheight);//bottom rigjht


        var rotULX = (pULX * Math.cos(theta)) - (pULY * Math.sin(theta));
        var rotULY = (pULX * Math.sin(theta)) + (pULY * Math.cos(theta));

        var rotURX = (pURX * Math.cos(theta)) - (pURY * Math.sin(theta));
        var rotURY = (pURX * Math.sin(theta)) + (pURY * Math.cos(theta));

        var rotBLX = (pBLX * Math.cos(theta)) - (pBLY * Math.sin(theta));
        var rotBLY = (pBLX * Math.sin(theta)) + (pBLY * Math.cos(theta));

        var rotBRX = (pBRX * Math.cos(theta)) - (pBRY * Math.sin(theta));
        var rotBRY = (pBRX * Math.sin(theta)) + (pBRY * Math.cos(theta));

        rotULX = rotULX + new0x;
        rotULY = new0y - rotULY;

        rotURX = rotURX + new0x;
        rotURY = new0y - rotURY;

        rotBLX = rotBLX + new0x;
        rotBLY = new0y - rotBLY;

        rotBRX = rotBRX + new0x;
        rotBRY = new0y - rotBRY;

        var collideTopRight = this.checkCollisionWallPlayer(this, rotULX, rotULY);
        var collideTopLeft = this.checkCollisionWallPlayer(this, rotURX, rotURY);
        var collideBotRight = this.checkCollisionWallPlayer(this, rotBLX, rotBLY);
        var collideBotLeft = this.checkCollisionWallPlayer(this, rotBRX, rotBRY);


        if (collideTopLeft > 0){
          PLAYER_LIST[player].canRotateLeft = false;
          if (collideTopLeft == 1 || collideTopLeft == 3){//top or bottom
            PLAYER_LIST[player].canMoveForward = false;
          } else {
            PLAYER_LIST[player].canMoveBackward = false;
          }
        }

        if (collideTopRight > 0){
          PLAYER_LIST[player].canRotateRight = false;
          if (collideTopRight == 1 || collideTopRight == 3){//top or bottom
            PLAYER_LIST[player].canMoveForward = false;
          } else {
            PLAYER_LIST[player].canMoveBackward = false;
          }
        }

        if (collideBotLeft > 0){
          PLAYER_LIST[player].canRotateRight = false;
          if (collideBotLeft == 1 || collideBotLeft == 3){//top or bottom
            PLAYER_LIST[player].canMoveBackward = false;
          } else {
            PLAYER_LIST[player].canMoveForward = false;
          }
        }

        if (collideBotRight > 0){
          PLAYER_LIST[player].canRotateLeft = false;

          if (collideBotRight == 1 || collideBotRight == 3){//top or bottom
            PLAYER_LIST[player].canMoveBackward = false;
          } else {
            PLAYER_LIST[player].canMoveForward = false;
          }
        }

      }
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


//---------------Edges of map------------------//
var wall1 = new Wall(wallWidth, mapSize, 1, 0, 0);
var wall2 = new Wall(mapSize, wallWidth, 2, 0, 0);
var wall3 = new Wall(mapSize, wallWidth, 3, 0, (mapSize - wallWidth));
var wall4 = new Wall(wallWidth, mapSize, 4, (mapSize - wallWidth),0);


//This is where the 4 walls surrounding the map are defined
WALL_LIST[1] = wall1;
WALL_LIST[2] = wall2;
WALL_LIST[3] = wall3;
WALL_LIST[4] = wall4;


io.sockets.on('connection', function(socket){//called when player connects to server

  socket.id = Math.random();//creating random socket id
  SOCKET_LIST[socket.id] = socket;//adding socket to list

  var player = new Player(socket.id);//creating player on connection
  PLAYER_LIST[socket.id] = player;//adding player to list

  SOCKET_LIST[socket.id].emit('setID', socket.id);

  socket.on('disconnect', function(){//called when player leaves server
    for(var i in BULLET_LIST){//delete all bullets belonging to player
      if (BULLET_LIST[i].parent === PLAYER_LIST[socket.id]){
        delete BULLET_LIST[i];
      }
    }
    
    // Clean up chat history for disconnected player
    chatHistory.delete(socket.id);
    
    delete SOCKET_LIST[socket.id];//delete player from lists
    delete PLAYER_LIST[socket.id];
    console.log("Player disconnection");
  });


//called when player hits respawn button
  socket.on('respawnButton', function(){
    PLAYER_LIST[socket.id].deathCount = PLAYER_LIST[socket.id].deathCount + 1;//adding 1 to player death count
    PLAYER_LIST[socket.id].respawn('suicide');//marking that player was killed by suicide
  });

//called when player sends msg to chat box
  socket.on('sendMsgToServer', function(data){
    if (data[0].msg != ''){//does not send empy messages
      const playerId = socket.id;
      const playerName = data[0].name;
      const originalMessage = data[0].msg;
      
      // Check if message is allowed (rate limiting and spam detection)
      const messageCheck = isMessageAllowed(playerId, originalMessage);
      
      if (!messageCheck.allowed) {
        // Send error message only to the sender
        SOCKET_LIST[playerId].emit('addMsg', '[SYSTEM]: ' + messageCheck.reason);
        return;
      }
      
      // Censor the message
      const censoredMessage = censorMessage(originalMessage);
      
      // Log potentially inappropriate content attempts
      if (censoredMessage !== originalMessage) {
        console.log(`[CHAT FILTER] Player ${playerName} (${playerId}) sent filtered content: "${originalMessage}" -> "${censoredMessage}"`);
      }
      
      // Send the censored message to all players
      for (var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('addMsg', playerName + ': ' + censoredMessage);
      }
    }
  });

//called every time player presses a key: detects which key is pressed and decides what to do
  socket.on('keyPress', function(data){
    if(data.inputId === 'left'){
      player.pressingLeft = data.state;
    } else if(data.inputId === 'right'){
      player.pressingRight = data.state;
    } else if(data.inputId === 'up'){
      player.pressingUp = data.state;
    } else if(data.inputId === 'down'){
      player.pressingDown = data.state;
    } else if(data.inputId === 'shoot'){
      player.shooting = data.state;
    } else if(data.inputId === 'cannonRight'){
      player.rotatingCannonRight = data.state;
    } else if(data.inputId === 'cannonLeft'){
      player.rotatingCannonLeft = data.state;
    }
  });

/*
Mousemove function
called every time mouse is moved across canvas
allows for cannon mouse tracking
*/
socket.on('mouseMove', function(data){//function to track movement of the mouse
  if (data.rotatePointX != 0 && data.rotatePointY != 0){//does not change cannon position if rotate point is not set before
    var changeX, changeY, theta;//variables
    changeX = data.mousePosX - data.rotatePointX;//determining change of x between rotate point and mouse position
    changeY = data.rotatePointY - data.mousePosY;//same as above for y
    theta = Math.atan(changeY / changeX);//tangent of y/x
    theta = theta * 180 / Math.PI;//converting to degrees
    if (changeX < 0){//adjusting for trig complications
      theta = theta + 180;//incrementing by 180
    }
    theta = theta * (-1);//need these two calculations to adjust for how cannon is drawn
    theta = theta - 90;//same as above
    player.cannonAngle = theta;//setting new cannon angle
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
    deaths:player.deathCount,
    health:player.health,
    mapsize:mapSize,
    wallwidth:wallWidth
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

  for (var cycle in PLAYER_LIST){
    PLAYER_LIST[cycle].canRotateLeft = true;
    PLAYER_LIST[cycle].canRotateRight = true;
    PLAYER_LIST[cycle].canMoveForward = true;
    PLAYER_LIST[cycle].canMoveBackward = true;
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
