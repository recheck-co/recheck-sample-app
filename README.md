# Setup

Please follow the instructions in the [developer docs](https://recheck.co/developer/docs/oauth/).

# Implementation details

This project is built with Node.js using the [passport](https://www.passportjs.org/) middleware for authentication. It makes use of the [passport-oauth2](https://www.passportjs.org/packages/passport-oauth2/) strategy to sign in using someone's Recheck identity.

## Authorization, token, and callback URLs

1. See [recheck-strategy.js](recheck-strategy.js) for how this is done with Passport.js
1. The callback url (see [auth.js](routes/auth.js#L53)) should be whatever URL in your app you want to handle the response after a user returns from being redirected over to Recheck

## Required options to enable OpenID Connect (OIDC)

* For passport.js, you will want to set the `pkce` and `state` options to `true` (see below)

## Strategy subclass for passport-oauth2
```javascript
var OAuth2Strategy = require('passport-oauth2');

class RecheckStrategy extends OAuth2Strategy {
    constructor(options, verify) {
        super({
            authorizationURL: `https://recheck.co/oauth/authorize/`,
            tokenURL: `https://recheck.co/oauth/token/`,
            clientID: process.env['RECHECK_CLIENT_ID'],
            clientSecret: process.env['RECHECK_CLIENT_SECRET'],
            scope: 'openid profile email phone',
            pkce: true,
            state: true,
            ...options // Allow passed in options to override defaults
        }, verify);
    }
}
```

## Tell Passport to use your custom RecheckStrategy for authentication
```javascript
var strategyCallback = async (accessToken, refreshToken, profile, cb) => {
  // This is where you'd do whatever you want after receiving a valid authentication
  // For example - storing the access/refresh keys for future API requests
  // or associatng the given recheck ID with the user in your database
};

var stratgyOptions = { callbackURL: `https://mycompany.com/login/oauth/recheck/callback` }
passport.use(new RecheckStrategy(stratgyOptions, strategyCallback));
```

## Setup the request to get userinfo after authorization is completed

* After an end user authorizes Recheck, you can make a request to the userinfo endpoint to get data like name/phone 
* Passport will automatically attempt to fetch userinfo from the API if you define a `userProfile` method on your strategy

### Passport userProfile method
```javascript
class RecheckStrategy extends OAuth2Strategy {
    
    ...

    parseUserInfo(err, profile, done) {
        // API will return a JSON string for profile data, parse it into an object
        const deserializedProfile = profile ? JSON.parse(profile) : profile;
        done(err, deserializedProfile);
    }

    userProfile(accessToken, done) {
        // Strategy subclasses are allowed to use the protected `_oauth2` variable
        return this._oauth2.getProtectedResource(
            `https://recheck.co/api/userinfo/`,
            accessToken,
            (err, profile) => this.parseUserInfo(err, profile, done)
        );
    };
}
```
