import { test, expect, APIRequestContext } from '@playwright/test';

// Comment tests, written from API.md only.
// Each run signs up its own user through the API, makes its own article,
// and deletes its comments and article afterwards.
const runId = Date.now();
const testUser = {
  username: `comment-tester-${runId}`,
  email: `comment-tester-${runId}@example.com`,
  password: 'password123', // API.md: at least 8 characters
};

let token: string;

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/users', { data: { user: testUser } });
  expect(response.status()).toBe(201); // API.md: sign up gives 201 User
  const json = await response.json();
  expect(json.user.username).toBe(testUser.username);
  token = json.user.token;
});

function authHeader() {
  return { Authorization: `Token ${token}` };
}

// Clean up after each test, even when the test fails:
// delete the test user's comments first, then the test user's articles.
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

// Set up: an article made through the API, with no comments yet.
async function createArticle(request: APIRequestContext, title: string): Promise<string> {
  const created = await request.post('/api/articles', {
    headers: authHeader(),
    data: {
      article: {
        title,
        description: 'Article for the comment tests',
        body: 'Body of the comment test article',
        tagList: [],
      },
    },
  });
  expect(created.status()).toBe(201); // API.md: 201 Article
  const slug = (await created.json()).article.slug as string;

  const comments = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(comments.status()).toBe(200);
  expect((await comments.json()).comments).toEqual([]);
  return slug;
}

test('a signed-in user posts a comment and it is saved correctly', async ({ request }) => {
  const slug = await createArticle(request, `Comment save article ${runId}`);
  const commentText = `Saved comment ${runId}`;

  const response = await request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
    headers: authHeader(),
    data: { comment: { body: commentText } },
  });

  // API.md: 201 {"comment":{"id","createdAt","updatedAt","body","author"}}, author is a Profile
  expect(response.status()).toBe(201);
  const { comment } = await response.json();
  expect(comment.id).toBeDefined();
  expect(comment.body).toBe(commentText);
  expect(comment.author.username).toBe(testUser.username);
  // API.md: a new user has bio and image set to null
  expect(comment.author.bio).toBeNull();
  expect(comment.author.image).toBeNull();
  // API.md: dates are ISO 8601 text
  expect(new Date(comment.createdAt).toISOString()).toBe(comment.createdAt);
  expect(new Date(comment.updatedAt).toISOString()).toBe(comment.updatedAt);

  // Check with a GET that the comment was saved with the same values.
  const list = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(list.status()).toBe(200);
  const { comments } = await list.json();
  expect(comments).toHaveLength(1);
  expect(comments[0].id).toBe(comment.id);
  expect(comments[0].body).toBe(commentText);
  expect(comments[0].author.username).toBe(testUser.username);
  expect(comments[0].createdAt).toBe(comment.createdAt);
  expect(comments[0].updatedAt).toBe(comment.updatedAt);
});

test('a posted comment appears when the comments are fetched again', async ({ request }) => {
  const slug = await createArticle(request, `Comment fetch article ${runId}`);
  const commentText = `Fetched comment ${runId}`;

  const posted = await request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
    headers: authHeader(),
    data: { comment: { body: commentText } },
  });
  expect(posted.status()).toBe(201);
  const { comment } = await posted.json();

  // API.md: GET comments takes an optional token. Fetch again with and without one.
  for (const headers of [authHeader(), undefined]) {
    const list = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`, { headers });
    expect(list.status()).toBe(200);
    const { comments } = await list.json();
    const found = comments.filter((c: { id: number }) => c.id === comment.id);
    expect(found).toHaveLength(1);
    expect(found[0].body).toBe(commentText);
    expect(found[0].author.username).toBe(testUser.username);
    expect(found[0].createdAt).toBe(comment.createdAt);
  }
});
