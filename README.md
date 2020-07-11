# The Google Assistant SDK
A version in node to play around with! I've abstracted it from needing to use the mic and speakers on the device running the code (but it still can!) so that you can pass audio in and play audio back however you want to.

## Installation
**You need to create a JSON file for OAuth2 permissions!** [Follow the instructions][oauth] and then:

```bash
$ npm install google-assistant
```

> You may also pass in your own OAuth2 client via the `oauth2Client` param _(This will be used instead of `keyFilePath` and `savedTokensPath`)_. See the usage below for an example.

> If you want the device that you are running this code on to respond to commands _(eg. "Turn off")_, you'll need to go through the [Device Registration][device-registration] instructions.

## Usage
```js
const path = require('path');
const GoogleAssistant = require('google-assistant');
const config = {
  auth: {
    keyFilePath: path.resolve(__dirname, 'YOUR_API_KEY_FILE_PATH.json'),
    // where you want the tokens to be saved
    // will create the directory if not already there
    savedTokensPath: path.resolve(__dirname, 'tokens.json'),
    // you can also pass an oauth2 client instead if you've handled
    // auth in a different workflow. This trumps the other params.
    oauth2Client: YOUR_CLIENT,
  },
  // this param is optional, but all options will be shown
  conversation: {
    audio: {
      encodingIn: 'LINEAR16', // supported are LINEAR16 / FLAC (defaults to LINEAR16)
      sampleRateIn: 16000, // supported rates are between 16000-24000 (defaults to 16000)
      encodingOut: 'LINEAR16', // supported are LINEAR16 / MP3 / OPUS_IN_OGG (defaults to LINEAR16)
      sampleRateOut: 24000, // supported are 16000 / 24000 (defaults to 24000)
    },
    lang: 'en-US', // language code for input/output (defaults to en-US)
    deviceModelId: 'xxxxxxxx', // use if you've gone through the Device Registration process
    deviceId: 'xxxxxx', // use if you've gone through the Device Registration process
    deviceLocation: {
      coordinates: { // set the latitude and longitude of the device
        latitude: xxxxxx,
        longitude: xxxxx,
      },
    },
    textQuery: 'What time is it?', // if this is set, audio input is ignored
    isNew: true, // set this to true if you want to force a new conversation and ignore the old state
    screen: {
      isOn: true, // set this to true if you want to output results to a screen
    },
  },
};

const assistant = new GoogleAssistant(config.auth);

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
    .on('transcription', (data) => {
      // do stuff with the words you are saying to the assistant
    })
    .on('response', (text) => {
      // do stuff with the text that the assistant said back
    })
    .on('volume-percent', (percent) => {
      // do stuff with a volume percent change (range from 1-100)
    })
    .on('device-action', (action) => {
      // if you've set this device up to handle actions, you'll get that here
    })
    .on('screen-data', (screen) => {
      // if the screen.isOn flag was set to true, you'll get the format and data of the output
    })
    .on('ended', (error, continueConversation) => {
      // once the conversation is ended, see if we need to follow up
      if (error) console.log('Conversation Ended Error:', error);
      else if (continueConversation) assistant.start();
      else console.log('Conversation Complete');
    })
    .on('data', (data) => {
      // raw data from the google assistant conversation
      // useful for debugging or if something is not covered above
    })
    .on('error', (error) => {
      // handle error messages
    })
};

// will start a conversation and wait for audio data
// as soon as it's ready
assistant
  .on('ready', () => assistant.start(config.conversation))
  .on('started', startConversation);
```

### TypeScript

```ts
import GoogleAssistant = require("google-assistant");

const googleAssistant: GoogleAssistant = new GoogleAssistant();
```

## Examples
* [mic-speaker](examples/mic-speaker.js) - If you want to test input and output using your machine’s built-in hardware.
* [console-input](examples/console-input.js) - Use the console to have a text-based conversation with the assistant.

### Pre-reqs for the mic-speaker example
* [node-speaker](https://github.com/TooTallNate/node-speaker)
* [node-record-lpcm16](https://github.com/endoplasmic/node-record-lpcm16)

If you are on macOS and are seeing `Illegal instruction: 4` when you complete your conversation, just use this command to re-install the speaker:
```bash
$ npm install speaker --mpg123-backend=openal
```

If you are on a Raspberry Pi and having some issues with getting the `mic-speaker` example working, try changing the following code around line 54:
```js
const mic = record.start({ threshold: 0, recordProgram: 'arecord', device: 'plughw:1,0' });
```

This is assuming you have a capture device on 1,0 _(hint: type `arecord -l` to see what capture devices you have and what card/device they are on)_

---------------

## Assistant Instance _{Object}_
Expects an object with the following params:
* keyFilePath _{String}_: Path of the JSON file that you have after following the [OAuth flow][oauth].
* savedTokensPath _{String}_: Path where you would like your tokens saved after you give your app permission to access your account.

### Events

#### ready _{Assistant}_
Emitted once your OAuth2 credentials have been saved. It's safe to start a conversation now. Returns an instance of the assitant that you can start conversations with _(after the ready event is fired though)_

#### started _{Conversation}_
You'll get this right after a call to `start` and it returns a `conversation` instance (see below).

### Methods

#### start([callback]) _{Conversation}_
This is called anytime after you've got a `ready` event. Optional callback will return `Error` or a `Conversation` instance.

---------------

## Conversation Instance [_{Object}_]
After you call `start` on your Assistant instance, you will get this back. It takes an optional config object with the follow params:

* audio _{Object}_: How audio in/out is handled. Has the folliowing params:
  * encodingIn _{String}_: How the audio coming in is encoded. Supported are `LINEAR16` and `FLAC` _(defaults to `LINEAR16`)_
  * sampleRateIn _{Number}_: Sample rate of the input audio. Supported rates are between `16000`-`24000` _(defaults to `16000`)_
  * encodingOut _{String}_: How you would like out output audio to be encoded. Supported are `LINEAR16`, `MP3`, and `OPUS_IN_OGG` _(defaults to `LINEAR16`)_
  * sampleRateOut _{Number}_: Sample rate of output audio.  Supported are `16000` and `24000` _(defaults to `24000`)_
* lang _{String}_: Language code for the input / output. _(defaults to `en-US`, [but here are some more options!][language-info])_
* deviceModelId _{String}_: Device model id when using [custom devices][device-registration].
* deviceId _{String}_: Device id when using [custom devices][device-registration].
* deviceLocation _{Object}_: Set the device's location.
  * coordinates _{Object}_: Set the latitude and longitude of the devic.
    * latitude _{Number}_: The latitude in degrees. It must be in the range [-90.0, +90.0].
    * longitude _{Number}_: The longitude in degrees. It must be in the range [-180.0, +180.0].
* textQuery _{String}_: Text that will be passed to the assistant. **Audio input is disabled if this is set!**
* isNew _{Boolean}_: Set this to true if you want to force a new conversation and ignore the old state.
* screen _{Object}_: Configures output to return visual results.
  * isOn _{Boolean}_: Set this to true to be able to trigger the `screen-data` event.


### Events

#### error
If things go funky, this will be called.

#### audio-out _{Buffer}_
Contains an audio buffer to use to pipe to a file or speaker.

#### end-of-utterance
Emitted once the server detects you are done speaking.

#### transcription _{Object}_
While you are speaking, you will get many of these messages. They contain the following params:
* transcription _{String}_: What your current speech to text value is.
* done _{Boolean}_: If `true` the assistant has determined you are done speaking and is processing it.

#### response _{String}_
The response text from the assistant.

#### volume-percent _{Number}_
There was a request to change the volume. The range is from 1-100.

#### device-action _{Object}_
There was a request to complete an action. Check out the [Device Registration][device-registration] page for more info on creating a device instance.

#### ended _{Error, Boolean}_
After a call to `end()` this will be emitted with an error and a boolean that will be `true` if you need to continue the conversation. This is basically your cue to call `start()` again.

#### screen-data _{Object}_
Contains information to render a visual version of the assistant's response.
* format _{String}_: What format the data is in (eg. `HTML`).
* data _{Buffer}_: Raw data to be used to display the formatted result.

### Methods

#### write(_UInt8Array_)
When using audio input, this is what you use to send your audio chunks to the assistant. _(see the [mic-speaker](examples/mic-speaker.js) example)_

#### end()
Send this when you are finsished playing back the assistant's response.


[oauth]: https://developers.google.com/assistant/sdk/prototype/getting-started-other-platforms/config-dev-project-and-account
[device-registration]: https://developers.google.com/assistant/sdk/reference/device-registration/register-device-manual
[language-info]: https://developers.google.com/actions/localization/languages-locales
