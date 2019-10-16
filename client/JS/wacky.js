//var Img = {};
//var Img.player = new Image();
//Img.player.src = "/client/images/tankBaseDarkGreenPartOne.png";

var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';

var socket = io();

socket.on('newPosition', function(data){
  ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
  for(var i = 0; i < data.length; i++){
    ctx.fillStyle = 'red';
    //ctx.fillRect(data[i].x, data[i].y, 30, 50);

    ctx.save();
    var rad = (data[i].rot * Math.PI) / 180;

    ctx.translate(
    data[i].x + data[i].width / 2,
    data[i].y + data[i].height / 2
    );

    ctx.rotate(rad);

    ctx.fillRect(
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
    socket.emit('keyPress', {inputId:'right', state:true});
  else if(event.keyCode === 83)
    socket.emit('keyPress', {inputId:'down', state:true});
  else if(event.keyCode === 65)
    socket.emit('keyPress', {inputId:'left', state:true});
  else if(event.keyCode === 87)
    socket.emit('keyPress', {inputId:'up', state:true});
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
}
