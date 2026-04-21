# Quick Start Guide - ChatApp Frontend

## 🚀 Quick Start

### Option 1: Local Development

#### Prerequisites

- Node.js 18+
- npm or yarn

#### Setup

1. **Install dependencies**

   ```bash
   cd client
   npm install
   ```

2. **Configure environment**

   ```bash
   # Copy environment file (if needed)
   cp .env.example .env
   ```

   Default `.env`:

   ```
   VITE_API_URL=http://localhost:3000/api
   VITE_WS_URL=http://localhost:3000
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

   Frontend will be available at: **http://localhost:5173**

4. **Start backend** (in another terminal)

   ```bash
   cd ../server
   npm install
   npm run dev
   ```

   Backend will be available at: **http://localhost:3000**

---

### Option 2: Docker (Recommended)

#### Prerequisites

- Docker
- Docker Compose

#### Setup

1. **Build and start containers**

   ```bash
   # From root directory
   docker-compose up --build
   ```

2. **Access services**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - Database: localhost:5432

3. **Shutdown**
   ```bash
   docker-compose down
   ```

---

## 🔐 Test Credentials

After starting the application:

1. **Create a new account**
   - Go to Registration page
   - Fill in email, username, password
   - Click "Create Account"

2. **Or use test account** (if seeded)
   - Email: test@example.com
   - Password: testpassword123

---

## 📱 Features to Try

### Authentication

- Register a new account
- Login/Logout
- Change password
- View sessions
- Delete account

### Rooms

- Create public/private rooms
- Browse public rooms
- Join/leave rooms
- Edit room settings (as admin)
- Invite users
- Ban/unban users
- Manage room admins

### Messaging

- Send messages to rooms
- Send personal messages
- Edit your messages
- Delete your messages
- Reply to messages
- See typing indicators
- View message history

### Friends

- Search and add friends
- Accept/reject friend requests
- View friend status (online/AFK/offline)
- Message friends directly
- Ban users

### Admin Features

- Make users admins
- Remove admins
- Ban users
- View banned users
- Delete messages
- Delete rooms

---

## 🛠️ Development Commands

### Frontend

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Clean build
rm -rf dist && npm run build
```

### Backend

```bash
# Development with auto-restart
npm run dev

# Production
npm run server

# Database migrations
npx prisma migrate dev
```

### Docker

```bash
# Build and start all services
docker-compose up --build

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f client
docker-compose logs -f server
docker-compose logs -f db

# Rebuild specific service
docker-compose up --build client
```

---

## 📡 API/WebSocket Configuration

### For Frontend to Connect to Local Backend

```javascript
// .env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

### For Docker Container Communication

```javascript
// Inside docker-compose.yml
VITE_API_URL=http://server:3000/api
VITE_WS_URL=ws://server:3000
```

---

## 🐛 Troubleshooting

### Issue: WebSocket connection fails

**Solution**:

- Check if backend is running on port 3000
- Verify VITE_WS_URL is correct
- Check browser console for errors

### Issue: CORS errors

**Solution**:

- Ensure backend CORS is configured
- Check FRONTEND_URL in backend .env

### Issue: Database connection fails

**Solution**:

- Start PostgreSQL service
- Check DATABASE_URL in backend .env
- Run `npx prisma migrate deploy`

### Issue: Module not found

**Solution**:

```bash
rm -rf node_modules
npm install
```

### Issue: Port already in use

**Solution**:

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# On Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

## 📝 Key Files

- **src/App.jsx** - Main app routing
- **src/pages/ChatPage.jsx** - Main chat interface
- **src/contexts/AuthContext.jsx** - Authentication state
- **src/contexts/ChatContext.jsx** - Chat state
- **src/services/api.js** - API client
- **src/services/websocket.js** - WebSocket client
- **tailwind.config.js** - Tailwind configuration
- **vite.config.js** - Vite configuration

---

## 🎨 Customization

### Change Color Scheme

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#3b82f6',    // Change primary color
      secondary: '#10b981',  // Change secondary color
    }
  }
}
```

### Change Fonts

Edit `src/styles/global.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=YOUR_FONT&display=swap");
```

### Modify UI Components

All components are in `src/components/`:

- `Common.jsx` - Basic UI components
- `Chat.jsx` - Chat-specific components
- `Message.jsx` - Message components
- `Cards.jsx` - Card components
- `Modals.jsx` - Modal components

---

## 🚀 Deployment

### Deploy Frontend to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy Frontend to Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

### Deploy with Docker to VPS

```bash
# Build images
docker-compose build

# Push to registry
docker tag chatapp-client registry.example.com/chatapp-client:latest
docker push registry.example.com/chatapp-client:latest

# Pull and run on server
docker-compose pull
docker-compose up -d
```

---

## 📚 Documentation

- [Main README](./README.md) - Full project documentation
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Feature checklist
- [Backend Documentation](../server/README.md) - Backend setup and APIs

---

## 💡 Tips

1. **Multi-Tab Support**: Open ChatApp in multiple tabs - all tabs will show as online
2. **Presence Updates**: You'll go AFK after 1 minute of inactivity across all tabs
3. **Message Persistence**: All messages are stored persistently
4. **Offline Messages**: Messages sent to offline users are delivered when they reconnect
5. **File Uploads**: Ready for attachment implementation
6. **Responsive Design**: Works on mobile and desktop

---

## 🤝 Contributing

Feel free to extend the frontend with:

- File upload UI
- Message search
- Read receipts
- Reactions/emojis
- Voice/video chat
- Message encryption
- Dark theme

---

## 📞 Support

For issues:

1. Check browser console for errors
2. Check backend logs
3. Review troubleshooting section
4. Create an issue on GitHub

---

Happy chatting! 🎉
