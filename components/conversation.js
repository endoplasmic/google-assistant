'use strict';

const EventEmitter = require('events');
const util = require('util');

const embeddedAssistant = require('../lib/google/assistant/embedded/v1alpha2/embedded_assistant_pb');

const END_OF_UTTERANCE = embeddedAssistant.AssistResponse.EventType.END_OF_UTTERANCE;
const DIALOG_FOLLOW_ON = embeddedAssistant.DialogStateOut.MicrophoneMode.DIALOG_FOLLOW_ON;
const CLOSE_MICROPHONE = embeddedAssistant.DialogStateOut.MicrophoneMode.CLOSE_MICROPHONE;
const DEFAULT_GRPC_DEADLINE = 60 * 3 + 5;

let conversationState;
let volumePercent = 100;

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
    Object.keys(embeddedAssistant.AudioOutConfig.Encoding).forEach((encoding) => {
      if (params.encodingOut.toUpperCase() === encoding.toUpperCase()) {
        encodingOut = embeddedAssistant.AudioOutConfig.Encoding[encoding];
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
  audioOut.setVolumePercentage(volumePercent);

  const assistConfig = new embeddedAssistant.AssistConfig();
  assistConfig.setAudioInConfig(audioIn);
  assistConfig.setAudioOutConfig(audioOut);

  /* * Stuff for the future * * *
    setTextQuery(STRING)
    setDeviceConfig()
  * */

  const deviceConfig = new embeddedAssistant.DeviceConfig();
  deviceConfig.setDeviceId('TEST1234');
  deviceConfig.setDeviceModelId('4321TSET');
  assistConfig.setDeviceConfig(deviceConfig);

  // setup the dialog state
  const dialogStateIn = new embeddedAssistant.DialogStateIn();
  dialogStateIn.setLanguageCode(params.lang || 'en-US');
  // dialogStateIn.setDeviceLocation

  // if there is a current conversation state, we need to make sure the config knows about it
  if (conversationState) {
    dialogStateIn.setConversationState(conversationState);
  }

  assistConfig.setDialogStateIn(dialogStateIn);

  // go ahead and create the request to return
  const assistRequest = new embeddedAssistant.AssistRequest();
  assistRequest.setConfig(assistConfig);

  return assistRequest;
};

const setConversationState = value => conversationState = value;
const setVolumePercent = value => volumePercent = value;

function Conversation(assistant, audioConfig) {
  // let's start a new conversation
  const conversation = assistant.converse();
  let continueConversation = false;

  conversation.on('data', (data) => {
    if (data.getEventType() === END_OF_UTTERANCE) {
      this.emit('end-of-utterance');
    }

    // speech to text results
    const speechResultsList = data.getSpeechResultsList();
    if (speechResultsList && speechResultsList.length) {
      let transcription = '';
      let done = false;
      speechResultsList.forEach((result, index) => {
        transcription += result.getTranscript();
        if (result.getStability() === 1) done = true;
      });
      this.emit('transcription', { transcription, done });
    }

    // send along the audio buffer
    const audioOut = data.getAudioOut();
    if (audioOut) {
      this.emit('audio-data', new Buffer(audioOut.getAudioData()));
    }

    // action that needs to be handled
    const deviceAction = data.getDeviceAction();
    if (deviceAction) {
      this.emit('device-action', deviceAction.getDeviceRequestJson());
    }

    const dialogStateOut = data.getDialogStateOut();
    if (dialogStateOut) {
      // if we need to continue the conversation, let's do that
      const micMode = dialogStateOut.getMicrophoneMode();
      if (micMode === DIALOG_FOLLOW_ON) continueConversation = true;

      this.emit('response', dialogStateOut.getSupplementalDisplayText());
      setConversationState(dialogStateOut.getConversationState());
      
      const volumePercent = dialogStateOut.getVolumePercentage();
      if (volumePercent !== 0) {
        // set our local version so our assistant speaks this loud
        setVolumePercent(volumePercent);
        this.emit('volume-percent', volumePercent);
      }
    }
  });

  conversation.on('end', (error) => {
    this.emit('ended', error, continueConversation);
  });

  conversation.on('error', (error) => {
    this.emit('error', error);
  });

  // we write the request before any data comes in
  conversation.write(createRequest(audioConfig));
  
  // write audio data to the conversation
  this.write = (data) => {
    const request = new embeddedAssistant.AssistRequest();
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
