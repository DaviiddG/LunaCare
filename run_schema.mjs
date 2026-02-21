import postgres from 'postgres';
import fs from 'fs';

const connectionString = 'postgresql://postgres:[0nY8WTI3wkQowkNf]@db.rheraruqppkplwaursys.supabase.co:5432/postgres';

// Replace brackets if they were literally copied as placeholder quotes, but try as is first.
const sql = postgres(connectionString.replace('[', '').replace(']', ''), { ssl: 'require' });

async function run() {
    const schema = fs.readFileSync('C:\\Users\\oscar\\.gemini\\antigravity\\brain\\0a668d56-99c7-4be8-b8f7-2b0a6d7bd623\\setup_schema.sql', 'utf8');
    try {
        // postgres module can execute multiple statements with simple() or unsafe()
        await sql.unsafe(schema);
        console.log('Schema executed successfully!');
    } catch (err) {
        console.error('Error executing schema:', err);
    } finally {
        await sql.end();
    }
}
run();
