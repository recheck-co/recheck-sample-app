var OAuth2Strategy = require('passport-oauth2');
var constants = require('./utils/constants');
var TokenError = require('passport-oauth2/lib/errors/tokenerror')

class RecheckStrategy extends OAuth2Strategy {
    constructor(options, verify) {
        const hostname = process.env['RECHECK_HOSTNAME'];
        super({
            authorizationURL: `${hostname}/${constants.RECHECK_OAUTH_PATH}/authorize/`,
            tokenURL: `${hostname}/${constants.RECHECK_OAUTH_PATH}/token/`,
            clientID: process.env['RECHECK_CLIENT_ID'],
            clientSecret: process.env['RECHECK_CLIENT_SECRET'],
            scope: 'openid profile email phone',
            pkce: true,
            state: true,
            ...options // Allow passed in options to override defaults
        }, verify);

        // log requests
        const originalGet = this._oauth2.get;
        this._oauth2.get = function (url, accessToken, callback) {
            const parsedUrl = new URL(url);
            console.log(`GET request to ${parsedUrl.origin}${parsedUrl.pathname} with access token ${accessToken}`);

            const wrappedCallback = (error, body, response) => {
                if (error) {
                    console.error(`GET request to ${parsedUrl.origin}${parsedUrl.pathname} failed: ${error}`);
                } else {
                    console.log(`GET response from ${parsedUrl.origin}${parsedUrl.pathname}: ${response.statusCode} - ${body}`);
                }
                callback(error, body, response);
            };

            return originalGet.call(this, url, accessToken, wrappedCallback);
        };

        const originalRequest = this._oauth2._request;
        this._oauth2._request = function (method, url, headers, postBody, accessToken, callback) {
            const parsedUrl = new URL(url);
            console.log(`${method} request to ${parsedUrl.origin}${parsedUrl.pathname} with access token ${accessToken} and body ${postBody}`);

            const wrappedCallback = (error, body, response) => {
                if (error) {
                    console.error(`${method} request to ${parsedUrl.origin}${parsedUrl.pathname} failed: ${error}`);
                } else {
                    console.log(`${method} response from ${parsedUrl.origin}${parsedUrl.pathname}: ${response.statusCode} - ${body}`);
                }
                callback(error, body, response);
            };

            return originalRequest.call(this, method, url, headers, postBody, accessToken, wrappedCallback);
        };
    }

    parseUserInfo(err, profile, done) {
        const deserializedProfile = profile ? JSON.parse(profile) : profile;
        done(err, deserializedProfile);
    }

    userProfile(accessToken, done) {
        // Strategy subclasses are allowed to use the protected `_oauth2` variable
        return this._oauth2.getProtectedResource(
            `${process.env['RECHECK_HOSTNAME']}/api/userinfo/`,
            accessToken,
            (err, profile) => this.parseUserInfo(err, profile, done)
        );
    };

    parseErrorResponse(body, status) {
        var json = JSON.parse(body);
        if (json.error) {
            if (status == 401 && json.error == 'invalid_client') {
                return new TokenError(
                    "Not authorized. Check to make sure your client ID and client secret are correct.",
                    json.error,
                    null,
                    status)
            }
        }
        return super.parseErrorResponse(body, status);
    };
}

module.exports = RecheckStrategy;