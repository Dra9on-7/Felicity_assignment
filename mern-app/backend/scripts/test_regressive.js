const http = require('http');

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  let passed = 0, failed = 0;
  function check(label, condition) {
    if (condition) { passed++; console.log('   ' + label + ' ✅'); }
    else { failed++; console.log('   ' + label + ' ❌'); }
  }

  console.log('=== REGRESSIVE TESTS ===\n');

  // 1. Login as organizer
  console.log('1. Login as organizer...');
  const loginRes = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/auth/login',
    method: 'POST', headers: { 'Content-Type': 'application/json' }
  }, { email: 'testclub@iiit.ac.in', password: 'test123456' });
  check('Login status 200', loginRes.status === 200);
  const token = loginRes.body && loginRes.body.token;
  if (!token) { console.log('   No token, cannot continue'); return; }

  // 2. Test date validation - past start date
  console.log('\n2. Create event with past start date (should fail)...');
  const pastDateRes = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/organizer/events',
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
  }, {
    eventName: 'Past Event', eventType: 'normal',
    eventStartDate: '2023-01-01', eventEndDate: '2023-01-02',
    category: 'Technical'
  });
  check('Rejected with 400', pastDateRes.status === 400);
  console.log('   Message: ' + (pastDateRes.body && pastDateRes.body.message));

  // 3. Test date validation - end before start
  console.log('\n3. Create event with end before start (should fail)...');
  const endBeforeStart = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/organizer/events',
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
  }, {
    eventName: 'Bad Date Event', eventType: 'normal',
    eventStartDate: '2026-06-15', eventEndDate: '2026-06-10',
    category: 'Technical'
  });
  check('Rejected with 400', endBeforeStart.status === 400);
  console.log('   Message: ' + (endBeforeStart.body && endBeforeStart.body.message));

  // 4. Test date validation - deadline after start
  console.log('\n4. Create event with deadline after start (should fail)...');
  const deadlineAfterStart = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/organizer/events',
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
  }, {
    eventName: 'Bad Deadline Event', eventType: 'normal',
    eventStartDate: '2026-06-15', eventEndDate: '2026-06-20',
    registrationDeadline: '2026-06-18',
    category: 'Sports'
  });
  check('Rejected with 400', deadlineAfterStart.status === 400);
  console.log('   Message: ' + (deadlineAfterStart.body && deadlineAfterStart.body.message));

  // 5. Create valid event with category and venue
  console.log('\n5. Create valid event with category and venue...');
  const validEvent = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/organizer/events',
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
  }, {
    eventName: 'Test Category Event ' + Date.now(), eventType: 'normal',
    eventStartDate: '2026-07-01', eventEndDate: '2026-07-02',
    registrationDeadline: '2026-06-28',
    category: 'AI/ML', venue: 'Himalaya Hall',
    eventDescription: 'A test event', eligibility: 'all'
  });
  check('Created with 201', validEvent.status === 201);
  const event = validEvent.body && validEvent.body.event;
  const eventId = event && event._id;
  check('Category saved correctly', event && event.category === 'AI/ML');
  check('Venue saved correctly', event && event.venue === 'Himalaya Hall');
  console.log('   Event ID: ' + eventId);

  if (eventId) {
    // 6. Publish the event
    console.log('\n6. Publish the event...');
    const publishRes = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/api/organizer/events/' + eventId + '/publish',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    });
    check('Published with 200', publishRes.status === 200);

    // 7. End event early
    console.log('\n7. End event early...');
    const endEarlyRes = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/api/organizer/events/' + eventId + '/end-early',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    });
    check('Ended with 200', endEarlyRes.status === 200);
    const endData = endEarlyRes.body && endEarlyRes.body.data;
    check('Status is completed', endData && endData.status === 'completed');
    console.log('   Message: ' + (endEarlyRes.body && endEarlyRes.body.message));

    // 8. Try ending already completed event (should fail)
    console.log('\n8. Try ending already completed event (should fail)...');
    const endAgainRes = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/api/organizer/events/' + eventId + '/end-early',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    });
    check('Rejected with 400', endAgainRes.status === 400);
    console.log('   Message: ' + (endAgainRes.body && endAgainRes.body.message));

    // 9. Clean up - delete the test event
    console.log('\n9. Clean up test event...');
    const deleteRes = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/api/organizer/events/' + eventId,
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    });
    check('Deleted', deleteRes.status === 200 || deleteRes.status === 204);
  }

  // 10. Login as admin
  console.log('\n10. Login as admin...');
  const adminLogin = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/auth/login',
    method: 'POST', headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@felicity.com', password: 'admin123' });
  check('Admin login 200', adminLogin.status === 200);
  const adminToken = adminLogin.body && adminLogin.body.token;

  if (adminToken) {
    // 11. Admin dashboard
    console.log('\n11. Admin dashboard...');
    const dashRes = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/api/admin/dashboard',
      method: 'GET', headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    check('Dashboard 200', dashRes.status === 200);

    // 12. Get organizers
    console.log('\n12. Get all organizers...');
    const orgRes = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/api/admin/organizers',
      method: 'GET', headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    check('Organizers 200', orgRes.status === 200);
    console.log('   Organizers count: ' + ((orgRes.body && orgRes.body.data && orgRes.body.data.length) || 0));
  }

  // 13. Get event categories endpoint
  console.log('\n13. Get event categories...');
  const catRes = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/events/categories',
    method: 'GET', headers: {}
  });
  check('Categories 200', catRes.status === 200);
  console.log('   Categories: ' + JSON.stringify(catRes.body && catRes.body.data));

  // 14. Get organizer profile
  console.log('\n14. Get organizer profile...');
  const profileRes = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/organizer/profile',
    method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
  });
  check('Profile 200', profileRes.status === 200);

  // 15. Get organizer dashboard
  console.log('\n15. Get organizer dashboard...');
  const orgDashRes = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/organizer/dashboard',
    method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
  });
  check('Organizer dashboard 200', orgDashRes.status === 200);

  console.log('\n=== RESULTS: ' + passed + ' passed, ' + failed + ' failed out of ' + (passed + failed) + ' tests ===');
}

runTests().catch(e => console.error('Test error:', e));
