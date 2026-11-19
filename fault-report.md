# My practice fault report (week 4, project P4)

App: Conduit practice app on my laptop · Practice faults: `P4/faults/practice.json` (F1 to F6) · Date: 2026-11-19
**How to read it:** a "detect" fault is **caught** when at least one test that passed with no fault fails with it, and **missed** when every test still passes. A "robust" fault (the app is only slower) should **stay green**; if tests fail, it **went red**.

## 1. My guess this morning
- **The developer asked:** "Your suite is green. How many real problems would it catch?"
- **My answer:** Passing tests doesn't mean our tests are good. We need to introduce some bugs and see whether our tests catch them.

## 2. Before: my suite against the practice faults
- **Command:** `node materials/faults-run.mjs` (TESTS terminal, in `P4`, with no app running)
- **My test files:** `api.spec.ts`, `contract.spec.ts`, `e2e.spec.ts`, `example.spec.ts`, `profile-follow/follow-persists.spec.ts`, `profile-follow/signed-out-profile.spec.ts`, `seed.spec.ts`
- **No fault:** 18 passed, 0 failed
- **F1:** caught (8 tests failed)
- **F2:** caught (4 tests failed)
- **F3:** caught (4 tests failed)
- **F4:** caught (1 test failed: e2e.spec.ts › a signed-in user posts a comment on an article)
- **F5:** stayed green (0 tests failed)
- **F6:** caught (1 test failed: e2e.spec.ts › a signed-in user posts a comment on an article)

## 3. The weak spot I chose, and why
My suite is weakest at F4 because only one test catches it. A good suite should catch bugs where the comments list is empty, even if the existing test is removed or fails for another reason.

## 4. How I made the suite stronger
- **My request for Claude** (the New tests line of `P4/prompts/stronger.md`): Add tests for comments. Check that a user can post a comment and that the comment is saved correctly. Also check that the comment appears when we fetch the comments again.
- **New or changed test file:** `tests/comments.spec.ts` (new, 2 tests); `tests/profile-follow/follow-persists.spec.ts` (changed)

## 5. After: the run again
- **Command:** `node materials/faults-run.mjs F4`
- **No fault:** 20 passed, 0 failed
- **The fault I chose:** F4: caught (3 tests failed, before 1)

## 6. What changed
We don't know exactly how many real problems our suite can catch. But after adding the comment tests, our suite is stronger because more tests catch the same bug.
