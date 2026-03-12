const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID') || 'YOUR_DISCORD_CLIENT_ID';
const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET') || 'YOUR_DISCORD_CLIENT_SECRET';
const DISCORD_REDIRECT_URI = Deno.env.get('DISCORD_REDIRECT_URI') || 'http://localhost:8000/auth/discord/callback';

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';

interface SessionData {
  status: 'pending' | 'complete' | 'error';
  state: string;
  user?: UserSession['user'];
  sessionToken?: string;
  error?: string;
}

interface UserSession {
  user: {
    id: string;
    username: string;
    avatar: string;
    email: string;
  };
}

// In-memory OAuth flow store keyed by sessionId (short-lived, cleared after poll)
const sessions = new Map<string, SessionData>();

// In-memory auth session store keyed by sessionToken (long-lived, persists while server runs)
const userSessions = new Map<string, UserSession>();

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Validates the Authorization: Bearer <token> header and returns the session, or null.
// Use this in every protected route you add.
function requireAuth(req: Request): UserSession | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return userSessions.get(token) ?? null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }


  // GET /auth/discord/callback
  // Discord redirects the user here after they authorize. The API handles the full token exchange.
  if (req.method === 'GET' && url.pathname === '/auth/discord/callback') {
    const code = url.searchParams.get('code');
    const rawState = url.searchParams.get('state');

    const failPage = (message: string) =>
      new Response(
        `<!DOCTYPE html><html><head><title>Pulsar</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:40px">
          <h2>&#10007; ${message}</h2><p>You can close this tab.</p>
        </body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } },
      );

    if (!code || !rawState) {
      return failPage('Authorization failed.');
    }

    // State format: "sessionId:state"
    const colonIndex = rawState.indexOf(':');
    const sessionId = rawState.substring(0, colonIndex);
    const state = rawState.substring(colonIndex + 1);
    const session = sessions.get(sessionId);

    if (!session || session.state !== state) {
      return failPage('Invalid state. Possible CSRF attempt.');
    }

    try {
      // Exchange authorization code for access token
      const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: DISCORD_REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
      }

      const { access_token } = await tokenResponse.json();

      // Fetch Discord user profile
      const userResponse = await fetch(DISCORD_USER_URL, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user: ${userResponse.statusText}`);
      }

      const userData = await userResponse.json();
      console.log(`User ${userData.username} (${userData.id}) authenticated`);

      // TODO: Persist user to your database here
      // e.g. await db.upsert('users', { id: userData.id, username: userData.username, ... })

      const sessionToken = generateRandomString(48);
      const user = {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar,
        email: userData.email,
      };

      userSessions.set(sessionToken, { user });

      session.status = 'complete';
      session.user = user;
      session.sessionToken = sessionToken;
    }
    catch (error) {
      console.error('Callback error:', error);
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
    }

    const success = session.status === 'complete';
    return new Response(
      `<!DOCTYPE html><html><head><title>Pulsar</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>${success ? '&#10003; Logged in! You can close this tab.' : '&#10007; Login failed. You can close this tab.'}</h2>
        <script>setTimeout(() => window.close(), 2000);</script>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // GET /auth/discord/status?sessionId=...
  // Extension polls this until status is 'complete' or 'error'
  if (req.method === 'GET' && url.pathname === '/auth/discord/status') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      return jsonResponse({ error: 'Missing sessionId' }, 400);
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return jsonResponse({ error: 'Session not found' }, 404);
    }

    if (session.status === 'complete') {
      const { user, sessionToken } = session;
      sessions.delete(sessionId);
      return jsonResponse({ status: 'complete', user, sessionToken });
    }

    if (session.status === 'error') {
      sessions.delete(sessionId);
      return jsonResponse({ status: 'error', error: session.error });
    }

    return jsonResponse({ status: 'pending' });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

// Example of a protected route — duplicate this pattern for future APIs:
//   const session = requireAuth(req);
//   if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);

console.log('Starting API server on http://localhost:8000');
console.log('  GET  /auth/discord/start    — initiate OAuth flow');
console.log('  GET  /auth/discord/callback — Discord redirect target');
console.log('  GET  /auth/discord/status   — poll for completion');

Deno.serve({ port: 8000 }, handler);
