# My end-to-end tests and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you found and decided.

App: Conduit practice app · Test file: `P4/tests/e2e.spec.ts` · Date: 2026-11-18

## 1. My first look
- **After I published an article by hand, I would check:** I will check whether the newly created article appears in the Global Feed with the correct title and content
- **Where the page keeps my sign-in:** jwtToken

## 2. Practice
- **Worked example (the like test):** it signs in through the form as a practice user, so other tests can change its data.
- **Does its check at the end prove the journey?** No. Line 19 only checks whether the article heading is visible. It does not verify whether clicking the Favorite Article button actually worked

## 3. My prompt
```text
Task: Write 2 end-to-end tests in P4/tests/e2e.spec.ts. Test 1: a signed-in user publishes a new article in the editor. Test 2: a signed-in user posts a comment on an article. Make a new user with the API, give the page its token, do the journey in the page, and check the result with the API at the end. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/app/public/app.js app.js is the page's code: take the labels and button names from it. The page keeps the sign-in token in localStorage, key jwtToken.
Rules: Use app.js only for the labels and button names. Do not change the app. Do not run the tests. After posting the comment, use API to verify the comment was saved with correct text and the author
```

## 4. The run
- **Claude's 2 tests:** 2 passed, 0 failed

## 5. The teammate's question
- **Claude said:** "Test 1, publishing an article: a user made through the API, with their token put in the page, fills in the editor and clicks Publish Article."
- **My answer:** No. The tests create their own users and data, but they do not clean them up after running. The articles and comments may remain in the app.

## 6. What I saw on the home page
- E2E comment article 1795021259748

## 7. My change
- **My line to Claude:** In @P4/tests/e2e.spec.ts, add test.afterEach() to clean up all test data created by the two end-to-end tests, including the published articles and posted comments. Use the API DELETE endpoints and the required authentication token. Make sure cleanup runs even if a test fails. Do not change the existing test checks. Do not run the tests.
- **The clean-up Claude added:** test.afterEach finds the test user's articles with the API, deletes the user's comments on each, then deletes each article.

## 8. Proof
- **Each test twice, on an app that keeps its data:** `npx playwright test tests/e2e.spec.ts --repeat-each=2` → 4 passed, 0 failed
- **The newest article on the home page after the run:** Your first end-to-end test
