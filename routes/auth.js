var express = require('express');
var passport = require('passport');
var constants = require('../utils/constants');

var router = express.Router();
var RecheckStrategy = require('../recheck-strategy');

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

var stratgyOptions = {
  callbackURL: `${process.env['SAMPLE_APP_HOSTNAME']}/login/oauth/recheck/callback`
}
passport.use(new RecheckStrategy(stratgyOptions, strategyCallback));

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name, recheck_id: user.recheck_id });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

const passportOauthRedirectErrors = () => {
  return (req, res, next) => {
    const interceptedNext = (err) => {
      // Redirect back to login if we encounter any errors during auth
      if (err) {
        console.error(`Error during authentication: ${err}`);
        req.flash('error', 'We encountered an error during authentication. Maybe try again?');
        return res.redirect('/');
      }
      next();
    }

    try {
      passport.authenticate('oauth2', { failureRedirect: '/' })(req, res, interceptedNext);
    } catch (err) {
      next(err);
    }
  }
};

router.get('/login/oauth/recheck', passportOauthRedirectErrors());

router.get('/login/oauth/recheck/callback',
  passportOauthRedirectErrors(),

  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

module.exports = router;
