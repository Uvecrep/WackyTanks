//User Side

//var Img = {};
//var Img.player = new Image();
//Img.player.src = "/client/images/tankBaseDarkGreenPartOne.png";

var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';

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
});

document.getElementById("sendInput").onsubmit = function(e){
  e.preventDefault();
  socket.emit("sendMsgToServer", document.getElementById("usermsg").value);
  document.getElementById("usermsg").value = '';
}

//Canvas window //
socket.on('newPosition', function(data){
  ctx.clearRect(0,0,window.innerWidth,window.innerHeight);//celars canvas
  for(var i = 0; i < data.length; i++){//drawing all objects passed in through data array
    ctx.fillStyle = 'red';
    //ctx.fillRect(data[i].x, data[i].y, 30, 50);

    ctx.save();//need to save canvas before drawing rotated objects, this part draws the tank body
    var rad = (data[i].rot * Math.PI) / 180;//getting object's angle in radians

    ctx.translate(//moving the canvas to the center of the object
    data[i].x + data[i].width / 2,
    data[i].y + data[i].height / 2
    );

    ctx.rotate(rad);//rotating canvas to correct position

    ctx.fillRect(//drawing the actual tank body
      (data[i].width / 2) * -1,
      (data[i].height / 2) * -1,
       data[i].width,
       data[i].height
    );

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

    ctx.save();//Now we draw the cannon part of each Player
    var cRad = (data[i].cannonAngle * Math.PI) / 180;

    ctx.translate(//moving the canvas to the center of the tank
      (data[i].x + data[i].width / 2),
      (data[i].y + data[i].height / 2)
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
    ctx.arc(data[i].x + data[i].width / 2, data[i].y + data[i].height / 2, topCannonRadius, 0, 2 * Math.PI);//drawing circle on top of tank
    ctx.fill();//filling circle


  }
});

socket.on('drawBullets', function(data){
  for(var i = 0; i < data.length; i++){//drawing all bullets passed in through data array
    ctx.fillStyle = 'black';
    //ctx.fillRect(data[i].x, data[i].y, 30, 50);

    ctx.save();//need to save canvas before drawing rotated objects, this part draws the bullet
    var rad = (data[i].rot * Math.PI) / 180;//getting object's angle in radians

    ctx.translate(//moving the canvas to the center of the object
    data[i].x + data[i].width / 2,
    data[i].y + data[i].height / 2
    );

    ctx.rotate(rad);//rotating canvas to correct position

    ctx.fillRect(//drawing the bullet
      (data[i].width / 2) * -1,
      (data[i].height / 2) * -1,
       data[i].width,
       data[i].height
    );
    ctx.restore();
  }
});

document.onkeydown = function(event){
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
