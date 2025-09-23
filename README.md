# ServiceText Pro (STP)

A comprehensive multi-platform system for Bulgarian tradespeople (electricians, plumbers, HVAC technicians).

## 🏗️ System Architecture

### 📱 Mobile App (React Native)
Core business communication tool with:
- Call detection and contact management
- AI-powered conversations with Bulgarian NLP
- SMS automation with chat links
- Real-time analytics and business intelligence
- Multi-platform messaging (WhatsApp, Viber, Telegram)

### 🌐 Marketplace Website (Next.js)
Customer-facing platform featuring:
- Service provider discovery and booking
- Real-time chat system
- Case management and templates
- Review and rating system
- Referral tracking system

### ⚙️ Backend System (Node.js/Express)
Complete API and WebSocket infrastructure:
- JWT-based authentication
- GDPR-compliant data handling
- Real-time messaging with Socket.IO
- Bulgarian market integrations (ЕИК/ДДС validation)
- Advanced security and rate limiting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- React Native development environment
- Android Studio (for mobile app)

### Backend Setup
```bash
cd ServiceTextPro/backend
npm install
npm run dev
```

### Marketplace Setup
```bash
cd Marketplace
npm install
npm run dev
```

### Mobile App Setup
```bash
cd ServiceTextPro
npm install
npx react-native run-android
```

## 🔧 Configuration

### Environment Variables
Create `.env` files in each project directory:

**Backend (.env)**:
```
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret
DATABASE_URL=sqlite:./data/servicetextpro.db
```

**Marketplace (.env.local)**:
```
NEXT_PUBLIC_API_URL=http://192.168.0.129:3000
NEXT_PUBLIC_CHAT_URL=http://192.168.0.129:3002
```

**Mobile App (.env)**:
```
API_BASE_URL=http://192.168.0.129:3000
CHAT_BASE_URL=http://192.168.0.129:3002
```

## 🌟 Key Features

### 🤖 AI-Powered Conversations
- Bulgarian language processing
- Intelligent response generation
- Context-aware chat routing

### 📊 Business Intelligence
- Call analytics and tracking
- SMS campaign management
- Revenue and performance metrics

### 🔒 Security & Compliance
- GDPR-compliant data handling
- SMS abuse prevention
- Rate limiting and monitoring
- Device authentication

### 🇧🇬 Bulgarian Market Focus
- ЕИК/ДДС business validation
- Sofia traffic intelligence
- Professional trade terminology
- Local payment integrations

## 📁 Project Structure

```
ServiceText Pro/
├── ServiceTextPro/          # React Native Mobile App
│   ├── src/
│   │   ├── services/        # SMS, Contact, Auth services
│   │   ├── components/      # UI components
│   │   └── screens/         # App screens
│   └── android/             # Android-specific code
├── Marketplace/             # Next.js Web Application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # React components
│   │   └── styles/         # CSS and themes
│   └── public/             # Static assets
└── ServiceTextPro/backend/  # Node.js Backend
    ├── src/
    │   ├── controllers/    # API controllers
    │   ├── services/       # Business logic
    │   ├── middleware/     # Express middleware
    │   └── models/         # Database models
    └── data/              # SQLite database
```

## 🔐 Security Features

### SMS Security System
- Rate limiting (5 SMS per 15 minutes)
- Device authentication and fingerprinting
- Cryptographically secure token generation
- Real-time abuse monitoring
- Automatic blocking mechanisms

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Session management
- GDPR consent tracking

## 🛠️ Development

### Running Tests
```bash
# Backend tests
cd ServiceTextPro/backend
npm test

# Frontend tests
cd Marketplace
npm test
```

### Building for Production
```bash
# Backend
cd ServiceTextPro/backend
npm run build

# Marketplace
cd Marketplace
npm run build

# Mobile App
cd ServiceTextPro
npx react-native run-android --variant=release
```

## 📱 Mobile App Features

### Call Management
- Automatic call detection
- Missed call SMS automation
- Contact filtering and management
- Call history and analytics

### SMS Automation
- Template-based messaging
- Dynamic chat link generation
- Bulk SMS capabilities
- Delivery tracking

### Chat Integration
- Real-time messaging
- Multi-platform support
- File and image sharing
- Chat history synchronization

## 🌐 Marketplace Features

### Service Provider Profiles
- Business information and certifications
- Service categories and pricing
- Photo galleries and portfolios
- Customer reviews and ratings

### Customer Experience
- Advanced search and filtering
- Real-time chat with providers
- Case creation and management
- Booking and scheduling

### Business Tools
- Dashboard and analytics
- Case management system
- Referral tracking
- Revenue reporting

## 🔗 API Documentation

The backend provides RESTful APIs for:
- Authentication (`/api/v1/auth`)
- Chat management (`/api/v1/chat`)
- Marketplace operations (`/api/v1/marketplace`)
- Referral system (`/api/v1/referrals`)
- GDPR compliance (`/api/v1/gdpr`)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support and questions:
- Email: support@servicetextpro.bg
- Documentation: [Coming Soon]
- Issues: Use GitHub Issues for bug reports

---

**ServiceText Pro** - Empowering Bulgarian tradespeople with modern communication technology.
