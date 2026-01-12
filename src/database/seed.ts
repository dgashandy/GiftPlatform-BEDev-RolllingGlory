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
        console.log('📝 Fetching roles...');
        const existingRoles = await db.select().from(schema.roles);

        const adminRole = existingRoles.find(r => r.name === 'admin');
        const supportRole = existingRoles.find(r => r.name === 'support');
        const userRole = existingRoles.find(r => r.name === 'user');

        if (!adminRole || !supportRole || !userRole) {
            throw new Error('Required roles not found. Make sure migrations have been run.');
        }

        console.log('✅ Roles found:', adminRole.name, supportRole.name, userRole.name);

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
                pointsRequired: 750,
                stock: 5,
                imageUrl: '/images/samsung-s9.jpg',
                badgeType: 'bestseller',
                avgRating: '4.50',
                totalReviews: 160,
            },
            {
                name: 'Apple AirPods Pro 2nd Gen',
                description: 'Active Noise Cancellation and Transparency mode. Personalized Spatial Audio with dynamic head tracking.',
                categoryId: electronicsCategory?.id,
                pointsRequired: 650,
                stock: 10,
                imageUrl: '/images/airpods-pro.jpg',
                badgeType: 'hotitem',
                avgRating: '4.80',
                totalReviews: 250,
            },
            {
                name: 'Nike Air Max 270',
                description: 'The Nike Air Max 270 delivers visible cushioning under every step. Updated for modern comfort, it features Nike\'s biggest heel Air unit yet.',
                categoryId: fashionCategory?.id,
                pointsRequired: 450,
                stock: 15,
                imageUrl: '/images/nike-airmax.jpg',
                badgeType: 'newitem',
                avgRating: '4.20',
                totalReviews: 85,
            },
            {
                name: 'Starbucks Gift Card Rp 500.000',
                description: 'Enjoy your favorite Starbucks drinks and food with this prepaid gift card.',
                categoryId: vouchersCategory?.id,
                pointsRequired: 300,
                stock: 100,
                imageUrl: '/images/starbucks-voucher.jpg',
                badgeType: null,
                avgRating: '5.00',
                totalReviews: 320,
            },
            {
                name: 'Sony WH-1000XM5 Headphones',
                description: 'Industry-leading noise cancellation. Crystal clear hands-free calling with 4 beamforming microphones.',
                categoryId: electronicsCategory?.id,
                pointsRequired: 800,
                stock: 0,
                imageUrl: '/images/sony-headphones.jpg',
                badgeType: 'bestseller',
                avgRating: '4.70',
                totalReviews: 180,
            },
            {
                name: 'Adidas Ultraboost 22',
                description: 'Incredibly responsive cushioning and a Linear Energy Push system for a smooth, well-cushioned ride.',
                categoryId: fashionCategory?.id,
                pointsRequired: 550,
                stock: 20,
                badgeType: 'newitem',
                avgRating: '4.30',
                totalReviews: 95,
            },
            {
                name: 'Wireless Charging Pad',
                description: 'Fast wireless charging for all Qi-compatible devices. Sleek and compact design.',
                categoryId: electronicsCategory?.id,
                pointsRequired: 350,
                stock: 50,
                badgeType: null,
                avgRating: '4.10',
                totalReviews: 42,
            },
        ];

        const gifts = await db.insert(schema.gifts).values(giftsData).returning();
        console.log('✅ Gifts created:', gifts.length);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('===================================');
        console.log('Admin credentials:');
        console.log('  Email: admin@giftplatform.com');
        console.log('  Password: admin123');
        console.log('Support credentials:');
        console.log('  Email: support@giftplatform.com');
        console.log('  Password: support123');
        console.log('===================================\n');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

seed().catch(console.error);
