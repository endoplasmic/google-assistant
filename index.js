'use strict';

const EventEmitter = require('events');
const util = require('util');

const Assistant = require('./components/assistant');
const Auth = require('./components/auth');
const Conversation = require('./components/conversation');

function GoogleAssistant(authConfig, callback) {
  if (authConfig === undefined) {
    const error = new Error('Missing auth config object!');
    this.emit('error', error);
    if (callback) callback(error);
    return;
  }

  let assistant;

  // we need to auth with Google right out of the gate
  const auth = new Auth(authConfig);

  auth.on('ready', (client) => {
    assistant = new Assistant(client);
    this.emit('ready', assistant);
    if (callback) callback(assistant);
  });

  this.start = (conversationConfig, callback) => {
    if (assistant === undefined) {
      const error = new Error('Tried calling start() before the ready event!');
      this.emit('error', error);
      if (callback) callback(error);
      return;
    }

    const conversation = new Conversation(assistant, conversationConfig);
    this.emit('started', conversation, assistant);
    if (callback) callback(conversation);
  };

  return this;
}

util.inherits(GoogleAssistant, EventEmitter);
module.exports = GoogleAssistant;
