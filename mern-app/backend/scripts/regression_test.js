/**
 * Comprehensive Regression Test Suite
 * Tests all endpoints: auth, events, participant, organizer, admin, and advanced features
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5000/api';
let PASS = 0, FAIL = 0;
const failures = [];

function ok(label) { PASS++; console.log(`  ✅ ${label}`); }
function fail(label, detail) { FAIL++; console.log(`  ❌ ${label}: ${detail}`); failures.push(`${label}: ${detail}`); }

async function req(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(BASE + urlPath);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, body: parsed, raw: data });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: null, raw: e.message }));
    if (body) {
      if (typeof body === 'string') r.write(body);
      else r.write(JSON.stringify(body));
    }
    r.end();
  });
}

async function uploadFile(urlPath, filePath, fieldName, token) {
  return new Promise((resolve) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: image/png\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const body = Buffer.concat([Buffer.from(header), fileContent, Buffer.from(footer)]);

    const url = new URL(BASE + urlPath);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'Authorization': `Bearer ${token}`,
      },
    };

    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, body: parsed, raw: data });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: null, raw: e.message }));
    r.write(body);
    r.end();
  });
}

function check(label, expected, res) {
  if (res.status === expected) {
    ok(`${label} (HTTP ${res.status})`);
    return true;
  } else {
    fail(label, `Expected HTTP ${expected}, got ${res.status} — ${(res.raw || '').substring(0, 200)}`);
    return false;
  }
}

async function solveCaptcha() {
  const res = await req('GET', '/auth/captcha');
  if (res.status !== 200 || !res.body) return null;
  const { captchaId, question } = res.body.data || res.body;
  // question is like "What is 16 - 7?" — extract the numbers and operator
  const match = question.match(/(\d+)\s*([+\-*x×])\s*(\d+)/);
  if (!match) { console.log('    ⚠️  CAPTCHA question not parseable:', question); return null; }
  const a = parseInt(match[1]), op = match[2], b = parseInt(match[3]);
  let answer;
  if (op === '+') answer = a + b;
  else if (op === '-') answer = a - b;
  else if (op === '*' || op === 'x' || op === '×') answer = a * b;
  else answer = a + b; // fallback
  return { captchaId, captchaAnswer: String(answer) };
}

async function run() {
  console.log('============================================');
  console.log('  REGRESSION TEST SUITE');
  console.log('============================================\n');

  // ═══ 1. AUTH ═══
  console.log('═══ 1. AUTH ENDPOINTS ═══');

  // 1a. CAPTCHA
  const cap1 = await req('GET', '/auth/captcha');
  check('GET /auth/captcha', 200, cap1);

  // 1b. Admin login
  const captcha = await solveCaptcha();
  if (!captcha) { fail('Solve CAPTCHA', 'Could not get captcha'); return; }
  
  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@felicity.com',
    password: 'admin123',
    ...captcha,
  });
  const adminOk = check('POST /auth/login (admin)', 200, adminLogin);
  const ADMIN_TOKEN = adminLogin.body?.token;
  if (adminOk) console.log(`    token=${ADMIN_TOKEN?.substring(0, 25)}...`);

  // 1c. Register new participant
  const cap2 = await solveCaptcha();
  const testEmail = `regtest_${Date.now()}@students.iiit.ac.in`;
  const regRes = await req('POST', '/auth/register', {
    email: testEmail,
    password: 'test1234',
    firstName: 'Regression',
    lastName: 'Tester',
    ...cap2,
  });
  const regOk = check('POST /auth/register (participant)', 201, regRes);
  const PART_TOKEN = regRes.body?.token;
  const PART_ID = regRes.body?.user?.id || regRes.body?.user?._id;
  if (regOk) console.log(`    id=${PART_ID}, email=${testEmail}`);

  // 1d. Login with same participant
  const cap3 = await solveCaptcha();
  const partLogin = await req('POST', '/auth/login', {
    email: testEmail,
    password: 'test1234',
    ...cap3,
  });
  check('POST /auth/login (participant)', 200, partLogin);

  // 1e. Auth me
  const me = await req('GET', '/auth/me', null, { Authorization: `Bearer ${PART_TOKEN}` });
  check('GET /auth/me', 200, me);

  // 1f. No token => 401
  const noAuth = await req('GET', '/auth/me');
  check('GET /auth/me (no token → 401)', 401, noAuth);

  // ═══ 2. PUBLIC EVENTS ═══
  console.log('\n═══ 2. PUBLIC EVENT ENDPOINTS ═══');

  const events = await req('GET', '/events');
  check('GET /events (browse)', 200, events);
  const eventsList = events.body?.data || [];
  console.log(`    ${eventsList.length} events found`);

  const trending = await req('GET', '/events/trending');
  check('GET /events/trending', 200, trending);

  const cats = await req('GET', '/events/categories');
  check('GET /events/categories', 200, cats);

  const orgs = await req('GET', '/events/organizers');
  check('GET /events/organizers', 200, orgs);
  const organizersList = orgs.body?.data || [];
  console.log(`    ${organizersList.length} organizers found`);

  // Event details (if any events exist)
  let TEST_EVENT_ID = null;
  if (eventsList.length > 0) {
    TEST_EVENT_ID = eventsList[0]._id;
    const detail = await req('GET', `/events/${TEST_EVENT_ID}`, null, { Authorization: `Bearer ${PART_TOKEN}` });
    check('GET /events/:id (details)', 200, detail);
    console.log(`    event="${detail.body?.data?.name}", isRegistered=${detail.body?.data?.isRegistered}`);
  } else {
    console.log('    ⚠️  No events in DB — skipping event detail test');
  }

  // ═══ 3. PARTICIPANT FLOWS ═══
  console.log('\n═══ 3. PARTICIPANT FLOWS ═══');
  const PH = { Authorization: `Bearer ${PART_TOKEN}` };

  const profile = await req('GET', '/participant/profile', null, PH);
  check('GET /participant/profile', 200, profile);

  const dash = await req('GET', '/participant/dashboard', null, PH);
  check('GET /participant/dashboard', 200, dash);

  const prefs = await req('GET', '/participant/preferences', null, PH);
  check('GET /participant/preferences', 200, prefs);

  const regEvents = await req('GET', '/participant/events/registered', null, PH);
  check('GET /participant/events/registered', 200, regEvents);

  const followedClubs = await req('GET', '/participant/clubs/following', null, PH);
  check('GET /participant/clubs/following', 200, followedClubs);

  // Update profile
  const upd = await req('PUT', '/participant/profile', { firstName: 'Updated', lastName: 'Name' }, PH);
  check('PUT /participant/profile', 200, upd);

  // Update preferences
  const updPref = await req('PUT', '/participant/preferences', { areasOfInterest: ['Tech', 'Music'] }, PH);
  check('PUT /participant/preferences', 200, updPref);

  // Follow a club (if organizer exists)
  if (organizersList.length > 0) {
    const orgId = organizersList[0]._id;
    const follow = await req('POST', `/participant/clubs/${orgId}/follow`, {}, PH);
    check('POST /participant/clubs/:id/follow', 200, follow);

    const unfollow = await req('DELETE', `/participant/clubs/${orgId}/follow`, null, PH);
    check('DELETE /participant/clubs/:id/unfollow', 200, unfollow);
  }

  // Register for an event (skip if only merchandise events exist)
  let REGISTRATION_ID = null;
  if (TEST_EVENT_ID) {
    // Check if event is merchandise type
    const evInfo = await req('GET', `/events/${TEST_EVENT_ID}`, null, PH);
    const evType = evInfo.body?.data?.eventType;
    if (evType === 'merchandise') {
      console.log('    ⚠️  Skipping register/cancel on existing event (merchandise type) — will test with organizer-created events');
    } else {
      const regEv = await req('POST', `/participant/events/${TEST_EVENT_ID}/register`, {}, PH);
      if (regEv.status === 201) {
        ok('POST /participant/events/:id/register (201)');
        REGISTRATION_ID = regEv.body?.data?.registration?._id;
        console.log(`    registrationId=${REGISTRATION_ID}`);
      } else if (regEv.status === 400 && regEv.body?.message?.includes('Already registered')) {
        ok('POST /participant/events/:id/register (already registered — 400 expected)');
      } else {
        fail('POST /participant/events/:id/register', `HTTP ${regEv.status}: ${regEv.body?.message}`);
      }

      // Cancel registration
      const cancelReg = await req('DELETE', `/participant/events/${TEST_EVENT_ID}/register`, null, PH);
      if (cancelReg.status === 200) {
        ok('DELETE /participant/events/:id/register (cancel)');
      } else if (cancelReg.status === 404) {
        ok('DELETE /participant/events/:id/register (no active reg — 404 expected)');
      } else {
        fail('DELETE /participant/events/:id/register', `HTTP ${cancelReg.status}: ${cancelReg.body?.message}`);
      }
    }
  }

  // Change password
  const pwChange = await req('PUT', '/participant/change-password', {
    currentPassword: 'test1234',
    newPassword: 'test12345',
  }, PH);
  check('PUT /participant/change-password', 200, pwChange);

  // ═══ 4. ADMIN FLOWS ═══
  console.log('\n═══ 4. ADMIN ENDPOINTS ═══');
  const AH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

  const adminDash = await req('GET', '/admin/dashboard', null, AH);
  check('GET /admin/dashboard', 200, adminDash);

  const adminEvents = await req('GET', '/admin/events', null, AH);
  check('GET /admin/events', 200, adminEvents);

  const adminParts = await req('GET', '/admin/participants', null, AH);
  check('GET /admin/participants', 200, adminParts);

  const adminOrgs = await req('GET', '/admin/organizers', null, AH);
  check('GET /admin/organizers', 200, adminOrgs);

  const pwResets = await req('GET', '/admin/password-reset-requests', null, AH);
  check('GET /admin/password-reset-requests', 200, pwResets);

  // ═══ 5. ORGANIZER FLOWS ═══
  console.log('\n═══ 5. ORGANIZER FLOWS ═══');

  // Create a test organizer via admin
  const cap4 = await solveCaptcha();
  const orgEmail = `testorg_${Date.now()}@iiit.ac.in`;
  const createOrg = await req('POST', '/admin/organizers', {
    email: orgEmail,
    password: 'org12345',
    organizerName: 'Test Club',
    clubName: 'Test Club',
    organizerType: 'club',
    category: 'Technical',
  }, AH);
  
  let ORG_TOKEN = null;
  let ORG_ID = null;
  if (createOrg.status === 201 || createOrg.status === 200) {
    ok(`POST /admin/organizers (create, HTTP ${createOrg.status})`);
    ORG_ID = createOrg.body?.data?.id || createOrg.body?.organizer?._id || createOrg.body?.data?._id;
    console.log(`    orgId=${ORG_ID}, email=${orgEmail}`);

    // Login as organizer
    const cap5 = await solveCaptcha();
    const orgLogin = await req('POST', '/auth/login', {
      email: orgEmail,
      password: 'org12345',
      ...cap5,
    });
    if (orgLogin.status === 200) {
      ok('POST /auth/login (organizer)');
      ORG_TOKEN = orgLogin.body?.token;
    } else {
      fail('POST /auth/login (organizer)', `HTTP ${orgLogin.status}: ${orgLogin.body?.message}`);
    }
  } else {
    fail('POST /admin/organizers', `HTTP ${createOrg.status}: ${createOrg.body?.message}`);
  }

  if (ORG_TOKEN) {
    const OH = { Authorization: `Bearer ${ORG_TOKEN}` };

    // Organizer dashboard
    const orgDash = await req('GET', '/organizer/dashboard', null, OH);
    check('GET /organizer/dashboard', 200, orgDash);

    // Create normal event
    const futureStart = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString();
    const regDeadline = new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString();

    const createEv = await req('POST', '/organizer/events', {
      eventName: 'Regression Test Event',
      eventDescription: 'Auto-created for regression testing',
      eventType: 'normal',
      category: 'Technical',
      eligibility: 'all',
      eventStartDate: futureStart,
      eventEndDate: futureEnd,
      registrationDeadline: regDeadline,
      registrationLimit: 100,
      venue: 'Test Venue',
      eventTags: ['test', 'regression'],
    }, OH);
    let NORMAL_EVENT_ID = null;
    if (createEv.status === 201) {
      ok('POST /organizer/events (create normal)');
      NORMAL_EVENT_ID = createEv.body?.event?._id;
      console.log(`    normalEventId=${NORMAL_EVENT_ID}`);
    } else {
      fail('POST /organizer/events (normal)', `HTTP ${createEv.status}: ${createEv.body?.message}`);
    }

    // Create merchandise event
    const createMerchEv = await req('POST', '/organizer/events', {
      eventName: 'Merch Test Event',
      eventDescription: 'Merchandise event for regression testing',
      eventType: 'merchandise',
      category: 'Cultural',
      eligibility: 'all',
      eventStartDate: futureStart,
      eventEndDate: futureEnd,
      registrationDeadline: regDeadline,
      registrationLimit: 50,
      venue: 'Merch Booth',
      merchandiseDetails: [
        { name: 'T-Shirt', size: 'M', price: 500, stock: 20 },
        { name: 'Hoodie', size: 'L', price: 1200, stock: 10 },
      ],
    }, OH);
    let MERCH_EVENT_ID = null;
    if (createMerchEv.status === 201) {
      ok('POST /organizer/events (create merchandise)');
      MERCH_EVENT_ID = createMerchEv.body?.event?._id;
      console.log(`    merchEventId=${MERCH_EVENT_ID}`);
    } else {
      fail('POST /organizer/events (merchandise)', `HTTP ${createMerchEv.status}: ${createMerchEv.body?.message}`);
    }

    // Publish normal event
    if (NORMAL_EVENT_ID) {
      const pub = await req('POST', `/organizer/events/${NORMAL_EVENT_ID}/publish`, {}, OH);
      check('POST /organizer/events/:id/publish (normal)', 200, pub);

      // Get event details as organizer
      const evDet = await req('GET', `/organizer/events/${NORMAL_EVENT_ID}`, null, OH);
      check('GET /organizer/events/:id (details)', 200, evDet);

      // Get registrations
      const evRegs = await req('GET', `/organizer/events/${NORMAL_EVENT_ID}/registrations`, null, OH);
      check('GET /organizer/events/:id/registrations', 200, evRegs);

      // Get analytics
      const evAn = await req('GET', `/organizer/events/${NORMAL_EVENT_ID}/analytics`, null, OH);
      check('GET /organizer/events/:id/analytics', 200, evAn);

      // ═══ REGISTER PARTICIPANT FOR THIS EVENT ═══
      console.log('\n--- Participant registers for organizer event ---');
      const regForEv = await req('POST', `/participant/events/${NORMAL_EVENT_ID}/register`, {}, PH);
      if (regForEv.status === 201) {
        ok('Participant registers for normal event');
        const regId = regForEv.body?.data?.registration?._id;
        const qrData = regForEv.body?.data?.registration?.qrCode;
        console.log(`    registrationId=${regId}, hasQR=${!!qrData}`);

        // ═══ 6. QR ATTENDANCE (Tier A) ═══
        console.log('\n═══ 6. QR SCANNER & ATTENDANCE (Tier A) ═══');

        // Get attendance stats
        const attStats = await req('GET', `/advanced/organizer/events/${NORMAL_EVENT_ID}/attendance`, null, OH);
        check('GET /attendance stats', 200, attStats);
        if (attStats.body?.data) {
          console.log(`    total=${attStats.body.data.total}, attended=${attStats.body.data.attended}`);
        }

        // Try to scan QR — we need the raw QR data (it's a data URL, we need the JSON inside)
        // The QR encodes JSON: {eventId, eventName, participantId, participantEmail, registeredAt}
        const qrJsonPayload = JSON.stringify({
          eventId: NORMAL_EVENT_ID,
          eventName: 'Regression Test Event',
          participantId: PART_ID,
          participantEmail: testEmail,
          registeredAt: new Date().toISOString(),
        });

        const scanRes = await req('POST', `/advanced/organizer/events/${NORMAL_EVENT_ID}/attendance/scan`, {
          qrData: qrJsonPayload,
        }, OH);
        if (scanRes.status === 200) {
          ok('POST /attendance/scan (QR scan mark attended)');
          console.log(`    ${scanRes.body?.message}`);
        } else {
          fail('POST /attendance/scan', `HTTP ${scanRes.status}: ${scanRes.body?.message}`);
        }

        // Duplicate scan → 409
        const dupScan = await req('POST', `/advanced/organizer/events/${NORMAL_EVENT_ID}/attendance/scan`, {
          qrData: qrJsonPayload,
        }, OH);
        check('POST /attendance/scan (duplicate → 409)', 409, dupScan);

        // Attendance stats after scan
        const attStats2 = await req('GET', `/advanced/organizer/events/${NORMAL_EVENT_ID}/attendance`, null, OH);
        if (attStats2.status === 200 && attStats2.body?.data?.attended >= 1) {
          ok('Attendance stats updated after scan');
          console.log(`    attended=${attStats2.body.data.attended}, rate=${attStats2.body.data.attendanceRate}%`);
        } else {
          fail('Attendance stats after scan', `attended=${attStats2.body?.data?.attended}`);
        }

        // Export CSV
        const csvExport = await req('GET', `/advanced/organizer/events/${NORMAL_EVENT_ID}/attendance/export`, null, OH);
        check('GET /attendance/export (CSV)', 200, csvExport);

      } else {
        fail('Participant registers for normal event', `HTTP ${regForEv.status}: ${regForEv.body?.message}`);
      }
    }

    // ═══ 7. MERCHANDISE PAYMENT WORKFLOW (Tier A) ═══
    console.log('\n═══ 7. MERCHANDISE PAYMENT WORKFLOW (Tier A) ═══');

    if (MERCH_EVENT_ID) {
      // Publish merch event
      const pubMerch = await req('POST', `/organizer/events/${MERCH_EVENT_ID}/publish`, {}, OH);
      check('POST /organizer/events/:id/publish (merch)', 200, pubMerch);

      // Get merch event details to find item IDs
      const merchDet = await req('GET', `/organizer/events/${MERCH_EVENT_ID}`, null, OH);
      const merchItems = merchDet.body?.data?.merchandiseItems || merchDet.body?.data?.merchandiseDetails || [];
      console.log(`    ${merchItems.length} merchandise items found`);

      if (merchItems.length > 0) {
        const firstItemId = merchItems[0]._id;

        // Participant registers for merch event (should go to pending)
        const merchReg = await req('POST', `/participant/events/${MERCH_EVENT_ID}/register`, {
          merchandiseItemId: firstItemId,
          quantity: 1,
        }, PH);

        if (merchReg.status === 201) {
          ok('Participant registers for merch event (pending)');
          const merchRegData = merchReg.body?.data?.registration;
          const merchRegId = merchRegData?._id;
          console.log(`    status=${merchRegData?.status}, paymentStatus=${merchRegData?.paymentStatus}`);

          if (merchRegData?.status === 'pending') {
            ok('Merch registration status = pending ✓');
          } else {
            fail('Merch registration status', `Expected "pending", got "${merchRegData?.status}"`);
          }

          if (merchRegData?.paymentStatus === 'pending_approval') {
            ok('Payment status = pending_approval ✓');
          } else {
            fail('Payment status', `Expected "pending_approval", got "${merchRegData?.paymentStatus}"`);
          }

          // Get merchandise orders as organizer
          const orders = await req('GET', `/advanced/organizer/events/${MERCH_EVENT_ID}/merchandise-orders`, null, OH);
          check('GET /merchandise-orders', 200, orders);
          console.log(`    ${(orders.body?.data || []).length} orders found`);

          // Upload payment proof (create a tiny test file)
          const testImgPath = '/tmp/test_payment_proof.png';
          // Create a minimal valid PNG (1x1 pixel)
          const pngHeader = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489000000', 'hex');
          const pngData = Buffer.from('0a49444154789c6260000000060005010d7a0000000049454e44ae426082', 'hex');
          fs.writeFileSync(testImgPath, Buffer.concat([pngHeader, pngData]));

          const uploadRes = await uploadFile(
            `/advanced/registrations/${merchRegId}/payment-proof`,
            testImgPath,
            'paymentProof',
            PART_TOKEN
          );
          check('POST /payment-proof upload', 200, uploadRes);

          // Reject payment first
          const rejectRes = await req('POST', `/advanced/organizer/events/${MERCH_EVENT_ID}/orders/${merchRegId}/reject`, {
            reason: 'Blurry screenshot — please reupload'
          }, OH);
          check('POST /orders/:id/reject', 200, rejectRes);

          // Re-upload after rejection
          const reupload = await uploadFile(
            `/advanced/registrations/${merchRegId}/payment-proof`,
            testImgPath,
            'paymentProof',
            PART_TOKEN
          );
          check('POST /payment-proof re-upload after rejection', 200, reupload);

          // Approve payment
          const approveRes = await req('POST', `/advanced/organizer/events/${MERCH_EVENT_ID}/orders/${merchRegId}/approve`, {}, OH);
          check('POST /orders/:id/approve', 200, approveRes);
          if (approveRes.body?.data?.qrCode) {
            ok('QR code generated on payment approval ✓');
          } else {
            fail('QR on approval', 'No qrCode in response');
          }
          if (approveRes.body?.data?.status === 'registered') {
            ok('Status changed to "registered" after approval ✓');
          } else {
            fail('Status after approval', `Expected "registered", got "${approveRes.body?.data?.status}"`);
          }

        } else {
          fail('Merch registration', `HTTP ${merchReg.status}: ${merchReg.body?.message}`);
        }
      }
    }

    // ═══ 8. DISCUSSION FORUM (Tier B) ═══
    console.log('\n═══ 8. DISCUSSION FORUM (Tier B) ═══');

    if (NORMAL_EVENT_ID) {
      // Post message as organizer
      const postMsg = await req('POST', `/advanced/events/${NORMAL_EVENT_ID}/forum`, {
        content: 'Welcome to the event discussion! This is a test announcement.',
        isAnnouncement: true,
      }, OH);
      check('POST /forum (organizer announcement)', 201, postMsg);
      const msgId = postMsg.body?.data?._id;
      if (postMsg.body?.data?.isAnnouncement) {
        ok('Message marked as announcement ✓');
      }

      // Post message as participant
      const partMsg = await req('POST', `/advanced/events/${NORMAL_EVENT_ID}/forum`, {
        content: 'Hello from a participant! Excited about this event!',
      }, PH);
      check('POST /forum (participant message)', 201, partMsg);
      const partMsgId = partMsg.body?.data?._id;

      // Post reply
      const replyMsg = await req('POST', `/advanced/events/${NORMAL_EVENT_ID}/forum`, {
        content: 'This is a reply to the organizer announcement.',
        parentMessageId: msgId,
      }, PH);
      check('POST /forum (reply/thread)', 201, replyMsg);

      // Get messages
      const getMsg = await req('GET', `/advanced/events/${NORMAL_EVENT_ID}/forum`, null, OH);
      check('GET /forum messages', 200, getMsg);
      console.log(`    ${getMsg.body?.data?.total || 0} messages in forum`);

      // Toggle reaction
      if (partMsgId) {
        const react = await req('POST', `/advanced/events/${NORMAL_EVENT_ID}/forum/${partMsgId}/react`, {
          emoji: '👍',
        }, OH);
        check('POST /forum/:id/react (add reaction)', 200, react);

        // Toggle same reaction again (remove)
        const unreact = await req('POST', `/advanced/events/${NORMAL_EVENT_ID}/forum/${partMsgId}/react`, {
          emoji: '👍',
        }, OH);
        check('POST /forum/:id/react (remove reaction)', 200, unreact);
      }

      // Pin message (organizer)
      if (msgId) {
        const pin = await req('PATCH', `/advanced/events/${NORMAL_EVENT_ID}/forum/${msgId}/pin`, {}, OH);
        check('PATCH /forum/:id/pin (pin message)', 200, pin);
      }

      // Delete message (participant deletes own)
      if (partMsgId) {
        const del = await req('DELETE', `/advanced/events/${NORMAL_EVENT_ID}/forum/${partMsgId}`, null, PH);
        check('DELETE /forum/:id (delete own message)', 200, del);
      }

      // Admin can also post (superuser access)
      const adminPost = await req('POST', `/advanced/events/${NORMAL_EVENT_ID}/forum`, {
        content: 'Admin posting in forum',
      }, AH);
      check('POST /forum (admin superuser → 201)', 201, adminPost);

      // Unregistered participant cannot post — create a 2nd participant
      const cap6 = await solveCaptcha();
      const unreg = await req('POST', '/auth/register', {
        email: `unreg_${Date.now()}@students.iiit.ac.in`,
        password: 'unreg1234',
        firstName: 'Unreg',
        lastName: 'User',
        ...cap6,
      });
      if (unreg.status === 201) {
        const unregToken = unreg.body?.token;
        const unregPost = await req('POST', `/advanced/events/${NORMAL_EVENT_ID}/forum`, {
          content: 'Unauthorized post attempt',
        }, { Authorization: `Bearer ${unregToken}` });
        check('POST /forum (unregistered participant → 403)', 403, unregPost);
      }
    }

    // ═══ 9. CLEANUP & EDGE CASES ═══
    console.log('\n═══ 9. EDGE CASES ═══');

    // Cancel a normal event
    if (NORMAL_EVENT_ID) {
      const cancel = await req('POST', `/organizer/events/${NORMAL_EVENT_ID}/cancel`, {}, OH);
      check('POST /organizer/events/:id/cancel', 200, cancel);
    }

    // Organizer profile
    const orgProfile = await req('GET', '/organizer/profile', null, OH);
    check('GET /organizer/profile', 200, orgProfile);

    // Organizer change password
    const orgPw = await req('PUT', '/organizer/change-password', {
      currentPassword: 'org12345',
      newPassword: 'org123456',
    }, OH);
    check('PUT /organizer/change-password', 200, orgPw);

    // Request password reset
    const orgResetReq = await req('POST', '/organizer/request-password-reset', {}, OH);
    check('POST /organizer/request-password-reset', 200, orgResetReq);

    // Invalid event ID → 404/500
    const badEvent = await req('GET', '/organizer/events/000000000000000000000000', null, OH);
    check('GET /organizer/events/:invalid (404)', 404, badEvent);

    // Delete draft event
    if (MERCH_EVENT_ID) {
      // Event was published, so delete should fail
      const delPub = await req('DELETE', `/organizer/events/${MERCH_EVENT_ID}`, null, OH);
      check('DELETE published event (400 expected)', 400, delPub);
    }

    // Admin delete organizer (cleanup)
    if (ORG_ID) {
      const delOrg = await req('DELETE', `/admin/organizers/${ORG_ID}`, null, AH);
      if (delOrg.status === 200) {
        ok('DELETE /admin/organizers/:id (cleanup)');
      } else {
        console.log(`    ⚠️  Cleanup: HTTP ${delOrg.status} — ${delOrg.body?.message}`);
      }
    }
  }

  // ═══ RESULTS ═══
  console.log('\n============================================');
  console.log(`  RESULTS: ${PASS} passed, ${FAIL} failed`);
  console.log('============================================');
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log(`  ❌ ${f}`));
  }

  process.exit(FAIL > 0 ? 1 : 0);
}

run().catch(e => { console.error('Test runner error:', e); process.exit(1); });
