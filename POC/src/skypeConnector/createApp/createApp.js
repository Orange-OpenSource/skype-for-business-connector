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

const keys = require('../../config/keys');
const { promisify } = require('util');
const { getAccessToken } = require('../common/common');
const skcoCommon = require('../common/common');
const request = require('request');

const getApplicationURL = (accessToken, callback) => {
  const requestURL =
    keys.domain + '/Autodiscover/AutodiscoverService.svc/root/oauth/user';
  const reqOpts = {
    method: 'GET',
    uri: requestURL,
    headers: {
      Authorization: 'Bearer ' + accessToken
    }
  };
  skcoCommon
    .proxyRequest(reqOpts)
    .then(({ err, res, body }) => {
      if (err) {
        console.log('INFO: getApplicationURL proxyRequest err');
        return callback(err);
      }
      const stt = res.statusCode;
      if (stt !== 200)
        return callback('getApplicationURL proxyRequest stt ' + stt);
      const parsed = JSON.parse(body);
      const appURL = parsed._links.applications.href;
      callback(null, appURL);
    })
    .catch(err => {
      console.log('INFO: getApplicationURL err');
      return callback(err);
    });
};

/**
 * Create an app URL, such as https://myDomain.com/ucwa/oauth/v1/applications,
 * that points to the applicationResource.
 * @param {*} accessToken
 */
const getApplicationURLP = promisify(getApplicationURL);

/**
 *
 * @param {*} appResourceJSON
 * @param {*} callback
 */
const saveAppResourceInFDS = (appResourceJSON, callback) => {
  skcoCommon.proxyFDSPush(
    keys.fdsNamespace + keys.fdsAppResourcePath,
    JSON.stringify({ value: appResourceJSON }),
    err => {
      if (err) return callback(err);
      console.log('INFO: saveAppResourceInFDS executed!');
      callback(null);
    }
  );
};

/**
 *
 * @param {*} appResourceJSON
 */
const saveAppResourceInFDSP = promisify(saveAppResourceInFDS);

// This fn somehow got away without proxy param, so I leave it there
// with OG request module.
const sendPostRegisterAppRequest = (
  appURL,
  accessToken,
  userAgent,
  endpointId,
  culture
) =>
  new Promise((resolve, reject) => {
    request(
      {
        method: 'POST',
        uri: appURL,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken
        },
        // proxy: proxy.cntlm ? proxy.proxy : null,
        rejectUnauthorized: false,
        body: {
          userAgent,
          endpointId,
          culture
        },
        json: true
      },
      (err, res, body) => {
        if (err) {
          console.log('INFO: sendPostRegisterAppRequest err');
          return reject(err);
        }
        const stt = res.statusCode;
        if (stt !== 201)
          return reject(
            `sendPostRegisterAppRequest stt ${stt} & body: ${JSON.stringify(
              body,
              null,
              2
            )}`
          );
        resolve(body);
      }
    );
  });

/**
 * registerApp returns 201 and appResource the 1st time I register with a brand new endpoint.
 * Subsequent registration(s) with the same endpoint will only result in you
 * receiving a 200 + a same body anyway.
 * @param {*} appURL
 * @param {*} accessToken
 * @param {*} options
 */
const registerApp = async (appURL, accessToken, options) => {
  try {
    const { lyncUserAgent, lyncEndpointId, lyncCulture } = keys;
    const appResource = await sendPostRegisterAppRequest(
      appURL,
      accessToken,
      lyncUserAgent,
      lyncEndpointId,
      lyncCulture
    );
    // await saveAppResourceInFDSP(appResource);
    return appResource;
  } catch (err) {
    console.log('INFO: registerApp err');
    console.log(err);
  }
};

module.exports = {
  getApplicationURLP,
  registerApp,
  dev: {
    getApplicationURL,
    getApplicationURLP,
    registerApp
  }
};
