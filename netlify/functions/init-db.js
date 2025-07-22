const { Pool } = require('pg');

exports.handler = async (event, context) => {
    console.log('Initializing database...');
    
    let pool;
    try {
        // Create a new connection pool using environment variables
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        console.log('Database connection pool created');
        
        // Check if contacts table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'contacts'
            )`);
            
        if (!tableCheck.rows[0].exists) {
            console.log('Contacts table does not exist. Creating table...');
            
            await pool.query(`
                CREATE TABLE contacts (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`);
                
            console.log('Contacts table created successfully');
            
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    success: true,
                    message: 'Database initialized successfully',
                    tableCreated: true
                })
            };
        } else {
            console.log('Contacts table already exists');
            
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    success: true,
                    message: 'Database already initialized',
                    tableExists: true
                })
            };
        }
        
    } catch (error) {
        console.error('Database initialization error:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Database initialization failed',
                details: error.message
            })
        };
    } finally {
        if (pool) {
            try {
                await pool.end();
                console.log('Database connection closed');
            } catch (endError) {
                console.error('Error closing database connection:', endError);
            }
        }
    }
};
