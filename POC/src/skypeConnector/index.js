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

const skcoCommon = require('./common/common');
const skcoIMCommon = require('./IM/common/common');
const conversation = require('./IM/conversation/conversation');
const sendIM = require('./IM/sendIM/sendIM');
const receiveIM = require('./IM/receiveIM/receiveIM');
const keys = require('../config/keys');
const createApp = require('./createApp/createApp');

module.exports = {
  getAccessToken: skcoCommon.getAccessToken,
  getApplicationURLP: createApp.getApplicationURLP,
  registerApp: createApp.registerApp,
  startConversation: conversation.startConversation_v2,
  sendMessage: sendIM.sendMessage_v2,
  // experimental
  EventsResourceSubjectFactory: skcoCommon.EventsResourceSubjectFactory,
  enableReceivingIncomingMessages: receiveIM.enableReceivingIncomingMessages,
  extractAndCleanMessageFromEventsResource:
    receiveIM.extractAndCleanMessageFromEventsResource,
  logSomething: skcoCommon.logSomething,
  sendGetEventsRequest: skcoCommon.sendGetEventsRequest
};
