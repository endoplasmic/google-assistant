'use strict';

const EventEmitter = require('events');
const util = require('util');
const protoLoader = require('./proto-loader');

const embeddedAssistant = protoLoader.loadSync('google/assistant/embedded/v1alpha2/embedded_assistant.proto');
const AssistConfig = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.AssistConfig');
const AssistRequest = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.AssistRequest');
const AssistResponse = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.AssistResponse');
const AudioInConfig = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.AudioInConfig');
const AudioOutConfig = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.AudioOutConfig');
const DebugConfig = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.DebugConfig');
const DeviceConfig = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.DeviceConfig');
const DeviceLocation = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.DeviceLocation');
const DialogStateIn = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.DialogStateIn');
const DialogStateOut = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.DialogStateOut');
const LatLng = embeddedAssistant.lookupType('google.type.LatLng');
const ScreenOut = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.ScreenOut');
const ScreenOutConfig = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.ScreenOutConfig');

const END_OF_UTTERANCE = AssistResponse.EventType.END_OF_UTTERANCE;
const DIALOG_FOLLOW_ON = DialogStateOut.MicrophoneMode.DIALOG_FOLLOW_ON;
const CLOSE_MICROPHONE = DialogStateOut.MicrophoneMode.CLOSE_MICROPHONE;
const SCREEN_PLAYING = ScreenOutConfig.ScreenMode.PLAYING;
const SCREEN_OFF = ScreenOutConfig.ScreenMode.OFF;
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
  const assistConfig = {};

  // create the defaults if nothing was passed in
  const encodingOut = params.audio ? params.audio.encodingOut : undefined;
  const sampleRateOut = params.audio ? params.audio.sampleRateOut : DEFAULT_SAMPLE_RATE_OUT;
  const audioOutConfig = AudioOutConfig.create({
    encoding: getEncoding(AudioOutConfig, encodingOut),
    sampleRateHertz: sampleRateOut || DEFAULT_SAMPLE_RATE_OUT,
    volumePercentage: volumePercent,
  });
  assistConfig.audioOutConfig = audioOutConfig;

  // we want to send text to the assistant instead of audio
  if (params.textQuery) {
    assistConfig.textQuery = params.textQuery;
  } else {
    const encodingIn = params.audio ? params.audio.encodingIn : undefined;
    const sampleRateIn = params.audio ? params.audio.sampleRateIn : DEFAULT_SAMPLE_RATE_IN;
    const audioInConfig = AudioInConfig.create({
      encoding: getEncoding(AudioInConfig, encodingIn),
      sampleRateHertz: sampleRateIn || DEFAULT_SAMPLE_RATE_IN,
    });
    assistConfig.audioInConfig = audioInConfig;
  }

  // set device information (or use dummy placeholders so the request works)
  const deviceConfig = DeviceConfig.create({
    deviceId: params.deviceId || 'example',
    deviceModelId: params.deviceModelId || 'example',
  });
  assistConfig.deviceConfig = deviceConfig;

  // setup the dialog state
  assistConfig.dialogStateIn = {
    languageCode: params.lang || 'en-US',
    isNewConversation: params.isNew === true,
  };

  // set device location if set
  if (params.deviceLocation) {
    const deviceLocation = {};
    const coordinates = params.deviceLocation.coordinates;
    if (coordinates) {
      const latLng = LatLng.create(coordinates);
      deviceLocation.coordinates = latLng;
    }
    assistConfig.dialogStateIn.deviceLocation = DeviceLocation.create(deviceLocation);
  }

  // // if there is a current conversation state, we need to make sure the config knows about it
  if (conversationState) {
    assistConfig.dialogStateIn.conversationState = conversationState;
  }

  // if we want to support a screen
  if (params.screen) {
    const screenOutConfig = ScreenOutConfig.create({
      screenMode: (params.screen.isOn ? SCREEN_PLAYING : SCREEN_OFF),
    });
    assistConfig.screenOutConfig = screenOutConfig;
  }

  // if we want to show debug info
  const debugConfig = DebugConfig.create({
    returnDebugInfo: params.showDebugInfo === true,
  });
  assistConfig.debugConfig = debugConfig;

  // go ahead and create the request to return
  const assistRequest = AssistRequest.create({
    config: AssistConfig.create(assistConfig),
  });

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
    // see if we are done speaking
    if (data.eventType === END_OF_UTTERANCE) {
      this.emit('end-of-utterance');
    }

    // speech to text results
    const speechResultsList = data.speechResults;
    if (speechResultsList && speechResultsList.length) {
      let transcription = '';
      let done = false;
      speechResultsList.forEach((result) => {
        transcription += result.transcript;
        if (result.stability === 1) done = true;
      });

      this.emit('transcription', { transcription, done });
    }

    // send along the audio buffer
    const audioOut = data.audioOut;
    if (audioOut) {
      this.emit('audio-data', audioOut.audioData);
    }

    // see if there is any debug info
    const debugInfo = data.debugInfo;
    if (debugInfo) {
      this.emit('debug-info', JSON.parse(debugInfo.aogAgentToAssistantJson));
    }

    // action that needs to be handled
    const deviceAction = data.deviceAction;
    if (deviceAction) {
      this.emit('device-action', JSON.parse(deviceAction.deviceRequestJson));
    }

    const dialogStateOut = data.dialogStateOut;
    if (dialogStateOut) {
      // if we need to continue the conversation, let's do that
      const micMode = dialogStateOut.microphoneMode;
      if (micMode === DIALOG_FOLLOW_ON) continueConversation = true;

      this.emit('response', dialogStateOut.supplementalDisplayText);
      setConversationState(dialogStateOut.conversationState);
      
      const volumePercent = dialogStateOut.volumePercentage;
      if (volumePercent !== 0) {
        // set our local version so our assistant speaks this loud
        setVolumePercent(volumePercent);
        this.emit('volume-percent', volumePercent);
      }
    }

    // see if we have any screen output
    const screenOut = data.screenOut;
    if (screenOut) {
      this.emit('screen-data', {
        format: ScreenOut.Format[screenOut.format],
        data: screenOut.data,
      });
    }

    this.emit('data', data);
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

    const request = AssistRequest.create({ audioIn: data });
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
