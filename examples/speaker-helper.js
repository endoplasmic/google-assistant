let speaker;
let spokenResponseLength = 0;
let speakerOpenTime = 0;
let speakerTimer;

const init = (spkr) => {
  speaker = spkr;
};

const open = () => {
  clearTimeout(speakerTimer);
  spokenResponseLength = 0;
  speakerOpenTime = new Date().getTime();
};

const update = (data) => {
  if (!speaker) return;

  const now = new Date().getTime();
  speaker.write(data);

  // kill the speaker after enough data has been sent to it and then let it flush out
  spokenResponseLength += data.length;
  const audioTime = spokenResponseLength / (24000 * 16 / 8) * 1000;
  clearTimeout(speakerTimer);
  speakerTimer = setTimeout(() => {
    speaker.end();
  }, audioTime - Math.max(0, now - speakerOpenTime));
};

module.exports = {
  init,
  open,
  update,
};
