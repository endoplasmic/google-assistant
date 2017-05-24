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
    savedTokensPath: 'SOME_PATH/tokens.js', // where you want the tokens to be saved (will create the directory if not already there)
  },
};
const assistant = new GoogleAssistant(config);

// will start a conversation and wait for audio data
assistant.on('ready', () => assistant.start());
```

## Examples
Check out the [mic-speaker](examples/mic-speaker.js) example if you want to test input and output using your machine’s built-in hardware.

### Pre-reqs for the mic-speaker example
* [node-speaker](https://github.com/TooTallNate/node-speaker)
* [node-record-lpcm16](https://github.com/gillesdemey/node-record-lpcm16)

If you are on macOS and are seeing `Illegal instruction: 4` when you complete your conversation, just use this command to re-install the speaker:
```bash
$ npm install speaker --mpg123-backend=openal
```

## Assistant Instance
Here are the events and methods on the main instance.

### `ready` event
Emitted once your OAuth2 credentials have been saved. It's safe to start a conversation now.

### `start()`
This is called anytime after you've got a `ready` event.

### `started` event {Conversation}
You'll get this right after a call to `start` and it returns a `conversation` instance (see below).

### `error` event
If things go funky, this will be called.

## Conversation Instance
After a call to `start` you will get one of these back. Here are the events and methods that it supports:

### `audio-out` event {Buffer}
Contains an audio buffer to use to pipe to a file or speaker.

### `end-of-utterance` event
Emitted once the server detects you are done speaking.

### `transcription` event {String}
Contains the text that the server recognized from your voice.

### `end()`
Send this when the assistant is finished speaking.

### `ended` event {Error, Boolean}
After a call to `end()` this will be emitted with an error and a boolean that will be `true` if you need to continue the conversation. This is basically your cue to call `start()` again.

### `response` event {String}
This is only emitted when using IFTTT and I found it in the Python SDK, so I put it in here as well. Untested, but there all the same.

[oauth]: https://developers.google.com/assistant/sdk/prototype/getting-started-other-platforms/config-dev-project-and-account
