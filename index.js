'use strict';

const EventEmitter = require('events');
const util = require('util');

const Assistant = require('./components/assistant');
const Auth = require('./components/auth');
const Conversation = require('./components/conversation');

function GoogleAssistant(config) {
  if (config === undefined) config = {};

  let assistant;

  // we need to auth with Google right out of the gate
  const auth = new Auth(config.auth);

  auth.on('ready', (client) => {
    assistant = new Assistant(client);
    this.emit('ready', assistant);
  });

  this.start = (callback) => {
    const conversation = new Conversation(assistant, config.audio);
    this.emit('started', conversation);
    if (callback) callback(conversation);
  };

  return this;
}

util.inherits(GoogleAssistant, EventEmitter);
module.exports = GoogleAssistant;
