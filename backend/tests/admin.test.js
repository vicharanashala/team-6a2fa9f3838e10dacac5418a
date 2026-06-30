const { app, request } = require('./setup');
const User = require('../models/User');

let studentToken, mentorToken, adminToken, studentId, mentorId, adminId;

async function createUserWithRole(role) {
  const email = `${role}@test.com`;
  const user = await User.create({ name: role, email, password: 'pass123', role });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'pass123' });
  console.log(`[DEBUG ${role}] login status: ${res.status}, body keys: ${Object.keys(res.body)}, token: ${res.body.token ? 'exists' : 'MISSING'}`);
  return { token: res.body.token, id: user._id.toString() };
}

beforeAll(async () => {
  console.log('[DEBUG] beforeAll starting');
  const student = await createUserWithRole('student');
  studentToken = student.token; studentId = student.id;
  const mentor = await createUserWithRole('mentor');
  mentorToken = mentor.token; mentorId = mentor.id;
  const admin = await createUserWithRole('admin');
  adminToken = admin.token; adminId = admin.id;
  console.log(`[DEBUG] Tokens created: student=${!!studentToken}, mentor=${!!mentorToken}, admin=${!!adminToken}`);
  console.log(`[DEBUG] adminToken val: ${adminToken}`);
});

describe('DEBUG: Token investigation', () => {
  it('should use admin token correctly', async () => {
    console.log(`[DEBUG TEST] adminToken=${adminToken}`);
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    console.log(`[DEBUG TEST] /api/users status: ${res.status}`);
    expect(res.status).toBe(200);
  });
});