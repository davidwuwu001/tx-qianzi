# Technology Stack

## Framework & Runtime

- **Next.js 16.1.1** with App Router
- **React 19.2.3** with React Compiler enabled
- **TypeScript 5** with strict mode
- **Node.js 20+**

## Core Libraries

- **Database**: Prisma 5.22 with MySQL
- **Authentication**: NextAuth.js 4.24
- **UI Framework**: Ant Design 6.1 (antd)
- **Styling**: Tailwind CSS 4
- **Password Hashing**: bcrypt
- **QR Code Generation**: qrcode
- **Testing**: Jest 30 with fast-check for property-based testing

## External APIs

- **Tencent E-Sign API**: Contract signing and document management
- **Tencent Cloud SMS**: Verification codes and notifications

## Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Build & Production
npm run build            # Build for production
npm start                # Start production server

# Database
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema changes
npm run db:seed          # Seed database

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint

# Scripts
node scripts/create-user.mjs          # Create admin user
node scripts/create-ordinary-user.mjs # Create ordinary user
node scripts/verify-api-integration.mjs # Test Tencent API
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL`: MySQL connection string
- `NEXTAUTH_SECRET`: NextAuth session secret
- `NEXTAUTH_URL`: Application URL
- `TENCENT_SECRET_ID`: Tencent Cloud API credentials
- `TENCENT_SECRET_KEY`: Tencent Cloud API credentials
- `TENCENT_ESIGN_OPERATOR_ID`: E-Sign operator user ID

## API Integration

- Uses TC3-HMAC-SHA256 signature algorithm for Tencent Cloud API
- Implements retry logic with exponential backoff
- Rate limiting: 20 requests/second for CreateFlowSignUrl
- All API calls in `src/services/esign.service.ts`
