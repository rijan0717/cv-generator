import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Content } from '../../src/models/Content.js';
import { connectMemoryDb, clearMemoryDb, closeMemoryDb } from '../helpers/memoryDb.js';

const app = createApp();

/**
 * Registers an ordinary user and returns an agent holding their session.
 * @param {string} email - The account to create.
 * @returns {Promise<import('supertest').SuperAgentTest>}
 */
async function signUpUser(email) {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ name: 'Normal User', email, password: 'password123' });
  return agent;
}

/**
 * Creates an admin the way the seed script does, then logs in as them.
 * @returns {Promise<import('supertest').SuperAgentTest>}
 */
async function signInAdmin() {
  await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: 'password123', // hashed by the model's pre-save hook
    role: 'admin',
  });

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: 'admin@example.com', password: 'password123' });
  return agent;
}

/** The smallest valid post. */
const POST = {
  type: 'post',
  title: 'Reading a job advert',
  bodyHtml: '<p>First paragraph.</p>',
};

beforeAll(async () => {
  await connectMemoryDb();
});

afterEach(async () => {
  await clearMemoryDb();
});

afterAll(async () => {
  await closeMemoryDb();
});

describe('admin content CRUD', () => {
  it('creates a post, derives its slug and records the author', async () => {
    const admin = await signInAdmin();

    const res = await admin.post('/api/admin/content').send(POST);

    expect(res.status).toBe(201);
    expect(res.body.data.content.slug).toBe('reading-a-job-advert');
    expect(res.body.data.content.status).toBe('draft');
    expect(res.body.data.content.author).toBe('Admin');
  });

  it('gives a clashing title its own slug rather than refusing it', async () => {
    // Two pages called "About us" a year apart is ordinary, not an error.
    const admin = await signInAdmin();

    await admin.post('/api/admin/content').send({ ...POST, title: 'About us' });
    const second = await admin.post('/api/admin/content').send({ ...POST, title: 'About us' });

    expect(second.status).toBe(201);
    expect(second.body.data.content.slug).toBe('about-us-2');
  });

  it('keeps the slug when the title changes', async () => {
    // A slug is a URL somebody may have bookmarked or shared.
    const admin = await signInAdmin();
    const created = await admin.post('/api/admin/content').send(POST);
    const { id, slug } = created.body.data.content;

    const updated = await admin.patch(`/api/admin/content/${id}`).send({ title: 'A new title' });

    expect(updated.body.data.content.title).toBe('A new title');
    expect(updated.body.data.content.slug).toBe(slug);
  });

  it('stamps publishedAt once and never moves it', async () => {
    const admin = await signInAdmin();
    const created = await admin.post('/api/admin/content').send({ ...POST, status: 'published' });
    const { id, publishedAt } = created.body.data.content;

    // Unpublish, edit, publish again: the original date must survive, or
    // editing an old post would make it look new.
    await admin.patch(`/api/admin/content/${id}`).send({ status: 'draft' });
    const again = await admin.patch(`/api/admin/content/${id}`).send({ status: 'published' });

    expect(again.body.data.content.publishedAt).toBe(publishedAt);
  });

  it('soft deletes, and takes the link out of the navigation', async () => {
    const admin = await signInAdmin();
    const created = await admin
      .post('/api/admin/content')
      .send({ ...POST, type: 'page', status: 'published', showInHeader: true });
    const { id } = created.body.data.content;

    expect((await request(app).get('/api/content/nav')).body.data.header).toHaveLength(1);

    const removed = await admin.delete(`/api/admin/content/${id}`);
    expect(removed.status).toBe(200);

    // The row survives for the activity log that mentions it...
    const stored = await Content.findById(id);
    expect(stored).not.toBeNull();
    expect(stored.isDeleted).toBe(true);

    // ...but the header must not keep a link to something that 404s.
    expect((await request(app).get('/api/content/nav')).body.data.header).toHaveLength(0);
    expect((await admin.delete(`/api/admin/content/${id}`)).status).toBe(404);
  });

  it('refuses everything to a user who is not an admin', async () => {
    const admin = await signInAdmin();
    const created = await admin.post('/api/admin/content').send(POST);
    const { id } = created.body.data.content;

    const user = await signUpUser('user@example.com');

    expect((await user.get('/api/admin/content')).status).toBe(403);
    expect((await user.post('/api/admin/content').send(POST)).status).toBe(403);
    expect((await user.patch(`/api/admin/content/${id}`).send({ title: 'Mine now' })).status).toBe(
      403,
    );
    expect((await user.delete(`/api/admin/content/${id}`)).status).toBe(403);
    expect((await request(app).post('/api/admin/content').send(POST)).status).toBe(401);
  });

  it('rejects an empty title or body', async () => {
    const admin = await signInAdmin();

    expect((await admin.post('/api/admin/content').send({ bodyHtml: POST.bodyHtml })).status).toBe(400);
    expect((await admin.post('/api/admin/content').send({ title: 'Hello' })).status).toBe(400);
    expect((await admin.post('/api/admin/content').send({ ...POST, type: 'video' })).status).toBe(
      400,
    );
    expect(
      (await admin.post('/api/admin/content').send({ ...POST, bodyHtml: '<p></p>' })).status,
    ).toBe(400);
  });

  it('keeps headings, formatting and an image placed in the text', async () => {
    const admin = await signInAdmin();

    const res = await admin.post('/api/admin/content').send({
      ...POST,
      status: 'published',
      coverImageUrl: '/uploads/cover.jpg',
      bodyHtml:
        '<h2>What screeners read</h2>' +
        '<p>They read the words in <strong>their own advert</strong>.</p>' +
        '<img src="/uploads/example.png" alt="A screening report">' +
        '<p style="text-align: center">So use those words where they are true.</p>' +
        '<ul><li>One</li><li>Two</li></ul>',
    });

    expect(res.status).toBe(201);

    const { bodyHtml, coverImageUrl } = res.body.data.content;
    expect(coverImageUrl).toBe('/uploads/cover.jpg');
    expect(bodyHtml).toContain('<h2>What screeners read</h2>');
    expect(bodyHtml).toContain('<strong>their own advert</strong>');
    expect(bodyHtml).toContain('<li>One</li>');
    // The picture has to survive, and in its place between the two
    // paragraphs — that position is the whole point of the editor.
    expect(bodyHtml.indexOf('<img')).toBeGreaterThan(bodyHtml.indexOf('<h2>'));
    expect(bodyHtml.indexOf('<img')).toBeLessThan(bodyHtml.lastIndexOf('<p'));
  });

  it('strips a script, an iframe and an event handler', async () => {
    // The body is HTML somebody typed, which is the oldest way there
    // is to put code on another person's page.
    const admin = await signInAdmin();

    const res = await admin.post('/api/admin/content').send({
      ...POST,
      bodyHtml:
        '<p>Harmless.</p>' +
        '<script>alert(1)</script>' +
        '<iframe src="https://example.com"></iframe>' +
        '<img src="/uploads/a.png" onerror="alert(2)">' +
        '<a href="javascript:alert(3)">click</a>',
    });

    expect(res.status).toBe(201);

    const { bodyHtml } = res.body.data.content;
    expect(bodyHtml).toContain('Harmless.');
    expect(bodyHtml).not.toMatch(/<script/i);
    expect(bodyHtml).not.toMatch(/<iframe/i);
    expect(bodyHtml).not.toMatch(/onerror/i);
    expect(bodyHtml).not.toMatch(/javascript:/i);
  });

  it('drops an image that is not one of our uploads', async () => {
    // An external image makes every reader's browser announce itself
    // to a server we do not control.
    const admin = await signInAdmin();

    const res = await admin.post('/api/admin/content').send({
      ...POST,
      bodyHtml: '<p>Text.</p><img src="https://example.com/tracker.gif">',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.content.bodyHtml).not.toContain('example.com');
    expect(res.body.data.content.bodyHtml).toContain('Text.');
  });

  it('accepts a body that is only a picture', async () => {
    const admin = await signInAdmin();

    const res = await admin
      .post('/api/admin/content')
      .send({ ...POST, bodyHtml: '<img src="/uploads/only.png" alt="A chart">' });

    expect(res.status).toBe(201);
  });

  it('publishes from the list without resending the body', async () => {
    const admin = await signInAdmin();
    const created = await admin.post('/api/admin/content').send(POST);

    const published = await admin
      .patch(`/api/admin/content/${created.body.data.content.id}`)
      .send({ status: 'published' });

    expect(published.status).toBe(200);
    expect(published.body.data.content.bodyHtml).toContain('First paragraph.');
  });
});

describe('the public side', () => {
  it('lists published posts without their bodies', async () => {
    // A page of nine articles should not send every word of all nine
    // just to render nine summaries.
    const admin = await signInAdmin();
    await admin.post('/api/admin/content').send({ ...POST, status: 'published' });

    const res = await request(app).get('/api/content/posts');

    expect(res.status).toBe(200);
    expect(res.body.data.posts).toHaveLength(1);
    expect(res.body.data.posts[0].bodyHtml).toBeUndefined();
    expect(res.body.data.posts[0].title).toBe(POST.title);
  });

  it('never shows a draft, by list or by slug', async () => {
    const admin = await signInAdmin();
    const created = await admin.post('/api/admin/content').send(POST);
    const { slug } = created.body.data.content;

    expect((await request(app).get('/api/content/posts')).body.data.posts).toHaveLength(0);

    // The same answer as an unknown slug: an unpublished page should not
    // be discoverable by the shape of its refusal.
    expect((await request(app).get(`/api/content/${slug}`)).status).toBe(404);
  });

  it('leaves pages out of the blog list', async () => {
    const admin = await signInAdmin();
    await admin
      .post('/api/admin/content')
      .send({ ...POST, type: 'page', title: 'Privacy', status: 'published' });

    expect((await request(app).get('/api/content/posts')).body.data.posts).toHaveLength(0);
    expect((await request(app).get('/api/content/privacy')).status).toBe(200);
  });

  it('builds the header and footer links in the admin order', async () => {
    const admin = await signInAdmin();
    await admin.post('/api/admin/content').send({
      ...POST,
      type: 'page',
      title: 'Contact',
      status: 'published',
      showInFooter: true,
      sortOrder: 2,
    });
    await admin.post('/api/admin/content').send({
      ...POST,
      type: 'page',
      title: 'About us',
      navLabel: 'About',
      status: 'published',
      showInHeader: true,
      showInFooter: true,
      sortOrder: 1,
    });

    const res = await request(app).get('/api/content/nav');

    expect(res.body.data.header).toHaveLength(1);
    // `navLabel` wins over the title, and the order is the admin's.
    expect(res.body.data.header[0]).toMatchObject({ label: 'About', to: '/p/about-us' });
    expect(res.body.data.footer.map((link) => link.label)).toEqual(['About', 'Contact']);
  });

  it('does not link a draft, whatever is ticked on it', async () => {
    const admin = await signInAdmin();
    await admin
      .post('/api/admin/content')
      .send({ ...POST, type: 'page', showInHeader: true, showInFooter: true });

    const res = await request(app).get('/api/content/nav');

    expect(res.body.data.header).toHaveLength(0);
    expect(res.body.data.footer).toHaveLength(0);
  });

  it('reads the blog and the nav without a session', async () => {
    expect((await request(app).get('/api/content/posts')).status).toBe(200);
    expect((await request(app).get('/api/content/nav')).status).toBe(200);
  });
});
