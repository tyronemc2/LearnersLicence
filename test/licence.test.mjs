import assert from 'node:assert/strict';
import test from 'node:test';
import {
  betaMastery,
  buildProgressSummary,
  getThresholdRate,
  OFFICIAL_PRACTICE_RULE_SET,
  scoreAttempt,
  topicPriority
} from '../dist/domain/licence.js';

test('uses the official-practice sectional thresholds', () => {
  assert.equal(OFFICIAL_PRACTICE_RULE_SET.durationSeconds, 3600);
  assert.equal(OFFICIAL_PRACTICE_RULE_SET.rulesQuestions, 28);
  assert.equal(OFFICIAL_PRACTICE_RULE_SET.signsQuestions, 28);
  assert.equal(OFFICIAL_PRACTICE_RULE_SET.controlsQuestions, 8);
  assert.equal(getThresholdRate('rules'), 22 / 28);
  assert.equal(getThresholdRate('signs'), 23 / 28);
  assert.equal(getThresholdRate('controls'), 6 / 8);
});

test('requires every section to pass for a simulated pass', () => {
  assert.equal(scoreAttempt({ rules: 22, signs: 23, controls: 6 }).passedSimulated, true);
  assert.equal(scoreAttempt({ rules: 21, signs: 28, controls: 8 }).passedSimulated, false);
});

test('bases overall readiness on the weakest section', () => {
  const summary = buildProgressSummary('B', { rules: 22 / 28, signs: 23 / 28, controls: 0.5 });
  assert.equal(summary.overallReadiness, 67);
});

test('calculates mastery and remediation priority', () => {
  assert.equal(betaMastery({ attempted: 10, correct: 8 }), 9 / 12);
  assert.equal(topicPriority(0.6, 0.8, 0.5, 0.25), 0.265);
});
