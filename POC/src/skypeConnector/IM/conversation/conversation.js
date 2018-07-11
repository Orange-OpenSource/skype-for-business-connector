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

const keys = require('../../../config/keys');
const skcoCommon = require('../../common/common');
const skcoIMCommon = require('../common/common');

const defaultSessionContext = 'HTD ' + Date.now();

// Get the startMessaging URL from App URL
const createStartMessagingURLFromAppResource = appResource => {
  return (
    keys.domain + appResource._embedded.communication._links.startMessaging.href
  );
};

const getOperationIdFromAppResource = appResource => {
  // Find the key of the prop in communicationProp whose value = 'please pass this in a PUT request'
  const { communication } = appResource._embedded;
  for (let key in communication) {
    if (communication[key] === 'please pass this in a PUT request') {
      return key;
    }
  }
  return null;
};

/**
 * Send invitation (actually send a POST to startMessaging URL)
 * @param {*} startMessagingURL
 * @param {*} accessToken
 * @param {*} destinationEmail eg. 'sip:foobar@orange.com'
 * @param {*} subject
 * @param {*} operationId
 * @param {*} options importance, sessionContext (string, Eg. 'HTD-' + Date.now()), etc (TBD)
 */
const sendPostStartMessagingRequest = (
  startMessagingURL,
  accessToken,
  destinationEmail,
  subject,
  operationId,
  { sessionContext = defaultSessionContext } = {}
) =>
  new Promise((resolve, reject) => {
    skcoCommon
      .proxyRequest({
        method: 'POST',
        uri: startMessagingURL,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken
        },
        json: true,
        body: {
          importance: 'Normal',
          sessionContext,
          subject,
          telemetryId: null,
          to: new skcoIMCommon.DestinationEmail(destinationEmail).toString(),
          operationId
        }
      })
      .then(({ err, res, body }) => {
        if (err) return reject(err);
        const stt = res.statusCode;
        if (stt !== 201) {
          return reject(JSON.stringify({ stt, body }));
        }
        // body is undefined
        resolve();
      });
  });

const extractConversationStateFromEventsResource = eventsResource => {
  const { sender } = eventsResource;
  const filteredSender = sender.filter(el => el.rel === 'communication');
  const senderChild = filteredSender[0];
  const { events } = senderChild;
  const filtered = events.filter(el => el.link.rel === 'conversation');
  const eventsChild = filtered[0];
  const conversationState = eventsChild._embedded.conversation.state;
  return conversationState;
};

/**
 * Check conversation state, if 'success', return. Else, keep asking
 * getEventsRequest, with events URL this time = next URL
 * @param {*} eventsURL
 * @param {*} accessToken
 * @param {*} options
 */
const returnEventsResourceWhenConnected = async (
  eventsURL,
  accessToken,
  { waitTime = 1000 } = {}
) => {
  const eventsResource = await skcoIMCommon.makeGetEventsRequest(
    eventsURL,
    accessToken
  );
  const conversationState = extractConversationStateFromEventsResource(
    eventsResource
  );
  if (conversationState === 'Connected') return eventsResource;
  const nextEventsURL = keys.domain + eventsResource._links.next.href;
  await skcoIMCommon.setTimeoutP(waitTime);
  return await returnEventsResourceWhenConnected(nextEventsURL, accessToken);
};

/**
 * Make its own startMessaging related actions, then return an eventsResource
 * @param {*} accessToken
 * @param {*} destinationEmail
 * @param {*} subject
 */
const startConversation = async (
  accessToken,
  destinationEmail,
  subject,
  appResource
) => {
  try {
    const startMessagingURL = createStartMessagingURLFromAppResource(
      appResource
    );
    const operationId = getOperationIdFromAppResource(appResource);
    await sendPostStartMessagingRequest(
      startMessagingURL,
      accessToken,
      destinationEmail,
      subject,
      operationId
    );
    const eventsURL = await skcoIMCommon.extractEventsURLFromAppResource(
      appResource
    );
    const eventsResource = await returnEventsResourceWhenConnected(
      eventsURL,
      accessToken
    );
    return eventsResource;
  } catch (err) {
    console.log('startConversation err');
    console.log(err);
  }
};

// ##########

/**
 * Start a conversation. Shorthand of making a POST request to the 'startMessaging' URL. Promise resolves to nothing.
 * @param {*} accessToken authenticated the server as an user
 * @param {*} destinationEmail
 * @param {*} subject
 * @param {*} appResource
 */
const startConversation_v2 = async (
  accessToken,
  destinationEmail,
  subject,
  appResource
) => {
  try {
    const URL = createStartMessagingURLFromAppResource(appResource);
    const opId = getOperationIdFromAppResource(appResource);
    await sendPostStartMessagingRequest(
      URL,
      accessToken,
      destinationEmail,
      subject,
      opId
    );
  } catch (err) {
    console.log('startConversation err', err);
  }
};

module.exports = {
  startConversation,
  startConversation_v2,
  dev: {
    createStartMessagingURLFromAppResource,
    getOperationIdFromAppResource,
    sendPostStartMessagingRequest,
    startConversation
  }
};
