const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

exports.handler = async (event) => {
  // Common CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Access-Control-Allow-Credentials': true
  };

  try {
    // Log the incoming event
    const code = event?.queryStringParameters?.code;

    if (!code) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing code parameter' }),
      };
    }

    const { res, tokens } = await client.getToken({ code })
    console.log('_tokens', tokens);
    console.log('_res', res);
    client.setCredentials(tokens);

    // Get user info from Google using the access token
    const userInfoResponse = await client.request({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });
    console.log('_userInfoResponse', userInfoResponse);


    const user = {
      ...userInfoResponse.data
    };

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


// const { google } = require('googleapis');
// const oauth2Client = new google.auth.OAuth2(
//     process.env.GOOGLE_CLIENT_ID,
//     process.env.GOOGLE_CLIENT_SECRET,
//     process.env.GOOGLE_REDIRECT_URI,
// );

// exports.handler = async (event) => {
//     // Common CORS headers
//     const corsHeaders = {
//       'Access-Control-Allow-Origin': 'http://localhost:3000',
//       'Access-Control-Allow-Headers': 'Content-Type,Authorization',
//       'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
//       'Access-Control-Allow-Credentials': true
//     };

//     try {
//         const code = event?.queryStringParameters?.code;

//         if (!code) {
//             return {
//                 statusCode: 400,
//                 headers: corsHeaders,
//                 body: JSON.stringify({ message: 'Missing code parameter' }),
//             };
//         }

//         const { tokens } = await oauth2Client.getToken({code, redirect_uri: process.env.GOOGLE_REDIRECT_URI})
//         console.log('tokens', tokens);
//         oauth2Client.setCredentials(tokens);

//         const oauth2 = google.oauth2({
//             auth: oauth2Client,
//             version: 'v2',
//         });
//         const { data: user } = await oauth2.userinfo.get();
//         console.log('user', user);

//         const redirectUrl = `http://localhost:3000?name=${encodeURIComponent(
//         user.name
//         )}&email=${encodeURIComponent(user.email)}&picture=${encodeURIComponent(user.picture)}`;

//         return {
//             statusCode: 302,
//             headers: {
//                 Location: redirectUrl,
//                 ...corsHeaders,
//             },
//             body: JSON.stringify({ message: "Redirecting..." }),
//         };
//     } catch (error) {
//         console.error('OAuth error:', error);
//         return {
//             statusCode: 500,
//             headers: corsHeaders,
//             body: JSON.stringify({
//                 message: 'Internal server error',
//                 error: error.message
//             })
//         };
//     }
// };
