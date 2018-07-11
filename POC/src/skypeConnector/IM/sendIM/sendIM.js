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

const skcoCommon = require('../../common/common');
const skcoIMCommon = require('../common/common');
const keys = require('../../../config/keys');

const keepEverythingButLastFragment = text => {
  const fragments = text.split('/');
  const res = fragments.slice(0, fragments.length - 1).join('/');
  return res;
};

// There is a collection of links that is needed for sending or terminating
// conversation.
const extractInstantMessageLinksFromEventsResource = eventsResource => {
  const { sender } = eventsResource;
  const conversation = sender.filter(el => el.rel === 'conversation')[0];
  const conversationsEventsChildren = conversation.events.map(
    el => el.link.rel
  );
  if (conversationsEventsChildren.indexOf('messaging') !== -1) {
    const messaging = conversation.events.filter(
      el => el.link.rel === 'messaging'
    )[0];
    const links = messaging._embedded.messaging._links;
    return links;
  }
  // A thing that is deeply nested in conversation, events, link, href
  const selectedLink = conversation.events.filter(
    el => el.link.rel === 'message'
  )[0].link.href;
  console.log('selectedLink', selectedLink);
  const fakeSendMessageHref = keepEverythingButLastFragment(selectedLink);
  return { sendMessage: { href: fakeSendMessageHref } };
};

// Send a message (to the sendMessage URL (arg))
// then up-to-date return eventsResource
const sendPostSendMessageRequest = (
  sendMessagePath,
  message,
  accessToken,
  eventsURL
) =>
  new Promise(async (resolve, reject) => {
    try {
      const requestOptions = {
        method: 'POST',
        uri: keys.domain + sendMessagePath,
        headers: {
          'Content-Type': 'text/plain',
          Authorization: 'Bearer ' + accessToken
        },
        body: message
      };
      const { err, res, body } = await skcoCommon.proxyRequest(requestOptions);
      if (err) return reject(err);
      const stt = res.statusCode;
      if (stt !== 201) {
        console.log('INFO stt', stt);
        console.log('INFO body', body);
        return reject(stt);
      }
      console.log(
        'INFO: sendPostSendMessageRequest makeGetEventsRequest: doing'
      );
      const eventsResource = await skcoIMCommon.makeGetEventsRequest(
        keys.domain + eventsURL,
        accessToken
      );
      resolve(eventsResource);
    } catch (err) {
      console.log('sendMessage err', err);
    }
  });

/**
 * Send a message as the owner of accessToken to sendMessage URL defined in eventsResource. Return a new eventsResource.
 * @param {*} accessToken
 * @param {*} eventsResource
 * @param {*} message
 */
const sendMessage = async (accessToken, eventsResource, message) => {
  // Monitor the case where after sending a message, the app receives an
  // eventsResource that has sender = [].
  await skcoCommon.logSomething(eventsResource);
  if (
    eventsResource &&
    eventsResource._links &&
    eventsResource._links.resync &&
    eventsResource._links.resync.href
  ) {
    const newEventsURL = keys.domain + eventsResource._links.resync.href;
    console.log('INFO: sendMessage makeGetEventsRequest resync: doing');
    eventsResource = await skcoIMCommon.makeGetEventsRequest(
      newEventsURL,
      accessToken
    );
    await skcoCommon.logSomething(eventsResource, 'resynced');
  }
  const links = extractInstantMessageLinksFromEventsResource(eventsResource);
  const sendMsgPath = links.sendMessage.href;
  const newEventsResource = await sendPostSendMessageRequest(
    sendMsgPath,
    message,
    accessToken,
    eventsResource._links.next.href
  );
  return newEventsResource;
};

// ##########

/**
 * Send a message as the owner of accessToken (aka. server) to sendMessage URL defined in eventsResource. Promise resolves to nothing
 * @param {*} accessToken
 * @param {*} eventsResource
 * @param {*} message
 */
const sendMessage_v2 = async (accessToken, eventsResource, message) =>
  new Promise((resolve, reject) => {
    const sendMsgPath = extractInstantMessageLinksFromEventsResource(
      eventsResource
    ).sendMessage.href;
    const requestOptions = {
      method: 'POST',
      uri: keys.domain + sendMsgPath,
      headers: {
        'Content-Type': 'text/plain',
        Authorization: 'Bearer ' + accessToken
      },
      body: message
    };
    skcoCommon
      .proxyRequest(requestOptions)
      .then(({ err, res, body }) => {
        if (err) return reject(err);
        const stt = res.statusCode;
        if (stt !== 201) {
          console.log(
            'INFO: sendMessage_v2 stt prob: stt & body',
            JSON.stringify({ stt, body })
          );
          return reject(stt);
        }
        resolve();
      })
      .catch(console.log.bind(console));
  });

module.exports = {
  extractInstantMessageLinksFromEventsResource,
  sendPostSendMessageRequest,
  sendMessage,
  sendMessage_v2,
  dev: {
    extractInstantMessageLinksFromEventsResource,
    sendMessage,
    sendPostSendMessageRequest
  }
};
