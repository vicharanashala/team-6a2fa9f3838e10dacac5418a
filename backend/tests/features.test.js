const { app, request } = require('./setup');
const User = require('../models/User');

let studentToken, mentorToken, adminToken, studentId, mentorId, adminId;

async function createUserWithRole(role) {
  const email = `${role}@test.com`;
  // Create user directly in DB with correct role (signup always creates 'student')
  const user = await User.create({ name: role, email, password: 'pass123', role });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'pass123' });
  return { token: res.body.token, id: user._id.toString() };
}

beforeAll(async () => {
  const student = await createUserWithRole('student');
  studentToken = student.token; studentId = student.id;
  const mentor = await createUserWithRole('mentor');
  mentorToken = mentor.token; mentorId = mentor.id;
  const admin = await createUserWithRole('admin');
  adminToken = admin.token; adminId = admin.id;
});

describe('FAQ Routes', () => {
  describe('GET /api/faq (public)', () => {
    it('should list FAQs without auth', async () => {
      const res = await request(app).get('/api/faq');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.faqs)).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await request(app).get('/api/faq?category=NOC');
      expect(res.status).toBe(200);
    });

    it('should search FAQs', async () => {
      const res = await request(app).get('/api/faq?search=viBe');
      expect(res.status).toBe(200);
    });

    it('should return single FAQ by id', async () => {
      // Create a FAQ first
      const create = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ question: 'What is ViBe?', answer: 'It is a platform.', category: 'ViBe' });
      const faqId = create.body._id;
      const res = await request(app).get(`/api/faq/${faqId}`);
      expect(res.status).toBe(200);
      expect(res.body.question).toBe('What is ViBe?');
    });
  });

  describe('POST /api/faq (mentor/admin only)', () => {
    it('should allow mentor to create FAQ', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ question: 'How does NOC work?', answer: 'NOC is required.', category: 'NOC' });

      expect(res.status).toBe(201);
      expect(res.body.question).toBe('How does NOC work?');
    });

    it('should reject student from creating FAQ', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: 'Test', answer: 'Test answer', category: 'General' });

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/faq')
        .send({ question: 'Test', answer: 'Test answer', category: 'General' });

      expect(res.status).toBe(401);
    });

    it('should reject FAQ with missing fields', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ question: 'Only question' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/faq/:id (mentor/admin only)', () => {
    let faqId;
    beforeEach(async () => {
      const res = await request(app).post('/api/faq').set('Authorization', `Bearer ${mentorToken}`)
        .send({ question: 'Original Q?', answer: 'Original A.', category: 'NOC' });
      faqId = res.body._id;
    });

    it('should allow mentor to update FAQ', async () => {
      const res = await request(app)
        .patch(`/api/faq/${faqId}`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ answer: 'Updated answer.' });

      expect(res.status).toBe(200);
      expect(res.body.answer).toBe('Updated answer.');
    });

    it('should reject student from updating FAQ', async () => {
      const res = await request(app)
        .patch(`/api/faq/${faqId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answer: 'Hacked answer.' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/faq/:id (admin only)', () => {
    let faqId;
    beforeEach(async () => {
      const res = await request(app).post('/api/faq').set('Authorization', `Bearer ${mentorToken}`)
        .send({ question: 'To be deleted?', answer: 'Yes.', category: 'General' });
      faqId = res.body._id;
    });

    it('should allow admin to delete FAQ', async () => {
      const res = await request(app).delete(`/api/faq/${faqId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('should reject mentor from deleting FAQ', async () => {
      const res = await request(app).delete(`/api/faq/${faqId}`).set('Authorization', `Bearer ${mentorToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject student from deleting FAQ', async () => {
      const res = await request(app).delete(`/api/faq/${faqId}`).set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });
});

describe('Query Routes', () => {
  describe('GET /api/queries (public)', () => {
    it('should list queries without auth', async () => {
      const res = await request(app).get('/api/queries');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.queries)).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await request(app).get('/api/queries?category=ViBe');
      expect(res.status).toBe(200);
    });

    it('should return single query with id', async () => {
      // Create a query
      const create = await request(app).post('/api/queries').set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Test Query', content: 'Test content', category: 'ViBe' });
      const qId = create.body._id;
      const res = await request(app).get(`/api/queries/${qId}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Test Query');
    });
  });

  describe('POST /api/queries (authenticated)', () => {
    it('should allow authenticated user to post query', async () => {
      const res = await request(app)
        .post('/api/queries')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Why is ViBe slow?', content: 'It takes forever to load.', category: 'ViBe' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Why is ViBe slow?');
      expect(res.body.author._id).toBe(studentId);
    });

    it('should reject unauthenticated post', async () => {
      const res = await request(app)
        .post('/api/queries')
        .send({ title: 'Secret query', content: '...', category: 'General' });

      expect(res.status).toBe(401);
    });

    it('should reject query with missing title', async () => {
      const res = await request(app)
        .post('/api/queries')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'No title here', category: 'General' });

      expect(res.status).toBe(400);
    });

    it('should increment author stats after posting', async () => {
      const res = await request(app)
        .post('/api/queries')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Stats test', content: 'Testing stats', category: 'General' });

      const user = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${studentToken}`);
      expect(user.body.stats.queriesRaised).toBeGreaterThan(0);
    });
  });

  describe('POST /api/queries/:id/answers', () => {
    let queryId;
    beforeEach(async () => {
      const res = await request(app).post('/api/queries').set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'A question', content: 'Need help', category: 'NOC' });
      queryId = res.body._id;
    });

    it('should allow user to post answer', async () => {
      const res = await request(app)
        .post(`/api/queries/${queryId}/answers`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ content: 'Here is the answer.' });

      expect(res.status).toBe(201);
      expect(res.body.answers).toHaveLength(1);
      expect(res.body.answers[0].content).toBe('Here is the answer.');
    });

    it('should reject answer without auth', async () => {
      const res = await request(app)
        .post(`/api/queries/${queryId}/answers`)
        .send({ content: 'Unauthorized answer' });

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/queries/:id/escalate', () => {
    let queryId;
    beforeEach(async () => {
      const res = await request(app).post('/api/queries').set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Escalate me', content: 'Urgent', category: 'ViBe' });
      queryId = res.body._id;
    });

    it('should allow student to escalate their own query', async () => {
      const res = await request(app)
        .patch(`/api/queries/${queryId}/escalate`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ reason: 'No answer for 2 days' });

      expect(res.status).toBe(200);
      expect(res.body.isEscalated).toBe(true);
    });

    it('should track escalation reason', async () => {
      const res = await request(app)
        .patch(`/api/queries/${queryId}/escalate`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ reason: 'Critical issue' });

      expect(res.body.escalationReason).toBe('Critical issue');
    });
  });

  describe('POST /api/queries/:id/vote', () => {
    let queryId;
    beforeEach(async () => {
      const res = await request(app).post('/api/queries').set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Vote test', content: 'Vote please', category: 'General' });
      queryId = res.body._id;
    });

    it('should allow voting on query', async () => {
      const res = await request(app)
        .post(`/api/queries/${queryId}/vote`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ type: 'up' });

      expect(res.status).toBe(200);
    });
  });
});

describe('Announcement Routes', () => {
  describe('GET /api/announcements (public)', () => {
    it('should list announcements without auth', async () => {
      const res = await request(app).get('/api/announcements');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.announcements)).toBe(true);
    });
  });

  describe('POST /api/announcements (mentor/admin)', () => {
    it('should allow admin to create announcement', async () => {
      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Important Update', content: 'Read this.', priority: 'high', audience: 'all' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Important Update');
    });

    it('should reject student from posting announcement', async () => {
      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Bad', content: 'Posting', priority: 'low', audience: 'all' });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/announcements/:id (admin)', () => {
    let annId;
    beforeEach(async () => {
      const res = await request(app).post('/api/announcements').set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Original', content: 'Content', priority: 'low', audience: 'all' });
      annId = res.body._id;
    });

    it('should allow admin to update announcement', async () => {
      const res = await request(app)
        .patch(`/api/announcements/${annId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('high');
    });

    it('should reject student from updating announcement', async () => {
      const res = await request(app)
        .patch(`/api/announcements/${annId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/announcements/:id (admin)', () => {
    let annId;
    beforeEach(async () => {
      const res = await request(app).post('/api/announcements').set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'To Delete', content: 'Gone soon', priority: 'low', audience: 'all' });
      annId = res.body._id;
    });

    it('should soft-delete announcement (set isActive=false)', async () => {
      const res = await request(app).delete(`/api/announcements/${annId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      // Should not appear in public list
      const list = await request(app).get('/api/announcements');
      const found = list.body.announcements.find(a => a._id === annId);
      expect(found).toBeUndefined();
    });

    it('should reject student from deleting announcement', async () => {
      const res = await request(app).delete(`/api/announcements/${annId}`).set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });
});

describe('Analytics Routes', () => {
  describe('GET /api/analytics/overview', () => {
    it('should require auth', async () => {
      const res = await request(app).get('/api/analytics/overview');
      expect(res.status).toBe(401);
    });

    it('should return stats for authenticated user', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalQueries');
    });
  });

  describe('GET /api/analytics/faq-gaps (mentor/admin)', () => {
    it('should allow mentor access', async () => {
      const res = await request(app)
        .get('/api/analytics/faq-gaps')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject student', async () => {
      const res = await request(app)
        .get('/api/analytics/faq-gaps')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });
});