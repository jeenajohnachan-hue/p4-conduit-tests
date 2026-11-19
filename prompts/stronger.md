Changes: In @P4/tests/profile-follow/follow-persists.spec.ts: Changed. The test is useful because it checks whether following an author works and persists. However, it uses a shared practice account. It should create its own user through the API to avoid affecting other tests or teammates.
New tests: Add tests for comments. Check that a user can post a comment and that the comment is saved correctly. Also check that the comment appears when we fetch the comments again.
Material: @P4/API.md @P4/tests/e2e.spec.ts Make users and data by API, and clean up, like these tests.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Change nothing else. Do not run the tests.
