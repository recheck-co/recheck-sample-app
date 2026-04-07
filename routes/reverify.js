var express = require('express');
var constants = require('../utils/constants');

var router = express.Router();

var recheckHostname = process.env['RECHECK_HOSTNAME'];
var clientId = process.env['RECHECK_CLIENT_ID'];
var appHostname = process.env['SAMPLE_APP_HOSTNAME'];

// Step 1: User clicks "Verify identity" — create a session and redirect to Recheck
router.post('/reverify', async function (req, res, next) {
  if (!req.user) {
    return res.redirect('/');
  }

  try {
    var db = await require('../db');
    const userRecord = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const recheckToken = userRecord.recheck_token;

    if (!recheckToken) {
      req.flash('error', 'No recheck token found for this user.');
      return res.redirect('/home');
    }

    // Create verification session
    const response = await fetch(`${recheckHostname}/${constants.RECHECK_OAUTH_PATH}/reverify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        recheck_token: recheckToken,
        reference_user_id: String(req.user.id),
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Reverify session creation failed: ${response.status} - ${errorBody}`);
      req.flash('error', 'Failed to start identity verification. Please try again.');
      return res.redirect('/home');
    }

    const { session_id } = await response.json();

    // Step 2: Redirect user to Recheck for selfie verification
    const redirectUri = encodeURIComponent(`${appHostname}/reverify/callback`);
    res.redirect(`${recheckHostname}/reverify/?session=${session_id}&redirect_uri=${redirectUri}`);
  } catch (err) {
    console.error(`Error starting reverification: ${err}`);
    req.flash('error', 'An error occurred starting identity verification.');
    res.redirect('/home');
  }
});

// Step 3: Handle the callback from Recheck
router.get('/reverify/callback', async function (req, res, next) {
  if (!req.user) {
    return res.redirect('/');
  }

  const sessionId = req.query.session;
  const code = req.query.code;

  if (!sessionId || !code) {
    req.flash('error', 'Invalid verification callback.');
    return res.redirect('/home');
  }

  try {
    // Step 4: Fetch the result
    const response = await fetch(
      `${recheckHostname}/${constants.RECHECK_OAUTH_PATH}/reverify/${sessionId}/?client_id=${clientId}&code=${code}`
    );

    if (response.status === 410) {
      req.flash('error', 'Verification session has expired. Please try again.');
      return res.redirect('/home');
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Reverify result fetch failed: ${response.status} - ${errorBody}`);
      req.flash('error', 'Failed to retrieve verification result. Please try again.');
      return res.redirect('/home');
    }

    const result = await response.json();

    // Verify the reference_user_id matches the current user
    if (result.reference_user_id !== String(req.user.id)) {
      req.flash('error', 'Verification user mismatch. Please try again.');
      return res.redirect('/home');
    }

    if (result.status === 'pass') {
      // Update stored recheck_token with the fresh one
      var db = await require('../db');
      await db.run('UPDATE users SET recheck_token = ? WHERE id = ?', [
        result.recheck_token,
        req.user.id
      ]);
      req.user.recheck_token = result.recheck_token;
    }

    const renderData = {
      title: process.env['SAMPLE_APP_NAME'],
      status: result.status,
      name: req.user.name,
      recheck_id: req.user.recheck_id,
      recheck_token: req.user.recheck_token,
    };

    if (result.status === 'pending') {
      const redirectUri = encodeURIComponent(`${appHostname}/reverify/callback`);
      renderData.resumeUrl = `${recheckHostname}/reverify/?session=${sessionId}&redirect_uri=${redirectUri}`;
    }

    res.render('reverify-result', renderData);
  } catch (err) {
    console.error(`Error fetching reverification result: ${err}`);
    req.flash('error', 'An error occurred during identity verification.');
    res.redirect('/home');
  }
});

module.exports = router;
