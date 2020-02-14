const fetch = require('node-fetch');
const crypto = require('crypto');
const uuid = require('uuid/v4');

const API_ENDPOINT_1 = 'https://eurouter.ablecloud.cn:9005/zc-account/v1/';
const API_ENDPOINT_2 = 'https://eurouter.ablecloud.cn:9005/millService/v1/';
const REQUEST_TIMEOUT = '300';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/x-zc-object',
  Connection: 'Keep-Alive',
  'X-Zc-Major-Domain': 'seanywell',
  'X-Zc-Msg-Name': 'millService',
  'X-Zc-Sub-Domain': 'milltype',
  'X-Zc-Seq-Id': '1',
  'X-Zc-Version': '1',
};

const authenticate = async (username, password, logger) => {
  const url = API_ENDPOINT_1 + 'login';
  const method = 'POST';
  const headers = {
    ...DEFAULT_HEADERS,
  };
  const body = JSON.stringify({ account: username, password });
  logger.debug(`request: { method: ${method}, url: ${url}, headers: ${JSON.stringify(headers)}, body: ${body} }`);
  const response = await fetch(url, {
    method,
    headers,
    body,
  });
  const json = await response.json();
  logger.debug(`response: ${JSON.stringify(json)}`);
  if (response.ok && !json.error) {
    return json;
  } else {
    throw new Error(`errorCode: ${json.errorCode}, error: ${json.error}, description: ${json.description}`);
  }
};

const command = async (userId, token, command, payload, logger) => {
  const url = API_ENDPOINT_2 + command;
  const method = 'POST';
  const nonce = uuid()
    .replace(/-/g, '')
    .toUpperCase()
    .substring(0, 16);
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(REQUEST_TIMEOUT + timestamp + nonce + token)
    .digest('hex');
  const body = JSON.stringify(payload);
  const headers = {
    ...DEFAULT_HEADERS,
    'X-Zc-Timestamp': timestamp,
    'X-Zc-Timeout': REQUEST_TIMEOUT,
    'X-Zc-Nonce': nonce,
    'X-Zc-User-Id': userId,
    'X-Zc-User-Signature': signature,
    'X-Zc-Content-Length': body.length,
  };
  logger.debug(`request: { method: ${method}, url: ${url}, headers: ${JSON.stringify(headers)}, body: ${body} }`);
  const response = await fetch(url, {
    method,
    headers,
    body,
  });
  let json;
  try {
    json = await response.json();
  } catch (e) {
    json = {};
  }
  logger.debug(`response: ${JSON.stringify(json)}`);
  if (response.ok && !json.error) {
    return json;
  } else {
    throw new Error(`error: { errorCode: ${json.errorCode}, error: ${json.error}, description: ${json.description} }`);
  }
};

module.exports = {
  authenticate,
  command,
};
