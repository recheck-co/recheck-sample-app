var express = require('express');
var router = express.Router();

router.get('/', function (req, res, next) {
  if (req.user) {
    return res.redirect('/home');
  }
  res.render('index', {
    title: process.env['SAMPLE_APP_NAME']
  });
});

router.get('/home', function (req, res, next) {
  if (!req.user) {
    return res.redirect('/');
  }

  res.render('home', {
    title: process.env['SAMPLE_APP_NAME'],
    user: req.user,
    name: `${req.user.name}`,
    recheck_id: `${req.user.recheck_id}`
  });
});

router.post('/logout', function (req, res, next) {
  req.session.user = null
  req.session.save(function (err) {
    if (err) next(err)

    // regenerate the session, which is good practice to help
    // guard against forms of session fixation
    req.session.regenerate(function (err) {
      if (err) next(err)
      res.redirect('/')
    })
  });
});

module.exports = router;
