# Deploying to Dokploy

This guide walks you through deploying the Gift Platform API to **Dokploy**.

## Prerequisites

1. **Dokploy Server** - A running Dokploy instance on your VPS
2. **Domain configured** - `dgift-rgb.rnv.lol` pointing to your Dokploy server IP
3. **Git repository** - Push this project to GitHub, GitLab, or another Git provider

---

## Step 1: Push PROD Branch to Git

```bash
git add .
git commit -m "Configure for production deployment"
git push origin PROD
```

---

## Step 2: Create Project in Dokploy

1. **Login** to your Dokploy dashboard
2. Go to **Projects** → Click **"Create Project"**
3. Name it: `Gift Platform` or similar
4. Click **Create**

---

## Step 3: Create PostgreSQL Database

1. Inside your project, click **"Create Service"** → Select **"PostgreSQL"**
2. Configure the database:
   - **Name**: `gift-platform-db`
   - **Database Name**: `gift_platform`
   - **Username**: `postgres`
   - **Password**: Use a strong password (save this for later!)
3. Click **Deploy**
4. Wait for the database to be healthy

> **Note**: Copy the internal hostname from the database service info (usually `gift-platform-db` or similar).

---

## Step 4: Create the Application Service

1. Inside your project, click **"Create Service"** → Select **"Application"**
2. Name it: `gift-platform-api`

### Configure Git Provider

1. Select **"Git"** tab
2. Choose your Git provider (GitHub, GitLab, etc.)
3. Enter repository details:
   - **Repository**: Your repository URL
   - **Branch**: `PROD`
   - **Build Path**: `/` (root)

### Configure Build Settings

Dokploy will auto-detect the Dockerfile. If not:
- **Build Type**: Dockerfile
- **Dockerfile Path**: `Dockerfile`

---

## Step 5: Configure Environment Variables

In the application service, go to **"Environment"** tab and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `3000` | App port |
| `APP_URL` | `https://dgift-rgb.rnv.lol` | Your domain |
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@gift-platform-db:5432/gift_platform` | Internal DB connection |
| `JWT_SECRET` | `<generate-strong-secret>` | JWT signing key |
| `JWT_EXPIRES_IN` | `15m` | Token expiration |
| `JWT_REFRESH_SECRET` | `<generate-strong-secret>` | Refresh token key |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh expiration |
| `FRONTEND_URL` | `https://dgift-rgb.rnv.lol` | CORS origin |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID | OAuth |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth secret | OAuth |
| `GOOGLE_CALLBACK_URL` | `https://dgift-rgb.rnv.lol/auth/google/callback` | OAuth callback |
| `MAIL_HOST` | `smtp.gmail.com` | SMTP host |
| `MAIL_PORT` | `587` | SMTP port |
| `MAIL_USER` | Your email | SMTP user |
| `MAIL_PASSWORD` | Your app password | SMTP password |
| `MAIL_FROM` | `"Gift Platform <noreply@giftplatform.com>"` | Email sender |

### Generate Secure Secrets

Use this command to generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 6: Configure Domain & SSL

1. Go to **"Domains"** tab in your application service
2. Click **"Add Domain"**
3. Enter: `dgift-rgb.rnv.lol`
4. **Container Port**: `3000`
5. Enable **HTTPS** (Let's Encrypt will auto-provision SSL)
6. Click **Save**

---

## Step 7: Deploy

1. Click the **"Deploy"** button
2. Watch the build logs for any errors
3. Wait for deployment to complete (status: Running)

---

## Step 8: Initialize Database

After first deployment, run database migrations:

1. Go to **"Advanced"** → **"Terminal"** in your app service
2. Run:
   ```bash
   npm run db:push
   ```
3. (Optional) Seed initial data:
   ```bash
   npm run db:seed
   ```

---

## Verification

Test your deployment:

```bash
# Health check
curl https://dgift-rgb.rnv.lol/

# Test auth endpoint
curl https://dgift-rgb.rnv.lol/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@giftplatform.com","password":"admin123"}'
```

---

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` uses the internal service name (not `localhost`)
- Check PostgreSQL service is running and healthy
- Verify credentials match

### Build Failures
- Check Dockerfile syntax
- Ensure `package-lock.json` is committed
- Review build logs in Dokploy

### SSL/Domain Issues
- Verify DNS A record points to Dokploy server IP
- Wait for DNS propagation (up to 24 hours)
- Check Let's Encrypt logs for certificate errors

### Container Crashes
- Check application logs in Dokploy
- Verify all required environment variables are set
- Ensure database is accessible

---

## Updating the Application

To deploy updates:

1. Push changes to the `PROD` branch
2. In Dokploy, click **"Deploy"** or enable **Auto Deploy** from Git webhooks

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Dokploy Server                    │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────────┐  │
│  │   gift-platform  │────│  gift-platform-db    │  │
│  │       -api       │    │    (PostgreSQL)      │  │
│  │   Port: 3000     │    │    Port: 5432        │  │
│  └────────┬─────────┘    └──────────────────────┘  │
│           │                                         │
├───────────┼─────────────────────────────────────────┤
│    Traefik Reverse Proxy (SSL/HTTPS)               │
│           │                                         │
│  dgift-rgb.rnv.lol:443 → localhost:3000            │
└───────────┼─────────────────────────────────────────┘
            │
      ┌─────▼─────┐
      │  Internet │
      │   Users   │
      └───────────┘
```
