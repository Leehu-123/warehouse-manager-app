const { Client } = require('pg');

async function createDb() {
  const client = new Client({
    connectionString: 'postgresql://antigrapvity_user:ChangeMe123!@localhost:5432/postgres'
  });
  
  try {
    await client.connect();
    const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'dafa_warehouse'");
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE dafa_warehouse');
      console.log('Created database dafa_warehouse');
    } else {
      console.log('Database dafa_warehouse already exists');
    }
  } catch (err) {
    console.error('Error connecting or creating database:', err.message);
  } finally {
    await client.end();
  }
}

createDb();
