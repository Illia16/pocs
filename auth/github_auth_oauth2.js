exports.handler = async (event) => {
  // Common CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Access-Control-Allow-Credentials': true
  };

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;

  try {
    const code = event?.queryStringParameters?.code;

    if (!code) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing code parameter' }),
      };
    }

    // const { OAuthApp } = await import("@octokit/oauth-app");
    // const { Octokit } = await import("@octokit/rest");
    // // - Exchange code for access token
    // const app = new OAuthApp({
    //   clientType: "oauth-app",
    //   clientId: clientId,
    //   clientSecret: clientSecret,
    //   redirectUrl: redirectUri,
    // });

    // const { authentication } = await app.createToken({
    //   code: code,
    // });
    // console.log("Access token:", authentication.token);
    // // - Use token to get user info
    // const octokit = new Octokit({
    //   auth: authentication.token,
    // });

    // const userInfoRequest = await octokit.request('GET /user');
    // console.log('userInfoRequest', userInfoRequest);
    // const userInfo = userInfoRequest.data;
    // return {
    //   statusCode: 200,
    //   headers: corsHeaders,
    //   body: JSON.stringify({ message: userInfo })
    // }


    const endPoint = `https://github.com/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirectUri}`;
    const response = await fetch(endPoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
    });
    const data = await response.json();
    console.log('data', data);

    // Get user info from Google using the access token
    const userInfoResponse = await fetch('https://api.github.com/user', {
      // const userInfoResponse = await fetch('https://api.github.com/user/emails', { // use this if emails are hidden
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        // Accept: 'application/vnd.github+json'
      }
    });
    const userInfo = await userInfoResponse.json();
    console.log('userInfo', userInfo);

    const redirectUrl = `http://localhost:3000/github.html?name=${encodeURIComponent(
      userInfo.name
    )}&email=${encodeURIComponent(userInfo.email)}&picture=${encodeURIComponent(userInfo.avatar_url)}`;

    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl,
        ...corsHeaders,
      },
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