export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: {
    id: string;
    email?: string;
  };
}

export interface RuntimeSupabaseConfig {
  url: string;
  anonKey: string;
}

type InvokeOptions = {
  body?: unknown;
  token?: string;
};

const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const SESSION_STORAGE_KEY = 'learners.supabase.session';

function getConfig(): RuntimeSupabaseConfig | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_PROJECT_REF')) {
    return null;
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
  };
}

function getStoredSession(): SupabaseSession | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SupabaseSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function storeSession(session: SupabaseSession | null) {
  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

async function supabaseFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const config = getConfig();
  if (!config) {
    throw new Error('Supabase is not configured. Update src/lib/supabaseClient.ts with your project URL and anon key.');
  }

  const response = await fetch(`${config.url}${path}`, {
    ...options,
    headers: {
      apikey: config.anonKey,
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || 'Supabase request failed';
    throw new Error(message);
  }

  return payload as T;
}

export const supabaseRuntime = {
  isConfigured() {
    return Boolean(getConfig());
  },

  getSession() {
    return getStoredSession();
  },

  getAccessToken() {
    return getStoredSession()?.access_token;
  },

  async signUp(email: string, password: string) {
    const session = await supabaseFetch<SupabaseSession>('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (session.access_token) {
      storeSession(session);
    }

    return session;
  },

  async signIn(email: string, password: string) {
    const session = await supabaseFetch<SupabaseSession>('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    storeSession(session);
    return session;
  },

  async signOut() {
    const token = this.getAccessToken();

    try {
      if (token) {
        await supabaseFetch('/auth/v1/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } finally {
      storeSession(null);
    }
  },

  async invoke<T>(functionName: string, { body, token }: InvokeOptions = {}) {
    const config = getConfig();
    const accessToken = token ?? this.getAccessToken();

    if (!config) {
      throw new Error('Supabase is not configured. Update src/lib/supabaseClient.ts with your project URL and anon key.');
    }

    if (!accessToken) {
      throw new Error('Please sign in before starting a full mock test.');
    }

    const response = await fetch(`${config.url}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body ?? {})
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || `${functionName} failed`);
    }

    return payload as T;
  }
};
