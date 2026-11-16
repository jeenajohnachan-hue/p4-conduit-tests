import { test, expect, APIRequestContext } from '@playwright/test';

// Test user data, kept in one place. A new user is signed up for each run.
const runId = Date.now();
const testUser = {
  username: `api-author-${runId}`,
  email: `api-author-${runId}@example.com`,
  password: 'password123', // API.md: at least 8 characters
};

let token: string;

// API.md: 401 body when a token is needed but not sent.
const missingTokenError = { errors: { token: ['is missing'] } };

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

function newArticle(name: string) {
  return {
    title: `${name} ${runId}`,
    description: `Description of ${name}`,
    body: `Body of ${name}`,
    tagList: ['testing', 'api'],
  };
}

async function createArticle(request: APIRequestContext, name: string) {
  const article = newArticle(name);
  const response = await request.post('/api/articles', {
    headers: authHeader(),
    data: { article },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { sent: article, slug: json.article.slug as string };
}

// ---------- Positive tests ----------

test('creates an article with a token', async ({ request }) => {
  const article = newArticle('Create test');

  const response = await request.post('/api/articles', {
    headers: authHeader(),
    data: { article },
  });

  expect(response.status()).toBe(201);
  const json = await response.json();
  expect(json.article.title).toBe(article.title);
  expect(json.article.description).toBe(article.description);
  expect(json.article.body).toBe(article.body);
  expect(json.article.tagList).toEqual(article.tagList);
  expect(json.article.slug).toBeTruthy();
  expect(json.article.favorited).toBe(false);
  expect(json.article.favoritesCount).toBe(0);
  expect(json.article.author.username).toBe(testUser.username);
});

test('reads an article by its slug', async ({ request }) => {
  const { sent, slug } = await createArticle(request, 'Read test');

  const response = await request.get(`/api/articles/${slug}`);

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.slug).toBe(slug);
  expect(json.article.title).toBe(sent.title);
  expect(json.article.description).toBe(sent.description);
  expect(json.article.body).toBe(sent.body);
  expect(json.article.tagList).toEqual(sent.tagList);
  expect(json.article.author.username).toBe(testUser.username);
});

test('the author changes the description, and other fields stay the same', async ({ request }) => {
  // The app removes existing tags when only the description is updated, but API.md says existing fields should remain unchanged.
  test.fail();
  const { sent, slug } = await createArticle(request, 'Update test');

  const response = await request.put(`/api/articles/${slug}`, {
    headers: authHeader(),
    data: { article: { description: 'Changed description' } },
  });

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.description).toBe('Changed description');
  expect(json.article.title).toBe(sent.title);
  expect(json.article.body).toBe(sent.body);
  expect(json.article.tagList).toEqual(sent.tagList);
  expect(json.article.slug).toBe(slug);

  // The change is saved
  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(200);
  expect((await readBack.json()).article.description).toBe('Changed description');
});

test('the author deletes an article, and it is then not found', async ({ request }) => {
  const { slug } = await createArticle(request, 'Delete test');

  const response = await request.delete(`/api/articles/${slug}`, { headers: authHeader() });

  expect(response.status()).toBe(204);
  expect(await response.text()).toBe('');

  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(404);
  expect(await readBack.json()).toEqual({ errors: { article: ['not found'] } });
});

// ---------- Negative tests ----------

test('creating an article without a token gives 401', async ({ request }) => {
  const response = await request.post('/api/articles', {
    data: { article: newArticle('No token create') },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual(missingTokenError);
});

test('changing an article without a token gives 401, and nothing changes', async ({ request }) => {
  const { sent, slug } = await createArticle(request, 'No token update');

  const response = await request.put(`/api/articles/${slug}`, {
    data: { article: { description: 'Should not be saved' } },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual(missingTokenError);

  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(200);
  expect((await readBack.json()).article.description).toBe(sent.description);
});

test('deleting an article without a token gives 401, and the article stays', async ({ request }) => {
  const { sent, slug } = await createArticle(request, 'No token delete');

  const response = await request.delete(`/api/articles/${slug}`);

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual(missingTokenError);

  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(200);
  expect((await readBack.json()).article.title).toBe(sent.title);
});
