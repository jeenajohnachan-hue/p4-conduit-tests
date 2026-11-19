# Tests from Playwright's agents, and my review (week 4, project P4)

App: Conduit practice app on my laptop · Date: 2026-11-19

## 1. How I set up the agents
- **Command:** `npx playwright init-agents --loop=claude` (TESTS terminal, in `P4`)
- **What it made:** `.claude/agents/playwright-test-planner.md`, `.claude/agents/playwright-test-generator.md`, `.claude/agents/playwright-test-healer.md`, `.mcp.json`, `specs/README.md`, `tests/seed.spec.ts`
- **Browser hidden:** `"--headless"` added to `P4/.mcp.json`: yes
- **Where I started Claude for the agents:** in `P4`, because Claude finds the agents and their browser only there

## 2. What I asked the agents
- **Area:** the profile page and following an author
- **My prompt** (`P4/prompts/agents.md`):
  - Task: First use the playwright-test-planner agent to plan tests for the profile page and following an author. Save the plan as specs/profile-follow.md. Then use the playwright-test-generator agent to write one test for each scenario in the plan, in the folder tests/profile-follow/.
  - Material: Start on the page /profile/practice-author. For steps that need a signed-in user, use a practice user from README.md.
  - Rules: Plan at most 2 short scenarios, with at most 5 steps each. Do not change any other test file. Do not run the test suite. Every test must verify the actual result, not just that a message appears on the screen.
- **The plan the planner saved:** `specs/profile-follow.md` (2 scenarios)
- **The test files the generator wrote:** `tests/profile-follow/follow-persists.spec.ts`, `tests/profile-follow/signed-out-profile.spec.ts`
- `tests/seed.spec.ts` is the agents' start file. It checks nothing about the app, so it is not reviewed here.

## 3. My review of every generated test
- **The teammate's question:** "Claude says the test unfollows at the end, and the API says `following: false`. So we can keep this test in our suite as it is, right?"
- **My answer:** No, we shouldn't keep the test as it is. It changes the practice-editor account (practice-editor@example.com).
- "Signed-in user follows an author and the follow persists" · **changed**, because the test is useful because it checks whether following an author works and persists. However, it uses a shared practice account. It should create its own user through the API to avoid affecting other tests or teammates.
- "Signed-out visitor sees the profile but cannot follow (read-only)" · **kept**, because the test is useful because it checks that a signed-out user can view the profile but cannot follow the author. It also verifies that the API rejects the follow request with a 401 error and that the profile remains unchanged. It doesn't modify shared data.

## 4. What I asked Claude to change, and the result
- **My change** (the Changes line of `P4/prompts/stronger.md`): In @P4/tests/profile-follow/follow-persists.spec.ts: Changed. The test is useful because it checks whether following an author works and persists. However, it uses a shared practice account. It should create its own user through the API to avoid affecting other tests or teammates.
- **Result:** No fault: 20 passed, 0 failed
