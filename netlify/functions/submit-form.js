const { Pool } = require('pg');

exports.handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        console.log('Method not allowed:', event.httpMethod);
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        console.log('Request body:', event.body);
        
        // Parse the request body
        let parsedBody;
        try {
            parsedBody = JSON.parse(event.body);
        } catch (parseError) {
            console.error('Error parsing request body:', parseError);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }
        
        const { name, email, message } = parsedBody;

        // Validate input
        if (!name || !email || !message) {
            console.log('Missing required fields:', { name, email, message });
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: 'Name, email, and message are required',
                    received: { name, email, message }
                })
            };
        }

        console.log('Connecting to database...');
        let pool;
        try {
            // Create a new connection pool using environment variables
            pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false // Required for some PostgreSQL providers
                }
            });
            
            console.log('Database connection pool created');
            
            // Test the connection with a simple query
            try {
                const testResult = await pool.query('SELECT NOW()');
                console.log('Database connection test successful:', testResult.rows[0]);
                
                // Check if the contacts table exists
                const tableCheck = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'contacts'
                    )`);
                console.log('Contacts table exists:', tableCheck.rows[0].exists);
                
                if (!tableCheck.rows[0].exists) {
                    throw new Error('Contacts table does not exist in the database');
                }
            } catch (testError) {
                console.error('Database test failed:', testError);
                throw new Error(`Database test failed: ${testError.message}`);
            }

            // Insert the form data into the database
            const query = `
                INSERT INTO contacts (name, email, message)
                VALUES ($1, $2, $3)
                RETURNING id, created_at
            `;
            
            const values = [name, email, message];
            console.log('Executing query with values:', values);
            
            const result = await pool.query(query, values);
            console.log('Query result:', result.rows[0]);

            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    success: true,
                    message: 'Message sent successfully!',
                    id: result.rows[0].id,
                    created_at: result.rows[0].created_at
                })
            };

        } catch (dbError) {
            console.error('Database error:', dbError);
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: 'Database operation failed',
                    details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
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

    } catch (error) {
        console.error('Unexpected error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to process your message',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};
