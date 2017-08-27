'use strict';

const https = require('https');
const readline = require('readline');
const lame = require('lame');
const googleTTS = require('google-tts-api');
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

const startConversation = (conversation, ttsResponse) => {
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
    // done speaking (since we aren't speaking, let's just console log)
    .on('end-of-utterance', () => {
      console.log('TTS playback complete');
    })
    // just to spit out to the console what was said
    .on('transcription', text => {
      console.log('Transcription:', text);
    })
    // once the conversation is ended, see if we need to follow up
    .on('ended', (error, continueConversation) => {
      if (error) {
        console.log('Conversation Ended Error:', error);
      } else if (continueConversation) {
        promptForInput();
      } else {
        console.log('Conversation Complete');
        conversation.end();
      }
    })
    // catch any errors
    .on('error', (error) => {
      console.log('Conversation Error:', error);
    });

  // decode the mp3 and send it off
  const decoder = new lame.Decoder();
  ttsResponse.pipe(decoder).on('format', (format) => {
    decoder.pipe(conversation);
  });

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

const promptForInput = () => {
  // type what you want to ask the assistant
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Type your request: ', (request) => {
    // create a TTS file from the request string
    googleTTS(request)
      .then((url) => {
        console.log('Fetching TTS file...');

        // go snag the file
        https.get(url, (response) => {
          if (!response || response.statusCode !== 200) {
            console.error('Failed to download TTS file from', url, response.statusMessage);
            return;
          }

          // start the conversation
          assistant.start((conversation) => {
            startConversation(conversation, response);
          });
        });
      })
      .catch(error => console.error);

    rl.close();
  });
};

const assistant = new GoogleAssistant(config);
  assistant
    .on('ready', () => {
      // start a conversation!
      promptForInput();
    })
    // .on('started', promptForInput)
    .on('error', (error) => {
      console.log('Assistant Error:', error);
    });
