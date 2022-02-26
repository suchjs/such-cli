const cliSpinners = require("cli-spinners");
const chalk = require("chalk");
const path = require("path");
const { default: globalSuch, createNsSuch } = require("suchjs");

const updateLog = (message) => {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(message);
};

const createSpinner = (message = "", type = "dots", color = "green") => {
  const { frames, interval } = cliSpinners[type];
  const total = frames.length;
  let i = 0;
  let timer;
  let prevMessage = "";
  return {
    start() {
      timer = setInterval(() => {
        prevMessage =
          chalk[color](frames[i >= total ? (i = 0) : i++]) + message;
        updateLog(prevMessage);
      }, interval);
    },
    stop() {
      clearInterval(timer);
    },
  };
};

const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const createSuch = async (opts) => {
  let cliSuch;
  if (opts.root) {
    const rootDir = path.resolve(process.cwd(), opts.root);
    const ns = rootDir.split(path.sep).slice(-2).map((name) => name.replace(/[^a-zA-Z_0-9]/g, '_')).join('_');
    cliSuch = createNsSuch(ns);
    cliSuch.loadConf(path.join(rootDir, 'such.config.js'));
    await cliSuch.reloadData();
  } else {
    cliSuch = globalSuch;
  }
  return cliSuch;
}

module.exports = {
  createSpinner,
  updateLog,
  capitalize,
  hasOwn,
  createSuch
};
