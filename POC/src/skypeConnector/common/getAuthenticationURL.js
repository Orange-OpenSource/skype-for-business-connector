/*
 * skype-for-business-server-connector
 *
 * Copyright 2018 Orange
 * <tuan.dunghoang@orange.com>
 *
 * This library is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by the
 * Free Software Foundation; either version 2.1 of the License, or (at your
 * option) any later version.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License
 * for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library; if not, write to the Free Software Foundation,
 * Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 *
 */

const request = require('request');
const proxy = require('../config/proxy');
const keys = require('../config/keys');
const proxyFDSGet = require('../common/proxyFDSGet');
const proxyFDSPush = require('../common/proxyFDSPush');
const { promisify } = require('util');
const getAccessToken = require('./getAccessToken');

const getAutodiscoveryURLFromFDS = callback => {
  proxyFDSGet(keys.fdsNamespace + '/autodiscoveryURL.json', callback);
};

const extractUserURL = source => source._links.user.href;

const extractXframeURL = source => source._links.xframe.href;

const makeRequest = (userURL, referer, accessToken, callback) => {
  request(
    {
      method: 'GET',
      uri: userURL,
      headers: {
        'Content-Type': 'application/json',
        Referer: referer || undefined,
        Authorization: accessToken ? 'Bearer ' + accessToken : undefined
      },
      proxy: proxy.cntlm ? proxy.proxy : null,
      rejectUnauthorized: false,
      json: true
    },
    (err, res, body) => {
      // console.log('body', body);
      if (!body) return callback(null, res);
      callback(null, body);
    }
  );
};

// source is something like this:
// 'Bearer trusted_issuers="", client_id="00000004-0000-0ff1-ce00-000000000000", MsRtcOAuth href="https://foobar.com/WebTicket/oauthtoken",grant_type="urn:microsoft.rtc:windows,urn:microsoft.rtc:anonmeeting,password"'
const extractAuthenticationURL = source => {
  source = source.headers['www-authenticate'];
  const hrefPos = source.indexOf('href=');
  const cuttedBefore = source.slice(hrefPos + 'href="'.length);
  const closingDoubleQuotePos = cuttedBefore.indexOf('"');
  const cuttedAfter = cuttedBefore.slice(0, closingDoubleQuotePos);
  return cuttedAfter;
};

const extractDomain = URL => {
  const dotComPos = URL.indexOf('.com');
  const cuttedAfter = URL.slice(0, dotComPos + '.com'.length);
  return cuttedAfter;
};

const getAuthenticationURL = callback => {
  getAutodiscoveryURLFromFDS((err, obj) => {
    if (err) {
      console.log('INFO: getAuthenticationURL err');
      return callback(err);
    }

    const userURL = extractUserURL(obj);
    const xframeURL = extractXframeURL(obj);

    makeRequest(userURL, xframeURL, null, (err, res) => {
      const fakeAuthURL = extractAuthenticationURL(res);

      // HACKFIX, SPEEDUP
      // Detect immediately the correct authentication URL, in case of cross
      // domain pool.
      getAccessToken(fakeAuthURL, (err, accessToken) => {
        makeRequest(userURL, null, accessToken, (noErr, body) => {
          const latestDomain = extractDomain(body._links.self.href);
          const oldDomain = extractDomain(fakeAuthURL);

          // Save the domain in FDS
          proxyFDSPush(
            keys.fdsNamespace + '/domain.json',
            JSON.stringify({ value: latestDomain }),
            err => {
              if (err) return callback(err);

              // Return chosen Auth URL
              if (latestDomain === oldDomain)
                return callback(null, fakeAuthURL);

              callback(null, latestDomain + '/WebTicket/oauthtoken');
            }
          );
        });
      });
    });
  });
};

module.exports = getAuthenticationURL;

module.exports.P = promisify(getAuthenticationURL);
