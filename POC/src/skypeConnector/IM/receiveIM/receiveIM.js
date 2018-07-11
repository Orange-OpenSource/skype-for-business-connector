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

const skcoIMCommon = require('../common/common');
const skcoCommon = require('../../common/common');
const keys = require('../../../config/keys');
const { EventEmitter } = require('events');

const extractMakeMeAvailablePathFromAppResource = appResource =>
  appResource._embedded.me._links.makeMeAvailable.href;

const sendPostMakeMeAvailableRequest = (makeMeAvailablePath, accessToken) =>
  new Promise((resolve, reject) => {
    const postURL = keys.domain + makeMeAvailablePath;
    const requestOptions = {
      method: 'POST',
      uri: postURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      json: true,
      body: {
        SupportedModalities: ['Messaging']
      }
    };
    skcoCommon
      .proxyRequest(requestOptions)
      .then(({ err, res, body }) => {
        if (err) return reject(err);
        const stt = res.statusCode;
        if (stt !== 204) {
          console.log(
            'INFO: sendPostMakeMeAvailableRequest stt problem: stt & body',
            JSON.stringify({ stt, body })
          );
          return reject(stt);
        }
        resolve(stt); // 204
      })
      .catch(err => {
        console.log('INFO: sendPostMakeMeAvailableRequest err', err);
      });
  });

/**
 * Enable server to receive any message
 * @param {*} accessToken
 * @param {*} appResource
 */
const enableReceivingIncomingMessages = async (accessToken, appResource) => {
  const mmaPath = extractMakeMeAvailablePathFromAppResource(appResource);
  await sendPostMakeMeAvailableRequest(mmaPath, accessToken);
};

const extractMessageFromEventsResource = eventsResource => {
  console.log(
    'eventsResource.sender children',
    eventsResource.sender.map(el => el.rel)
  );
  const conversation = eventsResource.sender.filter(
    el => el.rel === 'conversation'
  )[0];
  const eventsLinkMessage = conversation.events.filter(
    el => el.link.rel === 'message'
  )[0];
  const res = eventsLinkMessage._embedded.message._links.plainMessage.href;
  return res;
};

// message Eg. 'data:text/plain;charset=utf-8,TOTO+TUAN%0d%0a'
const cleanMessage = text => {
  const firstPartToRemove = 'data:text/plain;charset=utf-8,';
  const cuttedBefore = text.slice(
    text.indexOf(firstPartToRemove) + firstPartToRemove.length
  );
  const cleanedMessage = decodeURIComponent(cuttedBefore);
  const removedPluses = cleanedMessage.replace(/\+/g, ' ');
  console.log('removedPluses', removedPluses);
  return removedPluses;
};

// ##########

/**
 * Detect a plain message in eventsResource
 * @param {*} eventsResource
 */
const extractAndCleanMessageFromEventsResource = eventsResource => {
  const rawMsg = extractMessageFromEventsResource(eventsResource);
  const msg = cleanMessage(rawMsg);
  return msg;
};

module.exports = {
  enableReceivingIncomingMessages,
  extractAndCleanMessageFromEventsResource,
  dev: {
    extractMakeMeAvailablePathFromAppResource,
    enableReceivingIncomingMessages,
    extractMessageFromEventsResource
  },
  experiment: {
    enableReceivingIncomingMessages,
    extractMessageFromEventsResource,
    cleanMessage
  }
};
