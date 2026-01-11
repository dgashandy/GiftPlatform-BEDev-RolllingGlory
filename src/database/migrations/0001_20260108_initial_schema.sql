CREATE TABLE IF NOT EXISTS "roles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL UNIQUE,
    "permissions" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "role_id" UUID NOT NULL REFERENCES "roles"("id"),
    "is_verified" BOOLEAN DEFAULT FALSE NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL UNIQUE,
    "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "gifts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category_id" UUID REFERENCES "categories"("id"),
    "points_required" INTEGER NOT NULL,
    "stock" INTEGER DEFAULT 0 NOT NULL,
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "redemptions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id"),
    "gift_id" UUID NOT NULL REFERENCES "gifts"("id"),
    "quantity" INTEGER DEFAULT 1 NOT NULL,
    "points_spent" INTEGER NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending' NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "point_balance" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id"),
    "transaction_type" VARCHAR(50) NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" VARCHAR(255),
    "reference_id" UUID,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

INSERT INTO "roles" ("name", "permissions") VALUES 
    ('admin', '["all"]'),
    ('support', '["gifts:read", "gifts:write"]'),
    ('user', '["gifts:read", "profile:write"]')
ON CONFLICT ("name") DO NOTHING;
