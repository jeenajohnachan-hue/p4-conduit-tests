import { test, expect, Page } from '@playwright/test';

// Test user data, kept in one place. A new user is signed up through the API for each run.
const runId = Date.now();
const testUser = {
  username: `e2e-author-${runId}`,
  email: `e2e-author-${runId}@example.com`,
  password: 'password123', // API.md: at least 8 characters
};

let token: string;

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/users', { data: { user: testUser } });
  expect(response.status()).toBe(201);
  const json = await response.json();
  expect(json.user.username).toBe(testUser.username);
  token = json.user.token;
});

function authHeader() {
  return { Authorization: `Token ${token}` };
}

// Clean up after each test, even when the test fails.
// It looks up the test user's articles through the API, so it also finds an article
// that was published before the test failed. For each article it deletes the
// test user's comments first, then the article.
test.afterEach(async ({ request }) => {
  if (!token) return; // the user was never made, so there is nothing to clean up

  const list = await request.get(`/api/articles?author=${encodeURIComponent(testUser.username)}&limit=100`);
  expect.soft(list.status()).toBe(200);
  const { articles } = await list.json();

  for (const article of articles as { slug: string }[]) {
    const slug = encodeURIComponent(article.slug);

    const commentsResponse = await request.get(`/api/articles/${slug}/comments`);
    expect.soft(commentsResponse.status()).toBe(200);
    const { comments } = await commentsResponse.json();
    for (const comment of comments as { id: number; author: { username: string } }[]) {
      if (comment.author.username !== testUser.username) continue;
      const deleteComment = await request.delete(`/api/articles/${slug}/comments/${comment.id}`, { headers: authHeader() });
      expect.soft(deleteComment.status()).toBe(204); // API.md: 204, no body
    }

    const deleteArticle = await request.delete(`/api/articles/${slug}`, { headers: authHeader() });
    expect.soft(deleteArticle.status()).toBe(204); // API.md: 204, no body
  }
});

// app.js keeps the sign-in token in localStorage under "jwtToken".
// Put it there before the page's own script runs, so the page starts signed in.
async function signInPage(page: Page) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('jwtToken', t);
  }, token);
}

test('a signed-in user publishes a new article in the editor', async ({ page, request }) => {
  const article = {
    title: `E2E article ${runId}`,
    description: 'Description of the E2E article',
    body: 'Body of the E2E article',
    tagList: ['testing', 'e2e'],
  };
  await signInPage(page);

  await page.goto('/editor');
  // The nav shows the username only when the page is signed in.
  await expect(page.getByRole('link', { name: testUser.username })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New Article' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Title' }).fill(article.title);
  await page.getByRole('textbox', { name: "What's this article about?" }).fill(article.description);
  await page.getByRole('textbox', { name: 'Write your article' }).fill(article.body);
  await page.getByRole('textbox', { name: 'Tags' }).fill(article.tagList.join(', '));
  await page.getByRole('button', { name: 'Publish Article' }).click();

  // The page goes to the new article.
  await expect(page).toHaveURL(/\/article\/[^/]+$/);
  await expect(page.getByRole('heading', { level: 1, name: article.title })).toBeVisible();
  const slug = decodeURIComponent(new URL(page.url()).pathname.split('/')[2]);

  // Check with the API that the article was saved as typed, by this user.
  const response = await request.get(`/api/articles/${slug}`);
  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.slug).toBe(slug);
  expect(json.article.title).toBe(article.title);
  expect(json.article.description).toBe(article.description);
  expect(json.article.body).toBe(article.body);
  expect(json.article.tagList).toEqual(article.tagList);
  expect(json.article.author.username).toBe(testUser.username);
});

test('a signed-in user posts a comment on an article', async ({ page, request }) => {
  // Set up: an article made through the API.
  const created = await request.post('/api/articles', {
    headers: authHeader(),
    data: {
      article: {
        title: `E2E comment article ${runId}`,
        description: 'Article for the comment test',
        body: 'Body of the comment test article',
        tagList: [],
      },
    },
  });
  expect(created.status()).toBe(201);
  const slug = (await created.json()).article.slug as string;
  const commentText = `E2E comment ${runId}`;
  await signInPage(page);

  await page.goto(`/article/${encodeURIComponent(slug)}`);
  await expect(page.getByRole('link', { name: testUser.username }).first()).toBeVisible();

  await page.getByRole('textbox', { name: 'Write a comment' }).fill(commentText);
  await page.getByRole('button', { name: 'Post Comment' }).click();

  // The page shows the new comment.
  await expect(page.getByText(commentText, { exact: true })).toBeVisible();

  // Check with the API that the comment was saved with the right text and author.
  const response = await request.get(`/api/articles/${slug}/comments`);
  expect(response.status()).toBe(200);
  const json = await response.json();
  const saved = json.comments.filter((c: { body: string }) => c.body === commentText);
  expect(saved).toHaveLength(1);
  expect(saved[0].body).toBe(commentText);
  expect(saved[0].author.username).toBe(testUser.username);
});
