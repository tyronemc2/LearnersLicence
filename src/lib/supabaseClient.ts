export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: {
    id?: string;
    email?: string;
    phone?: string;
  };
}

export interface RuntimeSupabaseConfig {
  url: string;
  anonKey: string;
}

export interface ExamQuestion {
  id: string;
  position: number;
  officialDomain: 'rules' | 'signs' | 'controls';
  stem: string;
  options: Array<{ id: string; label: string; body: string }>;
}

export interface StartFullMockResponse {
  attemptId: string;
  licenceFamily: string;
  startedAt: string;
  durationSeconds: number;
  questions: ExamQuestion[];
}

export interface SubmitAttemptResponse {
  attemptId: string;
  passedSimulated: boolean;
  overallReadiness: number;
  sections: Record<'rules' | 'signs' | 'controls', {
    correct: number;
    total: number;
    passMark: number;
    passed: boolean;
  }>;
}

type InvokeOptions = {
  body?: unknown;
  token?: string;
};

declare global {
  interface Window {
    __SUPABASE_CONFIG__?: RuntimeSupabaseConfig;
  }
}

const DEFAULT_SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const SESSION_STORAGE_KEY = 'learners.supabase.session';

function getConfig(): RuntimeSupabaseConfig | null {
  const runtime = typeof window !== 'undefined' ? window.__SUPABASE_CONFIG__ : undefined;
  const url = runtime?.url ?? DEFAULT_SUPABASE_URL;
  const anonKey = runtime?.anonKey ?? DEFAULT_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes('YOUR_PROJECT_REF') || anonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
    return null;
  }

  return { url, anonKey };
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

export function normalizeSouthAfricanPhone(input: string) {
  const digits = input.replace(/\D/g, '');

  if (digits.startsWith('27') && digits.length === 11) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+27${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `+27${digits}`;
  }

  throw new Error('Enter a valid South African mobile number, e.g. 082 123 4567.');
}

export function formatPhoneForDisplay(phone: string) {
  const normalized = phone.startsWith('+') ? phone : normalizeSouthAfricanPhone(phone);
  const digits = normalized.replace(/\D/g, '');

  if (digits.length !== 11 || !digits.startsWith('27')) {
    return phone;
  }

  return `0${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

function formatAuthError(payload: Record<string, unknown>, fallback: string) {
  const errorCode = String(payload.error_code ?? payload.code ?? '').toLowerCase();
  const message = String(
    payload.msg
    ?? payload.message
    ?? payload.error_description
    ?? payload.error
    ?? fallback
  );
  const lowerMessage = message.toLowerCase();

  if (errorCode === 'otp_expired' || lowerMessage.includes('otp has expired')) {
    return 'That code has expired. Request a new SMS code and try again.';
  }

  if (errorCode === 'otp_disabled' || lowerMessage.includes('otp disabled')) {
    return 'Phone sign-in is not enabled in Supabase yet. Enable Phone auth and configure an SMS provider.';
  }

  if (
    errorCode === 'invalid_otp'
    || lowerMessage.includes('invalid otp')
    || lowerMessage.includes('token has expired or is invalid')
  ) {
    return 'That code is incorrect. Check the SMS and try again.';
  }

  if (lowerMessage.includes('invalid phone')) {
    return 'Enter a valid mobile number in South African format, e.g. 082 123 4567.';
  }

  if (lowerMessage.includes('sms send failed') || lowerMessage.includes('phone provider')) {
    return 'Could not send the SMS. Check your Supabase phone/SMS provider settings.';
  }

  return message;
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

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(formatAuthError(payload, 'Supabase request failed'));
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

  async sendPhoneOtp(phone: string) {
    const normalizedPhone = normalizeSouthAfricanPhone(phone);

    await supabaseFetch('/auth/v1/otp', {
      method: 'POST',
      body: JSON.stringify({
        phone: normalizedPhone,
        create_user: true
      })
    });

    return normalizedPhone;
  },

  async verifyPhoneOtp(phone: string, token: string) {
    const normalizedPhone = normalizeSouthAfricanPhone(phone);
    const session = await supabaseFetch<SupabaseSession>('/auth/v1/verify', {
      method: 'POST',
      body: JSON.stringify({
        type: 'sms',
        phone: normalizedPhone,
        token: token.trim()
      })
    });

    if (!session.access_token) {
      throw new Error('Sign in failed. Check the SMS code and try again.');
    }

    storeSession({
      ...session,
      user: {
        ...session.user,
        phone: session.user?.phone ?? normalizedPhone
      }
    });

    return session;
  },

  async startFullMock(licenceFamily: string) {
    return this.invoke<StartFullMockResponse>('start-full-mock', {
      body: { licenceFamily }
    });
  },

  async submitAttempt(attemptId: string, answers: Array<{
    questionId: string;
    selectedOption: 'a' | 'b' | 'c';
    flagged?: boolean;
  }>) {
    return this.invoke<SubmitAttemptResponse>('submit-attempt', {
      body: { attemptId, answers }
    });
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
