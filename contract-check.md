# My schema, auth and contract checks (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-17

## 1. My first look
How I would check that an article answer has the right shape: A test should check that all required fields are present and that each field has the correct data type, as defined in API.md.

## 2. Practice: the key list check
File: `P4/materials/contract-example.spec.ts` (the sign-up answer).
Three changes: `bio` is missing · a new field `password` is added · `token` becomes a number.
- **The toMatchObject check (worked example):** missing: passes · new field: passes · number: fails
- **The key list check (my answer):** Missing bio-fail · new password field-fail · token is a number-pass

## 3. My prompt for Claude
```text
Task: Write Playwright API tests in P4/tests/contract.spec.ts. Schema checks: the answers of GET /api/articles/:slug and GET /api/user have the shape that API.md gives, checked with toMatchObject and expect.any. Auth tests: no token, a wrong token, and changing someone else's article. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Check that every API response contains all the required fields and that each field has the correct data type, as defined in API.md
```

## 4. Claude's tests and my run
- **Run:** `npx playwright test tests/contract.spec.ts` · **Result:** 5 passed, 0 failed
- **A red test, and who was wrong:** No test failed.

## 5. The teammate's question
- **Claude's test:** "GET /api/articles/:slug answers with the Article shape from API.md"
- **Claude said:** "the status is 200, and every Article field is there with the right type: strings, a list of text tags, ISO dates, a true/false `favorited`, a number `favoritesCount`, and an `author` profile."
- **My answer:** No. The test will not fail because toMatchObject() checks only the fields mentioned in the assertion. Since password is not included, an extra password field will not be detected

## 6. My change
- **What I asked Claude:** "In @P4/tests/contract.spec.ts, update the article shape test. Keep the existing checks. Add a check to compare the complete list of field names with the exact fields mentioned in API.md. If an unexpected field like password appears, the test should fail."
- **The run after it:** 5 passed, 0 failed

## 7. Proof: the contract test fails when the answer changes
- **My prediction before the run:** The first test will fail: GET /api/articles/:slug answers with the Article shape from API.md. Why? F2 removes one field from the article response. The contract test checks that all required fields are present, so it should detect the missing field and fail.
- **Run with the practice fault F2 on:** `$env:CONDUIT_FAULT = "F2"`, then `npx playwright test tests/contract.spec.ts` · **Result:** 3 passed, 2 failed ("GET /api/articles/:slug answers with the Article shape from API.md", "changing someone else's article gives 403, and the article stays the same")
- **What Playwright showed:** the article test: `-     "body": Any<String>,` (Expected - 1, Received + 0). The 403 test: Expected: "Body of the contract test", Received: undefined
- **My answer about a red test:** The test failed because F2 removed the body field from the article response. Even though this test checks authorization, it also checks the article body, so it failed too
- **Run with the fault off again:** `$env:CONDUIT_FAULT = ""`, then the same run · **Result:** 5 passed, 0 failed
