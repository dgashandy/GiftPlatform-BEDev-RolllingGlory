import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const migrations = pgTable('migrations', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  permissions: json('permissions').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  googleId: varchar('google_id', { length: 255 }).unique(),
  otpCode: varchar('otp_code', { length: 6 }),
  otpExpiresAt: timestamp('otp_expires_at'),
  refreshToken: varchar('refresh_token', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const gifts = pgTable('gifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  categoryId: uuid('category_id').references(() => categories.id),
  pointsRequired: integer('points_required').notNull(),
  stock: integer('stock').default(0).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  badgeType: varchar('badge_type', { length: 20 }),
  avgRating: decimal('avg_rating', { precision: 3, scale: 2 }).default('0'),
  totalReviews: integer('total_reviews').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const redemptions = pgTable('redemptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  giftId: uuid('gift_id').references(() => gifts.id).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  pointsSpent: integer('points_spent').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ratings = pgTable('ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  giftId: uuid('gift_id').references(() => gifts.id).notNull(),
  redemptionId: uuid('redemption_id').references(() => redemptions.id).notNull(),
  stars: integer('stars').notNull(),
  review: text('review'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pointBalance = pgTable('point_balance', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  description: varchar('description', { length: 255 }),
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  redemptions: many(redemptions),
  ratings: many(ratings),
  pointBalances: many(pointBalance),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  gifts: many(gifts),
}));

export const giftsRelations = relations(gifts, ({ one, many }) => ({
  category: one(categories, {
    fields: [gifts.categoryId],
    references: [categories.id],
  }),
  redemptions: many(redemptions),
  ratings: many(ratings),
}));

export const redemptionsRelations = relations(redemptions, ({ one, many }) => ({
  user: one(users, {
    fields: [redemptions.userId],
    references: [users.id],
  }),
  gift: one(gifts, {
    fields: [redemptions.giftId],
    references: [gifts.id],
  }),
  ratings: many(ratings),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
  gift: one(gifts, {
    fields: [ratings.giftId],
    references: [gifts.id],
  }),
  redemption: one(redemptions, {
    fields: [ratings.redemptionId],
    references: [redemptions.id],
  }),
}));

export const pointBalanceRelations = relations(pointBalance, ({ one }) => ({
  user: one(users, {
    fields: [pointBalance.userId],
    references: [users.id],
  }),
}));

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Gift = typeof gifts.$inferSelect;
export type NewGift = typeof gifts.$inferInsert;
export type Redemption = typeof redemptions.$inferSelect;
export type NewRedemption = typeof redemptions.$inferInsert;
export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;
export type PointBalance = typeof pointBalance.$inferSelect;
export type NewPointBalance = typeof pointBalance.$inferInsert;
