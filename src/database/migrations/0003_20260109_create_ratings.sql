CREATE TABLE IF NOT EXISTS "ratings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id"),
    "gift_id" UUID NOT NULL REFERENCES "gifts"("id"),
    "redemption_id" UUID NOT NULL REFERENCES "redemptions"("id"),
    "stars" INTEGER NOT NULL CHECK ("stars" >= 1 AND "stars" <= 5),
    "review" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_ratings_gift" ON "ratings"("gift_id");
CREATE INDEX IF NOT EXISTS "idx_ratings_user" ON "ratings"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ratings_unique_redemption" ON "ratings"("redemption_id");
