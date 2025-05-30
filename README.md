# WackyTanks 🎮

**WackyTanks** is an online competitive multiplayer tank battle arena that provides seamless, bug-free gameplay. Battle against other players in real-time with responsive controls and dynamic gameplay mechanics.

## ✨ Features

- 🏟️ **Real-time Multiplayer**: Battle against other players online
- 🎯 **Responsive Controls**: Smooth tank movement and shooting mechanics
- 🔄 **Live Updates**: Real-time game state synchronization using Socket.IO
- 🛡️ **Collision Detection**: Advanced physics for tanks, bullets, and walls
- 🎨 **Modern UI**: Clean and intuitive web-based interface
- 🔐 **User Authentication**: Secure login and registration system

## 🚀 Quick Start

### Prerequisites

Before running WackyTanks, ensure you have the following installed:

- **Node.js** (version 12.0.0 or higher)
- **npm** (comes with Node.js)
- **Internet connection** (for database access)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd WackyTanks
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   # or
   node app.js
   ```

4. **Access the game**:
   Open your browser and navigate to `http://localhost:2000`

### Testing Multiplayer

To test multiplayer functionality:
1. Start the server using the instructions above
2. Open multiple browser tabs/windows
3. Navigate to `http://localhost:2000` in each tab
4. Create different accounts and join games

## 📁 Project Structure

```
WackyTanks/
├── app.js                    # Main server file (Node.js/Express)
├── package.json              # Project dependencies and scripts
├── package-lock.json         # Locked dependency versions
├── database-manager.js       # Database operations and management
├── security-manager.js       # Security utilities and protection
├── supabase-config.js        # Database configuration
├── client/                   # Frontend assets
│   ├── index.html           # Landing page
│   ├── game.html            # Game canvas page
│   ├── admin.html           # Admin interface
│   ├── CSS/                 # Stylesheets
│   ├── JS/                  # Client-side JavaScript
│   ├── images/              # Game assets and images
│   └── PHP/                 # Additional HTML templates
├── docs/                    # Documentation files
│   ├── ENVIRONMENT_SETUP.md
│   ├── SECURITY_PROTECTION.md
│   ├── DATABASE_PROTECTION.md
│   └── SUPABASE_SETUP.md
└── node_modules/            # Node.js dependencies
```

## 🎮 Game Architecture

### Core Components

#### Entity System
All game objects inherit from a base `Entity` class:
- **Properties**: x, y, height, width, rotation, rotation speed, entity speed
- **Collision Detection**: Handles interactions between players, bullets, and walls

#### Player Object
- Extends the Entity class
- Manages player movement, respawning, and bullet firing
- Stores player-specific data and state

#### Wall Object
- Extends the Entity class
- Handles bullet collision calculations
- Manages trajectory changes upon impact

#### Bullet Object
- Extends the Entity class
- Contains lifespan and trajectory properties
- Simple object manipulated by other game systems

### Client-Server Communication

The game uses **Socket.IO** for real-time communication:
- Server sends game state updates to all connected clients
- Clients send input events (movement, shooting) to the server
- Game state is synchronized at regular intervals

### Frontend Architecture

#### Client-side Rendering (`wacky.js`)
- Renders game objects on HTML5 Canvas
- Implements player-centered camera system
- Handles coordinate transformation for smooth gameplay
- Manages keyboard input detection

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **Real-time Communication**: Socket.IO
- **Database**: PostgreSQL (via Supabase)
- **Frontend**: HTML5, CSS3, JavaScript
- **Security**: bcrypt for password hashing
- **Content Filtering**: bad-words library

## 🔧 Dependencies

```json
{
  "express": "^4.17.1",
  "socket.io": "^2.3.0",
  "pg": "^8.12.0",
  "bcrypt": "^6.0.0",
  "dotenv": "^16.5.0",
  "bad-words": "^3.0.4",
  "jsdom": "^15.2.1"
}
```

## 📝 Development

### Adding New Features

1. **Server-side**: Modify `app.js` for game logic changes
2. **Client-side**: Update files in the `client/JS/` directory
3. **Database**: Use `database-manager.js` for data operations
4. **Security**: Leverage `security-manager.js` for protection features

### Environment Setup

For detailed environment setup instructions, see:
- [`ENVIRONMENT_SETUP.md`](ENVIRONMENT_SETUP.md)
- [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md)

### Security Considerations

This project includes comprehensive security measures:
- See [`SECURITY_PROTECTION.md`](SECURITY_PROTECTION.md) for security guidelines
- See [`DATABASE_PROTECTION.md`](DATABASE_PROTECTION.md) for database security

## 👥 Authors

**Reality Bytes** - Development Team

Ian Peterson • Will Loughlin • Jayden Tang • Clint Eisenzimmer • Ryan Kenfield
