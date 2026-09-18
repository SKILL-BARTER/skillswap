/*
 * End-to-end smoke test: register -> add skills -> find match -> request swap
 * -> accept -> complete -> review, plus the guard rails in between.
 *
 * Usage: start the API (npm run dev:api) then run: npm run test:flow
 * Set API_URL to point at a different host (default http://localhost:4000/api).
 */

const API = process.env.API_URL || 'http://localhost:4000/api';

let passed = 0;
let failed = 0;

const ok = (cond, label, extra = '') => {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${label} ${extra}`);
  }
};

async function req(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function run() {
  console.log(`\nSkill-Swap end-to-end flow test against ${API}\n`);
  const stamp = Date.now();
  const uniqueSkill = `Kalimba ${stamp}`; // unique per run so the new match is unambiguous

  // 1. Demo student signs in
  const mayaLogin = await req('/auth/login', {
    method: 'POST',
    body: { email: 'maya@demo.edu', password: 'demo1234' },
  });
  ok(mayaLogin.status === 200, 'Demo student (maya@demo.edu) can sign in');
  if (mayaLogin.status !== 200) throw new Error('Sign-in failed, is the demo data seeded?');
  const maya = {
    token: mayaLogin.data.token,
    id: mayaLogin.data.user.id,
    credits: mayaLogin.data.user.credits,
  };

  // 2. Register a fresh student
  const reg = await req('/auth/register', {
    method: 'POST',
    body: {
      name: 'Smoke Tester',
      email: `smoke+${stamp}@test.edu`,
      password: 'testpass123',
      university: 'UC Berkeley',
    },
  });
  ok(reg.status === 201, 'A new student can register');
  const bob = { token: reg.data.token, id: reg.data.user.id };

  const badAuth = await req('/matches', { token: 'not-a-real-token' });
  ok(badAuth.status === 401, 'Invalid sessions are rejected with 401');

  // 3. Add skills: Bob teaches the unique skill and wants Python; Maya wants the unique skill
  const bobTeach = await req('/skills/mine', {
    method: 'POST',
    token: bob.token,
    body: { name: uniqueSkill, type: 'teach', level: 4 },
  });
  ok(bobTeach.status === 201, 'Student can add "I can teach" skills');
  await req('/skills/mine', {
    method: 'POST',
    token: bob.token,
    body: { name: 'Python', type: 'learn', level: 2 },
  });
  const mayaLearn = await req('/skills/mine', {
    method: 'POST',
    token: maya.token,
    body: { name: uniqueSkill, type: 'learn', level: 1 },
  });
  ok(mayaLearn.status === 201, 'Student can add "I want to learn" skills');

  // 4. Matching should surface Bob as a strong two-way match for Maya
  const matches = await req('/matches', { token: maya.token });
  const bobMatch = matches.data.matches.find((m) => m.user.id === bob.id);
  ok(!!bobMatch, 'New student appears in the other student\u2019s matches');
  ok(
    bobMatch?.breakdown?.some((b) => b.label.startsWith('Two-way swap')),
    'Two-way swap receives the +20 bonus in the breakdown'
  );
  ok(bobMatch?.score >= 70, `Two-way match scores >= 70 (got ${bobMatch?.score})`);
  ok(bobMatch?.breakdown?.length >= 3, 'Match score comes with an explainable breakdown');
  ok(!!bobMatch?.suggestion, 'Match suggests a concrete exchange (teach X / learn Y)');

  // 5. Bob sends a swap request to Maya
  const bobSkills = await req('/skills/mine', { token: bob.token });
  const mayaProfile = await req(`/users/${maya.id}`, { token: bob.token });
  const pythonSkill = mayaProfile.data.user.skills.teach.find((s) => s.name === 'Python');
  const teachSkillId = bobSkills.data.skills.teach[0].skill_id;

  const created = await req('/swaps', {
    method: 'POST',
    token: bob.token,
    body: {
      to_user_id: maya.id,
      teach_skill_id: teachSkillId,
      learn_skill_id: pythonSkill.skill_id,
      message: 'Smoke test: trade my kalimba for your Python?',
    },
  });
  ok(created.status === 201, 'A swap request can be sent');
  const swapId = created.data.swap.id;

  const dup = await req('/swaps', {
    method: 'POST',
    token: bob.token,
    body: { to_user_id: maya.id, teach_skill_id: teachSkillId, learn_skill_id: pythonSkill.skill_id },
  });
  ok(dup.status === 409, 'A duplicate active swap with the same student is rejected');

  const wrongAccept = await req(`/swaps/${swapId}/accept`, { method: 'POST', token: bob.token });
  ok(wrongAccept.status === 403, 'Only the recipient can accept a swap request');

  // 6. Maya accepts
  const accept = await req(`/swaps/${swapId}/accept`, { method: 'POST', token: maya.token });
  ok(accept.status === 200 && accept.data.swap.status === 'accepted', 'The recipient can accept the swap');

  // 7. Maya marks it completed
  const complete = await req(`/swaps/${swapId}/complete`, { method: 'POST', token: maya.token });
  ok(
    complete.status === 200 && complete.data.swap.status === 'completed',
    'An accepted swap can be marked completed'
  );

  // 8. Credits are awarded to both sides
  const mayaMe = await req('/auth/me', { token: maya.token });
  const bobMe = await req('/auth/me', { token: bob.token });
  ok(mayaMe.data.user.credits === maya.credits + 10, 'Completing awards +10 skill credits (sender side)');
  ok(bobMe.data.user.credits === 10, 'Completing awards +10 skill credits (recipient side)');

  // 9. Both sides review once
  const review1 = await req(`/swaps/${swapId}/review`, {
    method: 'POST',
    token: maya.token,
    body: { rating: 5, comment: 'Patient teacher, highly recommend.' },
  });
  ok(review1.status === 200 && review1.data.swap.my_review === true, 'Reviewer sees their review recorded');
  const review2 = await req(`/swaps/${swapId}/review`, {
    method: 'POST',
    token: bob.token,
    body: { rating: 4, comment: 'Clear explanations, would swap again.' },
  });
  ok(review2.status === 200, 'The other side can review too');
  const reviewDup = await req(`/swaps/${swapId}/review`, {
    method: 'POST',
    token: bob.token,
    body: { rating: 5, comment: 'Trying to review twice.' },
  });
  ok(reviewDup.status === 409, 'Reviewing twice is rejected');

  // 10. Trust data shows up on profiles
  const bobProfile = await req(`/users/${bob.id}`, { token: maya.token });
  ok(
    bobProfile.data.user.rating.count === 1 && bobProfile.data.user.rating.avg === 5,
    'The review appears on the reviewee\u2019s public profile'
  );
  ok(bobProfile.data.user.completed_swaps === 1, 'Completed swap count is tracked on the profile');
  const mayaAfter = await req(`/users/${maya.id}`, { token: bob.token });
  ok(
    mayaAfter.data.user.rating.count === mayaLogin.data.user.rating.count + 1,
    'The other side\u2019s review shows on their profile too'
  );

  // 11. University e-mail gate: personal addresses can't register
  const gmail = await req('/auth/register', {
    method: 'POST',
    body: { name: 'No Student', email: 'someone@gmail.com', password: 'testpass123' },
  });
  ok(gmail.status === 403, 'Registering with a personal (gmail.com) address is rejected');
  const uniEmail = await req('/auth/register', {
    method: 'POST',
    body: { name: 'Uni Student', email: `someone-${stamp}@harvard.edu`, password: 'testpass123' },
  });
  ok(uniEmail.status === 201, 'Registering with a university address still works');

  // 12. Selfie verification flips on the verified badge
  const badSelfie = await req('/users/me/verify-selfie', {
    method: 'POST',
    token: bob.token,
    body: { selfie: 'data:image/jpeg;base64,' + 'A'.repeat(4000) },
  });
  ok(badSelfie.status === 400, 'A fake (non-image) selfie is rejected');

  // Minimal real JPEG, padded past the minimum size — the server checks the magic bytes.
  const jpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==',
    'base64'
  );
  const paddedJpeg = Buffer.concat([jpeg, Buffer.alloc(4000)]);
  const selfie = await req('/users/me/verify-selfie', {
    method: 'POST',
    token: bob.token,
    body: { selfie: 'data:image/jpeg;base64,' + paddedJpeg.toString('base64') },
  });
  ok(selfie.status === 200 && selfie.data.user.verified === true, 'A valid selfie earns the verified badge');
  ok(selfie.data.user.selfie_data === undefined, 'The stored selfie is never sent back to clients');

  const bobPublic = await req(`/users/${bob.id}`, { token: maya.token });
  ok(bobPublic.data.user.verified === true, 'Other students see the verified flag on the profile');
  const matchesAfter = await req('/matches', { token: maya.token });
  const bobMatchAfter = matchesAfter.data.matches.find((m) => m.user.id === bob.id);
  ok(bobMatchAfter?.user.verified === true, 'Match cards carry the verified flag too');

  // Cleanup: remove the temporary skill Maya added for the test
  const mayaSkills = await req('/skills/mine', { token: maya.token });
  const temp = mayaSkills.data.skills.learn.find((s) => s.name === uniqueSkill);
  if (temp) await req(`/skills/mine/${temp.id}`, { method: 'DELETE', token: maya.token });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\nSmoke test crashed:', err.message);
  process.exit(1);
});
