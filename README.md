# Rolling Glory Gift Platform Backend

A gift redemption platform API built with NestJS, Drizzle ORM, and PostgreSQL.

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT + Google OAuth
- **Frontend**: Bootstrap 5 (served via static files)

## Architecture

| Environment | PostgreSQL | NestJS API |
|-------------|------------|------------|
| Development | Docker     | Local      |
| Production  | Docker     | Docker     |

---

## Development Setup

```bash
# 1. Start PostgreSQL container
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Setup environment (copy and edit as needed)
cp .env.example .env

# 4. Push database schema
npm run db:push

# 5. Seed database with sample data
npm run db:seed

# 6. Start development server (watch mode)
npm run start:dev

# Reset Docker Container and Volume
docker-compose down -v 
```

Open http://localhost:3000

**Default Admin Login:**
- Email: `admin@giftplatform.com`
- Password: `admin123`

---

## Production Setup

### Option 1: Full Docker (Recommended)

```bash
# 1. Build and start all containers (PostgreSQL + API)
docker-compose -f docker-compose.prod.yml up -d --build

# 2. Wait for database to be ready (check logs)
docker-compose -f docker-compose.prod.yml logs -f postgres

# 3. Run database migrations (inside API container)
docker exec gift_platform_api npm run db:push

# 4. Seed the database (inside API container)
docker exec gift_platform_api npm run db:seed
```

### Option 2: Docker DB + Local API

```bash
# 1. Start only PostgreSQL in Docker
docker-compose up -d

# 2. Build the app
npm run build

# 3. Push database schema
npm run db:push

# 4. Seed the database
npm run db:seed

# 5. Start production server
npm run start:prod
```

### Production Commands

```bash
# View API logs
docker-compose -f docker-compose.prod.yml logs -f api

# View database logs
docker-compose -f docker-compose.prod.yml logs -f postgres

# Restart API after code changes
docker-compose -f docker-compose.prod.yml up -d --build api

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v
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
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Drizzle Studio |

---

## API Endpoints

### Authentication
- `POST /auth/login` - Login
- `POST /auth/register` - Register (sends OTP email)
- `POST /auth/otp/verify` - Verify OTP
- `POST /auth/otp/request` - Request new OTP
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh token
- `GET /auth/google` - Google OAuth

### Users
- `GET /users/me` - Get profile
- `PUT /users/me` - Update profile
- `POST /users/me/change-password` - Change password
- `GET /users/me/points` - Get point balance

### Gifts
- `GET /gifts` - List gifts (paginated)
- `GET /gifts/:id` - Get gift detail
- `POST /gifts` - Create gift (admin/support)
- `PUT /gifts/:id` - Update gift (admin/support)
- `DELETE /gifts/:id` - Delete gift (admin)
- `POST /gifts/:id/redeem` - Redeem gift
- `POST /gifts/:id/rating` - Rate gift

---

## Environment Variables

See `.env.example` for all required environment variables.
