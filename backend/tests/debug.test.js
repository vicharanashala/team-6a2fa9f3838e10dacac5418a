// Debug test - run only this to understand the failure
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('Connected to MongoMemoryServer');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

test('DEBUG: signup and use token', async () => {
  // Step 1: Signup
  const signupRes = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test', email: 'test@test.com', password: 'pass123' });

  console.log('Signup status:', signupRes.status);
  console.log('Signup body keys:', Object.keys(signupRes.body));
  console.log('Signup body:', JSON.stringify(signupRes.body, null, 2));

  expect(signupRes.status).toBe(201);
  const token = signupRes.body.token;
  console.log('Token:', token);

  // Step 2: Use token immediately
  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);

  console.log('/me status:', meRes.status);
  console.log('/me body:', JSON.stringify(meRes.body, null, 2));

  expect(meRes.status).toBe(200);
});