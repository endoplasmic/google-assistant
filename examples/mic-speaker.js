'use strict';

const record = require('node-record-lpcm16');
const Speaker = require('speaker');
const GoogleAssistant = require('../index');

const config = {
  auth: {
    keyFilePath: 'YOUR_KEY_FILE_PATH.json',
    savedTokensPath: 'SOME_PATH/tokens.js', // where you want the tokens to be saved
  },
  audio: {
    encodingIn: 'LINEAR16', // supported are LINEAR16 / FLAC (defaults to LINEAR16)
    sampleRateOut: 24000, // supported are 16000 / 24000 (defaults to 24000)
  },
};

const startConversation = (conversation) => {
  console.log('Say something!');

  let spokenResponseLength = 0;
  let speakerOpenTime;
  let speakerTimer;

  // setup the conversation
  conversation
    // send the audio buffer to the speaker
    .on('audio-data', (data) => {
      const now = new Date().getTime();
      speaker.write(data);

      // kill the speaker after enough data has been sent to it and then let it flush out
      spokenResponseLength += data.length;
      const audioTime = spokenResponseLength / (config.audio.sampleRateOut * 16 / 8) * 1000;
      clearTimeout(speakerTimer);
      speakerTimer = setTimeout(() => {
        speaker.end();
      }, audioTime - Math.max(0, now - speakerOpenTime));
    })
    // done speaking, close the mic
    .on('end-of-utterance', () => record.stop())
    // just to spit out to the console what was said (as we say it)
    .on('transcription', text => console.log('Transcription:', text))
    // what the assistant said back
    .on('response', text => console.log('Assistant Text Response:', text))
    // if we've requested a volume level change, get the percentage of the new level
    .on('volume-percent', percent => console.log('New Volume Percent:', percent))
    // the device needs to complete an action
    .on('device-action', json => console.log('Device Action JSON:', json))
    // once the conversation is ended, see if we need to follow up
    .on('ended', (error, continueConversation) => {
      if (error) console.log('Conversation Ended Error:', error);
      else if (continueConversation) assistant.start();
      else console.log('Conversation Complete');
    })
    // catch any errors
    .on('error', (error) => {
      console.log('Conversation Error:', error);
    });

  // pass the mic audio to the assistant
  const mic = record.start({ threshold: 0 });
  mic.on('data', data => conversation.write(data));

  // setup the speaker
  const speaker = new Speaker({
    channels: 1,
    sampleRate: config.audio.sampleRateOut,
  });
  speaker
    .on('open', () => {
      console.log('Assistant Speaking');
      speakerOpenTime = new Date().getTime();
    })
    .on('close', () => {
      console.log('Assistant Finished Speaking');
      conversation.end();
    });
};

// setup the assistant
const assistant = new GoogleAssistant(config);
assistant
  .on('ready', () => {
    // start a conversation!
    assistant.start();
  })
  .on('started', startConversation)
  .on('error', (error) => {
    console.log('Assistant Error:', error);
  });
