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

class SmartlyConfig {
  constructor(
    lang,
    skill_id,
    accessToken,
    user_id = 'ORANGE_HTD_LIB',
    platform = 'ORANGE_HTD_LIB_PLATFORM'
  ) {
    this._validateLang(lang);
    this.lang = lang;
    this._validateSkillId(skill_id);
    this.skillId = skill_id;
    this._validateAccessToken(accessToken);
    this.accessToken = accessToken;
    this.userId = user_id;
    this.platform = platform;
  }

  _validateLang(value) {
    if (value === null || value === undefined) throw new Error('undefined');
    if (typeof value !== 'string') throw new Error('lang isnt string');
    const allLangs = 'en-us;en-gb;en-au;en-ca;en-in;fr-fr;fr-ca;de-de';
    if (allLangs.indexOf(value) === -1)
      throw new Error('lang uses undefined value');
  }

  _validateSkillId(value) {
    if (value === null || value === undefined) throw new Error('undefined');
    if (typeof value !== 'string') throw new Error('skill_id isnt a string');
    if (value.length === 0) throw new Error('skill_id cant be empty');
  }

  _validateAccessToken(value) {
    if (value === null || value === undefined) throw new Error('undefined');
    if (typeof value !== 'string') throw new Error('accessToken isnt a string');
    if (value.length === 0) throw new Error('accessToken cant be empty');
  }
}

/**
 *
 * @param {*} smartlyConfigObject
 * @param {*} eventName
 * @param {*} input
 * @return Promise<Object> JSON containing the answer from Smartly Dialog API. Please see docs.smartly.ai/#API.
 */
const askBot = (smartlyConfigObject, eventName, input) =>
  new Promise((resolve, reject) => {
    if (!smartlyConfigObject.constructor)
      throw new Error('invalid smartlyConfigObject');
    if (eventName !== 'NEW_INPUT' && eventName !== 'NEW_DIALOG_SESSION')
      throw new Error('invalid eventName');
    if (
      typeof input === 'string' &&
      input.length > 0 &&
      eventName === 'NEW_DIALOG_SESSION'
    )
      throw new Error('invalid combination of input and eventName');
    const {
      lang,
      skillId,
      accessToken,
      userId,
      platform
    } = smartlyConfigObject;
    request(
      {
        method: 'POST',
        uri: 'https://apis.nectarine.ai/api/dialog/',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`
        },
        json: true,
        body: {
          user_id: userId,
          lang,
          skill_id: skillId,
          user_data: {},
          platform,
          event_name: eventName,
          input
        }
      },
      (err, res, body) => {
        if (err) return reject(err);
        const stt = res.statusCode;
        if (stt !== 200) return reject(stt);
        resolve(body);
      }
    );
  });

module.exports = {
  SmartlyConfig,
  askBot
};
