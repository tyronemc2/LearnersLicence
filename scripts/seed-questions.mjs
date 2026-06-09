import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { familiesByLearnerClass } from '../supabase/seed/families.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};

  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getEnv() {
  return { ...loadDotEnv(path.join(projectRoot, '.env')), ...process.env };
}

function chunk(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function loadQuestionBank() {
  const modulePath = path.join(projectRoot, 'supabase', 'seed', 'question-bank.mjs');
  return import(pathToFileURL(modulePath).href);
}

async function main() {
  const env = getEnv();
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const { questionsByLearnerClass } = await loadQuestionBank();
  const rows = [];

  for (const [learnerClass, questions] of Object.entries(questionsByLearnerClass)) {
    const families = familiesByLearnerClass[learnerClass];
    if (!families) {
      throw new Error(`No licence families mapped for learner class ${learnerClass}`);
    }

    for (const family of families) {
      for (const question of questions) {
        rows.push({
          licence_family: family,
          learner_class: learnerClass,
          official_domain: question.official_domain,
          topic_slug: question.topic_slug,
          stem: question.stem,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          correct_option: question.correct_option,
          explanation: question.explanation ?? null,
          source_reference: question.source_reference ?? 'practice-original-v1',
          active: true
        });
      }
    }
  }

  const existingResponse = await fetch(`${supabaseUrl}/rest/v1/questions?select=id&limit=1`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (!existingResponse.ok) {
    const body = await existingResponse.text();
    throw new Error(`Could not read questions table: ${body}`);
  }

  const existing = await existingResponse.json();
  if (existing.length > 0) {
    console.error('Questions table is not empty. Delete existing rows first if you want to reseed.');
    console.error('SQL: truncate table public.attempt_answers, public.attempt_questions, public.attempts, public.questions cascade;');
    process.exit(1);
  }

  console.log(`Inserting ${rows.length} questions...`);

  for (const batch of chunk(rows, 100)) {
    const response = await fetch(`${supabaseUrl}/rest/v1/questions`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(batch)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Insert failed: ${body}`);
    }
  }

  for (const family of Object.values(familiesByLearnerClass).flat()) {
    for (const domain of ['rules', 'signs', 'controls']) {
      const countResponse = await fetch(
        `${supabaseUrl}/rest/v1/questions?select=id&licence_family=eq.${family}&official_domain=eq.${domain}&active=eq.true`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Prefer: 'count=exact',
            Range: '0-0'
          }
        }
      );

      const range = countResponse.headers.get('content-range') ?? '*/0';
      const count = range.split('/')[1] ?? '?';
      console.log(`${family} / ${domain}: ${count} active questions`);
    }
  }

  console.log('Seed complete.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
