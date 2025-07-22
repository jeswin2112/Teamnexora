const { Pool } = require('pg');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // Parse the request body
        const { name, email, message } = JSON.parse(event.body);

        // Validate input
        if (!name || !email || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Name, email, and message are required' })
            };
        }

        // Create a new connection pool using environment variables
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false // Required for some PostgreSQL providers
            }
        });

        // Insert the form data into the database
        const query = `
            INSERT INTO contacts (name, email, message)
            VALUES ($1, $2, $3)
            RETURNING id, created_at
        `;
        
        const values = [name, email, message];
        const result = await pool.query(query, values);

        // Release the client back to the pool
        await pool.end();

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: 'Message sent successfully!',
                id: result.rows[0].id,
                created_at: result.rows[0].created_at
            })
        };

    } catch (error) {
        console.error('Database error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to process your message',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};
