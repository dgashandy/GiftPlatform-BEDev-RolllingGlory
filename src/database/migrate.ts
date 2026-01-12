import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL is not defined');
    }

    const pool = new Pool({
        connectionString,
    });

    const db = drizzle(pool);

    console.log('Running migrations...');

    const migrationsFolder = path.join(__dirname, 'migrations');
    console.log(`Migrations folder: ${migrationsFolder}`);
    const fs = require('fs');
    try {
        const files = fs.readdirSync(migrationsFolder);
        console.log('Files in migrations folder:', files);

        const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
        if (fs.existsSync(journalPath)) {
            const journalContent = fs.readFileSync(journalPath, 'utf-8');
            console.log('Journal content:', journalContent);
        } else {
            console.error('Journal file not found at:', journalPath);
        }
    } catch (err) {
        console.error('Error reading migrations folder:', err);
    }

    try {
        await migrate(db, { migrationsFolder });
        console.log('Migrations completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
