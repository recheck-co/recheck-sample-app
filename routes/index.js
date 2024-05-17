var express = require('express');
var router = express.Router();

router.get('/', function (req, res, next) {
  if (req.user) {
    return res.redirect('/home');
  }
  res.render('index', { title: 'Recheck Sample App' });
});

router.get('/home', function (req, res, next) {
  if (!req.user) {
    return res.redirect('/');
  }
  res.render('home', { 'user': req.user, title: `Welcome ${req.user.name || "unknown"}` });
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
