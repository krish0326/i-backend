# Interior Design Website Backend

A comprehensive backend API for an interior design website with chatbot functionality, team management, design portfolio, and real-time communication using Socket.IO.

## 🚀 Features

- **Team Management**: CRUD operations for team members with expertise tracking
- **Intelligent Chatbot**: AI-powered conversation flow for design consultations
- **Design Portfolio**: Complete design management with before/after images
- **Real-time Communication**: Socket.IO integration for live chat
- **File Upload**: Multer + Cloudinary integration for image management
- **MongoDB Integration**: Robust data storage with Mongoose ODM
- **Security**: Rate limiting, CORS, and input validation
- **Analytics**: Comprehensive statistics and reporting

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Cloudinary account (for image uploads)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `config.env.example` to `config.env`
   - Update the configuration variables:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/interior_design_db

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_secure
   JWT_EXPIRE=7d

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # File Upload Configuration
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Start MongoDB**
   ```bash
   # Local MongoDB
   mongod

   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in config.env
   ```

5. **Run the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Health Check
```
GET /health
```

### Team Management

#### Get All Team Members
```
GET /team
Query Parameters:
- active (boolean): Filter active members
- limit (number): Number of results (default: 10)
- page (number): Page number (default: 1)
```

#### Get Active Team Members
```
GET /team/active
```

#### Get Single Team Member
```
GET /team/:id
```

#### Create Team Member
```
POST /team
Body:
{
  "name": "Sarah Johnson",
  "position": "Lead Interior Designer",
  "image": "https://example.com/image.jpg",
  "description": "With over 10 years of experience...",
  "expertise": ["Residential Design", "Luxury Interiors"],
  "experience": "10+ Years",
  "projects": "150+ Projects",
  "social": {
    "linkedin": "https://linkedin.com/in/sarah",
    "instagram": "https://instagram.com/sarah",
    "pinterest": "https://pinterest.com/sarah"
  }
}
```

#### Update Team Member
```
PUT /team/:id
```

#### Delete Team Member
```
DELETE /team/:id
```

#### Toggle Active Status
```
PATCH /team/:id/toggle-status
```

### Chatbot API

#### Create Chat Session
```
POST /chatbot/session
Body:
{
  "userId": "user123",
  "initialMessage": "Hello, I need help with my living room design"
}
```

#### Send Message
```
POST /chatbot/message
Body:
{
  "sessionId": "session_123",
  "userId": "user123",
  "message": "I want a modern style"
}
```

#### Get Conversation History
```
GET /chatbot/history/:sessionId
Query Parameters:
- limit (number): Number of messages (default: 50)
```

#### Get User Sessions
```
GET /chatbot/sessions/:userId
```

#### Get Chat Analytics
```
GET /chatbot/analytics
Query Parameters:
- startDate (string): Start date filter
- endDate (string): End date filter
- userId (string): User filter
```

#### Export Conversation
```
GET /chatbot/export/:sessionId
```

### Design Portfolio

#### Get All Designs
```
GET /designs
Query Parameters:
- category (string): Filter by category
- designStyle (string): Filter by style
- status (string): Filter by status
- featured (boolean): Filter featured designs
- search (string): Search query
- limit (number): Number of results (default: 12)
- page (number): Page number (default: 1)
- sortBy (string): Sort field (default: createdAt)
- sortOrder (string): Sort order (default: desc)
```

#### Get Featured Designs
```
GET /designs/featured
Query Parameters:
- limit (number): Number of results (default: 6)
```

#### Get Designs by Category
```
GET /designs/category/:category
Query Parameters:
- limit (number): Number of results (default: 12)
```

#### Search Designs
```
GET /designs/search?q=modern
Query Parameters:
- q (string): Search query (required)
- limit (number): Number of results (default: 20)
```

#### Get Single Design
```
GET /designs/:id
```

#### Create Design
```
POST /designs
Body:
{
  "title": "Modern Living Room Design",
  "description": "A contemporary living room with clean lines...",
  "category": "residential",
  "designStyle": "modern",
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "caption": "Main view",
      "order": 0
    }
  ],
  "tags": ["modern", "living-room", "contemporary"],
  "teamMember": "team_member_id"
}
```

#### Update Design
```
PUT /designs/:id
```

#### Delete Design
```
DELETE /designs/:id
```

#### Toggle Featured Status
```
PATCH /designs/:id/toggle-featured
```

#### Like Design
```
POST /designs/:id/like
```

#### Add Before/After Images
```
POST /designs/:id/before-after
Body:
{
  "beforeImage": "https://example.com/before.jpg",
  "afterImage": "https://example.com/after.jpg",
  "caption": "Kitchen renovation"
}
```

### File Upload

#### Upload Single Image
```
POST /upload/image
Content-Type: multipart/form-data
Body:
- image: File
```

#### Upload Multiple Images
```
POST /upload/images
Content-Type: multipart/form-data
Body:
- images: File[] (max 10)
```

#### Upload Design Images
```
POST /upload/design-images
Content-Type: multipart/form-data
Body:
- images: File[] (max 10)
- designId: string
- imageType: string
```

#### Upload Team Profile
```
POST /upload/team-profile
Content-Type: multipart/form-data
Body:
- profile: File
- teamMemberId: string
```

#### Upload Before/After Images
```
POST /upload/before-after
Content-Type: multipart/form-data
Body:
- images: File[] (exactly 2)
- designId: string
- caption: string
```

#### Delete Image
```
DELETE /upload/image/:publicId
```

## 🔌 Socket.IO Events

### Client to Server

#### Join Session
```javascript
socket.emit('join-session', {
  sessionId: 'session_123',
  userId: 'user123'
});
```

#### Send Message
```javascript
socket.emit('send-message', {
  sessionId: 'session_123',
  userId: 'user123',
  message: 'Hello, I need design help',
  metadata: {
    userAgent: navigator.userAgent,
    ipAddress: '192.168.1.1'
  }
});
```

#### Typing Indicators
```javascript
socket.emit('typing-start', { sessionId: 'session_123' });
socket.emit('typing-stop', { sessionId: 'session_123' });
```

#### Upload Design Image
```javascript
socket.emit('upload-design-image', {
  sessionId: 'session_123',
  userId: 'user123',
  imageData: 'base64_image_data',
  imageType: 'inspiration'
});
```

#### Update Design Preferences
```javascript
socket.emit('update-design-preferences', {
  sessionId: 'session_123',
  userId: 'user123',
  preferences: {
    designStyle: 'modern',
    budget: '25k-50k',
    roomType: 'living-room'
  }
});
```

### Server to Client

#### Session Joined
```javascript
socket.on('session-joined', (data) => {
  console.log('Joined session:', data.sessionId);
});
```

#### New Message
```javascript
socket.on('new-message', (data) => {
  console.log('User message:', data.userMessage);
  console.log('Bot response:', data.botMessage);
});
```

#### Conversation Complete
```javascript
socket.on('conversation-complete', (data) => {
  console.log('Conversation complete:', data.collectedData);
});
```

#### Image Upload Success
```javascript
socket.on('image-upload-success', (data) => {
  console.log('Image uploaded:', data.imageUrl);
});
```

## 🗄️ Database Models

### TeamMember
- name, position, image, description
- expertise array, experience, projects count
- social links, active status, order

### ChatMessage
- sessionId, userId, message, response
- messageType (user/bot), intent, confidence
- context with conversation state
- metadata (userAgent, ipAddress, timestamp)

### Design
- title, description, category, designStyle
- images array with captions and order
- beforeAfterImages array
- project details, tags, team member reference
- status, featured flag, views, likes
- metadata (colors, materials, furniture, lighting)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment mode | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/interior_design_db |
| JWT_SECRET | JWT secret key | - |
| JWT_EXPIRE | JWT expiration time | 7d |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud name | - |
| CLOUDINARY_API_KEY | Cloudinary API key | - |
| CLOUDINARY_API_SECRET | Cloudinary API secret | - |
| MAX_FILE_SIZE | Maximum file size in bytes | 10485760 (10MB) |
| UPLOAD_PATH | Local upload directory | ./uploads |
| RATE_LIMIT_WINDOW_MS | Rate limit window | 900000 (15 minutes) |
| RATE_LIMIT_MAX_REQUESTS | Rate limit max requests | 100 |

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   MONGODB_URI=your_production_mongodb_uri
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   JWT_SECRET=your_secure_jwt_secret
   ```

2. **Build and Start**
   ```bash
   npm install --production
   npm start
   ```

3. **Process Management (PM2)**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "interior-design-backend"
   pm2 save
   pm2 startup
   ```

### Docker Deployment

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

## 📊 Monitoring and Analytics

### Health Check
```
GET /api/health
```

### Upload Statistics
```
GET /api/upload/stats
```

### Design Statistics
```
GET /api/designs/stats/overview
```

### Chat Analytics
```
GET /api/chatbot/analytics
```

## 🔒 Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **CORS**: Cross-origin resource sharing configuration
- **Input Validation**: Express-validator for all inputs
- **File Upload Security**: File type and size validation
- **Helmet**: Security headers middleware
- **Compression**: Response compression for performance

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "Team API"
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Built with ❤️ for Interior Design Professionals** 