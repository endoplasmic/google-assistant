# The Google Assistant SDK
A version in node to play around with! I've abstracted it from needing to use the mic and speakers on the device running the code (but it still can!) so that you can pass audio in and play audio back however you want to.

## Installation
**You need to create a JSON file for OAuth2 permissions!** [Follow the instructions][oauth] and then:

```bash
$ npm install google-assistant
```

## Usage
```js
const GoogleAssistant = require('google-assistant');
const config = {
  auth: {
    keyFilePath: 'YOUR_API_KEY_FILE_PATH.json',
    // where you want the tokens to be saved
    // will create the directory if not already there
    savedTokensPath: 'SOME_PATH/tokens.js',
  },
};

const assistant = new GoogleAssistant(config);

// starts a new conversation with the assistant
const startConversation = (conversation) => {
  // setup the conversation and send data to it
  // for a full example, see `examples/mic-speaker.js`

  conversation
    .on('audio-data', (data) => {
      // do stuff with the audio data from the server
      // usually send it to some audio output / file
    })
    .on('end-of-utterance', () => {
      // do stuff when done speaking to the assistant
      // usually just stop your audio input
    })
    .on('transcription', (text) => {
      // do stuff with the text you said to the assistant
    })
    .on('ended', (error, continueConversation) => {
      // once the conversation is ended, see if we need to follow up
      if (error) console.log('Conversation Ended Error:', error);
      else if (continueConversation) assistant.start();
      else console.log('Conversation Complete');
    })
    .on('error', error => console.error(error));
};

// will start a conversation and wait for audio data
// as soon as it's ready
assistant
  .on('ready', () => assistant.start())
  .on('started', startConversation);
```

## Examples
* [mic-speaker](examples/mic-speaker.js) - If you want to test input and output using your machine’s built-in hardware.
* [console-input](examples/console-input.js) - If you want to use the console to type in commands instead of saying them (thanks to @CTKRocks for the help on this)

### Pre-reqs for the mic-speaker example
* [node-speaker](https://github.com/TooTallNate/node-speaker)
* [node-record-lpcm16](https://github.com/gillesdemey/node-record-lpcm16)

If you are on macOS and are seeing `Illegal instruction: 4` when you complete your conversation, just use this command to re-install the speaker:
```bash
$ npm install speaker --mpg123-backend=openal
```

---------------

## Assistant Instance
Here are the events and methods on the main instance.

### Events

#### ready
Emitted once your OAuth2 credentials have been saved. It's safe to start a conversation now.

#### started _{Conversation}_
You'll get this right after a call to `start` and it returns a `conversation` instance (see below).

### Methods

#### start()
This is called anytime after you've got a `ready` event.

---------------

## Conversation Instance
After a call to `start` you will get one of these back. Here are the events and methods that it supports:

### Events

#### error
If things go funky, this will be called.

#### audio-out _{Buffer}_
Contains an audio buffer to use to pipe to a file or speaker.

#### end-of-utterance
Emitted once the server detects you are done speaking.

#### transcription _{String}_
Contains the text that the server recognized from your voice.

#### ended _{Error, Boolean}_
After a call to `end()` this will be emitted with an error and a boolean that will be `true` if you need to continue the conversation. This is basically your cue to call `start()` again.

#### response _{String}_
This is only emitted when using IFTTT.

### Methods

#### end()
Send this when you are finsished playing back the assistant's response.


[oauth]: https://developers.google.com/assistant/sdk/prototype/getting-started-other-platforms/config-dev-project-and-account
