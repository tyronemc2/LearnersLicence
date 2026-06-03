import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type OfficialDomain = 'rules' | 'signs' | 'controls';

const totals: Record<OfficialDomain, number> = {
  rules: 28,
  signs: 28,
  controls: 8
};

const passMarks: Record<OfficialDomain, number> = {
  rules: 22,
  signs: 23,
  controls: 6
};

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
  const attemptId = body.attemptId as string;
  const answers = body.answers as Array<{
    questionId: string;
    selectedOption: 'a' | 'b' | 'c';
    timeSeconds?: number;
    flagged?: boolean;
  }>;

  if (!attemptId || !Array.isArray(answers)) {
    return jsonResponse({ error: 'Missing attemptId or answers' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: attempt, error: attemptError } = await admin
    .from('attempts')
    .select('id, user_id, status')
    .eq('id', attemptId)
    .single();

  if (attemptError || !attempt) {
    return jsonResponse({ error: 'Attempt not found' }, 404);
  }

  if (attempt.user_id !== authData.user.id) {
    return jsonResponse({ error: 'Attempt does not belong to user' }, 403);
  }

  if (attempt.status !== 'in_progress') {
    return jsonResponse({ error: 'Attempt already submitted or closed' }, 400);
  }

  const { data: attemptQuestions, error: questionsError } = await admin
    .from('attempt_questions')
    .select('question_id, official_domain, questions(correct_option)')
    .eq('attempt_id', attemptId);

  if (questionsError || !attemptQuestions) {
    return jsonResponse({ error: questionsError?.message ?? 'Could not load attempt questions' }, 500);
  }

  const allowedQuestionIds = new Set(attemptQuestions.map((row) => row.question_id));
  const questionMap = new Map(attemptQuestions.map((row) => {
    const question = row.questions as unknown as { correct_option: string };
    return [row.question_id, {
      domain: row.official_domain as OfficialDomain,
      correctOption: question.correct_option
    }];
  }));

  const cleanAnswers = answers.filter((answer) =>
    allowedQuestionIds.has(answer.questionId) && ['a', 'b', 'c'].includes(answer.selectedOption)
  );

  if (cleanAnswers.length !== 68) {
    return jsonResponse({ error: `Full mock requires 68 answers. Received ${cleanAnswers.length}.` }, 400);
  }

  const scoreByDomain: Record<OfficialDomain, number> = {
    rules: 0,
    signs: 0,
    controls: 0
  };

  const answerRows = cleanAnswers.map((answer) => {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      throw new Error(`Question ${answer.questionId} is not part of this attempt.`);
    }

    const isCorrect = answer.selectedOption === question.correctOption;
    if (isCorrect) {
      scoreByDomain[question.domain] += 1;
    }

    return {
      attempt_id: attemptId,
      question_id: answer.questionId,
      selected_option: answer.selectedOption,
      is_correct: isCorrect,
      time_seconds: answer.timeSeconds ?? null,
      flagged: answer.flagged ?? false
    };
  });

  const { error: answersError } = await admin
    .from('attempt_answers')
    .upsert(answerRows, { onConflict: 'attempt_id,question_id' });

  if (answersError) {
    return jsonResponse({ error: answersError.message }, 500);
  }

  const passedSimulated =
    scoreByDomain.rules >= passMarks.rules &&
    scoreByDomain.signs >= passMarks.signs &&
    scoreByDomain.controls >= passMarks.controls;

  const readinessByDomain = (['rules', 'signs', 'controls'] as OfficialDomain[]).map((domain) => {
    const thresholdRate = passMarks[domain] / totals[domain];
    const actualRate = scoreByDomain[domain] / totals[domain];
    return Math.min(1, actualRate / thresholdRate);
  });

  const overallReadiness = Math.round(100 * Math.min(...readinessByDomain));

  const { error: updateError } = await admin
    .from('attempts')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      score_rules: scoreByDomain.rules,
      score_signs: scoreByDomain.signs,
      score_controls: scoreByDomain.controls,
      passed_simulated: passedSimulated,
      overall_readiness: overallReadiness
    })
    .eq('id', attemptId);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  return jsonResponse({
    attemptId,
    passedSimulated,
    overallReadiness,
    sections: {
      rules: { correct: scoreByDomain.rules, total: 28, passMark: 22, passed: scoreByDomain.rules >= 22 },
      signs: { correct: scoreByDomain.signs, total: 28, passMark: 23, passed: scoreByDomain.signs >= 23 },
      controls: { correct: scoreByDomain.controls, total: 8, passMark: 6, passed: scoreByDomain.controls >= 6 }
    }
  });
});
