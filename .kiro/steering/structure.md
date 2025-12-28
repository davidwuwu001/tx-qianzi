# Project Structure

## Directory Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages (login)
│   │   └── m/             # Mobile login
│   ├── (dashboard)/       # Admin dashboard pages
│   │   ├── contracts/     # Contract management
│   │   ├── cities/        # City management (System Admin)
│   │   ├── products/      # Product management (System Admin)
│   │   └── users/         # User management (System Admin)
│   ├── m/                 # Mobile pages (Ordinary Users)
│   │   ├── contracts/     # Mobile contract management
│   │   └── profile/       # User profile
│   └── api/               # API routes
│       ├── auth/          # NextAuth endpoints
│       ├── callback/      # Tencent E-Sign callbacks
│       ├── cron/          # Scheduled tasks
│       └── m/             # Mobile API endpoints
├── components/            # React components
│   └── contract/          # Contract-related components
├── lib/                   # Utility libraries
│   ├── prisma.ts          # Prisma client singleton
│   ├── tencent-cloud-sign.ts  # API signature
│   ├── security.ts        # Security utilities
│   ├── validators.ts      # Input validation
│   └── contract-status.ts # Status management
├── services/              # Business logic layer
│   ├── esign.service.ts   # Tencent E-Sign API
│   ├── contract.service.ts # Contract operations
│   ├── contract-flow.service.ts # Contract workflow
│   ├── auth.service.ts    # Authentication
│   ├── user.service.ts    # User management
│   ├── sms.service.ts     # SMS notifications
│   └── statistics.service.ts # Data statistics
├── types/                 # TypeScript type definitions
│   ├── api.ts             # API response types
│   ├── contract.ts        # Contract types
│   └── auth.ts            # Auth types
├── utils/                 # Helper functions
│   ├── format.ts          # Data formatting
│   └── generate.ts        # ID/code generation
└── middleware.ts          # RBAC middleware

prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Database seeding

scripts/                   # Utility scripts
├── create-user.mjs        # Create admin users
├── create-ordinary-user.mjs # Create ordinary users
└── verify-api-integration.mjs # Test API integration

__tests__/                 # Test files
└── properties/            # Property-based tests
```

## Architecture Patterns

### Route Groups

- `(auth)`: Public authentication pages
- `(dashboard)`: Protected admin pages with shared layout
- `m/`: Mobile-optimized pages for ordinary users

### Server Actions

Each page directory contains `actions.ts` for server-side mutations:
- Form submissions
- Data mutations
- API calls requiring server-side secrets

### Service Layer

Business logic is isolated in `src/services/`:
- Services handle database operations via Prisma
- Services call external APIs (Tencent E-Sign)
- Services are imported by API routes and server actions

### Middleware

`src/middleware.ts` implements RBAC:
- Redirects unauthenticated users to login
- Enforces role-based page access
- Separates admin and mobile user flows

## Path Aliases

Use `@/*` to import from `src/`:
```typescript
import { prisma } from '@/lib/prisma';
import { esignService } from '@/services/esign.service';
```

## Naming Conventions

- **Files**: kebab-case (`contract-flow.service.ts`)
- **Components**: PascalCase (`PartyBForm.tsx`)
- **Types/Interfaces**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Database Models**: PascalCase (Prisma convention)
