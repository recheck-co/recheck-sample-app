# Setup

## Install node and app packages (run setup.sh or install manually)

`./setup.sh`

## Set your client ID and secret

Open the `.env` file and set the `RECHECK_CLIENT_ID` and `RECHECK_CLIENT_SECRET` values to the ones provided for your app on the Recheck developer site.

## Run the app

`npm start`

## Check it out in your browser

Navigate to `http://localhost:3000/` to see things in action

# Implementation details

This project assumes a Node.js project using the [passport](https://www.passportjs.org/) middleware for authentication. It makes use of the [passport-oauth2](https://www.passportjs.org/packages/passport-oauth2/) strategy to sign in using someone's Recheck identity.

While this project setup for a Node.js / Express backend, there are a few basic steps that should be similar for most any languange or framework.

## Setup client ID and client secret values

1. Make sure you have a developer account provisioned on Recheck. If you don't, contact us at [support@recheck.co](mailto:support@recheck.co) to get one setup
1. Go to https://recheck.co/developer/apps/
1. Choose "Create Application" and give it an appropriate name (e.g MyCompany Recheck Connect)
1. Set the Redirect URI to `http://localhost:3000/login/oauth/recheck/callback`
1. Store the Client ID and Client Secret values in the `.env` file that was created when you setup the project (or an equivalent appropriate location in your project)

### Environment template

NOTE: You can store/retrieve these values however you want - this is just how this project stores them

```
RECHECK_CLIENT_ID=__ENTER_CLIENT_ID_FROM_DEVELOPER_SITE__
RECHECK_CLIENT_SECRET=__ENTER_CLIENT_SECRET_FROM_DEVELOPER_SITE__
```

## Setup Passport / your oauth library of choice

### Set authorization, token, and callback URLs

1. See [recheck-strategy.js](recheck-strategy.js) for how this is done with Passport.js
1. The authorization URL should be `https://recheck.co/oauth/authorize/`
1. The token URL should be `https://recheck.co/oauth/token/`
1. The callback url (see [auth.js](routes/auth.js#L53)) should be whatever URL in your app you want to handle the response after a user returns from being redirected over to Recheck

### Define scopes (or lack thereof) and any required options to enable OpenID Connect (OIDC)

* You may request any set of scopes from among `openid`, `profile`, `email`, `phone`, and `address`, but we will return the same data regardless of requested scopes (this may change in the future)
* For passport.js, you will want to set the `pkce` and `state` options to `true`

### Strategy subclass for passport-oauth2
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

### Tell Passport to use your custom RecheckStrategy for authentication
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

* After an end user authorizes Recheck, you will need to make a request to the userinfo API to get data like name/phone 
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
