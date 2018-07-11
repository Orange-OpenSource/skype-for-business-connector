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

const { promisify } = require('util');
const { writeFile } = require('fs');
const keys = require('../../../config/keys');
const skcoCommon = require('../../common/common');

const extractEventsURLFromAppResource = appResource =>
  keys.domain + appResource._links.events.href;

const logEventsResource = async eventsResource => {
  await promisify(writeFile)(
    `eventsResource-${Date.now()}.txt`,
    JSON.stringify(eventsResource, null, 2)
  );
};

/**
 * DEPRECATED
 * Return eventsResource
 * @param {*} eventsURL
 * @param {*} accessToken
 */
const makeGetEventsRequest = (eventsURL, accessToken) =>
  new Promise((resolve, reject) => {
    console.log('INFO: makeGetEventsRequest on eventsURL = ', eventsURL);
    const options = {
      method: 'GET',
      uri: eventsURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      }
    };
    skcoCommon
      .proxyRequest(options)
      .then(({ err, res, body }) => {
        if (err) return reject(err);
        const stt = res.statusCode;
        if (stt !== 200) {
          console.log('makeGetEventsRequest stt err');
          console.log('with stt and body', stt, body);
          return reject(stt);
        }
        const resolvingContent = JSON.parse(body);
        // await logEventsResource(resolvingContent);
        resolve(resolvingContent);
      })
      .catch(err => {
        console.log('makeGetEventsRequest err');
        reject(err);
      });
  });

const setTimeoutP = timer =>
  new Promise(resolve => {
    setTimeout(resolve, timer);
  });

/**
 * DEPRECATED
 * @param {*} eventsResource 
 */
const extractNextEventsURLFromEventsResource = eventsResource =>
  keys.domain + eventsResource._links.next.href;

const _validateEmail = email => email.indexOf('sip:') !== -1;

class DestinationEmail {
  constructor(email) {
    this.email = _validateEmail(email) ? email : 'sip:' + email;
  }

  toString() {
    return this.email;
  }
}

module.exports = {
  extractEventsURLFromAppResource,
  makeGetEventsRequest,
  setTimeoutP,
  extractNextEventsURLFromEventsResource,
  DestinationEmail
};

module.exports.dev = {
  makeGetEventsRequest,
  extractEventsURLFromAppResource
};
