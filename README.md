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

## Development

```bash
# Start PostgreSQL container
docker-compose up -d

# Install dependencies
npm install

# Setup environment (copy and edit as needed)
cp .env.example .env

# Push database schema
npm run db:push

# Seed database with sample data
npm run db:seed

# Start development server (watch mode)
npm run start:dev
```

Open http://localhost:3000

**Default Admin Login:**
- Email: `admin@giftplatform.com`
- Password: `admin123`

---

## Production

```bash
# Build and run all containers (PostgreSQL + API)
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f api

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
- `POST /auth/register` - Register
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh token
- `GET /auth/google` - Google OAuth

### Users
- `GET /users/profile` - Get profile
- `PUT /users/profile` - Update profile
- `POST /users/change-password` - Change password
- `GET /users/points` - Get point balance

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
