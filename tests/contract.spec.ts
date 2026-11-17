import { test, expect, APIRequestContext } from '@playwright/test';

// Test user data, kept in one place. Two new users are signed up for each run.
const runId = Date.now();
const author = {
  username: `contract-author-${runId}`,
  email: `contract-author-${runId}@example.com`,
  password: 'password123', // API.md: at least 8 characters
};
const otherUser = {
  username: `contract-other-${runId}`,
  email: `contract-other-${runId}@example.com`,
  password: 'password123', // API.md: at least 8 characters
};

// API.md "Basics": dates are ISO 8601 text, for example 2026-01-05T12:00:00.000Z
const isoDate = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);

let authorToken: string;
let otherToken: string;
let slug: string;
const article = {
  title: `Contract test ${runId}`,
  description: 'Description of the contract test',
  body: 'Body of the contract test',
  tagList: ['testing', 'api'],
};

async function signUp(request: APIRequestContext, user: typeof author) {
  const response = await request.post('/api/users', { data: { user } });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.user.token as string;
}

function tokenHeader(token: string) {
  return { Authorization: `Token ${token}` };
}

test.beforeAll(async ({ request }) => {
  authorToken = await signUp(request, author);
  otherToken = await signUp(request, otherUser);

  const response = await request.post('/api/articles', {
    headers: tokenHeader(authorToken),
    data: { article },
  });
  expect(response.status()).toBe(201);
  slug = (await response.json()).article.slug;
});

// ---------- Schema tests ----------

test('GET /api/articles/:slug answers with the Article shape from API.md', async ({ request }) => {
  const response = await request.get(`/api/articles/${slug}`);

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json).toMatchObject({
    article: {
      slug: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      body: expect.any(String),
      tagList: expect.any(Array),
      createdAt: isoDate,
      updatedAt: isoDate,
      favorited: expect.any(Boolean),
      favoritesCount: expect.any(Number),
      // API.md: author is a Profile (without the profile wrapper)
      author: {
        username: expect.any(String),
        bio: null, // API.md: a new user has bio set to null
        image: null, // API.md: a new user has image set to null
        following: expect.any(Boolean),
      },
    },
  });
  // API.md: tagList is a list of text values
  for (const tag of json.article.tagList) {
    expect(tag).toEqual(expect.any(String));
  }

  // API.md: the Article has exactly these fields, no more and no fewer (an extra field like password fails)
  expect(Object.keys(json.article).sort()).toEqual(
    [
      'slug',
      'title',
      'description',
      'body',
      'tagList',
      'createdAt',
      'updatedAt',
      'favorited',
      'favoritesCount',
      'author',
    ].sort(),
  );
  // API.md: author is a Profile with exactly these fields
  expect(Object.keys(json.article.author).sort()).toEqual(
    ['username', 'bio', 'image', 'following'].sort(),
  );
});

test('GET /api/user answers with the User shape from API.md', async ({ request }) => {
  const response = await request.get('/api/user', { headers: tokenHeader(authorToken) });

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    user: {
      email: expect.any(String),
      token: expect.any(String),
      username: expect.any(String),
      bio: null, // API.md: a new user has bio set to null
      image: null, // API.md: a new user has image set to null
    },
  });
});

// ---------- Auth tests ----------

test('GET /api/user without a token gives 401 "is missing"', async ({ request }) => {
  const response = await request.get('/api/user');

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
});

test('GET /api/user with a wrong token gives 401 "is invalid"', async ({ request }) => {
  const response = await request.get('/api/user', { headers: tokenHeader('not-a-real-token') });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });
});

test("changing someone else's article gives 403, and the article stays the same", async ({ request }) => {
  const response = await request.put(`/api/articles/${slug}`, {
    headers: tokenHeader(otherToken),
    data: { article: { description: 'Should not be saved' } },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  // The rejected request did not change the article
  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(200);
  const json = await readBack.json();
  expect(json.article.description).toBe(article.description);
  expect(json.article.title).toBe(article.title);
  expect(json.article.body).toBe(article.body);
  expect(json.article.tagList).toEqual(article.tagList);
});
