const { app, request } = require('./setup');

describe('Auth Routes', () => {
  // --- Signup ---
  describe('POST /api/auth/signup', () => {
    it('should create a student account successfully', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Alice Student', email: 'alice@test.com', password: 'password123', college: 'IIT Ropar' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('name', 'Alice Student');
      expect(res.body.user).toHaveProperty('role', 'student');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should NOT allow setting role to admin during signup', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Hacker', email: 'hacker@test.com', password: 'password123', role: 'admin' });

      // Role must be stripped — should either be 201 (student) or we check role is 'student'
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('student');
    });

    it('should NOT allow setting role to mentor during signup', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Fake Mentor', email: 'fakementor@test.com', password: 'password123', role: 'mentor' });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('student');
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/api/auth/signup').send({ name: 'Bob', email: 'bob@test.com', password: 'pass123' });
      const res = await request(app).post('/api/auth/signup').send({ name: 'Bob Again', email: 'bob@test.com', password: 'pass123' });

      expect(res.status).toBe(400);
      expect(res.body.error.toLowerCase()).toContain('email');
    });

    it('should reject missing name', async () => {
      const res = await request(app).post('/api/auth/signup').send({ email: 'noname@test.com', password: 'pass123' });
      expect(res.status).toBe(400);
    });

    it('should reject missing email', async () => {
      const res = await request(app).post('/api/auth/signup').send({ name: 'No Email', password: 'pass123' });
      expect(res.status).toBe(400);
    });

    it('should reject missing password', async () => {
      const res = await request(app).post('/api/auth/signup').send({ name: 'No Pass', email: 'nopass@test.com' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app).post('/api/auth/signup').send({ name: 'Bad Email', email: 'notanemail', password: 'pass123' });
      expect(res.status).toBe(400);
    });
  });

  // --- Login ---
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/signup').send({ name: 'Login User', email: 'login@test.com', password: 'correctpass' });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'correctpass' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'login@test.com');
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'wrongpass' });
      expect(res.status).toBe(401);
    });

    it('should reject unregistered email', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'ghost@test.com', password: 'anypass' });
      expect(res.status).toBe(401);
    });
  });

  // --- Protected /me ---
  describe('GET /api/auth/me', () => {
    let token;
    beforeEach(async () => {
      const res = await request(app).post('/api/auth/signup').send({ name: 'Me Test', email: 'me@test.com', password: 'pass123' });
      token = res.body.token;
    });

    it('should return current user with valid token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('name', 'Me Test');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject request with malformed token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });

    it('should reject request with invalid Authorization format', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'NotBearer sometoken');
      expect(res.status).toBe(401);
    });
  });

  // --- Preferences ---
  describe('PATCH /api/auth/preferences', () => {
    let token;
    beforeEach(async () => {
      const res = await request(app).post('/api/auth/signup').send({ name: 'Pref Test', email: 'pref@test.com', password: 'pass123' });
      token = res.body.token;
    });

    it('should update theme preference', async () => {
      const res = await request(app)
        .patch('/api/auth/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'light' });

      expect(res.status).toBe(200);
      expect(res.body.user.preferences.theme).toBe('light');
    });

    it('should handle invalid theme value gracefully', async () => {
      const res = await request(app)
        .patch('/api/auth/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'invalid-theme' });

      // Invalid enum values are silently ignored by mongoose; prefer strict validation in production
      expect([200, 400]).toContain(res.status);
    });

    it('should update explainMode', async () => {
      const res = await request(app)
        .patch('/api/auth/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ explainMode: 'detailed' });

      expect(res.status).toBe(200);
      expect(res.body.user.preferences.explainMode).toBe('detailed');
    });
  });
});