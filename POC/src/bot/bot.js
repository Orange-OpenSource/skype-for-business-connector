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

const {
  askBot,
  SmartlyConfig
} = require('../../libs/smartlyDialogAPI/smartlyDialogAPI');
const keys = require('../config/keys');
const creds = new SmartlyConfig(
  keys.smartlyBotLang,
  keys.smartlyBotSkillId,
  keys.smartlyAccessToken
);
const {
  startConversation,
  sendMessage,
  getAccessToken,
  getApplicationURLP,
  registerApp,
  enableReceivingIncomingMessages,
  extractAndCleanMessageFromEventsResource,
  EventsResourceSubjectFactory,
  logSomething
} = require('../skypeConnector');

let accessToken, appResource, eventsResource;

/**
 * Register a new application, and start a new conversation with the desired destination and subject.
 */
const init = async (dest, subj) => {
  accessToken = await getAccessToken(keys.lyncUsername, keys.lyncPassword);
  const appURL = await getApplicationURLP(accessToken);
  appResource = await registerApp(appURL, accessToken);
  const defDest = 'sip:foo.bar@orange.com';
  const defSubj = new Date().toDateString();
  await startConversation(
    accessToken,
    dest || defDest,
    subj || defSubj,
    appResource
  );
  const creds = new SmartlyConfig(
    keys.smartlyBotLang,
    keys.smartlyBotSkillId,
    keys.smartlyAccessToken
  );
  const fac = new EventsResourceSubjectFactory();
  const stream = fac.createEventsResourceSubject(
    'LOCAL',
    null,
    accessToken,
    null,
    { appResource }
  );
  await enableReceivingIncomingMessages(accessToken, appResource);
  const id = stream.startStream({ type: 'P-GET' });
  stream.on('eventsResource', ({ eventsResource }) => {
    try {
      const msg = extractAndCleanMessageFromEventsResource(eventsResource);
      askBot(creds, 'NEW_INPUT', msg, (err, smartlyData) => {
        let smartlyAnswer;
        if (err) {
          console.log('askBot err', err);
          smartlyAnswer = 'error in askBot in bot.js';
        } else {
          smartlyAnswer = smartlyData.answer;
        }
        console.log('smartlyAnswer', smartlyAnswer);
        // WARNING: I ignored checking the Connected state of the conversation,
        // because if people just sent me something (extraction success), that
        // means they have already accepted my conversation.
        sendMessage(accessToken, eventsResource, smartlyAnswer)
          .then(() => {
            console.log('INFO: Answer sent!\n');
          })
          .catch(console.log.bind(console));
      });
    } catch (extractErr) {
      // Nothing to do, the message just hasnt come yet
    }
  });
};

module.exports = {
  init
};
