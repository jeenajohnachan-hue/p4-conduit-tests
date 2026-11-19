// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

// This test signs up its own user through the API (POST /api/users),
// so it does not change a shared practice account.
const runId = Date.now();
const testUser = {
  username: `follow-tester-${runId}`,
  email: `follow-tester-${runId}@example.com`,
  password: 'password123', // API.md: at least 8 characters
};

test.describe('Profile page and follow', () => {
  test('Signed-in user follows an author and the follow persists', async ({ page, request }) => {
    // Sign up a new user through the API, and keep its token for API checks and cleanup
    const signUpResponse = await request.post(`${BASE}/api/users`, {
      data: { user: testUser },
    });
    expect(signUpResponse.status()).toBe(201);
    const signUpJson = await signUpResponse.json();
    expect(signUpJson.user.username).toBe(testUser.username);
    const token = signUpJson.user.token as string;
    const authHeaders = { Authorization: `Token ${token}` };

    const getFollowing = async (headers?: Record<string, string>) => {
      const response = await request.get(`${BASE}/api/profiles/practice-author`, { headers });
      expect(response.status()).toBe(200);
      return (await response.json()).profile.following as boolean;
    };

    try {
      // 1. Sign in via /login, then go to /profile/practice-author
      await page.goto(`${BASE}/login`);
      await page.getByRole('textbox', { name: 'Email' }).fill(testUser.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(testUser.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

      await page.goto(`${BASE}/profile/practice-author`);
      await expect(page.getByRole('heading', { level: 1, name: 'practice-author' })).toBeVisible();
      await expect(page.getByText('I write about testing and quality.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Follow practice-author' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Unfollow practice-author' })).toHaveCount(0);
      // Precondition via API
      expect(await getFollowing(authHeaders)).toBe(false);

      // 2. Click the button 'Follow practice-author'
      await page.getByRole('button', { name: 'Follow practice-author' }).click();
      await expect(page.getByRole('button', { name: 'Unfollow practice-author' })).toBeVisible();

      // 3. Reload the page
      await page.reload();
      await expect(page.getByRole('button', { name: 'Unfollow practice-author' })).toBeVisible();

      // 4. GET /api/profiles/practice-author with and without token
      expect(await getFollowing(authHeaders)).toBe(true);
      expect(await getFollowing()).toBe(false);

      // 5. Cleanup via UI: click 'Unfollow practice-author', reload, check API
      await page.getByRole('button', { name: 'Unfollow practice-author' }).click();
      await expect(page.getByRole('button', { name: 'Follow practice-author' })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Follow practice-author' })).toBeVisible();
      expect(await getFollowing(authHeaders)).toBe(false);
    } finally {
      // Safety net: make sure the test user does not follow practice-author
      if (await getFollowing(authHeaders)) {
        await request.delete(`${BASE}/api/profiles/practice-author/follow`, { headers: authHeaders });
      }
    }
  });
});
