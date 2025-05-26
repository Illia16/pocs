const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Common CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Access-Control-Allow-Credentials': true
};

exports.handler = async (event) => {
    // Debug log for environment variables
    console.log('Environment variables:', {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        JWT_SECRET: process.env.JWT_SECRET
    });

    try {
        // Handle preflight requests for all endpoints
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({})
            };
        }

        // Handle token verification
        if (event.path === '/auth/google_gis/verify' && event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { token } = body;

            if (!token) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Token is required' })
                };
            }

            try {
                // Verify the JWT token
                jwt.verify(token, process.env.JWT_SECRET);
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({ valid: true })
                };
            } catch (error) {
                return {
                    statusCode: 401,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Invalid or expired token' })
                };
            }
        }

        // Handle Google authentication
        if (event.path === '/auth/google_gis' && event.httpMethod === 'POST') {
            const authHeader = event.headers.Authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Authorization header with Bearer token is required' })
                };
            }

            const token = authHeader.split('Bearer ')[1];

            // Verify the token
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();

            // Create a session token
            const sessionToken = jwt.sign(
                {
                    sub: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    picture: payload.picture
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    sessionToken,
                    user: {
                        name: payload.name,
                        email: payload.email,
                        picture: payload.picture
                    }
                })
            };
        }

        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
