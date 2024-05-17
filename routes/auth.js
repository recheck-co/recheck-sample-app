var express = require('express');
var passport = require('passport');
var constants = require('../utils/constants');

var router = express.Router();
var RecheckStrategy = require('../recheck-strategy')

var strategyCallback = async (accessToken, refreshToken, profile, cb) => {
  // This is where you'd do whatever you want after receiving a valid authentication
  // For example - storing the access/refresh keys for future API requests
  // or associatng the given recheck ID with the user in your database (recheck ID will be profile.sub)

  // Wrap everything in a try/catch since passport won't await this function, given its callback-y nature
  try {
    var db = await require('../db');
    const row = await db.get(
      'SELECT * FROM federated_credentials WHERE provider = ? AND subject = ?', [
      constants.RECHECK_PROVIDER_NAME,
      profile.sub
    ]);

    if (!row) {
      const userResult = await db.run('INSERT INTO users (name, recheck_id) VALUES (?, ?)', [
        profile.full_name,
        profile.sub
      ]);

      var id = userResult.lastID;
      const credentialsResult = await db.run('INSERT INTO federated_credentials (user_id, provider, subject) VALUES (?, ?, ?)', [
        id,
        constants.RECHECK_PROVIDER_NAME,
        profile.sub
      ]);
      var user = {
        id: id,
        name: profile.full_name,
        recheck_id: profile.sub,
      };
      return cb(null, user);
    } else {
      const userRecord = await db.get('SELECT * FROM users WHERE id = ?', [row.user_id]);
      if (!userRecord) {
        return cb(null, false);
      }

      return cb(null, userRecord);
    }
  } catch (ex) {
    return cb(ex, false);
  }
};

// Callback URL should be modified to be whatever URL is appropriate to your app
var stratgyOptions = { callbackURL: `http://localhost:3000/login/oauth/recheck/callback` }
passport.use(new RecheckStrategy(stratgyOptions, strategyCallback));

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

router.get('/login', function (req, res, next) {
  if (req.user) {
    return res.redirect('/home');
  }
  res.render('login', { title: 'Recheck Sample App - Login' });
});

router.get('/login/oauth/recheck', async (req, res, next) => passport.authenticate('oauth2')(req, res, next));

router.get('/login/oauth/recheck/callback',
  async (req, res, next) => passport.authenticate('oauth2', { failureRedirect: '/login' })(req, res, next),
  async function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

// The same handlers as above in non-async form (a bit simpler since passport is callback-based)
// router.get('/login/oauth/recheck', passport.authenticate('oauth2'));

// router.get('/login/oauth/recheck/callback',
//   passport.authenticate('oauth2', { failureRedirect: '/login' }),
//   function (req, res) {
//     // Successful authentication, redirect home.
//     res.redirect('/');
//   });

module.exports = router;
