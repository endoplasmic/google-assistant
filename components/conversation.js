'use strict';

const EventEmitter = require('events');
const util = require('util');

const embeddedAssistant = require('../lib/google/assistant/embedded/v1alpha2/embedded_assistant_pb');

const END_OF_UTTERANCE = embeddedAssistant.AssistResponse.EventType.END_OF_UTTERANCE;
const DIALOG_FOLLOW_ON = embeddedAssistant.DialogStateOut.MicrophoneMode.DIALOG_FOLLOW_ON;
const CLOSE_MICROPHONE = embeddedAssistant.DialogStateOut.MicrophoneMode.CLOSE_MICROPHONE;
const DEFAULT_GRPC_DEADLINE = 60 * 3 + 5;
const DEFAULT_SAMPLE_RATE_IN = 16000;
const DEFAULT_SAMPLE_RATE_OUT = 24000;

let conversationState;
let volumePercent = 100;
let sendingText = false;

const getEncoding = (config, encodingOverride) => {
  let result = config.Encoding.LINEAR16;
  if (encodingOverride !== undefined && isNaN(encodingOverride)) {
    // let's try to resolve it
    Object.keys(config.Encoding).forEach((encoding) => {
      if (encodingOverride.toUpperCase() === encoding.toUpperCase()) {
        result = config.Encoding[encoding];
      }
    });
  }

  return result;
};

const createRequest = (params) => {
  if (params === undefined) params = {};

  // build out the request config
  const assistConfig = new embeddedAssistant.AssistConfig();

  // create the defaults if nothing was passed in
  const encodingOut = params.audio ? params.audio.encodingOut : undefined;
  const sampleRateOut = params.audio ? params.audio.sampleRateOut : DEFAULT_SAMPLE_RATE_OUT;
  const audioOut = new embeddedAssistant.AudioOutConfig();
  audioOut.setEncoding(getEncoding(embeddedAssistant.AudioOutConfig, encodingOut));
  audioOut.setSampleRateHertz(sampleRateOut || DEFAULT_SAMPLE_RATE_OUT);
  audioOut.setVolumePercentage(volumePercent);

  assistConfig.setAudioOutConfig(audioOut);

  // we want to send text to the assistant instead of audio
  if (params.textQuery) {
    assistConfig.setTextQuery(params.textQuery);
  } else {
    const encodingIn = params.audio ? params.audio.encodingIn : undefined;
    const sampleRateIn = params.audio ? params.audio.sampleRateIn : DEFAULT_SAMPLE_RATE_IN;
    const audioIn = new embeddedAssistant.AudioInConfig();
    audioIn.setEncoding(getEncoding(embeddedAssistant.AudioInConfig, encodingIn));
    audioIn.setSampleRateHertz(sampleRateIn || DEFAULT_SAMPLE_RATE_IN);

    assistConfig.setAudioInConfig(audioIn);
  }

  // set device information (or use dummy placeholders so the request works)
  const deviceConfig = new embeddedAssistant.DeviceConfig();
  deviceConfig.setDeviceId(params.deviceId || 'sample_device_id');
  deviceConfig.setDeviceModelId(params.deviceModelId || 'sample_model_id');
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

  // make sure we set our flag if we are doing a text query
  sendingText = params.textQuery !== undefined;

  return assistRequest;
};

const setConversationState = value => conversationState = value;
const setVolumePercent = value => volumePercent = value;

function Conversation(assistant, config) {
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
      this.emit('device-action', JSON.parse(deviceAction.getDeviceRequestJson()));
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
  conversation.write(createRequest(config));
  
  // write audio data to the conversation
  this.write = (data) => {
    // if audio tries to come in when we are sending text, bail out
    if (sendingText) return;

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
