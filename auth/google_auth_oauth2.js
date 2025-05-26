const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
);

exports.handler = async (event) => {
    console.log('process.env.GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID);
    console.log('process.env.GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET);
    console.log('process.env.GOOGLE_REDIRECT_URI', process.env.GOOGLE_REDIRECT_URI);

    // Common CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      'Access-Control-Allow-Credentials': true
    };

    try {
        // Log the incoming event
        console.log('Event:', JSON.stringify(event, null, 2));
        const code = event?.queryStringParameters?.code;
        console.log('code');

        if (!code) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing code parameter' }),
            };
        }

        // const { tokens } = await oauth2Client.getToken(code)
        const { tokens } = await oauth2Client.getToken({code, redirect_uri: process.env.GOOGLE_REDIRECT_URI})
        console.log('tokens', tokens);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2',
        });
        const { data: user } = await oauth2.userinfo.get();

        console.log('user', user);

        const redirectUrl = `http://localhost:3000?name=${encodeURIComponent(
        user.name
        )}&email=${encodeURIComponent(user.email)}&picture=${encodeURIComponent(user.picture)}`;

        return {
            statusCode: 302,
            headers: {
                Location: redirectUrl,
                ...corsHeaders,
            },
            body: JSON.stringify({ message: "Redirecting..." }), 
        };
        // return {
        //     statusCode: 200,
        //     headers: corsHeaders,
        //     body: JSON.stringify({code: code}),
        // };
    } catch (error) {
        console.error('OAuth error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Internal server error',
                error: error.message
            })
        };
    }
};
