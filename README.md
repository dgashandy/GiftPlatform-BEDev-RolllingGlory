# Rolling Glory Gift Platform Backend

A gift redemption platform API built with NestJS, Drizzle ORM, and PostgreSQL.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS 10.x, TypeScript |
| **Database** | PostgreSQL 16 |
| **ORM** | Drizzle ORM |
| **Auth** | JWT (Access + Refresh Tokens), Google OAuth 2.0, Email OTP |
| **Frontend** | HTML5, CSS3, Vanilla JS, Bootstrap 5.3 |
| **Containerization** | Docker, Docker Compose |

## Architecture

| Environment | PostgreSQL | NestJS API |
|-------------|------------|------------|
| Development | Docker     | Local      |
| Production  | Docker     | Docker     |

## Feature Modules

| Module | Path | Description |
|--------|------|-------------|
| **Auth** | `src/auth/` | JWT, Google OAuth, Email OTP authentication |
| **Users** | `src/users/` | Profile, points balance, redemption history |
| **Gifts** | `src/gifts/` | CRUD, redeem, ratings |
| **Database** | `src/database/` | Drizzle ORM connection (global module) |
| **Common** | `src/common/` | Pagination utilities |

Each module uses **Controller → Service → Database** pattern with DTOs for validation.

---

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | Full system access | All operations |
| `support` | Gift management | Create/Update gifts |
| `user` | Regular user | Browse, redeem, rate |

---

## Default Credentials (Seeded)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@giftplatform.com | admin123 |
| Support | support@giftplatform.com | support123 |

---

## Development Setup

```bash
# 1. Start PostgreSQL container
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Setup environment (copy and edit as needed)
cp .env.example .env

# 4. Run database migrations
npx ts-node src/database/migrate.ts

# 5. Seed database with sample data
npm run db:seed

# 6. Start development server (watch mode)
npm run start:dev

# Reset Docker Container and Volume
docker-compose down -v 
```

Open http://localhost:3000

---

## Production Setup (Docker)

```bash
# 1. Build and start all containers (PostgreSQL + API)
docker-compose -f docker-compose.prod.yml up -d --build

# 2. Run database migrations
docker exec gift_platform_api npm run migration:run

# 3. Seed the database with initial data
docker exec gift_platform_api node dist/database/seed.js

# 4. Verify the app is running
curl http://localhost:3000/
```

### Useful Commands

```bash
# View API logs
docker-compose -f docker-compose.prod.yml logs -f api

# View database logs
docker-compose -f docker-compose.prod.yml logs -f postgres

# Restart API after code changes
docker-compose -f docker-compose.prod.yml up -d --build api

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: deletes all data!)
docker-compose -f docker-compose.prod.yml down -v

# Connect to database via DBeaver/pgAdmin
# Host: localhost, Port: 5432, Database: gift_platform
```

### Resetting Production Database

```bash
# Stop containers and remove volumes
docker-compose -f docker-compose.prod.yml down -v

# Rebuild and start fresh
docker-compose -f docker-compose.prod.yml up -d --build

# Re-run migrations and seed
docker exec gift_platform_api npm run migration:run
docker exec gift_platform_api node dist/database/seed.js
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in watch mode |
| `npm run start:prod` | Start production server |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |
| `npm run db:generate` | Generate migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly (dev only) |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Drizzle Studio |

---

## API Reference

### Authentication (`/auth`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| `POST` | `/auth/login` | ❌ | Public | Login with email/password |
| `POST` | `/auth/register` | ❌ | Public | Register new user |
| `GET` | `/auth/google` | ❌ | Public | Initiate Google OAuth |
| `GET` | `/auth/google/callback` | ❌ | Public | Google OAuth callback |
| `POST` | `/auth/otp/request` | ❌ | Public | Request email OTP |
| `POST` | `/auth/otp/verify` | ❌ | Public | Verify OTP & complete registration |
| `POST` | `/auth/refresh` | ✅ | Any | Refresh access token |
| `POST` | `/auth/logout` | ✅ | Any | Logout (invalidate refresh token) |

### Users (`/users`)

> All endpoints require JWT authentication

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/users/me` | Any | Get current user profile |
| `PUT` | `/users/me` | Any | Update profile (name, phone, avatar) |
| `POST` | `/users/me/change-password` | Any | Change password |
| `GET` | `/users/me/points` | Any | Get point balance |
| `GET` | `/users/me/points/history` | Any | Get point transaction history |
| `GET` | `/users/me/redemptions` | Any | Get redemption history |

### Gifts (`/gifts`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| `GET` | `/gifts` | ❌ | Public | List gifts (paginated, filterable) |
| `GET` | `/gifts/categories` | ❌ | Public | List all categories |
| `GET` | `/gifts/:id` | ❌ | Public | Get gift details + reviews |
| `POST` | `/gifts` | ✅ | admin, support | Create new gift |
| `PUT` | `/gifts/:id` | ✅ | admin, support | Update gift (full) |
| `PATCH` | `/gifts/:id` | ✅ | admin, support | Update gift (partial) |
| `DELETE` | `/gifts/:id` | ✅ | admin | Delete gift |
| `POST` | `/gifts/:id/redeem` | ✅ | Any | Redeem single gift |
| `POST` | `/gifts/redeem/multiple` | ✅ | Any | Redeem multiple gifts (cart) |
| `POST` | `/gifts/:id/rating` | ✅ | Any | Add rating/review |

---

## Key Services

### AuthService
- `login()` - Validates credentials, returns JWT tokens
- `register()` - Creates user, sends OTP for verification
- `requestOtp()` / `verifyOtp()` - Email verification flow
- `handleGoogleLogin()` - Google OAuth user creation/login
- `refreshTokens()` - Token refresh mechanism

### UsersService  
- `getProfile()` / `updateProfile()` - Profile management
- `changePassword()` - Password update with validation
- `getPointBalance()` / `getPointHistory()` - Point tracking
- `getRedemptions()` - User's redemption history

### GiftsService
- `findAll()` - Paginated gift listing with filters
- `findOne()` - Gift details with recent reviews
- `create()` / `update()` / `remove()` - CRUD operations
- `redeem()` / `redeemMultiple()` - Point deduction & redemption
- `addRating()` - Rating with average recalculation

---

## Environment Variables

See `.env.example` for all required environment variables.

