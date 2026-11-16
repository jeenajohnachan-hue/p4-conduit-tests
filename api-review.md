# API review: Claude's first API tests (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you decided and what you saw.

- **App:** Conduit, the practice app on your own laptop (`http://127.0.0.1:3000`)
- **API description:** `P4/API.md`
- **Test file:** `P4/tests/api.spec.ts`, written by Claude
- **Prompt file:** `P4/prompts/api.md`

## 1. My first look, by hand
The request my comment sent in the app, and the status that came back.
- Method: POST. Status: 201 created.

## 2. My predictions and the real answers
One line per request: what I predicted, and what the app really answered.
- **A** (a comment, with the token): I predicted 201 Comments are created. Response contain comments. The app answered 201, `{"comment":{... "body":"Clear and useful.", "author":{"username":"practice-reader", ...}}}`
- **B** (the same comment, with no token): I predicted 401 token missing, response contain errors.token. The app answered 401, `{"errors":{"token":["is missing"]}}`
- **C** (a comment on an article that does not exist): I predicted 404 Article not found, response contain errors.article. The app answered 404, `{"errors":{"article":["not found"]}}`

The answer that surprised me most: The 401 response surprised me most because the comment request did not include an Authorization token. The API requires a token to create a comment, so it returned 401 with the message "token is missing".

## 3. My prompt to Claude
```text
Task: Write at least 6 Playwright API tests for articles in the Conduit API: create, read, change and delete an article. At least 3 positive and at least 3 negative tests. Save them in P4/tests/api.spec.ts. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. For negative API tests, check that requests without a required token return 401, and verify the error response body
```

## 4. The run
- **Result:** 7 tests: 6 passed, 1 failed.
- **A red test, and who is wrong:** "the author changes the description, and other fields stay the same". Expected tagList `["testing", "api"]`, Received `[]`. API.md says: "Updating: every field is optional. A field you do not send stays as it was." My answer: The app is wrong. The existing tags should remain unchanged when only the description is updated.
- **My note** (kept with `test.fail()`): The app removes existing tags when only the description is updated, but API.md says existing fields should remain unchanged.

## 5. The developer's question
The test I looked at, and my answer to: "So the app saved nothing, right?"
- **Test:** "creating an article without a token gives 401"
- **My answer:** No.401 status code only confirm the response rejected because of no authorization token,we need to do the test seperately for no artle check

## 6. Tests I reviewed with the API checklist
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.

### "creates an article with a token"
- **My decision:** Change. The test checks the response correctly, but toBeTruthy() only confirms that a slug exists. It should check the expected slug and use a GET request to verify that the article was actually saved.

## 7. My API rules
The rules I added to my `playwright-quality` skill, under `## API rules`:
1. Check the exact status code and response body against API.md.
2. After creating, updating, or deleting data, use a GET request to verify the changes.
3. For negative API tests, verify that rejected requests do not create or change any data.
