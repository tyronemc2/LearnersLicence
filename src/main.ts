import { licenceFamilies } from './data/licenceFamilies.js';
import {
  buildProgressSummary,
  DrivingCodeFamily,
  OfficialDomain,
  OFFICIAL_PRACTICE_RULE_SET,
  scoreAttempt
} from './domain/licence.js';
import {
  ExamQuestion,
  formatPhoneForDisplay,
  StartFullMockResponse,
  SubmitAttemptResponse,
  supabaseRuntime
} from './lib/supabaseClient.js';

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

type AppView = 'home' | 'exam';
type AuthStep = 'phone' | 'otp';

let selectedFamily: DrivingCodeFamily = 'B';
let currentQuestionIndex = 0;
const answersByQuestionId: Record<string, string | undefined> = {};
const flaggedQuestionIds = new Set<string>();
let statusMessage = 'Choose a code family, then start a full mock or weak-area drill.';
let appView: AppView = 'home';
let showAuthModal = false;
let authStep: AuthStep = 'phone';
let isLoading = false;
let activeAttempt: StartFullMockResponse | null = null;
let examQuestions: ExamQuestion[] = [];
let submitResult: SubmitAttemptResponse | null = null;
let examEndsAt: number | null = null;
let authErrorMessage = '';
let authFormPhone = '';
let authFormOtp = '';
let pendingAuthPhone = '';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char] ?? char);
}

function getSignedInPhone() {
  const phone = supabaseRuntime.getSession()?.user?.phone;
  return phone ? formatPhoneForDisplay(phone) : null;
}

function formatRemainingTime() {
  if (!examEndsAt) return '60 min · 64 questions';

  const remainingSeconds = Math.max(0, Math.floor((examEndsAt - Date.now()) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
}

function resetExamState() {
  activeAttempt = null;
  examQuestions = [];
  submitResult = null;
  examEndsAt = null;
  currentQuestionIndex = 0;
  Object.keys(answersByQuestionId).forEach((key) => delete answersByQuestionId[key]);
  flaggedQuestionIds.clear();
  appView = 'home';
}

function renderFamilySelector() {
  return licenceFamilies.map((family) => `
    <button
      class="family-card ${family.drivingCodeFamily === selectedFamily ? 'selected' : ''}"
      type="button"
      data-family="${family.drivingCodeFamily}"
      aria-pressed="${family.drivingCodeFamily === selectedFamily}"
      ${appView === 'exam' ? 'disabled' : ''}
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

  const signedInPhone = getSignedInPhone();

  return `
    <section class="panel dashboard" aria-labelledby="dashboard-title">
      <div class="section-heading">
        <p class="eyebrow">Selected code family: ${summary.licenceFamily}</p>
        <h2 id="dashboard-title">Readiness dashboard</h2>
        <p>Your overall readiness is the lowest of the three section readiness scores, matching the official-style sectional pass condition.</p>
      </div>
      ${signedInPhone ? `
        <p class="signed-in" aria-live="polite">
          Signed in as <strong>${escapeHtml(signedInPhone)}</strong>
          <button type="button" class="link-button" data-sign-out>Sign out</button>
        </p>
      ` : `
        <p class="signed-out">
          Sign in with your mobile number to save full mock attempts and track progress.
          <button type="button" class="link-button" data-open-auth>Sign in</button>
        </p>
      `}
      <div class="readiness-score" aria-label="Overall readiness ${summary.overallReadiness}%">
        <span>${summary.overallReadiness}%</span>
        <small>overall readiness</small>
      </div>
      <div class="readiness-grid">${sections}</div>
      <div class="actions" aria-label="Practice actions">
        <button type="button" data-full-mock ${isLoading ? 'disabled' : ''}>
          ${isLoading ? 'Starting full mock…' : 'Start full mock'}
        </button>
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

function renderExamRunner() {
  if (appView !== 'exam' || examQuestions.length === 0) {
    return '';
  }

  const current = examQuestions[currentQuestionIndex];
  const answeredCount = examQuestions.filter((question) => answersByQuestionId[question.id]).length;
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

  const resultMarkup = submitResult ? `
    <div class="simulated-result ${submitResult.passedSimulated ? 'passed' : 'failed'}" aria-live="polite">
      <strong>${submitResult.passedSimulated ? 'Simulated pass' : 'Keep practising'}</strong>
      <span>Readiness: ${submitResult.overallReadiness}% · Rules ${submitResult.sections.rules.correct}/${submitResult.sections.rules.total} · Signs ${submitResult.sections.signs.correct}/${submitResult.sections.signs.total} · Controls ${submitResult.sections.controls.correct}/${submitResult.sections.controls.total}</span>
    </div>
  ` : `
    <div class="simulated-result" aria-live="polite">
      <strong>${answeredCount} of ${examQuestions.length} answered</strong>
      <span>Answer every question before submitting.</span>
    </div>
  `;

  return `
    <section class="panel runner exam-runner" aria-labelledby="runner-title">
      <div class="attempt-header">
        <div>
          <p class="eyebrow">Full mock exam</p>
          <h2 id="runner-title">Code family ${escapeHtml(activeAttempt?.licenceFamily ?? selectedFamily)}</h2>
        </div>
        <div class="timer" aria-label="Exam timer">${formatRemainingTime()}</div>
      </div>
      <div class="quota-tracker" aria-label="Official question quotas">
        <span>Rules 28 / pass 22</span>
        <span>Signs 28 / pass 23</span>
        <span>Controls 8 / pass 6</span>
      </div>
      <p class="question-progress">Question ${current.position} of ${examQuestions.length}</p>
      <article class="question-card">
        <span class="domain-badge">${current.officialDomain}</span>
        <h3>${escapeHtml(current.stem)}</h3>
        <div class="options" role="group" aria-label="Answer options">${options}</div>
      </article>
      <footer class="attempt-nav">
        <button type="button" data-nav="previous" ${currentQuestionIndex === 0 ? 'disabled' : ''}>Previous</button>
        <button type="button" data-flag>${flaggedQuestionIds.has(current.id) ? 'Unflag' : 'Flag'}</button>
        <button type="button" data-nav="next" ${currentQuestionIndex >= examQuestions.length - 1 ? 'disabled' : ''}>Next</button>
        ${submitResult ? `
          <button type="button" data-exit-exam>Back to dashboard</button>
        ` : `
          <button type="button" data-submit-exam ${answeredCount < examQuestions.length || isLoading ? 'disabled' : ''}>
            ${isLoading ? 'Submitting…' : 'Submit exam'}
          </button>
        `}
      </footer>
      ${resultMarkup}
    </section>
  `;
}

function renderSampleRunner() {
  if (appView === 'exam') {
    return '';
  }

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
    <section class="panel runner" aria-labelledby="sample-runner-title">
      <div class="attempt-header">
        <div>
          <p class="eyebrow">Sample accessible runner</p>
          <h2 id="sample-runner-title">Official-practice structure</h2>
        </div>
        <div class="timer" aria-label="Practice mode duration">60 min · 64 questions</div>
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

function openAuthModal() {
  showAuthModal = true;
  authStep = 'phone';
  authErrorMessage = '';
  authFormOtp = '';
  pendingAuthPhone = '';
  statusMessage = 'Sign in with your mobile number to start your full mock exam.';
  render();
}

function renderAuthModalLayer() {
  const modalRoot = document.getElementById('auth-modal-root');
  if (!modalRoot) {
    return;
  }

  document.body.style.overflow = showAuthModal ? 'hidden' : '';

  if (!showAuthModal) {
    modalRoot.innerHTML = '';
    return;
  }

  const phoneStep = authStep === 'phone';
  const displayPhone = pendingAuthPhone ? formatPhoneForDisplay(pendingAuthPhone) : '';

  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-close-auth>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" class="modal-close" aria-label="Close sign-in dialog">×</button>
        <p class="eyebrow">Full mock exam</p>
        <h2 id="auth-title">${phoneStep ? 'Sign in with your mobile' : 'Enter SMS code'}</h2>
        <p>${phoneStep
    ? `We'll send a one-time code to your mobile number to start the timed 64-question mock for code family ${selectedFamily}.`
    : `Enter the 6-digit code sent to ${escapeHtml(displayPhone)}.`}</p>
        ${authErrorMessage ? `<p class="auth-error" role="alert">${escapeHtml(authErrorMessage)}</p>` : ''}
        ${phoneStep ? `
          <form class="auth-form" data-phone-form>
            <label>
              Mobile number
              <input
                type="tel"
                name="phone"
                inputmode="tel"
                autocomplete="tel"
                placeholder="082 123 4567"
                value="${escapeHtml(authFormPhone)}"
                required
              />
            </label>
            <button type="submit" ${isLoading ? 'disabled' : ''}>
              ${isLoading ? 'Sending code…' : 'Send SMS code'}
            </button>
          </form>
        ` : `
          <form class="auth-form" data-otp-form>
            <label>
              SMS code
              <input
                type="text"
                name="otp"
                inputmode="numeric"
                autocomplete="one-time-code"
                pattern="[0-9]{6}"
                maxlength="6"
                placeholder="123456"
                value="${escapeHtml(authFormOtp)}"
                required
              />
            </label>
            <button type="submit" ${isLoading ? 'disabled' : ''}>
              ${isLoading ? 'Verifying…' : 'Verify and start mock'}
            </button>
            <button type="button" class="link-button auth-back" data-change-phone ${isLoading ? 'disabled' : ''}>
              Use a different number
            </button>
          </form>
        `}
      </section>
    </div>
  `;

  bindModalEvents(modalRoot);
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
          <span>64 questions · 1 hour</span>
          <span>22/28 rules · 23/28 signs · 6/8 controls</span>
        </div>
      </section>
      <aside class="disclaimer" aria-label="Legal disclaimer">
        <strong>Practice platform only.</strong> This app does not issue, book, invigilate or certify an official South African learner's licence test. Official applications and examinations remain with a driving licence testing centre.
      </aside>
      ${appView === 'home' ? `
        <section class="panel" aria-labelledby="code-family-title">
          <div class="section-heading">
            <p class="eyebrow">Normalised South African categories</p>
            <h2 id="code-family-title">Choose your learner code family</h2>
          </div>
          <div class="family-grid">${renderFamilySelector()}</div>
        </section>
        ${renderSelectedMetadata()}
        ${renderDashboard()}
      ` : ''}
      <p class="status ${statusMessage.toLowerCase().includes('error') || statusMessage.toLowerCase().includes('could not') ? 'error' : ''}" role="status">${escapeHtml(statusMessage)}</p>
      ${renderExamRunner()}
      ${renderSampleRunner()}
    </main>
  `;

  bindEvents(root);
  renderAuthModalLayer();
}

async function startFullMock() {
  if (!supabaseRuntime.isConfigured()) {
    statusMessage = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env on the server, then run npm run build.';
    render();
    return;
  }

  if (!supabaseRuntime.getAccessToken()) {
    openAuthModal();
    return;
  }

  isLoading = true;
  statusMessage = `Starting full mock for code family ${selectedFamily}…`;
  render();

  try {
    const attempt = await supabaseRuntime.startFullMock(selectedFamily);
    activeAttempt = attempt;
    examQuestions = attempt.questions;
    examEndsAt = Date.now() + attempt.durationSeconds * 1000;
    currentQuestionIndex = 0;
    submitResult = null;
    appView = 'exam';
    statusMessage = `Full mock started. ${attempt.questions.length} questions loaded.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start full mock.';
    if (message.toLowerCase().includes('not authenticated') || message.toLowerCase().includes('sign in')) {
      openAuthModal();
      statusMessage = 'Your session expired. Sign in again to start the full mock.';
    } else {
      statusMessage = message;
    }
  } finally {
    isLoading = false;
    render();
  }
}

async function handleSendPhoneOtp(form: HTMLFormElement) {
  const phone = (form.elements.namedItem('phone') as HTMLInputElement).value.trim();
  authFormPhone = phone;

  if (!phone) {
    authErrorMessage = 'Enter your mobile number to continue.';
    render();
    return;
  }

  isLoading = true;
  authErrorMessage = '';
  statusMessage = 'Sending SMS code…';
  render();

  try {
    pendingAuthPhone = await supabaseRuntime.sendPhoneOtp(phone);
    authStep = 'otp';
    authFormOtp = '';
    statusMessage = `SMS code sent to ${formatPhoneForDisplay(pendingAuthPhone)}.`;
  } catch (error) {
    authErrorMessage = error instanceof Error ? error.message : 'Could not send SMS code.';
    statusMessage = authErrorMessage;
  } finally {
    isLoading = false;
    render();
  }
}

async function handleVerifyPhoneOtp(form: HTMLFormElement) {
  const otp = (form.elements.namedItem('otp') as HTMLInputElement).value.trim();
  authFormOtp = otp;

  if (!pendingAuthPhone) {
    authStep = 'phone';
    authErrorMessage = 'Enter your mobile number again to receive a new code.';
    render();
    return;
  }

  if (!otp) {
    authErrorMessage = 'Enter the 6-digit SMS code.';
    render();
    return;
  }

  isLoading = true;
  authErrorMessage = '';
  statusMessage = 'Verifying SMS code…';
  render();

  try {
    await supabaseRuntime.verifyPhoneOtp(pendingAuthPhone, otp);
    showAuthModal = false;
    authErrorMessage = '';
    authFormOtp = '';
    isLoading = false;
    await startFullMock();
  } catch (error) {
    isLoading = false;
    authErrorMessage = error instanceof Error ? error.message : 'Authentication failed.';
    statusMessage = authErrorMessage;
    render();
  }
}

async function submitExam() {
  if (!activeAttempt || examQuestions.length === 0 || submitResult || isLoading) {
    return;
  }

  const unanswered = examQuestions.filter((question) => !answersByQuestionId[question.id]);
  if (unanswered.length > 0) {
    statusMessage = `Answer all questions before submitting. ${unanswered.length} remaining.`;
    render();
    return;
  }

  isLoading = true;
  statusMessage = 'Submitting your full mock attempt…';
  render();

  try {
    submitResult = await supabaseRuntime.submitAttempt(
      activeAttempt.attemptId,
      examQuestions.map((question) => ({
        questionId: question.id,
        selectedOption: answersByQuestionId[question.id] as 'a' | 'b' | 'c',
        flagged: flaggedQuestionIds.has(question.id)
      }))
    );
    statusMessage = submitResult.passedSimulated
      ? 'Full mock submitted. Simulated pass achieved.'
      : 'Full mock submitted. Review your sectional scores below.';
  } catch (error) {
    statusMessage = error instanceof Error ? error.message : 'Could not submit your attempt.';
  } finally {
    isLoading = false;
    render();
  }
}

function bindModalEvents(modalRoot: HTMLElement) {
  modalRoot.querySelector<HTMLFormElement>('[data-phone-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void handleSendPhoneOtp(event.currentTarget as HTMLFormElement);
  });

  modalRoot.querySelector<HTMLFormElement>('[data-otp-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void handleVerifyPhoneOtp(event.currentTarget as HTMLFormElement);
  });

  modalRoot.querySelector<HTMLButtonElement>('[data-change-phone]')?.addEventListener('click', () => {
    authStep = 'phone';
    authErrorMessage = '';
    authFormOtp = '';
    pendingAuthPhone = '';
    render();
  });

  modalRoot.querySelector<HTMLElement>('[data-close-auth]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      showAuthModal = false;
      render();
    }
  });

  modalRoot.querySelector<HTMLButtonElement>('.modal-close')?.addEventListener('click', () => {
    showAuthModal = false;
    render();
  });

  modalRoot.querySelector<HTMLElement>('.modal')?.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  if (authStep === 'phone') {
    modalRoot.querySelector<HTMLInputElement>('input[name="phone"]')?.focus();
  } else {
    modalRoot.querySelector<HTMLInputElement>('input[name="otp"]')?.focus();
  }
}

function bindEvents(root: HTMLElement) {
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
    void startFullMock();
  });

  root.querySelector<HTMLButtonElement>('[data-open-auth]')?.addEventListener('click', () => {
    if (!supabaseRuntime.isConfigured()) {
      statusMessage = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env on the server, then run npm run build.';
      render();
      return;
    }
    openAuthModal();
  });

  root.querySelector<HTMLButtonElement>('[data-sign-out]')?.addEventListener('click', () => {
    void supabaseRuntime.signOut().then(() => {
      resetExamState();
      statusMessage = 'Signed out.';
      render();
    });
  });

  root.querySelector<HTMLButtonElement>('[data-submit-exam]')?.addEventListener('click', () => {
    void submitExam();
  });

  root.querySelector<HTMLButtonElement>('[data-exit-exam]')?.addEventListener('click', () => {
    resetExamState();
    statusMessage = 'Returned to the dashboard.';
    render();
  });

  const activeQuestions = appView === 'exam' ? examQuestions : sampleQuestions;

  root.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      const question = activeQuestions[currentQuestionIndex];
      answersByQuestionId[question.id] = button.dataset.answer;
      render();
    });
  });

  root.querySelector<HTMLButtonElement>('[data-nav="previous"]')?.addEventListener('click', () => {
    currentQuestionIndex = Math.max(0, currentQuestionIndex - 1);
    render();
  });

  root.querySelector<HTMLButtonElement>('[data-nav="next"]')?.addEventListener('click', () => {
    currentQuestionIndex = Math.min(activeQuestions.length - 1, currentQuestionIndex + 1);
    render();
  });

  root.querySelector<HTMLButtonElement>('[data-flag]')?.addEventListener('click', () => {
    const questionId = activeQuestions[currentQuestionIndex].id;
    if (flaggedQuestionIds.has(questionId)) {
      flaggedQuestionIds.delete(questionId);
    } else {
      flaggedQuestionIds.add(questionId);
    }
    render();
  });
}

let timerHandle: number | undefined;

function startExamTimer() {
  if (timerHandle) {
    window.clearInterval(timerHandle);
  }

  timerHandle = window.setInterval(() => {
    if (appView === 'exam' && examEndsAt && !submitResult) {
      const timer = document.querySelector('.exam-runner .timer');
      if (timer) {
        timer.textContent = formatRemainingTime();
      }

      if (examEndsAt <= Date.now()) {
        statusMessage = 'Time is up. Submit your answers when ready.';
        render();
      }
    }
  }, 1000);
}

render();
startExamTimer();
