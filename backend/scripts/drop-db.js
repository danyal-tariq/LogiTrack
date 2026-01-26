require('dotenv').config();
const { Client } = require('pg');
const readline = require('readline');

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

// Create connection string to 'postgres' database for dropping
const dropConnectionString = `postgresql://${user}:${pass}@${host}:${port}/postgres`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Are you sure you want to drop the database? This action cannot be undone. Type "yes" to confirm: ', async (answer) => {
  if (answer.toLowerCase() === 'yes') {
    const client = new Client({ connectionString: dropConnectionString });
    try {
      await client.connect();
      console.log(`Dropping database "${dbname}"...`);
      await client.query(`DROP DATABASE IF EXISTS "${dbname}"`);
      console.log('Database dropped successfully.');
    } catch (error) {
      console.error('Error dropping database:', error.message);
      process.exit(1);
    } finally {
      await client.end();
    }
  } else {
    console.log('Aborted.');
  }
  rl.close();
});