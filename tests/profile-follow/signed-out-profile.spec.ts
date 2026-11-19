// spec: specs/plan.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test.describe('Profile page and follow', () => {
  test('Signed-out visitor sees the profile but cannot follow (read-only)', async ({ page, request }) => {
    // 1. With no sign-in, open /profile/practice-author.
    await page.goto(`${BASE}/profile/practice-author`);
    await expect(page.getByRole('heading', { name: 'practice-author', level: 1 })).toBeVisible();
    await expect(page.getByText('I write about testing and quality.')).toBeVisible();
    const profileNav = page.getByRole('navigation', { name: 'Profile articles' });
    await expect(profileNav.getByRole('link', { name: 'My Articles' })).toBeVisible();
    await expect(profileNav.getByRole('link', { name: 'Favorited Articles' })).toBeVisible();
    const articles = page.getByRole('article');
    await expect(articles).toHaveCount(7);
    await expect(articles.first().getByRole('heading', { level: 2 })).toHaveText('Your first end-to-end test');

    // 2. Look for any button named 'Follow practice-author' or 'Unfollow practice-author'.
    await expect(page.getByRole('button', { name: 'Follow practice-author' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Unfollow practice-author' })).toHaveCount(0);

    // 3. Call GET /api/profiles/practice-author with no token.
    const before = await request.get(`${BASE}/api/profiles/practice-author`);
    expect(before.status()).toBe(200);
    const beforeBody = await before.json();
    expect(beforeBody.profile.username).toBe('practice-author');
    expect(beforeBody.profile.following).toBe(false);

    // 4. Call POST /api/profiles/practice-author/follow with no token.
    const follow = await request.post(`${BASE}/api/profiles/practice-author/follow`);
    expect(follow.status()).toBe(401);
    expect((await follow.json()).errors.token).toEqual(['is missing']);

    // State is unchanged after the refused follow
    const after = await request.get(`${BASE}/api/profiles/practice-author`);
    expect(after.status()).toBe(200);
    const afterBody = await after.json();
    expect(afterBody.profile.following).toBe(false);
    expect(afterBody).toEqual(beforeBody);
  });
});
