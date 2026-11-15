/* Automation Foundations v2 – concise, visual, layered. Synthesised from 80 documents (see foundations-src.js). */
(() => {
const S = window.FOUND_SRC || {};
window.FOUND = {
  title: 'Test Automation Foundations',
  intro: 'Learn the **ideas once**, then pick up any framework. Short text, one picture per idea, every claim traced to a source. Start with the big picture, then dive into any layer.',
  sources: S,
  hero: {
    type: 'layers', title: 'The big picture – six layers of a healthy automation practice', arrow: 'informs ▼',
    layers: [
      {name: '1 · Strategy', owns: 'Why automate, what to automate, test shape (pyramid / trophy / honeycomb)', eg: 'Few broad tests, many fast ones'},
      {name: '2 · Test design', owns: 'Which cases matter: partitions, boundaries, rules, risk', eg: 'EP · BVA · decision tables'},
      {name: '3 · Framework architecture', owns: 'Test → flow → page/component → driver adapter → infra', eg: 'POM · Screenplay · fixtures'},
      {name: '4 · Tool & protocol', owns: 'How code drives a browser/device and who waits', eg: 'WebDriver · CDP · BiDi · Appium'},
      {name: '5 · Pipeline & scale', owns: 'When tests run, how they shard, how failures are reported', eg: 'Presubmit · shards · traces'},
      {name: '6 · Feedback & quality', owns: 'Flakes, metrics, production signals close the loop', eg: 'Quarantine · DORA · canaries'}
    ]
  },
  chapters: [
    {
      id: 'why', icon: '🎯', title: 'Why & what to automate', tag: 'Automate **checks**, keep **judgement** human.',
      points: [
        'Automation = fast feedback that replaces manual regression. DORA target: feedback in **under 10 minutes**.',
        'Developer-owned automated tests link to better delivery performance, stability and less burnout (DORA).',
        'Automate what you never want to break (Google\'s "Beyoncé Rule"): functionality, performance, accessibility, failure handling.',
        'Keep humans for usability, novel exploration and quality judgement. When a human finds a bug, automate it once.'
      ],
      visuals: [{
        type: 'compare', title: 'Automate vs keep manual',
        a: {t: 'Automate', items: ['Repeatable regression checks', 'Cross-browser / data matrices', 'Smoke after every deploy', 'Bugs that already escaped once']},
        b: {t: 'Keep human', items: ['Usability and look & feel', 'Exploratory sessions', 'One-off or very short-lived code', 'Record-and-playback as a whole strategy (rarely a good idea)']}
      }],
      callout: {kind: '', text: '**Cost side:** slow, flaky, brittle suites destroy trust. A small trusted suite beats a big one nobody believes. Measure ROI by bugs caught earlier, time spent fixing test failures, and the share of failures that are real defects.'},
      src: ['A17', 'A6', 'A19', 'A2', 'A8']
    },
    {
      id: 'shapes', icon: '🔺', title: 'Test shapes', tag: 'Pyramid, trophy, honeycomb – the **shape** matters less than the **rules** they share.',
      points: [
        'Pyramid (Cohn, 2009): many unit tests, fewer service tests, very few UI tests.',
        'Trophy (Dodds, 2018): static checks, then mostly integration tests – scoped to monoliths.',
        'Honeycomb (Spotify, 2018): for microservices, test mostly through the service boundary.',
        'Ice-cream cone (mostly UI/manual) is the anti-pattern: slow and brittle.'
      ],
      visuals: [
        {type: 'pyramid', title: 'Google\'s rule of thumb by count (not a law)', axis: ['▲ slower · flakier · costlier', '▼ faster · cheaper · more precise'],
          levels: [{name: 'E2E ≈ 5%', note: 'a few key journeys', w: 36, color: '#f87171'}, {name: 'Integration ≈ 15%', note: 'one integration point at a time', w: 62, color: '#fbbf24'}, {name: 'Unit ≈ 80%', note: 'thousands in minutes', w: 100, color: '#34d399'}]},
        {type: 'matrix', title: 'Which shape for which system', cols: ['Shape', 'Biggest layer', 'Best for', 'Source idea'],
          rows: [['Pyramid', 'Unit', 'Logic-heavy code', 'Cohn / Fowler'], ['Trophy', 'Integration', 'UI-heavy monolith, front end', 'Dodds'], ['Honeycomb', 'Integration (service edges)', 'Microservices', 'Spotify'], ['Hourglass', 'Unit + E2E, thin middle', '(anti-pattern) tight coupling', 'Google']]},
        {type: 'flow', title: '"Push it down" – the rule every shape agrees on', steps: [{t: 'Broad test fails', d: 'E2E or UI test goes red'}, {t: 'Does a lower test fail?', d: 'If not, the gap is below'}, {t: 'Add the lower-level test', d: 'Cheapest level that can catch it'}, {t: 'Delete the redundant top test', d: 'Keep few broad journeys'}]}
      ],
      callout: {kind: 'good', text: '**Reasoned take:** all shapes agree on (1) few broad E2E tests, (2) a fast deterministic bulk, (3) check each thing at the lowest level that can catch it. Percentages are rules of thumb; Fowler calls the shape debate largely **vocabulary** (solitary vs sociable tests).'},
      src: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A24']
    },
    {
      id: 'types', icon: '🧩', title: 'Test types & levels', tag: 'Separate **size** (resources) from **scope** (code covered).',
      points: [
        'Google: **small** = one process, no I/O or sleep; **medium** = several processes, localhost; **large** = multi-machine.',
        'A broad-scope test can still be small if dependencies are doubled.',
        'Config changes cause many outages and unit tests cannot see them – deploy-time smoke and probes cover that.'
      ],
      visuals: [{
        type: 'matrix', title: 'Test types at a glance', cols: ['Type', 'Checks', 'Typical speed', 'Owner / note'],
        rows: [['Unit', 'Public behaviour of one unit', 'ms', 'Test behaviour, not private methods'], ['Integration', 'One integration point (DB, queue, HTTP client)', 'ms–s', 'Needed wherever data is serialised'], ['Contract', 'Consumer expectations vs provider', 's', 'Replaces cross-team E2E'], ['Component / UI', 'Behaviour in the UI framework; layout by screenshot', 's', 'UI tests need not be E2E'], ['E2E', 'Key user journeys through the real stack', 's–min', 'Highest confidence, highest cost'], ['Non-functional', 'Performance, load, a11y, security, chaos', 'varies', 'Large tests, often post-merge'], ['Exploratory', 'What nobody scripted', 'manual', 'Automate what it finds']]
      }],
      callout: {kind: '', text: 'The **subcutaneous** test (API under the GUI) is the middle ground: most of the stack with far less flakiness than UI-driven E2E.'},
      src: ['A1', 'A6', 'A7', 'A8', 'A17']
    },
    {
      id: 'design', icon: '🧪', title: 'Test design techniques', tag: 'Choose **fewer, smarter** cases.',
      points: [
        'One condition per test, Arrange-Act-Assert, no logic in tests.',
        'Prefer readable (**DAMP**) tests over aggressive DRY helpers; only behaviour changes should force test edits.'
      ],
      visuals: [{
        type: 'matrix', title: 'Four techniques that cover most needs', cols: ['Technique', 'Idea', 'Example'],
        rows: [['Equivalence partitioning', 'Split inputs into classes that behave alike; test one of each', 'Age 18–65 → <18, 18–65, >65'], ['Boundary value analysis', 'Bugs live at the edges of comparisons', 'min, min+1, max-1, max (4n+1 cases)'], ['Decision table', 'Every combination of conditions → action', 'Discount rules: member × coupon × cart size'], ['Risk-based', 'Rank by likelihood × impact, spend effort there', 'Payment > profile avatar']],
        note: 'State-transition testing is a standard fifth technique; our sources only confirmed it from search snippets, so treat the detail as unverified.'
      }],
      src: ['A20', 'A21', 'A22', 'A1', 'A7']
    },
    {
      id: 'layers', icon: '🏗', title: 'Framework layers', tag: 'Each layer depends **only on the one below**; nothing calls upward.',
      points: [
        'No standard layer names exist. The classic split is Test / Business / Core; five layers is a refinement.',
        'Two rules define layering: **dependency direction** and **no upward calls**.',
        'WebDriver calls inside test methods are "doing it wrong" (Simon Stewart, via Fowler).',
        'The business layer can be skipped for small systems.'
      ],
      visuals: [
        {type: 'layers', title: 'A five-layer test framework', arrow: 'calls ▼ (never upward ▲)',
          layers: [
            {name: 'Test', owns: '**Intent and assertions.** Scenarios read like requirements.', eg: 'checkout.spec: "guest can pay by card"'},
            {name: 'Business flow', owns: '**System-specific actions.** Reusable steps.', eg: 'login(), addToCart() · Tasks · App Actions'},
            {name: 'Page / component', owns: '**How to find and use controls.** Hides widgetry, returns next page.', eg: 'CartPage, DatePicker'},
            {name: 'Driver adapter', owns: '**The only code that imports the tool.** Swappable.', eg: 'Playwright · Selenium · Appium (Abilities)'},
            {name: 'Infra', owns: '**Config, environments, test data, reporting, grid.**', eg: 'env files, fixtures, CI, Grid'}
          ]},
        {type: 'chain', title: 'Where Selenium puts the boundary', nodes: [{t: 'Test framework', s: 'JUnit, Cucumber…'}, {t: 'Language library', s: 'bindings'}, {t: 'Driver', s: 'chromedriver…'}, {t: 'Browser'}], links: ['assert / report', 'WebDriver API', 'HTTP'], note: 'WebDriver "has one job": talk to the browser. Assertions, reporting and structure belong to your framework.'}
      ],
      callout: {kind: 'warn', text: '**Do not** drive invalid-input and validation checks through the UI. Push them down to unit, service or integration level. The five-layer split above is our synthesis, not a quoted standard.'},
      src: ['B24', 'B1', 'B6', 'B4', 'B13']
    },
    {
      id: 'patterns', icon: '🧱', title: 'Design patterns', tag: 'Pick the pattern for the **pain** you have.',
      points: [
        'Page objects model meaningful UI parts (panels, components), not just whole pages.',
        'Evidence: in a 2013 study (Leotta et al.), a page-object suite was much faster to repair after an app upgrade.',
        'Open debate: should page objects contain assertions? Fowler says no by default; Playwright\'s own example does.'
      ],
      visuals: [{
        type: 'matrix', title: 'Pattern chooser', cols: ['Pattern', 'Hides', 'Pays off when', 'Cost / caveat'],
        rows: [['Page object', 'Locators and widget details', 'Many tests share screens', 'Can grow giant; keep components small'], ['Component object', 'One reusable widget', 'Same widget on many pages', 'More classes'], ['Screenplay', 'Tool behind Actor + Abilities', 'Same business flow over UI and API', 'More vocabulary to learn'], ['App actions', 'UI steps for setup', 'Setup-heavy tests (one report: ~4–5 s → ~1 s)', 'App must expose internals; single-author 2019 opinion'], ['Fixtures / DI', 'Setup and teardown', 'Shared state needs scoping', 'Pair with page objects']],
        note: 'Cypress docs advise against sharing page objects and promote app actions; Selenium, Playwright and Fowler endorse page objects. Both camps agree: keep tests readable.'
      }],
      src: ['B1', 'B4', 'B12', 'B13', 'B14', 'B18', 'B22', 'B15']
    },
    {
      id: 'locators', icon: '🎯', title: 'Locators & waiting', tag: 'Find elements like a **user**; let the tool **wait**.',
      points: [
        'Prefer what users perceive: role + name, label, text. Test ids when nothing else is stable. CSS/XPath last.',
        'Playwright locators re-resolve at each action; Selenium element references can go **stale**.',
        'Selenium: implicit wait defaults to 0; never mix implicit and explicit waits (total becomes unpredictable).',
        'Cypress: avoid fixed `cy.wait(number)`; wait on aliases or retrying assertions.'
      ],
      visuals: [
        {type: 'pyramid', title: 'Locator ladder – most to least stable (Playwright order)', axis: ['▲ prefer', '▼ last resort'],
          levels: [{name: 'role + name', note: 'getByRole("button", {name})', w: 40, color: '#34d399'}, {name: 'label / placeholder / text', note: 'what the user reads', w: 54, color: '#38d6ff'}, {name: 'test id', note: 'data-testid, data-cy', w: 68, color: '#fbbf24'}, {name: 'CSS', note: 'tied to markup', w: 84, color: '#fb923c'}, {name: 'XPath', note: 'long chains are bad practice', w: 100, color: '#f87171'}]},
        {type: 'flow', title: 'Auto-wait: what Playwright does before a click', steps: [{t: 'Resolve locator', d: 'Strict: more than one match throws'}, {t: 'Check', d: 'Visible · stable · receives events · enabled'}, {t: 'Pass?', d: 'Act. Fail: retry'}, {t: 'Timeout', d: 'TimeoutError with call log'}]}
      ],
      callout: {kind: 'warn', text: '`expect(await loc.isVisible())` does **not** retry. Use web-first assertions that poll until the condition holds. The #1 locator differs by camp: role-based (Playwright) vs `data-cy` (Cypress).'},
      src: ['B21', 'B3', 'B2', 'B14', 'B23', 'B10']
    },
    {
      id: 'protocols', icon: '🔌', title: 'How tools talk to browsers', tag: 'Same stack, different **wire** and different **owner of waiting**.',
      points: [
        '**WebDriver classic** (W3C): HTTP, one request = one command = one response.',
        '**CDP**: WebSocket JSON with events; experimental parts change without notice. Use via a library, not raw.',
        '**WebDriver BiDi**: WebSocket, adds browser-pushed events; spec is still a draft.',
        '**Cypress** runs test code inside the browser with a paired Node process.',
        '**Appium**: HTTP server speaking WebDriver, with a pluggable driver per platform.'
      ],
      visuals: [
        {type: 'chain', title: 'Selenium classic', nodes: [{t: 'Test'}, {t: 'Client lib'}, {t: 'Driver'}, {t: 'Browser'}], links: ['', 'HTTP / command', 'native']},
        {type: 'chain', title: 'Playwright / CDP / BiDi', nodes: [{t: 'Test'}, {t: 'Client'}, {t: 'Node server', s: 'actionability'}, {t: 'Browser'}], links: ['', 'WebSocket', 'CDP-like'], note: 'Playwright architecture detail comes from a secondary source; verify against its source before asserting.'},
        {type: 'chain', title: 'Cypress', nodes: [{t: 'Test code', s: 'in the browser'}, {t: 'Node side-car', s: 'files, video, OS'}], links: ['websocket']},
        {type: 'chain', title: 'Appium (mobile)', nodes: [{t: 'Test'}, {t: 'Appium server'}, {t: 'Driver', s: 'UiAutomator2 / XCUITest'}, {t: 'Device agent'}], links: ['HTTP', 'proxy', 'ADB / WDA']}
      ],
      callout: {kind: '', text: 'Hard limits to know up front: Cypress – one browser, one superdomain per test, no native events. UiAutomator2 – Android 8+. XCUITest – needs Xcode. No benchmark found for HTTP-per-command vs WebSocket latency, so treat speed claims as anecdotal.'},
      src: ['B10', 'B11', 'B17', 'B16', 'B5', 'B7', 'B8', 'B9', 'B19', 'B20', 'B6']
    },
    {
      id: 'flaky', icon: '🎲', title: 'Flaky tests', tag: 'Passes and fails on the **same code**. The real cost is lost trust.',
      points: [
        'Google (2016): ~16% of tests had flaked at least once; ~84% of pass-to-fail transitions were flakes.',
        'Spotify: just showing per-test flakiness in a table cut it from 6% to 4% in two months.',
        'Microsoft study: async calls were the top cause.',
        'Reruns trade CPU for engineer time and only delay the fix.'
      ],
      visuals: [
        {type: 'stats', title: 'Numbers (read the caveat)', items: [{n: '16%', l: 'of tests flaked at least once', s: 'Google, 2016'}, {n: '84%', l: 'of pass→fail transitions were flakes', s: 'Google, 2016'}, {n: '1.5%', l: 'of runs flaky (2016)', s: 'vs 0.15% in the later SWE book'}, {n: '6→4%', l: 'flakiness in two months', s: 'Spotify'}]},
        {type: 'matrix', title: 'Root cause → fix', cols: ['Cause', 'Fix'],
          rows: [['Shared state / order dependence', 'Fresh state per test; run in any order'], ['Async / timing / races', 'Poll for state, use auto-wait, never sleep'], ['Remote services', 'Doubles + periodic contract checks'], ['Clock / time', 'Inject the clock'], ['Resource leaks', 'Clean up, pool size 1, hermetic setup'], ['Environment / infra', 'Containers, consistent images, dashboards']]},
        {type: 'flow', title: 'Flake lifecycle', steps: [{t: 'Detect', d: 'Rerun or run-grid'}, {t: 'Tag + owner', d: 'A named team'}, {t: 'Quarantine', d: 'Out of the gate, still runs'}, {t: 'Fix', d: 'Root cause'}, {t: 'Verify', d: 'Rerun N times'}, {t: 'Re-gate', d: 'Back in the suite'}]}
      ],
      callout: {kind: 'warn', text: 'The 1.5% vs 0.15% difference is about units (runs vs tests) and year. Cite both. Retry-on-failure hides flakes; quarantine and fix is the real remedy.'},
      src: ['A9', 'A6', 'A10', 'A11', 'A12', 'C14', 'C1', 'B3']
    },
    {
      id: 'pipeline', icon: '🚦', title: 'CI/CD pipeline & scale', tag: 'Fast stages first; **shard** the slow ones.',
      points: [
        'Pipeline = stages ordered fast-first; the last stage is production.',
        'Fowler: commit build ≈ **10 min**; an hour-long build is unreasonable for most teams. Google: presubmit runs only fast, reliable tests.',
        'Promote one artifact unchanged through environments; do not rebuild per stage.',
        'Playwright suggests `workers=1` in CI for stability; scale by **sharding** across machines.'
      ],
      visuals: [
        {type: 'flow', title: 'Pipeline ladder (fast and cheap → slow and thorough)', steps: [{t: 'Local', d: 'seconds'}, {t: 'Commit / presubmit', d: '≤10 min: unit, narrow integration, lint'}, {t: 'PR / merge', d: 'contract tests, can-i-deploy, impacted E2E'}, {t: 'Post-submit / nightly', d: 'full E2E, cross-browser, perf'}, {t: 'Release candidate', d: 'same artifact, config tests'}, {t: 'Production', d: 'canary, probes, smoke'}]},
        {type: 'flow', title: 'Sharding flow', steps: [{t: 'Test list'}, {t: 'Shards 1/4 … 4/4', d: 'CI matrix, one job each'}, {t: 'Blob reports', d: 'per shard'}, {t: 'Merge job', d: 'needs all, runs even on failure'}, {t: 'One report + traces'}]},
        {type: 'compare', title: 'Shift-left vs shift-right', a: {t: '◀ Shift-left', items: ['Unit, contract, hermetic tests', 'Catch cheaply, before merge']}, b: {t: 'Shift-right ▶', items: ['Canary, probes, config and stress tests', 'Catch what only production shows']}}
      ],
      callout: {kind: '', text: 'Meta\'s predictive test selection runs about a third of dependency-matched tests while catching >99.9% of regressions – self-reported and needs large history. Playwright `--only-changed` is the small-suite version. Selenium Grid 4 splits into Router, Queue, Distributor, Nodes, Session Map and Event Bus.'},
      src: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C10', 'C12', 'C13', 'C18']
    },
    {
      id: 'data', icon: '🗄', title: 'Test data & environments', tag: 'Trade **speed** for **fidelity** deliberately.',
      points: [
        'A hermetic test is self-contained; failures then point at your change.',
        'Doubles drift from the real service. Pair them with contract tests.',
        'Testcontainers: throwaway real dependencies per run, instead of a shared environment that corrupts data.',
        'Mirror production in parity-critical places; mismatch usually costs more than parity.'
      ],
      visuals: [
        {type: 'pyramid', title: 'Dependency ladder – fidelity rises downward, speed rises upward', axis: ['▲ faster · deterministic', '▼ more realistic'],
          levels: [{name: 'Dummy / stub', note: 'canned answers', w: 34, color: '#34d399'}, {name: 'Fake / in-memory', note: 'working shortcut (H2)', w: 48, color: '#38d6ff'}, {name: 'Record / replay', note: 'risk of false pass/fail', w: 62, color: '#a78bfa'}, {name: 'Contract-verified double', note: 'checked against the real one', w: 76, color: '#fbbf24'}, {name: 'Testcontainers real dependency', note: 'disposable, per run', w: 90, color: '#fb923c'}, {name: 'Shared staging → production', note: 'slowest, shared state', w: 100, color: '#f87171'}]},
        {type: 'matrix', title: 'Double vocabulary', cols: ['Double', 'What it does'], rows: [['Dummy', 'Fills a parameter, never used'], ['Stub', 'Returns canned answers'], ['Fake', 'Working shortcut, e.g. in-memory database'], ['Spy', 'Records how it was called'], ['Mock', 'Pre-programmed with expectations']]}
      ],
      src: ['C1', 'C2', 'C8', 'C9', 'C15', 'C16', 'C17']
    },
    {
      id: 'api', icon: '🔗', title: 'API, contract & mobile', tag: 'Test below the UI; verify the **seams**.',
      points: [
        'Consumer-driven contracts: consumers write what they use, providers verify it in their own pipeline.',
        'Pact tests concrete examples ("contract by example"); an OpenAPI schema describes all states. They answer different questions.',
        '"Contract test" means different things: Fowler = check a double against the real service; Pact = verify on every build; Schemathesis = provider-only schema checks.',
        'Mobile: Appium drives native, web and desktop through one protocol; Detox is gray-box for React Native; Maestro uses YAML flows.'
      ],
      visuals: [
        {type: 'flow', title: 'Consumer-driven contract flow', steps: [{t: 'Consumer test', d: 'against a double'}, {t: 'Pact file', d: 'request/response examples'}, {t: 'Provider verifies', d: 'in provider CI'}, {t: 'can-i-deploy', d: 'gate by environment'}, {t: 'Break found before release'}]},
        {type: 'chain', title: 'Appium architecture', nodes: [{t: 'Test code'}, {t: 'Language client'}, {t: 'Appium server', s: 'core + plugins'}, {t: 'Driver', s: 'UiAutomator2 / XCUITest'}, {t: 'Device', s: 'emulator · real · cloud'}], links: ['', 'HTTP', 'proxy', 'native']}
      ],
      callout: {kind: '', text: 'Codepipes\' worked example (illustrative arithmetic, not measurement): 40 services with 10 unit (60 ms) + 2 integration (800 ms) tests each ≈ **1.4 min**, versus ≈ **6.4 min** with integration tests only. No source quantified emulator vs real-device differences.'},
      src: ['D1', 'D2', 'D3', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D20', 'C8', 'C9']
    },
    {
      id: 'bdd', icon: '🥒', title: 'BDD & keyword-driven', tag: 'BDD is a **collaboration** practice, not a test tool.',
      points: [
        'Three activities: **Discovery**, **Formulation** (Gherkin), **Automation**. Skip discovery and the rest adds little.',
        'Failure mode: Gherkin written after the code by a different role, as UI scripts.',
        'Gherkin smell test: will the wording change if the implementation changes? Then it is too imperative.',
        'Robot Framework: keyword-driven, tabular, Python libraries; Given/When/Then is supported.'
      ],
      visuals: [{type: 'flow', title: 'BDD loop', steps: [{t: 'Discovery', d: 'workshop, concrete examples'}, {t: 'Formulation', d: 'Gherkin, behaviour not UI'}, {t: 'Automation', d: 'red first, then implement'}]}],
      callout: {kind: 'warn', text: 'Every BDD source we read is tool-vendor affiliated; none gave measured defect or cost data. Judge it on your team\'s collaboration, not on tooling.'},
      src: ['D11', 'D12', 'D13', 'D14', 'D21']
    },
    {
      id: 'ai', icon: '🤖', title: 'AI-assisted testing', tag: 'Useful with **human gates**; numbers are company self-reports.',
      points: [
        'Meta TestGen-LLM: 75% of generated cases built, 57% passed reliably, 25% added coverage; 73% of test-a-thon recommendations accepted.',
        'Meta ACH (mutation-guided): 73% of 191 tests accepted in test-a-thons, but 49% of tests added no line coverage.',
        'An autonomous UI-repair case study documented assertion weakening and test deletion to "pass".',
        'Playwright agents: planner, generator, healer. Playwright MCP drives pages via accessibility-tree snapshots.'
      ],
      visuals: [
        {type: 'flow', title: 'Agent loop with human gates', steps: [{t: 'Seed test'}, {t: 'Planner', d: 'Markdown plan'}, {t: 'Generator', d: 'tests, verified live'}, {t: 'Healer', d: 'patch or skip'}, {t: 'Human review + CI', d: 'always'}]},
        {type: 'compare', title: 'Watch for', a: {t: 'Good fit', items: ['Extending existing human tests', 'Exploring and drafting', 'Mutation-guided hardening']}, b: {t: 'Red flags', items: ['Weakened assertions', 'Silently deleted or skipped tests', 'Healing onto the wrong element', 'Unreviewed generated code']}, bBad: true}
      ],
      callout: {kind: 'warn', text: 'All numbers come from Meta\'s Kotlin/Android code and one prototype read only as an abstract; do not generalise to web E2E. Self-healing and visual-AI claims had only vendor blog snippets, so we leave them out. Playwright MCP\'s own README says it is **not a security boundary**.'},
      src: ['D15', 'D16', 'D17', 'D18', 'D19']
    },
    {
      id: 'metrics', icon: '📈', title: 'Quality metrics', tag: 'Metrics inform; **targets** distort (Goodhart).',
      points: [
        'Coverage shows what ran, not what was verified. Use it to find gaps, not to mandate a number.',
        '**Mutation score** = (killed + timeout) / valid mutants × 100. Survivors mean the tests ran the code but missed the fault.',
        'DORA: five metrics, per service, not for team competition. Speed and stability correlate.'
      ],
      visuals: [{
        type: 'matrix', title: 'What to measure', cols: ['Metric', 'Tells you', 'Watch out'],
        rows: [['Feedback time', 'Can developers wait for it? (target <10 min)', 'Beck ≤10 min, others far stricter'], ['Line / branch coverage', 'Where tests never run', 'Fowler: <~50% is trouble, ~100% suspicious'], ['Mutation score', 'Whether tests would notice a bug', 'PIT speed claims are vendor marketing'], ['Flake rate', 'Trust in the suite', 'Define per test and per run'], ['Real-defect share of failures', 'Signal vs noise', 'Needs triage discipline'], ['DORA five', 'Delivery throughput and instability', 'Not targets; per service']]
      }],
      src: ['A13', 'A14', 'A15', 'A16', 'A17', 'A24', 'C18']
    },
    {
      id: 'learn', icon: '🧭', title: 'Learn any framework fast', tag: 'Seven questions map **any** tool onto the same stack.',
      points: [
        'Every tool fits the stack: your tests → runner → client library → protocol → driver/server → browser or device.',
        'Official "best practices" and "trade-offs" pages are the fastest way to a tool\'s worldview and limits.'
      ],
      visuals: [
        {type: 'flow', title: 'Ask these seven questions', steps: [{t: 'Where does test code run?', d: 'browser, client process, remote'}, {t: 'What wire?', d: 'HTTP, WebSocket, in-process'}, {t: 'Who owns waiting?', d: 'tool auto-wait or you'}, {t: 'How are elements found?', d: 'recommended locator order'}, {t: 'How is isolation provided?', d: 'context, fixture, session'}, {t: 'What are the hard limits?', d: 'tabs, origins, iframes, native'}, {t: 'Where are the extension seams?', d: 'fixtures, plugins, drivers'}]},
        {type: 'matrix', title: 'The same questions, two tools', cols: ['Question', 'Selenium', 'Playwright', 'Cypress'],
          rows: [['Runs where', 'Client process', 'Client + Node server', 'Inside the browser'], ['Wire', 'HTTP (+ BiDi)', 'WebSocket', 'WebSocket to Node side-car'], ['Waiting', 'You (explicit waits)', 'Auto-wait + retry', 'Retry-ability'], ['Isolation', 'Session', 'Browser context', 'Spec-level cleanup'], ['Limit', 'Stale elements', 'Experimental Electron', 'One superdomain per test']]}
      ],
      src: ['B5', 'B6', 'B9', 'B21', 'B22', 'B7', 'B2', 'B14']
    },
    {
      id: 'roadmap', icon: '🛤', title: 'Anti-patterns & roadmap', tag: 'Avoid the **known traps**; learn in a sensible order.',
      points: [
        'Codepipes lists 13 anti-patterns (unit-only, integration-only, testing internals, coverage obsession, flaky or slow tests, test code as a second-class citizen, not turning production bugs into tests, and more).',
        'Tests must run in any order and never rely on other tests (Selenium).',
        'Keep a reliable gating suite; isolate flaky tests in their own suite.'
      ],
      visuals: [
        {type: 'compare', title: 'Anti-patterns vs the fix', a: {t: 'Do', items: ['Push checks to the lowest level', 'Own test code like product code', 'Turn production bugs into tests', 'Poll for state, isolate state']}, b: {t: 'Avoid', items: ['UI-only suites (ice-cream cone)', 'Fixed sleeps', 'Shared state between tests', 'Testing internals and the framework itself', 'Over-mocking without contract tests']}, bBad: true},
        {type: 'flow', title: 'Learning roadmap (our synthesis – no source gave a full roadmap)', steps: [{t: 'Test thinking', d: 'pyramid, test design'}, {t: 'One language + unit tests', d: 'runner, assertions, doubles'}, {t: 'One UI tool', d: 'locators, waiting, page objects'}, {t: 'API and contract tests', d: 'push tests down'}, {t: 'CI', d: 'pipeline, sharding, traces'}, {t: 'Quality ops', d: 'flakes, metrics, production signals'}]}
      ],
      callout: {kind: 'warn', text: 'The roadmap order is our own synthesis from the sources above, not a published standard. Codepipes\' coverage numbers (e.g. ~20% as a Pareto rule) are one author\'s heuristics.'},
      src: ['D20', 'D22', 'D4', 'D2', 'A1']
    }
  ]
};
})();
