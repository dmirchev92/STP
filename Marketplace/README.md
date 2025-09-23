# ServiceText Pro Marketplace

🌐 **Bulgarian Service Provider Marketplace Website**

A modern Next.js website that connects customers with verified service providers (electricians, plumbers, HVAC technicians) across Bulgaria. Built to integrate seamlessly with the ServiceText Pro mobile app and backend.

## 🚀 Features

- **🔍 Advanced Search**: Find service providers by service type, city, and neighborhood
- **💬 Real-time Messaging**: Chat directly with service providers
- **📱 Mobile Integration**: Seamless connection with ServiceText Pro mobile app
- **🇧🇬 Bulgarian Localization**: Complete Bulgarian language support
- **🛡️ GDPR Compliant**: Full privacy compliance integration
- **⚡ Real-time Updates**: Live notifications and messaging via WebSocket

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit (same as mobile app)
- **API Client**: Axios (connects to existing backend)
- **Real-time**: Socket.io (connects to existing WebSocket server)
- **Authentication**: JWT (same as mobile app)

## 🔌 Integration

This website connects to your existing ServiceText Pro backend:

- **Backend API**: `http://localhost:3001/api/v1`
- **WebSocket**: `http://localhost:3001`
- **Database**: Same PostgreSQL, MongoDB, Redis databases
- **Authentication**: Same JWT tokens and user system

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- ServiceText Pro backend running on port 3001
- npm or yarn

### Installation

1. **Navigate to marketplace directory**
   ```bash
   cd Marketplace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp env.example .env.local
   
   # Edit .env.local with your configuration
   # The default values should work with your existing backend
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
Marketplace/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Homepage
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── Header.tsx         # Navigation header
│   │   ├── Hero.tsx           # Homepage hero section
│   │   ├── SearchSection.tsx  # Search functionality
│   │   └── ...
│   ├── lib/                   # Utilities and services
│   │   ├── api.ts             # API client (connects to backend)
│   │   └── socket.tsx         # WebSocket client
│   ├── store/                 # Redux store (same as mobile app)
│   │   ├── index.ts
│   │   └── slices/
│   └── types/                 # TypeScript types
├── package.json
├── next.config.js
├── tailwind.config.js
└── README.md
```

## 🔄 Cross-Platform Integration

### Shared Resources

- **API Client**: Same axios configuration as mobile app
- **Authentication**: Same JWT tokens work across platforms
- **State Management**: Same Redux slices and patterns
- **Real-time**: Same Socket.io connection for live updates

### User Flow Example

1. **Customer** searches for electrician on website
2. **Customer** finds Ivan's profile and clicks "Contact"
3. **Website** creates conversation in backend database
4. **Backend** sends real-time notification to Ivan's mobile app
5. **Ivan's mobile app** shows popup: "New message from customer"
6. **Ivan** opens chat in mobile app
7. **Both platforms** show the same conversation in real-time

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

### Development Workflow

1. **Backend First**: Ensure your ServiceText Pro backend is running
2. **API Integration**: Website automatically connects to your backend
3. **Real-time**: WebSocket connection provides live updates
4. **Testing**: Test cross-platform messaging and user flows

## 🌐 Deployment

### Production Setup

1. **Update Environment Variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_API_URL=https://api.servicetextpro.bg/api/v1
   NEXT_PUBLIC_WS_URL=https://api.servicetextpro.bg
   ```

2. **Build for Production**
   ```bash
   npm run build
   ```

3. **Deploy**
   ```bash
   npm run start
   ```

## 🔗 Integration with Existing System

### Backend Extensions Needed

Your existing backend will need these new endpoints:

```typescript
// New marketplace endpoints
/api/v1/marketplace/
├── providers/
│   ├── GET /search            # Search service providers
│   ├── GET /:id               # Get provider details
│   └── POST /:id/reviews      # Add review
├── bookings/
│   ├── POST /                 # Create booking
│   └── GET /:id               # Get booking details
└── search/
    ├── GET /suggestions       # Search suggestions
    └── GET /filters           # Available filters
```

### Database Extensions

New tables for marketplace functionality:

```sql
-- Service provider profiles
CREATE TABLE service_providers (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    service_types TEXT[],
    rating DECIMAL(3,2),
    -- ... other fields
);

-- Customer requests
CREATE TABLE customer_requests (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES users(id),
    service_provider_id UUID REFERENCES service_providers(id),
    -- ... other fields
);
```

## 🎯 Next Steps

1. **Install Dependencies**: Run `npm install` in the Marketplace folder
2. **Start Development**: Run `npm run dev` to start the website
3. **Test Integration**: Verify connection to your existing backend
4. **Add Backend Endpoints**: Implement marketplace API endpoints
5. **Test Cross-Platform**: Test messaging between website and mobile app

## 📞 Support

- **Backend Integration**: Connects to your existing ServiceText Pro backend
- **Mobile App**: Integrates with your React Native mobile app
- **Database**: Uses your existing PostgreSQL, MongoDB, Redis setup
- **Authentication**: Same JWT system across all platforms

---

**🎉 Your marketplace website is ready to connect with your existing ServiceText Pro ecosystem!**

