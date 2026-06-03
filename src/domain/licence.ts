export type LearnerClass = '1' | '2' | '3';
export type OfficialDomain = 'rules' | 'signs' | 'controls';
export type AttemptMode = 'full_mock' | 'topic_drill' | 'adaptive_drill';
export type DrivingCodeFamily = 'A1' | 'A' | 'B' | 'EB' | 'C1' | 'C' | 'EC1' | 'EC';

export interface RuleSet {
  id: string;
  version: string;
  learnerClass: LearnerClass;
  durationSeconds: number;
  rulesQuestions: number;
  signsQuestions: number;
  controlsQuestions: number;
  passRules: number;
  passSigns: number;
  passControls: number;
}

export interface LicenceFamily {
  drivingCodeFamily: DrivingCodeFamily;
  learnerClass: LearnerClass;
  displayName: string;
  minLearnerAge: number;
  vehicleScope: string;
  jurisdictionNote: string;
  ruleSet: RuleSet;
}

export interface SectionScore {
  correct: number;
  total: number;
  passMark: number;
}

export interface AttemptScore {
  passedSimulated: boolean;
  overallReadiness: number;
  sectionScores: Record<OfficialDomain, SectionScore>;
}

export interface MasteryStats {
  attempted: number;
  correct: number;
  recentAttempted: number;
  recentCorrect: number;
  avgTimeSeconds: number;
}

export interface ProgressSection {
  accuracy: number;
  thresholdRate: number;
  readiness: number;
}

export interface ProgressSummary {
  licenceFamily: DrivingCodeFamily;
  overallReadiness: number;
  sections: Record<OfficialDomain, ProgressSection>;
  weakTopics: Array<{
    slug: string;
    name: string;
    priority: number;
  }>;
}

export const OFFICIAL_PRACTICE_RULE_SET: RuleSet = {
  id: 'sa-learner-official-practice-2026',
  version: 'sa-learner-2026-01',
  learnerClass: '2',
  durationSeconds: 3_600,
  rulesQuestions: 28,
  signsQuestions: 28,
  controlsQuestions: 8,
  passRules: 22,
  passSigns: 23,
  passControls: 6
};

export function getThresholdRate(domain: OfficialDomain, ruleSet: RuleSet = OFFICIAL_PRACTICE_RULE_SET) {
  switch (domain) {
    case 'rules':
      return ruleSet.passRules / ruleSet.rulesQuestions;
    case 'signs':
      return ruleSet.passSigns / ruleSet.signsQuestions;
    case 'controls':
      return ruleSet.passControls / ruleSet.controlsQuestions;
  }
}

export function scoreAttempt(
  correctByDomain: Record<OfficialDomain, number>,
  ruleSet: RuleSet = OFFICIAL_PRACTICE_RULE_SET
): AttemptScore {
  const sectionScores: Record<OfficialDomain, SectionScore> = {
    rules: { correct: correctByDomain.rules, total: ruleSet.rulesQuestions, passMark: ruleSet.passRules },
    signs: { correct: correctByDomain.signs, total: ruleSet.signsQuestions, passMark: ruleSet.passSigns },
    controls: { correct: correctByDomain.controls, total: ruleSet.controlsQuestions, passMark: ruleSet.passControls }
  };

  const readiness = (Object.keys(sectionScores) as OfficialDomain[]).map((domain) => {
    const section = sectionScores[domain];
    return Math.min(1, section.correct / section.total / getThresholdRate(domain, ruleSet));
  });

  return {
    sectionScores,
    passedSimulated: sectionScores.rules.correct >= ruleSet.passRules &&
      sectionScores.signs.correct >= ruleSet.passSigns &&
      sectionScores.controls.correct >= ruleSet.passControls,
    overallReadiness: Math.round(100 * Math.min(...readiness))
  };
}

export function betaMastery({ attempted, correct }: Pick<MasteryStats, 'attempted' | 'correct'>) {
  const safeAttempted = Math.max(attempted, correct, 0);
  const alpha = 1 + Math.max(correct, 0);
  const beta = 1 + Math.max(safeAttempted - correct, 0);
  return alpha / (alpha + beta);
}

export function topicPriority(mastery: number, thresholdRate: number, recentWrongRate: number, speedPenalty: number) {
  const deficit = Math.max(0, thresholdRate - mastery);
  return Number((deficit * 0.7 + recentWrongRate * 0.2 + speedPenalty * 0.1).toFixed(3));
}

export function buildProgressSummary(
  licenceFamily: DrivingCodeFamily,
  accuracies: Record<OfficialDomain, number>,
  ruleSet: RuleSet = OFFICIAL_PRACTICE_RULE_SET
): ProgressSummary {
  const sections = (['rules', 'signs', 'controls'] as const).reduce<Record<OfficialDomain, ProgressSection>>(
    (acc, domain) => {
      const thresholdRate = getThresholdRate(domain, ruleSet);
      acc[domain] = {
        accuracy: accuracies[domain],
        thresholdRate,
        readiness: Math.min(1, accuracies[domain] / thresholdRate)
      };
      return acc;
    },
    {} as Record<OfficialDomain, ProgressSection>
  );

  return {
    licenceFamily,
    sections,
    overallReadiness: Math.round(100 * Math.min(sections.rules.readiness, sections.signs.readiness, sections.controls.readiness)),
    weakTopics: [
      {
        slug: 'intersections-right-of-way',
        name: 'Intersections and right of way',
        priority: topicPriority(betaMastery({ attempted: 12, correct: 7 }), sections.rules.thresholdRate, 0.35, 0.1)
      },
      {
        slug: 'road-sign-shapes',
        name: 'Road sign shapes and meanings',
        priority: topicPriority(betaMastery({ attempted: 16, correct: 11 }), sections.signs.thresholdRate, 0.25, 0.05)
      }
    ].sort((a, b) => b.priority - a.priority)
  };
}
