const cliSpinners = require("cli-spinners");
const chalk = require("chalk");

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

module.exports = {
  createSpinner,
  updateLog,
};
