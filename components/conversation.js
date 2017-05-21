'use strict';

const EventEmitter = require('events');
const util = require('util');

const embeddedAssistant = require('../lib/google/assistant/embedded/v1alpha1/embedded_assistant_pb');

const END_OF_UTTERANCE = embeddedAssistant.ConverseResponse.EventType.END_OF_UTTERANCE;
const DIALOG_FOLLOW_ON = embeddedAssistant.ConverseResult.MicrophoneMode.DIALOG_FOLLOW_ON;
const CLOSE_MICROPHONE = embeddedAssistant.ConverseResult.MicrophoneMode.CLOSE_MICROPHONE;
const DEFAULT_GRPC_DEADLINE = 60 * 3 + 5;

let conversationState;
let volume = 100;

const createRequest = (params) => {
  if (params === undefined) params = {};

  let encodingIn = embeddedAssistant.AudioInConfig.Encoding.LINEAR16;
  if (params.encodingIn !== undefined && isNaN(params.encodingIn)) {
    // let's try to resolve it
    Object.keys(embeddedAssistant.AudioInConfig.Encoding).forEach((encoding) => {
      if (params.encodingIn.toUpperCase() === encoding.toUpperCase()) {
        encodingIn = embeddedAssistant.AudioInConfig.Encoding[encoding];
      }
    });
  }

  let encodingOut = embeddedAssistant.AudioOutConfig.Encoding.LINEAR16;
  if (params.encodingOut !== undefined && isNaN(params.encodingOut)) {
    // let's try to resolve it
    Object.keys(embeddedAssistant.AudioInConfig.Encoding).forEach((encoding) => {
      if (params.encodingOut.toUpperCase() === encoding.toUpperCase()) {
        encodingOut = embeddedAssistant.AudioInConfig.Encoding[encoding];
      }
    });
  }

  // create the defaults if nothing was passed in
  const audioIn = new embeddedAssistant.AudioInConfig();
  audioIn.setEncoding(encodingIn);
  audioIn.setSampleRateHertz(params.sampleRateIn || 16000);

  const audioOut = new embeddedAssistant.AudioOutConfig();
  audioOut.setEncoding(encodingOut);
  audioOut.setSampleRateHertz(params.sampleRateOut || 24000);
  audioOut.setVolumePercentage(volume);

  const converseConfig = new embeddedAssistant.ConverseConfig();
  converseConfig.setAudioInConfig(audioIn);
  converseConfig.setAudioOutConfig(audioOut);

  // if there is a current conversation state, we need to make sure the config knows about it
  if (conversationState) {
    const converseState = new embeddedAssistant.ConverseState();
    converseState.setConversationState(conversationState);
    converseConfig.setConverseState(converseState);
  }

  // go ahead and create the request to return
  const converseRequest = new embeddedAssistant.ConverseRequest();
  converseRequest.setConfig(converseConfig);

  return converseRequest;
};

const setConversationState = value => conversationState = value;
const setVolume = value => volume = value;

function Conversation(assistant, audioConfig) {
  // let's start a new conversation
  const conversation = assistant.converse();
  let continueConversation = false;

  conversation.on('data', (data) => {
    if (data.hasEventType() && data.getEventType() === END_OF_UTTERANCE) {
      this.emit('end-of-utterance');
    }

    if (data.hasResult()) {
      const result = data.getResult();
      setConversationState(result.getConversationState_asU8());

      // if we are going to continue the conversation, we need to make sure the mic is open
      if (result.getMicrophoneMode() === DIALOG_FOLLOW_ON) {
        continueConversation = true;
      }

      // TODO - Make sure this is applied to the audio
      if (result.getVolumePercentage() !== 0) {
        setVolume(result.getVolumePercentage());
      }

      if (result.getSpokenRequestText()) {
        this.emit('transcription', result.getSpokenRequestText());
      }

      if (result.getSpokenResponseText()) {
        // this is only emitted when coming from IFTTT
        this.emit('response', result.getSpokenResponseText());
      }
    }

    // send along the audio buffer
    if (data.hasAudioOut()) {
      const audioData = data.getAudioOut().getAudioData();
      this.emit('audio-data', new Buffer(audioData));
    }

    // spit out any errors we may have
    if (data.hasError()) {
      this.emit('error', data.getError());
    }
  });

  conversation.on('end', (error) => {
    this.emit('ended', error, continueConversation);
  })

  // we write the request before any data comes in
  conversation.write(createRequest(audioConfig));
  
  // write audio data to the conversation
  this.write = (data) => {
    const request = new embeddedAssistant.ConverseRequest();
    request.setAudioIn(data);
    conversation.write(request);
  };

  // end the conversation
  this.end = () => {
    conversation.end();
  };

  return this;
};

util.inherits(Conversation, EventEmitter);
module.exports = Conversation;
