# WackyTanks
Wacky Tanks is an online competitive multiplayer tank battle arena experience that provides online bug-free seamless gameplay.

Repo Organization/Structure
  Our repository is organized into 3 folders: git, client, and node_modules.
  We also have several files outside of these folders. The most important of these files is app.js, which is our server code and what we run node.js with.
  The other files that are not within folders setup node and git.
  app.js
    This is our server file, it contains the java script that handles everything to do with our game server side.
    The server communicates to each client with socket.io, which can be seen in the socket.on functions.
    Every object in the game is based of off the basic entity class. Players, bullets, and walls all extend this entity class.
    Entity object
      each entity has the same list of variables. x, y, height, width, rotation, rotation speed, and entity speed.
      collision checks are handled within the entity class, checking collison between players and bullets, players and walls, and walls and bullets.
    Player object
      The player object extends entity, and stores all information of the player in its variables.
      player has functions to update movement, respawn, fire a bullet, and more.
    Wall object
      Another extension of entity object
      Contains extensive update function that handles bullet collision (calculates new trajectory of bullet)
    Bullet object
      Extends Entity
      contains variables for lifespan and trajectory angle.
      Simple object, mostly manipulated by other functions.
    app.js contains a set interval function that sends all of the game information to the player in packets for the player to draw.
  The git and node_modules folders are not very important to the gameplay, they contain source code to deal with node and the git repository
  The client folder contains the code that is send to each player, including html pages and client side code to draw the game.
  client
    css
      contains a styles folder to build the website correctly
    images
      contains all images used in the game (just the website)
    JS
      contains javascript to run a slideshow on the frontpage
      also contains client side code to draw game onto canvas and detect player keypresses
      wacky.js
        this is where everything gets drawn on the player side.
        takes the information from the server and draws it to canvas with player centered.
        has to modify x and y of all objects to create illusion of player centering
    PHP
      contains html code for front page and game page.
      game.html is the page with the canvas and game drawn on it
      index.html is the front page with login and register

How to build/run/test code
  To test code locally you need to have node.js and mongo db installed in your terminal.
  If you have both of these things installed, cd into the WackyTanks file.
  The command "node app.js" will start up the server locally and can be accessed by typing "localhost:2000" as a url.
  You will need to have access to wifi even when running locally in order to access the mongo db database and login.
  You can open multiple tabs to test how the game looks to different players.
