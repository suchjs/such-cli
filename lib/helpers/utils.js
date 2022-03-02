const cliSpinners = require("cli-spinners");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const { default: globalSuch, createNsSuch } = require("suchjs");
const { promisify } = require("util");
const writeFile = promisify(fs.writeFile);
const getFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

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
    const ns = rootDir
      .split(path.sep)
      .slice(-2)
      .map((name) => name.replace(/[^a-zA-Z_0-9]/g, "_"))
      .join("_");
    cliSuch = createNsSuch(ns);
    reloadConfig(cliSuch, rootDir);
    await cliSuch.reloadData();
  } else {
    cliSuch = globalSuch;
  }
  return cliSuch;
};

const reloadConfig = (cliSuch, rootDir) => {
  cliSuch.loadConf(path.join(rootDir, "such.config.js"));
};

const checkStat = async (pathname) => {
  try {
    const curStat = await stat(pathname);
    return {
      exist: true,
      dir: curStat.isDirectory(),
    };
  } catch (e) {
    return {
      exist: false,
    };
  }
};

const createDirectory = (dir) => {
  return mkdir(dir, {
    recursive: true,
  });
};

const createFile = async (file, content = '', dir) => {
  if (dir) {
    const directory = path.dirname(file);
    const isDirOk = await createDirectory(directory);
    if (isDirOk) {
      return writeFile(file, content);
    }
  } else {
    return writeFile(file, content);
  }
};

const getFileContent = (file) => {
  return getFile(file, "utf-8");
};

const deleteFile = (file) => {
  return unlink(file);
};

const isObject = (obj) =>
  Object.prototype.toString.call(obj) === "[object Object]";

module.exports = {
  createSpinner,
  updateLog,
  capitalize,
  isObject,
  hasOwn,
  createSuch,
  reloadConfig,
  checkStat,
  createDirectory,
  createFile,
  getFileContent,
  deleteFile
};
