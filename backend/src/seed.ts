import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set.');
  process.exit(1);
}

async function seedDatabase() {
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('Connected to database. Seeding vehicles...');

    // Clear existing data (optional, for fresh seed)
    await client.query('DELETE FROM vehicles');

    // Insert 500 vehicles
    const vehicles = [];
    for (let i = 1; i <= 500; i++) {
      const name = `Truck ${i.toString().padStart(3, '0')}`;
      const regNumber = `REG${i.toString().padStart(3, '0')}`;
      const status = 'active';
      vehicles.push({ name, regNumber, status });
    }

    // Batch insert for efficiency
    const values = vehicles.map((v, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`).join(', ');
    const params = vehicles.flatMap(v => [v.name, v.regNumber, v.status]);

    const query = `
      INSERT INTO vehicles (name, reg_number, status)
      VALUES ${values}
    `;

    await client.query(query, params);
    console.log('Successfully seeded 500 vehicles.');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDatabase();