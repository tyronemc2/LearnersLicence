import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type OfficialDomain = 'rules' | 'signs' | 'controls';
type DrivingCodeFamily = 'A1' | 'A' | 'B' | 'EB' | 'C1' | 'C' | 'EC1' | 'EC';

const quotas: Record<OfficialDomain, number> = {
  rules: 28,
  signs: 28,
  controls: 8
};

const validFamilies = new Set(['A1', 'A', 'B', 'EB', 'C1', 'C', 'EC1', 'EC']);

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase environment variables' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const licenceFamily = body.licenceFamily as DrivingCodeFamily;

  if (!validFamilies.has(licenceFamily)) {
    return jsonResponse({ error: 'Invalid licence family' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: attempt, error: attemptError } = await admin
    .from('attempts')
    .insert({
      user_id: authData.user.id,
      licence_family: licenceFamily,
      mode: 'full_mock',
      status: 'in_progress'
    })
    .select('id, started_at, licence_family')
    .single();

  if (attemptError || !attempt) {
    return jsonResponse({ error: attemptError?.message ?? 'Could not create attempt' }, 500);
  }

  const selectedQuestions = [];

  for (const domain of Object.keys(quotas) as OfficialDomain[]) {
    const { data, error } = await admin
      .from('questions')
      .select('id, official_domain, stem, option_a, option_b, option_c')
      .eq('active', true)
      .eq('licence_family', licenceFamily)
      .eq('official_domain', domain);

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    const chosen = shuffle(data ?? []).slice(0, quotas[domain]);

    if (chosen.length < quotas[domain]) {
      return jsonResponse({
        error: `Not enough ${domain} questions for ${licenceFamily}. Required ${quotas[domain]}, found ${chosen.length}.`
      }, 400);
    }

    selectedQuestions.push(...chosen);
  }

  const attemptQuestionRows = selectedQuestions.map((question, index) => ({
    attempt_id: attempt.id,
    question_id: question.id,
    position: index + 1,
    official_domain: question.official_domain
  }));

  const { error: attemptQuestionsError } = await admin
    .from('attempt_questions')
    .insert(attemptQuestionRows);

  if (attemptQuestionsError) {
    return jsonResponse({ error: attemptQuestionsError.message }, 500);
  }

  return jsonResponse({
    attemptId: attempt.id,
    licenceFamily: attempt.licence_family,
    startedAt: attempt.started_at,
    durationSeconds: 3600,
    questions: selectedQuestions.map((question, index) => ({
      id: question.id,
      position: index + 1,
      officialDomain: question.official_domain,
      stem: question.stem,
      options: [
        { id: 'a', label: 'A', body: question.option_a },
        { id: 'b', label: 'B', body: question.option_b },
        { id: 'c', label: 'C', body: question.option_c }
      ]
    }))
  });
});
