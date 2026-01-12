# Deploying to Dokploy (Compose Method)

This guide walks you through deploying the Gift Platform API using **Dokploy's Compose service**.

## Prerequisites

1. **Dokploy Server** - A running Dokploy instance on your VPS
2. **Domain configured** - `dgift-rgb.rnv.lol` pointing to your Dokploy server IP
3. **Git repository** - Push PROD branch to GitHub

---

## Step 1: Push PROD Branch to Git

```bash
git push origin PROD
```

---

## Step 2: Create Project in Dokploy

1. **Login** to your Dokploy dashboard
2. Go to **Projects** → Click **"Create Project"**
3. Name it: `Gift Platform`
4. Click **Create**

---

## Step 3: Create Compose Service

1. Inside your project, click **"Create Service"** → Select **"Compose"**
2. Name it: `gift-platform`

### Configure Git Source

1. Select **"Git"** as the source
2. Choose your **GitHub provider**
3. Select **Repository**: `RollingGloryBackEnd`
4. **Branch**: `PROD`
5. **Compose Path**: `docker-compose.prod.yml`

---

## Step 4: Configure Environment Variables

In the Compose service, go to **"Environment"** tab and add these variables:

```env
# Required - Generate secure secrets!
JWT_SECRET=your-64-char-random-secret-here
JWT_REFRESH_SECRET=your-64-char-random-refresh-secret-here

# Optional - Override defaults if needed
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/gift_platform
APP_URL=https://dgift-rgb.rnv.lol
FRONTEND_URL=https://dgift-rgb.rnv.lol

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://dgift-rgb.rnv.lol/auth/google/callback

# Mail (if using OTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM="Gift Platform <noreply@giftplatform.com>"
```

### Generate Secure JWT Secrets

Run this in your local terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 5: Deploy

1. Click **"Deploy"** button
2. Watch the build logs
3. Wait for all services to show as **Running**

---

## Step 6: Configure Domain & SSL

1. Go to the **"Domains"** tab in your Compose service
2. Click **"Add Domain"**
3. Configure:
   - **Service Name**: `api` (matches the service name in docker-compose.prod.yml)
   - **Domain**: `dgift-rgb.rnv.lol`
   - **Container Port**: `3000`
   - **HTTPS**: Enable (Let's Encrypt auto-provisions SSL)
4. Click **Save**

---

## Step 7: Initialize Database

After first deployment, you need to run migrations.

### Option A: Using Dokploy Terminal
1. In your Compose service, find **Terminal** or **Console** option
2. Select the `api` container
3. Run:
   ```bash
   npm run db:push
   npm run db:seed  # Optional: seed initial data
   ```

### Option B: Via SSH to VPS
```bash
# SSH into your server
ssh user@your-server-ip

# Find the API container
docker ps | grep gift_platform_api

# Execute into container
docker exec -it gift_platform_api sh

# Run migrations
npm run db:push
npm run db:seed
```

---

## Verification

Test your deployment:

```bash
# Health check
curl https://dgift-rgb.rnv.lol/

# Test login (after seeding)
curl https://dgift-rgb.rnv.lol/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@giftplatform.com","password":"admin123"}'
```

---

## Troubleshooting

### Build Fails
- Check logs tab for error details
- Verify `docker-compose.prod.yml` exists in PROD branch
- Ensure Dockerfile is valid

### Database Connection Issues
- Check postgres container is running
- Verify `DATABASE_URL` uses service name `postgres` (not localhost)
- Check postgres healthcheck passes

### Domain Not Working
- Verify DNS A record points to server IP
- Wait for DNS propagation
- Check SSL certificate in Dokploy logs

### Container Keeps Restarting
- Check application logs
- Verify all required environment variables are set
- Ensure database is accessible

---

## Updating

To deploy updates:
1. Push changes to `PROD` branch
2. In Dokploy, click **"Redeploy"** or enable **Auto Deploy**
