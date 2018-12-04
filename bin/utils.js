"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LoadSpinner = exports.promisify = void 0;

var _cliSpinners = _interopRequireDefault(require("cli-spinners"));

var _chalk = _interopRequireDefault(require("chalk"));

var _logUpdate = _interopRequireDefault(require("log-update"));

var promisify = function promisify(fn, scope) {
  return function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return new Promise(function (resolve, reject) {
      fn.apply(scope, args.concat(function (err, suc) {
        if (err) {
          reject(err);
        } else {
          resolve(suc);
        }
      }));
    });
  };
};

exports.promisify = promisify;

var LoadSpinner = function LoadSpinner(type, color, message) {
  var _cliSpinners$type = _cliSpinners.default[type],
      frames = _cliSpinners$type.frames,
      interval = _cliSpinners$type.interval;
  var total = frames.length;
  var i = 0;
  var timer;
  return {
    start: function start() {
      timer = setInterval(function () {
        (0, _logUpdate.default)(_chalk.default[color || 'green'](frames[i = ++i % total]) + (message || ''));
      }, interval);
    },
    stop: function stop() {
      clearInterval(timer);
    }
  };
};

exports.LoadSpinner = LoadSpinner;