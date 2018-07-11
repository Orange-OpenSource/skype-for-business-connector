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

const { writeFile } = require('fs');
const keys = require('../../config/keys');
const queryString = require('querystring');
const { promisify } = require('util');
const request = require('request');
const proxy = require('../../config/proxy');
const { EventEmitter } = require('events');

const logSomething = async (thing, name) => {
  let customName = '';
  if (name && typeof name === 'string') customName = name;
  await promisify(writeFile)(
    `thing-${Date.now()}-${customName}.txt`,
    JSON.stringify(thing, null, 2)
  );
};

/**
 * Wrapper of npm request module.
 * Always resolve as a promise.
 * The returned result is an object that contains 3 props: err, res, body.
 * They are originally args of the callback of request module.
 * @param {*} options request options. See request doc.
 */
const proxyRequest = options =>
  new Promise((resolve, reject) => {
    request(
      Object.assign({}, options, {
        proxy: proxy.cntlm ? proxy.proxy : null,
        rejectUnauthorized: false
      }),
      (err, res, body) => resolve({ err, res, body })
    );
  });

const doesEndWithJSON = namespace => namespace.endsWith('.json');

/**
 *
 * @param {*} namespace
 * @param {*} callback
 */
const proxyFDSGet = (namespace, callback) => {
  if (!doesEndWithJSON(namespace)) return callback('err: missing extension');
  request(
    {
      method: 'GET',
      proxy: proxy.cntlm ? proxy.proxy : null,
      uri: namespace,
      json: true
    },
    (err, res, body) => {
      if (err) return callback(err);
      const stt = res.statusCode;
      if (stt !== 200) return callback(stt);
      callback(null, JSON.parse(body));
    }
  );
};

/**
 * Push to FDS using its REST API and go through a proxy. Return a parsed
 * JSON.
 * @param {*} namespace namespace of the node to get. Should end with .json
 */
const proxyFDSGetP = promisify(proxyFDSGet);

const isDataJSON = data => {
  try {
    JSON.parse(data);
  } catch (e) {
    return false;
  }

  return true;
};

const proxyFDSPush = (namespace, dataJSON, callback) => {
  if (!doesEndWithJSON(namespace)) return callback('err: missing extension');
  if (!isDataJSON(dataJSON)) return callback('err: dataJSON isnt JSON');
  const reqOpts = {
    method: 'PUT',
    proxy: proxy.cntlm ? proxy.proxy : null,
    uri: namespace,
    headers: {
      'content-type': 'application/json'
    },
    body: dataJSON,
    json: true
  };
  proxyRequest(reqOpts)
    .then(({ err, res, body }) => {
      if (err) return callback(err);
      const stt = res.statusCode;
      if (stt !== 200) return callback(stt);
      callback(null);
    })
    .catch(err => callback(err));
};

/**
 * Equivalent to POST OAuth href with user credentials
 * @param {*} authURL
 * @param {*} skypeUsername
 * @param {*} skypePassword
 * @param {*} callback
 */
const sendPostAuthRequest = (
  authURL,
  skypeUsername,
  skypePassword,
  callback
) => {
  const formData = queryString.stringify({
    grant_type: 'password',
    username: skypeUsername,
    password: skypePassword
  });
  // console.log('formData', formData);
  const requestOptions = {
    method: 'POST',
    uri: authURL,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: formData
  };
  proxyRequest(requestOptions)
    .then(({ err, res, body }) => {
      if (err) return callback(err);
      const stt = res.statusCode;
      if (stt !== 200) return callback(stt);
      const { access_token } = JSON.parse(body);
      if (!access_token) return callback('access_token not found');
      callback(null, access_token);
    })
    .catch(err => callback(err));
};

/**
 * Create a token for corresponding username and password
 * HACKFIX, SPEEDUP
 * Consider knowing the correct domain => always use it
 * @param {*} skypeUsername
 * @param {*} skypePassword
 */
const getAccessToken = (skypeUsername, skypePassword) =>
  new Promise((resolve, reject) => {
    sendPostAuthRequest(
      keys.domain + '/WebTicket/oauthtoken',
      skypeUsername,
      skypePassword,
      (err, accessToken) => {
        if (err) return reject(err);
        resolve(accessToken);
      }
    );
  });

const getApplicationResourceFromFDS = async () => {
  const appResourceURLInFDS = keys.fdsNamespace + keys.fdsAppResourcePath;
  const appResource = (await proxyFDSGetP(appResourceURLInFDS)).value;
  return appResource;
};

/**
 * Return eventsResource
 * @param {*} eventsURL
 * @param {*} accessToken
 */
const sendGetEventsRequest = (eventsURL, accessToken) =>
  new Promise((resolve, reject) => {
    console.log('INFO: send... on eventsURL', eventsURL);
    const options = {
      method: 'GET',
      uri: eventsURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      }
    };
    proxyRequest(options)
      .then(({ err, res, body }) => {
        if (err) return reject(err);
        const stt = res.statusCode;
        if (stt !== 200) {
          console.log(
            'sendGetEventsRequest stt prob: stt & body',
            JSON.stringify({ stt, body })
          );
          return reject(stt);
        }
        const eventsResource = JSON.parse(body);
        resolve(eventsResource);
      })
      .catch(err => {
        console.log('sendGetEventsRequest err');
        reject(err);
      });
  });

/**
 * Send a Get Events request, without processing its response/error
 * @param {*} eventsURL
 * @param {*} accessToken
 */
const sendPGet = (eventsURL, accessToken) =>
  proxyRequest({
    method: 'GET',
    uri: eventsURL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + accessToken
    }
  });

const extractNextEventsURLFromEventsResource = eventsResource =>
  keys.domain + eventsResource._links.next.href;

// The idea is to keep running sendPGet (but only once at any moment),
// Each time the send... resolves or rejects, u forward its res to cb fn.
const loopSendPGet = (eventsURL, accessToken, cb) =>
  sendPGet(eventsURL, accessToken).then(({ err, res, body }) => {
    body = JSON.parse(body);
    if (err) {
      console.log('INFO: loopSendPGet sendPGet err', err);
      return new Promise.reject(err);
    }
    const stt = res.statusCode;
    if (stt !== 200) {
      const reason = JSON.stringify({ stt, body });
      console.log('INFO: loopSendPGet sendPGet stt prob: stt & body', reason);
      return new Promise.reject(reason);
    }
    // body here is the eventsResource
    cb(null, { eventsResource: body });
    // Pretty sure u have to update the eventsURL here
    let newEventsURL;
    if (body._links && body._links.next) {
      newEventsURL = keys.domain + body._links.next.href;
    } else if (body._links && body._links.resync) {
      newEventsURL = keys.domain + body._links.resync.href;
    } else {
      const reason =
        'INFO: received eventsResource but unable to extract _links' +
        JSON.stringify(body);
      return new Promise.reject(reason);
    }
    return loopSendPGet(newEventsURL, accessToken, cb);
  });

const increment = ack => {
  if (typeof ack !== 'number') ack = Number(ack);
  return ack + 1;
};

const createNextEventsURL = eventsURL => {
  const regex = /(?:=)(\d+)/;
  const match = eventsURL.match(regex);
  // console.log(match, Object.keys(match), match['1']);
  const newAck = increment(match['1']);
  const noAckEventsURL = eventsURL.slice(0, match['index'] + 1);
  // console.log(newAck, noAckEventsURL);
  return noAckEventsURL + newAck;
};

/**
 * EventsResource stream that gives out the latest eventsResource.
 * Listen to it via 'eventsResource' event.
 */
class EventsResourceSubject extends EventEmitter {
  /**
   * Create the stream. EventsResource stream that gives out the latest eventsResource. Listen to it via 'eventsResource' event.
   * @param {*} eventsURL could be null. If null, you should supply options.appResource
   * @param {*} accessToken
   * @param {*} options
   */
  constructor(eventsURL, accessToken, options) {
    super();
    if (options && options.appResource) {
      this.eventsURL = keys.domain + options.appResource._links.events.href;
    } else {
      this.eventsURL = eventsURL;
    }
    this.accessToken = accessToken;
  }

  /**
   * Private method
   * Start the stream. Return the stopInterval id that may be needed to stop the stream.
   * @param {*} ms
   * @param {*} options
   */
  _startStream(ms, options) {
    return setInterval(() => {
      console.log('this.eventsURL', this.eventsURL);
      sendGetEventsRequest(this.eventsURL, this.accessToken)
        .then(eventsResource => {
          // console.log(
          //   'eventsResource',
          //   JSON.stringify(eventsResource, null, 2)
          // );
          // Normal case
          if (eventsResource._links && eventsResource._links.next) {
            this.eventsURL = extractNextEventsURLFromEventsResource(
              eventsResource
            );
            this.emit('eventsResource', {
              eventsResource
            });
            console.log('fired!');
          } else {
            // Bad case, need resync
            this.eventsURL = keys.domain + eventsResource._links.resync.href;
            console.log('next: resync', this.eventsURL);
          }
        })
        // .catch(console.log.bind(console));
        .catch(err => {
          // // Unseen error
          // if (err !== 409) {
          //   console.log(err);
          // } else {
          //   // 409 Conflict PGetReplaced error
          //   // console.log(this.eventsURL);
          //   // TODO Find a way to increment this eventsURL for the next time you run it
          //   const nextEventsURL = createNextEventsURL(this.eventsURL);
          //   this.eventsURL = nextEventsURL;
          // }
          // EXPERIMENT: Show the error, but don't fix it.
          console.log(err);
        });
    }, ms);
  }

  /**
   * Private method
   * Implementation of startStream, by respecting Microsoft's P-Get guideline
   * @param {*} ms
   * @param {*} options
   */
  async _startStreamPGet(ms, options) {
    loopSendPGet(this.eventsURL, this.accessToken, (nullErr, data) =>
      this.emit('eventsResource', { eventsResource: data.eventsResource })
    );
  }

  /**
   *
   * @param {*} options { type = null, ms = 1000 }
   * * type: value = null | 'P-GET'. Decide which version of stream you want to listen to.
   * * ms: value = 1000 by default. Decide how often you want to send the GET events resource request.
   */
  startStream(options) {
    if (options && options.type && options.type === 'P-GET') {
      console.log('INFO: Stream type P-GET is selected');
      const ms = options.ms || 1000;
      return this._startStreamPGet(ms, options);
    }
    return this._startStream(ms, options);
  }
}

class EventsResourceSubjectFDS {
  constructor(eventsURL, accessToken, namespace, options) {
    if (options && options.appResource) {
      this.eventsURL = options.appResource._links.events.href;
    } else {
      this.eventsURL = eventsURL;
    }
    this.accessToken = accessToken;
    this.namespace = namespace;
  }

  startStream(ms, options) {
    return setInterval(() => {
      sendGetEventsRequest(this.eventsURL, this.accessToken)
        .then(eventsResource => {
          this.eventsURL = extractNextEventsURLFromEventsResource(
            eventsResource
          );
          proxyFDSPush(this.namespace, eventsResource, err =>
            console.log(
              'INFO: EventsResourceSubjectFDS startStream proxyFDSPush err',
              err
            )
          );
        })
        .catch(console.log.bind(console));
    }, ms);
  }
}

class EventsResourceSubjectFactory {
  constructor() {}

  /**
   *
   * @param {*} type LOCAL|FDS
   * @param {*} eventsURL
   * @param {*} accessToken
   * @param {*} namespace mandatory if type = FDS. Else null
   * @param {*} options
   */
  createEventsResourceSubject(
    type,
    eventsURL,
    accessToken,
    namespace,
    options
  ) {
    switch (type) {
      case 'LOCAL':
        return new EventsResourceSubject(eventsURL, accessToken, options);
      default:
        return new EventsResourceSubjectFDS(
          eventsURL,
          accessToken,
          namespace,
          options
        );
    }
  }
}

module.exports = {
  logSomething,
  getAccessToken,
  proxyRequest,
  proxyFDSPush,
  proxyFDSGet,
  proxyFDSGetP,
  getApplicationResourceFromFDS,
  EventsResourceSubjectFactory,
  sendGetEventsRequest
};
