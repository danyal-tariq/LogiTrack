require('dotenv').config();
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set.');
  process.exit(1);
}

// Parse the DATABASE_URL to extract components
// Format: postgresql://user:pass@host:port/dbname
const urlParts = databaseUrl.split('://');
if (urlParts.length !== 2 || urlParts[0] !== 'postgresql') {
  console.error('Invalid DATABASE_URL format. Expected postgresql://...');
  process.exit(1);
}

const [credentials, rest] = urlParts[1].split('@');
const [hostPort, dbname] = rest.split('/');
const [host, port] = hostPort.split(':');
const [user, pass] = credentials.split(':');

// Create connection string to 'postgres' database for creating
const createConnectionString = `postgresql://${user}:${pass}@${host}:${port}/postgres`;

async function createDatabase() {
  const client = new Client({ connectionString: createConnectionString });
  try {
    await client.connect();
    console.log(`Creating database "${dbname}" if it doesn't exist...`);
    await client.query(`CREATE DATABASE "${dbname}"`);
    console.log('Database created successfully (or already exists).');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('Database already exists.');
    } else {
      console.error('Error creating database:', error.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

createDatabase();