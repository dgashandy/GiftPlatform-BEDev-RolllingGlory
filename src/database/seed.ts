import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/gift_platform';

async function seed() {
    console.log('🌱 Starting database seeding...');

    const pool = new Pool({ connectionString });
    const db = drizzle(pool, { schema });

    try {
        console.log('📝 Seeding roles...');
        const [adminRole] = await db.insert(schema.roles).values({
            name: 'admin',
            permissions: ['*'],
        }).returning();

        const [supportRole] = await db.insert(schema.roles).values({
            name: 'support',
            permissions: ['gifts:read', 'gifts:create', 'gifts:update', 'users:read'],
        }).returning();

        const [userRole] = await db.insert(schema.roles).values({
            name: 'user',
            permissions: ['gifts:read', 'gifts:redeem', 'ratings:create', 'profile:update'],
        }).returning();

        console.log('✅ Roles created:', adminRole.name, supportRole.name, userRole.name);

        console.log('📝 Seeding admin user...');
        const passwordHash = await bcrypt.hash('admin123', 10);

        const [adminUser] = await db.insert(schema.users).values({
            email: 'admin@giftplatform.com',
            passwordHash,
            name: 'System Admin',
            roleId: adminRole.id,
            isVerified: true,
        }).returning();

        console.log('✅ Admin user created:', adminUser.email);

        console.log('📝 Seeding support user...');
        const supportPasswordHash = await bcrypt.hash('support123', 10);

        const [supportUser] = await db.insert(schema.users).values({
            email: 'support@giftplatform.com',
            passwordHash: supportPasswordHash,
            name: 'Support Staff',
            roleId: supportRole.id,
            isVerified: true,
        }).returning();

        console.log('✅ Support user created:', supportUser.email);

        console.log('📝 Seeding categories...');
        const categoryData = [
            { name: 'Electronics', slug: 'electronics' },
            { name: 'Fashion', slug: 'fashion' },
            { name: 'Home & Living', slug: 'home-living' },
            { name: 'Sports & Outdoors', slug: 'sports-outdoors' },
            { name: 'Beauty & Health', slug: 'beauty-health' },
            { name: 'Vouchers', slug: 'vouchers' },
        ];

        const categories = await db.insert(schema.categories).values(categoryData).returning();
        console.log('✅ Categories created:', categories.length);

        console.log('📝 Seeding gifts...');
        const electronicsCategory = categories.find(c => c.slug === 'electronics');
        const fashionCategory = categories.find(c => c.slug === 'fashion');
        const vouchersCategory = categories.find(c => c.slug === 'vouchers');

        const giftsData = [
            {
                name: 'Samsung Galaxy S9 - Midnight Black 4/64 GB',
                description: 'Experience the revolutionary camera that adapts like the human eye. It automatically switches between various lighting conditions, making stunning photos in Super Low Light, and icons bright daylight.',
                categoryId: electronicsCategory?.id,
                pointsRequired: 200000,
                stock: 5,
                imageUrl: '/images/samsung-s9.jpg',
                avgRating: '4.50',
                totalReviews: 160,
            },
            {
                name: 'Apple AirPods Pro 2nd Gen',
                description: 'Active Noise Cancellation and Transparency mode. Personalized Spatial Audio with dynamic head tracking.',
                categoryId: electronicsCategory?.id,
                pointsRequired: 150000,
                stock: 10,
                imageUrl: '/images/airpods-pro.jpg',
                avgRating: '4.80',
                totalReviews: 250,
            },
            {
                name: 'Nike Air Max 270',
                description: 'The Nike Air Max 270 delivers visible cushioning under every step. Updated for modern comfort, it features Nike\'s biggest heel Air unit yet.',
                categoryId: fashionCategory?.id,
                pointsRequired: 80000,
                stock: 15,
                imageUrl: '/images/nike-airmax.jpg',
                avgRating: '4.20',
                totalReviews: 85,
            },
            {
                name: 'Starbucks Gift Card Rp 500.000',
                description: 'Enjoy your favorite Starbucks drinks and food with this prepaid gift card.',
                categoryId: vouchersCategory?.id,
                pointsRequired: 50000,
                stock: 100,
                imageUrl: '/images/starbucks-voucher.jpg',
                avgRating: '5.00',
                totalReviews: 320,
            },
            {
                name: 'Sony WH-1000XM5 Headphones',
                description: 'Industry-leading noise cancellation. Crystal clear hands-free calling with 4 beamforming microphones.',
                categoryId: electronicsCategory?.id,
                pointsRequired: 180000,
                stock: 0,
                imageUrl: '/images/sony-headphones.jpg',
                avgRating: '4.70',
                totalReviews: 180,
            },
        ];

        const gifts = await db.insert(schema.gifts).values(giftsData).returning();
        console.log('✅ Gifts created:', gifts.length);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('===================================');
        console.log('Admin credentials:');
        console.log('  Email: admin@giftplatform.com');
        console.log('  Password: admin123');
        console.log('===================================\n');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

seed().catch(console.error);
