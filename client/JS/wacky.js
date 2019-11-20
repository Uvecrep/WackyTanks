//User Side

//var Img = {};
//var Img.player = new Image();
//Img.player.src = "/client/images/tankBaseDarkGreenPartOne.png";

var canvasElement = document.getElementById("ctx");
var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';

var id = 0;

var canvasX = 0;
var canvasY = 0;

var objChangeX = 0;//offset of objects drawn, used to center player
var objChangeY = 0;

var rPointX = 0;//rotation point for mouse tracking aiming
var rPointY = 0;//y coordinate for rotation point
var currentMousePosX = 0;//current mouse position, compared against rotation point to determine aiming
var currentMousePosY = 0;


var socket = io();

//LOGIN
// document.getElementById('SaveLogin').onclick = function(){
//   socket.emit('signIn',
//   {username:document.getElementById('UserName').value,
//   password:document.getElementById('Password').value});
// }
//
// socket.on('signInResponse', function(data){
//   if(data.success){
//     //let into game only on successful login
//   }else{
//     document.getElementById('unsuccessful').innerHTML = "Login Unsuccessful";
//   }
// });

//TextBox
socket.on("addMsg", function(data){
  document.getElementById("chatbox").innerHTML += "<div>"+data+"</div>";
  document.getElementById("chatbox").scrollTop = document.getElementById("chatbox").scrollHeight;
});

document.getElementById("sendInput").onsubmit = function(e){
  e.preventDefault();
  socket.emit("sendMsgToServer", document.getElementById("usermsg").value);
  document.getElementById("usermsg").value = '';
}

//Canvas window //
socket.on('newPosition', function(data){
  var indexSelf = 0;

  var dLength = data.length;

  //-------------------------FIND SELF----------------------------------//

  for(var i = 0; i < dLength; i++){
    if (data[i].id == id && !data[i].isBullet){//determines which tank is self
      indexSelf = i;
    }
  }

  var cameraPositionX = 240;
  var cameraPositionY = 190;

  objChangeX = cameraPositionX - data[indexSelf].x;
  objChangeY = cameraPositionY - data[indexSelf].y;

  var objX = 0;
  var objY = 0;


  ctx.clearRect(0,0,window.innerWidth,window.innerHeight);//clears canvas

  //-------------------------DRAW PLAYER RECTANGLES----------------------------------//

  for(var i = 0; i < dLength; i++){//drawing all objects passed in through data array
    if (!data[i].isWall && !data[i].isBullet){
    if (i != indexSelf){
      objX = data[i].x + data[i].width / 2 + objChangeX;
      objY = data[i].y + data[i].height / 2 + objChangeY;
    } else {
      objX = cameraPositionX + (data[i].width / 2);
      objY = cameraPositionY + (data[i].height / 2);
    }
    ctx.fillStyle = 'red';
    //ctx.fillRect(data[i].x, data[i].y, 30, 50);
    //console.log("id: " + data[i].id);


    ctx.save();//need to save canvas before drawing rotated objects, this part draws the tank body
    var rad = (data[i].rot * Math.PI) / 180;//getting object's angle in radians

    ctx.translate(//moving the canvas to the center of the object
    objX,
    objY
    );

    ctx.rotate(rad);//rotating canvas to correct position

    ctx.fillRect(//drawing the actual tank body
      (data[i].width / 2) * -1,
      (data[i].height / 2) * -1,
       data[i].width,
       data[i].height
    );

    //-------------------------DRAW BLACK FRONT OF TANK MARKER----------------------------------//

    ctx.fillStyle = "black";//for drawing the black marking on the front of the tank

    var frontTankWidth = 10;//width and height of front of tank marker
    var frontTankHeight = 5;//height of marker
    ctx.fillRect(//drawing marker onto front of tank to keep track of direction
      (frontTankWidth / 2) * -1,
      (data[i].height / 2) * -1,
      frontTankWidth,
      frontTankHeight
    )


    ctx.restore();



    //-------------------------DRAW CANNON----------------------------------//

    ctx.save();//Now we draw the cannon part of each Player
    var cRad = (data[i].cannonAngle * Math.PI) / 180;

    ctx.translate(//moving the canvas to the center of the tank
      objX,
      objY
    );

    ctx.rotate(cRad);//rotating canvas to correct position

    ctx.fillStyle = "orange";//cannon is orange

    ctx.fillRect(//drawing the actual tank body
      (data[i].cannonWidth / 2) * -1,//determines axis of rotation, if x and y are 0 axis is bottom left corner of cannon
      0,//this determines where the axis of rotating is on the cannon
      data[i].cannonWidth,//width of cannon
      data[i].cannonHeight//height of cannon
    );
    ctx.restore();//returing canvas to previus position

    var topCannonRadius = 10;//radius of circle on top of tank

    ctx.fillStyle = "orange";//circle is orange

    ctx.beginPath();
    ctx.arc(objX, objY, topCannonRadius, 0, 2 * Math.PI);//drawing circle on top of tank
    ctx.fill();//filling circle


    //-------------------------DRAW PLAYER NAME----------------------------------//

    ctx.fillStyle = "black";

    ctx.font = "15px Arial";
    ctx.fillText(data[i].name, objX - 19, objY - 40);

  }
  }


//-------------------------DRAW WALLS----------------------------------//

  objX = 0;
  objY = 0;
  //ctx.clearRect(0,0,window.innerWidth,window.innerHeight);//clears canvas
  ctx.fillStyle = 'green';

  for(var i = 0; i < dLength; i++){
    if (data[i].isWall){
    objX = data[i].wallX + objChangeX;
    objY = data[i].wallY + objChangeY;

    ctx.fillRect(
      objX,
      objY,
      data[i].wallWidth,
      data[i].wallHeight
    );
  }
  }

  //-------------------------DRAW BULLETS----------------------------------//

  for (var b = 0; b < dLength; b++){
    if (data[b].isBullet){
      objX = data[b].x + objChangeX;
      objY = data[b].y + objChangeY;
      ctx.fillStyle = 'black';

      ctx.beginPath();
      ctx.arc(objX, objY, data[b].width, 0, 2 * Math.PI);
      ctx.fill();//filling circle
    }
  }

  //-------------------------DRAW ENEMY DOT INDICATOR----------------------------------//

  var scanRadius = 180;
  var dotRadius = 3;
  var distanceDotAppears = 350;
  var changeX;
  var changeY;
  var distance;
  var theta;
  var xDot;
  var yDot;

  ctx.fillStyle = 'red';

  for (var i = 0; i < dLength; i++){
    if (!data[i].isWall && !data[i].isBullet && i != indexSelf){
      changeX = data[i].x - data[indexSelf].x;
      changeY = data[indexSelf].y - data[i].y;

      distance = Math.sqrt(Math.pow(changeX, 2) + Math.pow(changeY, 2));
      if (distance > distanceDotAppears){

        theta = Math.atan(changeY / changeX);

        if (changeX < 0){
          theta = theta + Math.PI;
        }
        //console.log("Angle: " + theta);
        xDot = scanRadius * Math.cos(theta) + cameraPositionX;
        yDot = cameraPositionY - scanRadius * Math.sin(theta);

        //console.log("xDot: " + xDot + " yDot: " + yDot);
        ctx.beginPath();
        ctx.arc(xDot, yDot, dotRadius, 0, 2 * Math.PI);
        ctx.fill();//filling circle

      }
    }
  }

  //-------------------------DRAW K/D----------------------------------//

  ctx.fillStyle = 'black';

  ctx.font = "20px Arial";
  ctx.fillText("Kills: " + data[indexSelf].kills, 10, 25);
  ctx.fillText("Deaths: " + data[indexSelf].deaths, 10, 50);

  //-------------------------DRAW TOP 3----------------------------------//

  ctx.font = "15px Arial";
  ctx.fillText("Top 3", 410, 15);
  ctx.fillRect(365,20, 125, 1);//underline

  var number1 = -1;
  var kills1 = 0;
  var number2 = -1;
  var kills2 = 0;
  var number3 = -1;
  var kills3 = 0;

  var numSave = 0;
  var numSave2 = 0;

  for (var i = 0; i < dLength; i++){
    if (!data[i].isWall && !data[i].isBullet){
      if (data[i].kills > kills1){
        kills1 = data[i].kills;
        numSave = number1;
        number1 = i;
        if (numSave == -1){

        } else if (data[numSave].kills > kills2 && numSave != -1){
          kills2 = data[numSave].kills;
          numSave2 = number2;
          number2 = numSave;
          if (numSave2 == -1){
          } else if (data[numSave2].kills > kills3 && numSave2 != -1){
            kills3 = data[numSave2].kills;
            number3 = numSave2;
          }
        } else if (data[numSave].kills > kills3 && numSave != -1){
          kills3 = data[numSave].kills;
          number3 = numSave;
        }
      } else if (data[i].kills > kills2){
        kills2 = data[i].kills;
        numSave = number2;
        number2 = i;
        if (numSave == -1){
        }else if (data[numSave].kills > kills3 && numSave != -1){
          kills3 = data[numSave].kills;
          number3 = numSave;
        }
      } else if (data[i].kills > kills3){
        kills3 = data[i].kills;
        number3 = i;
      }
    }
  }

  if (number1 != -1){
    ctx.fillText("id 1: " + ("" + data[number1].name) + " Kills: " + kills1, 365, 35);
  }
  if (number2 != -1){
    ctx.fillText("id 2: " + ("" + data[number2].name) + " Kills: " + kills2, 365, 50);
  }
  if (number3 != -1){
    ctx.fillText("id 3: " + ("" + data[number3].name) + " Kills: " + kills3, 365, 65);
  }

});

function getMousePos(canvasElement, evt) {
  var rect = canvasElement.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}


canvasElement.addEventListener('mousemove', function(evt) {
  var mousePos = getMousePos(canvasElement, evt);
  var message = 'Mouse position: ' + mousePos.x + ',' + mousePos.y;
  currentMousePosX = mousePos.x;
  currentMousePosY = mousePos.y;
  socket.emit('mouseMove', {
    rotatePointX:rPointX,
    rotatePointY:rPointY,
    mousePosX:mousePos.x,
    mousePosY:mousePos.y
  });
  //console.log(message);
  //writeMessage(canvasElement, message);
}, false);

socket.on('setID', function(playerID){
  id = playerID;
  console.log("New ID Set to: " + id);

});

function setRotatePoint(){
  rPointX = currentMousePosX;
  rPointY = currentMousePosY;
  //console.log('X: ' + rPointX + " Y: " + rPointY);
}

canvasElement.addEventListener("mousedown", function (evt) {
    socket.emit('keyPress', {inputId:'shoot', state:true});//shoots
}, false);

canvasElement.addEventListener("mouseup", function (evt) {
    socket.emit('keyPress', {inputId:'shoot', state:false});
}, false);

document.onkeydown = function(event){
  if(document.activeElement.id !== "usermsg"){
    event.preventDefault();
    if(event.keyCode === 68)
      socket.emit('keyPress', {inputId:'right', state:true});//rotates tank to the right
    else if(event.keyCode === 83)
      socket.emit('keyPress', {inputId:'down', state:true});//moves tank backward
    else if(event.keyCode === 65)
      socket.emit('keyPress', {inputId:'left', state:true});//rotates tank to the left
    else if(event.keyCode === 87)
      socket.emit('keyPress', {inputId:'up', state:true});//moves tank forward
    else if(event.keyCode === 32)
      socket.emit('keyPress', {inputId:'shoot', state:true});//shoots
    else if(event.keyCode === 39)
      socket.emit('keyPress', {inputId:'cannonRight', state:true});//rotates cannon to the right
    else if(event.keyCode === 37)
      socket.emit('keyPress', {inputId:'cannonLeft', state:true});//rotates cannon to the left
    else if(event.keyCode === 80){
      setRotatePoint();
    }
  }
}

document.onkeyup = function(event){
  if(event.keyCode === 68)
    socket.emit('keyPress', {inputId:'right', state:false});
  else if(event.keyCode === 83)
    socket.emit('keyPress', {inputId:'down', state:false});
  else if(event.keyCode === 65)
    socket.emit('keyPress', {inputId:'left', state:false});
  else if(event.keyCode === 87)
    socket.emit('keyPress', {inputId:'up', state:false});
  else if(event.keyCode === 32)
    socket.emit('keyPress', {inputId:'shoot', state:false});
  else if(event.keyCode === 39)
    socket.emit('keyPress', {inputId:'cannonRight', state:false});//stops cannon rotation to the right
  else if(event.keyCode === 37)
    socket.emit('keyPress', {inputId:'cannonLeft', state:false});//stops cannon rotation to the left
}
// LOGIN SQL
// app.get('/loginValidate', function(req, res) {
// 	console.log("got here muahahah")
// 	var query1 = "Call from database here to bring in list of all users;"; //games played in the Fall 2018 Season
// 	var query2 = ';';
// 	var query3 = ';';
// 	db.task('get-everything', task => {
// 	    return task.batch([
// 	        task.any(query1),
// 	        task.any(query2),
// 	        task.any(query3)
// 	    ]);
// 	})
// 	.then(batch_data => {
//     // we valid if the batch is not empty....
//     // if not empty then we want to
// 		console.log(batch_data[0]);
// 		console.log(batch_data[1]);
// 		console.log(batch_data[2]);
//
// 		res.render('pages/player_info',{
// 				my_title: "Page Title Here",
// 				result_1: batch_data[0],
// 				result_2: batch_data[1],
// 				result_3: batch_data[2]
// 			})
// 	})
// 	.catch(error => {
// 		console.log(error)
// 	    // display error message in case an error
// 	        req.flash('error', error);
// 	        res.render('pages/player_info',{
// 				my_title: "Page Title Here",
// 				result_1: '',
// 				result_2: '',
// 				result_3: ''
// 			})
//
// 		});
// };
