import { licenceFamilies } from './data/licenceFamilies.js';
import { buildProgressSummary, DrivingCodeFamily, OfficialDomain, OFFICIAL_PRACTICE_RULE_SET, scoreAttempt } from './domain/licence.js';

const sectionLabels: Record<OfficialDomain, string> = {
  rules: 'Rules of the road',
  signs: 'Road signs and markings',
  controls: 'Vehicle controls'
};

const sampleQuestions = [
  {
    id: 'sample-rules-1',
    officialDomain: 'rules' as const,
    stem: 'At an intersection, what should you do when another vehicle has right of way?',
    correctOptionId: 'a',
    options: [
      { id: 'a', label: 'A', body: 'Yield and proceed only when it is safe.' },
      { id: 'b', label: 'B', body: 'Accelerate so you clear the intersection first.' },
      { id: 'c', label: 'C', body: 'Stop in the middle of the intersection.' }
    ]
  },
  {
    id: 'sample-signs-1',
    officialDomain: 'signs' as const,
    stem: 'What does a triangular warning sign generally tell you?',
    correctOptionId: 'b',
    options: [
      { id: 'a', label: 'A', body: 'A parking instruction.' },
      { id: 'b', label: 'B', body: 'A hazard or condition ahead.' },
      { id: 'c', label: 'C', body: 'A vehicle control inside the car.' }
    ]
  },
  {
    id: 'sample-controls-1',
    officialDomain: 'controls' as const,
    stem: 'Which control is normally used to slow or stop a vehicle?',
    correctOptionId: 'c',
    options: [
      { id: 'a', label: 'A', body: 'Accelerator.' },
      { id: 'b', label: 'B', body: 'Indicator stalk.' },
      { id: 'c', label: 'C', body: 'Brake pedal.' }
    ]
  }
];

let selectedFamily: DrivingCodeFamily = 'B';
let currentQuestionIndex = 0;
const answersByQuestionId: Record<string, string | undefined> = {};
const flaggedQuestionIds = new Set<string>();
let statusMessage = 'Choose a code family, then start a full mock or weak-area drill.';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char] ?? char);
}

function renderFamilySelector() {
  return licenceFamilies.map((family) => `
    <button
      class="family-card ${family.drivingCodeFamily === selectedFamily ? 'selected' : ''}"
      type="button"
      data-family="${family.drivingCodeFamily}"
      aria-pressed="${family.drivingCodeFamily === selectedFamily}"
    >
      <span>${family.drivingCodeFamily}</span>
      <strong>${escapeHtml(family.displayName)}</strong>
      <small>LL1 class ${family.learnerClass} · minimum age ${family.minLearnerAge}</small>
      <em>${escapeHtml(family.vehicleScope)}</em>
    </button>
  `).join('');
}

function renderDashboard() {
  const selected = licenceFamilies.find((family) => family.drivingCodeFamily === selectedFamily) ?? licenceFamilies[2];
  const summary = buildProgressSummary(selectedFamily, { rules: 0.72, signs: 0.78, controls: 0.88 }, selected.ruleSet);

  const sections = (['rules', 'signs', 'controls'] as const).map((domain) => {
    const section = summary.sections[domain];
    const percent = Math.round(section.accuracy * 100);
    const threshold = Math.round(section.thresholdRate * 100);

    return `
      <article class="readiness-card">
        <div>
          <h3>${sectionLabels[domain]}</h3>
          <p>Current accuracy ${percent}% · threshold marker ${threshold}%</p>
        </div>
        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
          <span style="width: ${Math.min(100, percent)}%"></span>
          <i style="left: ${threshold}%" aria-hidden="true"></i>
        </div>
      </article>
    `;
  }).join('');

  const weakTopics = summary.weakTopics.map((topic) => `
    <article>
      <div>
        <strong>${escapeHtml(topic.name)}</strong>
        <p>Priority score ${Math.round(topic.priority * 100)}%</p>
      </div>
      <button type="button" data-drill="${escapeHtml(topic.slug)}">Practise</button>
    </article>
  `).join('');

  return `
    <section class="panel dashboard" aria-labelledby="dashboard-title">
      <div class="section-heading">
        <p class="eyebrow">Selected code family: ${summary.licenceFamily}</p>
        <h2 id="dashboard-title">Readiness dashboard</h2>
        <p>Your overall readiness is the lowest of the three section readiness scores, matching the official-style sectional pass condition.</p>
      </div>
      <div class="readiness-score" aria-label="Overall readiness ${summary.overallReadiness}%">
        <span>${summary.overallReadiness}%</span>
        <small>overall readiness</small>
      </div>
      <div class="readiness-grid">${sections}</div>
      <div class="actions" aria-label="Practice actions">
        <button type="button" data-full-mock>Start full mock</button>
        <button type="button" class="secondary" data-drill="${summary.weakTopics[0]?.slug ?? ''}">Do a weak-area drill</button>
      </div>
      <section class="weak-areas" aria-labelledby="weak-areas-title">
        <h3 id="weak-areas-title">Areas to work on</h3>
        ${weakTopics}
      </section>
    </section>
  `;
}

function renderSelectedMetadata() {
  const selected = licenceFamilies.find((family) => family.drivingCodeFamily === selectedFamily) ?? licenceFamilies[2];

  return `
    <section class="panel code-summary" aria-labelledby="selected-code-title">
      <p class="eyebrow">Selected metadata</p>
      <h2 id="selected-code-title">${escapeHtml(selected.displayName)}</h2>
      <dl>
        <div><dt>Driving code family</dt><dd>${selected.drivingCodeFamily}</dd></div>
        <div><dt>LL1 learner class</dt><dd>${selected.learnerClass}</dd></div>
        <div><dt>Minimum learner age</dt><dd>${selected.minLearnerAge}</dd></div>
        <div><dt>Rule-set version</dt><dd>${selected.ruleSet.version}</dd></div>
      </dl>
      <p>${escapeHtml(selected.jurisdictionNote)}</p>
    </section>
  `;
}

function getDemoScore() {
  const correctByDomain: Record<OfficialDomain, number> = { rules: 0, signs: 0, controls: 0 };
  sampleQuestions.forEach((question) => {
    if (answersByQuestionId[question.id] === question.correctOptionId) {
      correctByDomain[question.officialDomain] += 1;
    }
  });

  return scoreAttempt(correctByDomain, {
    ...OFFICIAL_PRACTICE_RULE_SET,
    rulesQuestions: 1,
    signsQuestions: 1,
    controlsQuestions: 1,
    passRules: 1,
    passSigns: 1,
    passControls: 1
  });
}

function renderRunner() {
  const current = sampleQuestions[currentQuestionIndex];
  const score = getDemoScore();
  const options = current.options.map((option) => `
    <button
      class="answer ${answersByQuestionId[current.id] === option.id ? 'selected' : ''}"
      type="button"
      data-answer="${option.id}"
      aria-pressed="${answersByQuestionId[current.id] === option.id}"
    >
      <strong>${option.label}</strong>
      <span>${escapeHtml(option.body)}</span>
    </button>
  `).join('');

  return `
    <section class="panel runner" aria-labelledby="runner-title">
      <div class="attempt-header">
        <div>
          <p class="eyebrow">Sample accessible runner</p>
          <h2 id="runner-title">Official-practice structure</h2>
        </div>
        <div class="timer" aria-label="Practice mode duration">60 min · 68 questions</div>
      </div>
      <div class="quota-tracker" aria-label="Official question quotas">
        <span>Rules 28 / pass 22</span>
        <span>Signs 28 / pass 23</span>
        <span>Controls 8 / pass 6</span>
      </div>
      <article class="question-card">
        <span class="domain-badge">${current.officialDomain}</span>
        <h3>${escapeHtml(current.stem)}</h3>
        <div class="options" role="group" aria-label="Answer options">${options}</div>
      </article>
      <footer class="attempt-nav">
        <button type="button" data-nav="previous">Previous</button>
        <button type="button" data-flag>${flaggedQuestionIds.has(current.id) ? 'Unflag' : 'Flag'}</button>
        <button type="button" data-nav="next">Next</button>
      </footer>
      <div class="simulated-result" aria-live="polite">
        <strong>${score.passedSimulated ? 'Simulated pass' : 'Keep practising'}</strong>
        <span>Demo readiness: ${score.overallReadiness}%</span>
      </div>
    </section>
  `;
}

function render() {
  const root = document.querySelector<HTMLDivElement>('#root');
  if (!root) return;

  root.innerHTML = `
    <main class="app-shell">
      <section class="hero" aria-labelledby="page-title">
        <div>
          <p class="eyebrow">South African learner's licence preparation</p>
          <h1 id="page-title">Practise with official-style sections, not official-test claims.</h1>
          <p>A mobile-first PWA starter that models LL1 learner classes, driving code families, sectional pass thresholds, and remediation-first learning flows.</p>
        </div>
        <div class="hero-card" aria-label="Official practice mode summary">
          <strong>Official practice mode</strong>
          <span>68 questions · 1 hour</span>
          <span>22/28 rules · 23/28 signs · 6/8 controls</span>
        </div>
      </section>
      <aside class="disclaimer" aria-label="Legal disclaimer">
        <strong>Practice platform only.</strong> This app does not issue, book, invigilate or certify an official South African learner's licence test. Official applications and examinations remain with a driving licence testing centre.
      </aside>
      <section class="panel" aria-labelledby="code-family-title">
        <div class="section-heading">
          <p class="eyebrow">Normalised South African categories</p>
          <h2 id="code-family-title">Choose your learner code family</h2>
        </div>
        <div class="family-grid">${renderFamilySelector()}</div>
      </section>
      ${renderSelectedMetadata()}
      ${renderDashboard()}
      <p class="status" role="status">${escapeHtml(statusMessage)}</p>
      ${renderRunner()}
    </main>
  `;

  root.querySelectorAll<HTMLButtonElement>('[data-family]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedFamily = button.dataset.family as DrivingCodeFamily;
      render();
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-drill]').forEach((button) => {
    button.addEventListener('click', () => {
      statusMessage = `Weak-area drill queued for ${button.dataset.drill || 'the top priority topic'}.`;
      render();
    });
  });

  root.querySelector<HTMLButtonElement>('[data-full-mock]')?.addEventListener('click', () => {
    statusMessage = 'Full mock queued using the 28 / 28 / 8 section quotas.';
    render();
  });

  root.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      answersByQuestionId[sampleQuestions[currentQuestionIndex].id] = button.dataset.answer;
      render();
    });
  });

  root.querySelector<HTMLButtonElement>('[data-nav="previous"]')?.addEventListener('click', () => {
    currentQuestionIndex = Math.max(0, currentQuestionIndex - 1);
    render();
  });

  root.querySelector<HTMLButtonElement>('[data-nav="next"]')?.addEventListener('click', () => {
    currentQuestionIndex = Math.min(sampleQuestions.length - 1, currentQuestionIndex + 1);
    render();
  });

  root.querySelector<HTMLButtonElement>('[data-flag]')?.addEventListener('click', () => {
    const questionId = sampleQuestions[currentQuestionIndex].id;
    if (flaggedQuestionIds.has(questionId)) {
      flaggedQuestionIds.delete(questionId);
    } else {
      flaggedQuestionIds.add(questionId);
    }
    render();
  });
}

render();
