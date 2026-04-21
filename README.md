# ChatApp - Real-time Web Chat Application

A full-featured web-based chat application built with React, Vite, and Tailwind CSS on the frontend, and Express.js with Socket.io on the backend.

## Features

### Authentication & User Management

- User registration with email, username, and password
- Login with persistent sessions across browser close/reopen
- Password reset and change functionality
- Account deletion with cascading data cleanup
- Multi-device/tab support with session management

### Chat Rooms

- Create public and private chat rooms
- Browse and join public rooms
- Room-specific member management
- Admin and owner roles with different permissions
- Ban/unban users from rooms
- Real-time member presence indicators

### Personal Messaging

- One-to-one personal dialogs (functionally equivalent to rooms)
- Friend system with friend requests and confirmations
- User-to-user ban functionality (blocks all communication)
- Friend removal capability

### Messaging Features

- Send messages with multiline text and emoji support
- Message replies with quoted references
- Message editing with "edited" indicator
- Message deletion (by author or room admins)
- File and image attachments (max 20MB files, 3MB images)
- Infinite scroll for message history

### Real-time Features

- WebSocket-based real-time messaging
- Typing indicators for room and personal chats
- User presence tracking (online, AFK, offline)
- Multi-tab awareness (AFK only when all tabs inactive)
- Automatic AFK status after 1 minute of inactivity
- Low-latency presence and message delivery (<2-3 seconds)

### Admin & Moderation

- Room admins can delete messages and manage members
- Ban/unban users from specific rooms
- Promote/demote admins
- View banned users list with ban history
- Owner-only room deletion

### Notifications

- Unread message indicators for rooms and dialogs
- Notification badges on sidebar items
- Message delivery to offline users

## Tech Stack

### Frontend

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time WebSocket communication
- **Axios** - HTTP client
- **date-fns** - Date formatting utilities

### Backend

- **Express.js** - Web server
- **Socket.io** - Real-time communication
- **Prisma** - ORM for database
- **PostgreSQL** - Relational database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Multer** - File uploads

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- npm or yarn

### Installation & Running with Docker

1. **Clone the repository**

```bash
git clone <repository-url>
cd chat-app
```

2. **Start with Docker Compose**

```bash
docker-compose up --build
```

This will:

- Start PostgreSQL database on port 5432
- Build and run the server on port 3000
- Optionally, run the client on port 5173

3. **Access the application**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Local Development

#### Backend Setup

```bash
cd server
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

#### Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend will be available at http://localhost:5173

## Project Structure

```
chat-app/
├── client/                 # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React context for state management
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API and WebSocket services
│   │   ├── styles/        # Global styles
│   │   ├── utils/         # Helper functions
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
│
├── server/                # Express backend
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── sockets/       # Socket.io handlers
│   │   ├── utils/         # Helper functions
│   │   └── app.js         # Express app setup
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── migrations/    # Database migrations
│   ├── package.json
│   ├── index.js           # Server entry point
│   └── Dockerfile
│
├── docker-compose.yml     # Docker Compose configuration
└── README.md             # This file
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/password` - Change password
- `POST /api/auth/password-reset/request` - Request password reset
- `POST /api/auth/password-reset/confirm` - Confirm password reset
- `DELETE /api/auth/account` - Delete account

### Rooms

- `GET /api/rooms/public` - List public rooms
- `GET /api/rooms/my` - List user's rooms
- `POST /api/rooms` - Create room
- `GET /api/rooms/:roomId` - Get room details
- `PUT /api/rooms/:roomId` - Update room
- `DELETE /api/rooms/:roomId` - Delete room
- `POST /api/rooms/:roomId/join` - Join room
- `POST /api/rooms/:roomId/leave` - Leave room
- `GET /api/rooms/:roomId/members` - Get room members
- `POST /api/rooms/:roomId/ban/:userId` - Ban user
- `DELETE /api/rooms/:roomId/ban/:userId` - Unban user
- `GET /api/rooms/:roomId/bans` - Get banned users
- `POST /api/rooms/:roomId/admins/:userId` - Make admin
- `DELETE /api/rooms/:roomId/admins/:userId` - Remove admin

### Messages

- `GET /api/messages/room/:roomId` - Get room messages
- `POST /api/messages/room/:roomId` - Send room message
- `PUT /api/messages/:messageId` - Edit message
- `DELETE /api/messages/:messageId` - Delete message

### Dialogs (Personal Chats)

- `GET /api/dialogs` - List all dialogs
- `GET /api/dialogs/with/:userId` - Get dialog with user
- `GET /api/dialogs/:dialogId/messages` - Get dialog messages
- `POST /api/dialogs/:userId/messages` - Send dialog message

### Friends

- `GET /api/friends` - List friends
- `GET /api/friends/requests` - Get friend requests
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/request/:requestId/accept` - Accept request
- `DELETE /api/friends/:friendId` - Remove friend
- `POST /api/friends/ban/:userId` - Ban user
- `DELETE /api/friends/ban/:userId` - Unban user

### Attachments

- `POST /api/attachments/room/:roomId` - Upload file to room
- `POST /api/attachments/dialog/:dialogId` - Upload file to dialog
- `GET /api/attachments/:attachmentId` - Download file

### Sessions

- `GET /api/sessions` - List active sessions
- `DELETE /api/sessions/:sessionId` - Revoke session
- `DELETE /api/sessions/all` - Revoke all sessions

## WebSocket Events

### Client → Server

- `room:join` - Join a room channel
- `room:leave` - Leave a room channel
- `dialog:join` - Join a dialog channel
- `user:activity` - Track user activity
- `user:afk` - Set user as AFK
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

### Server → Client

- `user:presence` - User presence updated (online/afk/offline)
- `typing:start` - Another user started typing
- `typing:stop` - Another user stopped typing
- `message:new` - New message received
- `message:updated` - Message edited
- `message:deleted` - Message deleted

## Environment Variables

### Frontend (.env)

```
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

### Backend (.env)

```
DATABASE_URL=postgresql://chatuser:chatpassword@db:5432/chatdb
JWT_SECRET=your-secret-key-here
NODE_ENV=development
PORT=3000
UPLOAD_DIR=./uploads
FRONTEND_URL=http://localhost:5173
```

## Database Schema

The application uses Prisma ORM with a PostgreSQL database. Key entities:

- **User** - User accounts with authentication
- **Session** - User sessions for authentication
- **Room** - Chat rooms (public/private)
- **Message** - Messages in rooms and dialogs
- **Attachment** - Files/images in messages
- **RoomMember** - User memberships in rooms
- **RoomBan** - Banned users in rooms
- **Friendship** - User-to-user relationships
- **FriendRequest** - Pending friend requests
- **Dialog** - Personal one-to-one conversations

## Performance Considerations

- Message delivery target: <3 seconds
- Presence updates target: <2 seconds
- Supports up to 300 simultaneous users
- Single room can support up to 1000 participants
- Infinite scroll for message history (10,000+ messages supported)
- File size limits: 20MB files, 3MB images
- Automatic AFK detection after 1 minute of inactivity

## Testing

Frontend dev server with hot reload:

```bash
cd client
npm run dev
```

Backend dev server with auto-restart:

```bash
cd server
npm run dev
```

## Building for Production

### Frontend

```bash
cd client
npm run build
# Output: dist/
```

### Docker Deployment

```bash
docker-compose up --build -d
```

## Troubleshooting

### WebSocket Connection Issues

- Ensure VITE_WS_URL matches your server URL
- Check CORS configuration on server
- Verify firewall allows WebSocket connections

### Database Connection Issues

- Ensure PostgreSQL service is running
- Check DATABASE_URL format
- Verify credentials in docker-compose.yml

### Build Errors

- Clear node_modules: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist/`
- Check Node.js version compatibility

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
