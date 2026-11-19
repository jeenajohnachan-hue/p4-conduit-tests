# Profile page and following an author

## Application Overview

Conduit profile page /profile/practice-author at http://127.0.0.1:3000. Values: usernames, emails and password Practice123 from README.md; endpoints and the "following" field from API.md; heading, bio "I write about testing and quality.", button name "Unfollow practice-author" and the 7 article titles from the live page. Observed at planning time (fresh data): practice-reader ALREADY follows practice-author (button shows "Unfollow practice-author", API following: true); practice-editor does NOT (API following: false). So the follow scenario uses practice-editor. Locators must follow CLAUDE.md: getByRole first, getByTestId only if needed, no CSS or xpath. The exact "Follow practice-author" button name is inferred from "Unfollow practice-author" and was not seen on screen.

## Test Scenarios

### 1. Profile page and follow

**Seed:** `tests/seed.spec.ts`

#### 1.1. Signed-in user follows an author and the follow persists

**File:** `tests/profile-follow/follow-persists.spec.ts`

**Steps:**
  1. Sign in via /login as practice-editor (practice-editor@example.com / Practice123) using the Email and Password textboxes and the Sign in button. Then go to /profile/practice-author.
    - expect: Heading level 1 'practice-author' and bio 'I write about testing and quality.' are shown
    - expect: Button 'Follow practice-author' is shown (not 'Unfollow'). Precondition: API GET /api/profiles/practice-author with this user's token reports following: false
  2. Click the button 'Follow practice-author'.
    - expect: The button changes to 'Unfollow practice-author'
  3. Reload the page (page.reload()).
    - expect: Button 'Unfollow practice-author' is still shown after the reload (persisted, not only client state)
  4. Call GET /api/profiles/practice-author with header Authorization: Token <practice-editor token> (token from POST /api/users/login).
    - expect: Status 200 and profile.following is true
    - expect: Same call without a token reports following: false (the follow belongs to the editor only)
  5. Cleanup: click 'Unfollow practice-author', reload, then GET the profile API again with the token.
    - expect: Button is back to 'Follow practice-author' after reload and API reports following: false. Cleanup is needed so reruns and other tests see practice-editor as not following. Run it in a finally/afterEach so it also runs when an earlier step fails. App data resets on every npm start, but not with KEEP_DATA=1.

#### 1.2. Signed-out visitor sees the profile but cannot follow (read-only)

**File:** `tests/profile-follow/signed-out-profile.spec.ts`

**Steps:**
  1. With no sign-in, open /profile/practice-author.
    - expect: Heading 'practice-author' and bio 'I write about testing and quality.' are shown
    - expect: The navigation 'Profile articles' has links 'My Articles' and 'Favorited Articles'
    - expect: 7 articles by practice-author are listed, first one 'Your first end-to-end test' (count and titles seen on the page at planning time)
  2. Look for any button named 'Follow practice-author' or 'Unfollow practice-author'.
    - expect: Neither button exists on the page (observed signed out: no follow button)
  3. Call GET /api/profiles/practice-author with no token.
    - expect: Status 200, profile.username is 'practice-author' and profile.following is false
  4. Call POST /api/profiles/practice-author/follow with no token.
    - expect: Status 401 with errors.token ['is missing'] (API.md). Then GET the profile again: following is still false. Nothing is changed, so no cleanup is needed.
