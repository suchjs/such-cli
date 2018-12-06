"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _inquirer = _interopRequireDefault(require("inquirer"));

var _chalk = _interopRequireDefault(require("chalk"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _child_process = require("child_process");

var utils = _interopRequireWildcard(require("../helpers/utils"));

var promisify = utils.promisify,
    LoadSpinner = utils.LoadSpinner;
var run = promisify(_child_process.exec, null);
var log = console.log;

var okSymbol = _chalk.default.green('√');

log('');
var rootDir = process.cwd();
var packages;

try {
  packages = require(_path.default.resolve(rootDir, './package.json'));
} catch (e) {
  log(_chalk.default.red('Error:You must execute the command in the root dir.'));
  process.exit(1);
}

var runAll =
/*#__PURE__*/
function () {
  var _ref = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee(isOnlyInstall) {
    var confFileName, configFile, isFileOk, successInfo, extendsChoices, extendsName, suchDirName, suchDirDef, dataDirName, dataDirDef, preloadName, preloadChoices, dirnameValidator, results, confSuchDir, confDataDir, confConfig, lastConf, mkdir, createFile, spinner, lastSuchDir;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            confFileName = 'such.config.js';
            configFile = _path.default.join(rootDir, confFileName);
            isFileOk = promisify(_fs.default.access, _fs.default);
            successInfo = "".concat(okSymbol, " Everything is ok,enjoy it!thanks!");
            _context.prev = 4;
            _context.next = 7;
            return isFileOk(configFile);

          case 7:
            log(isOnlyInstall ? successInfo : "".concat(okSymbol, " you'r config file is exists,just config it."));
            _context.next = 53;
            break;

          case 10:
            _context.prev = 10;
            _context.t0 = _context["catch"](4);
            log(_chalk.default.bgBlue.white('Now,config the suchjs'));
            extendsChoices = ['such:recommend', 'no,i will extends the types by myself.'];
            extendsName = 'extends';
            suchDirName = 'suchDir';
            suchDirDef = 'suchas';
            dataDirName = 'dataDir';
            dataDirDef = 'data';
            preloadName = 'preload';
            preloadChoices = ['yes', 'no'];

            dirnameValidator = function dirnameValidator(value) {
              if (/^[\w$-]+$/.test(value)) {
                return true;
              }

              return 'please enter a regular directory name';
            };

            _context.next = 24;
            return _inquirer.default.prompt([{
              type: 'list',
              name: extendsName,
              message: 'Do you need to use an extends file for support more types?',
              choices: extendsChoices
            }, {
              type: 'input',
              name: suchDirName,
              message: 'Please enter the such directory(save template files,base on project root directory)',
              validate: dirnameValidator,
              default: function _default() {
                return suchDirDef;
              }
            }, {
              type: 'input',
              name: dataDirName,
              message: 'Please enter the data directory(dict files and other data files,base on such directory)',
              validate: dirnameValidator,
              default: function _default() {
                return dataDirDef;
              }
            }, {
              type: 'list',
              name: preloadName,
              message: 'Do you need to preload your data files,so you can use it without async functions.',
              choices: preloadChoices
            }]);

          case 24:
            results = _context.sent;
            confSuchDir = results[suchDirName];
            confDataDir = results[dataDirName];
            confConfig = {
              suchDir: confSuchDir,
              dataDir: confSuchDir + _path.default.sep + confDataDir
            };

            if (results[preloadName] === preloadChoices[0]) {
              confConfig.preload = true;
            }

            lastConf = {
              extends: results[extendsName] === extendsChoices[extendsChoices.length - 1] ? [] : [results[extendsName]],
              config: confConfig,
              types: {},
              alias: {}
            };
            mkdir = promisify(_fs.default.mkdir, _fs.default);
            createFile = promisify(_fs.default.writeFile, _fs.default);
            spinner = new LoadSpinner('dots', 'green', ' Create directories and the config file');
            _context.prev = 33;
            spinner.start();
            lastSuchDir = _path.default.join(rootDir, confConfig.suchDir);
            _context.next = 38;
            return mkdir(lastSuchDir);

          case 38:
            _context.next = 40;
            return mkdir(_path.default.join(lastSuchDir, confDataDir), {
              recursive: true
            });

          case 40:
            _context.next = 42;
            return createFile(configFile, JSON.stringify(lastConf, null, 4), 'utf8');

          case 42:
            log(successInfo);
            process.exit(0);
            _context.next = 50;
            break;

          case 46:
            _context.prev = 46;
            _context.t1 = _context["catch"](33);
            log(_chalk.default.red("Error:create failed(".concat(_context.t1.message, ")")));
            process.exit(1);

          case 50:
            _context.prev = 50;

            if (spinner) {
              spinner.stop();
            }

            return _context.finish(50);

          case 53:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this, [[4, 10], [33, 46, 50, 53]]);
  }));

  return function runAll(_x) {
    return _ref.apply(this, arguments);
  };
}(); // judge if suchjs has installed


var isInstallSuchjs = function () {
  return packages && (packages.dependencies && 'suchjs' in packages.dependencies || packages.devDependencies && 'suchjs' in packages.devDependencies);
}();

if (!isInstallSuchjs) {
  // check if need install
  (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee2() {
    var installChoices, installName, installAnswer, toolChoices, toolName, dependName, dependChoices, wayAnswers, isUseYarn, lastCommand, spinner;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            installChoices = ['Yes,install now.', 'No,i will install it later by myself.'];
            installName = 'install';
            _context2.next = 4;
            return _inquirer.default.prompt([{
              type: 'list',
              message: 'You haven\'t install the suchjs yet,install it now?',
              name: installName,
              choices: installChoices
            }]);

          case 4:
            installAnswer = _context2.sent;

            if (!(installAnswer[installName] === installChoices[0])) {
              _context2.next = 30;
              break;
            }

            toolChoices = ['npm', 'yarn'];
            toolName = 'tool';
            dependName = 'depend';
            dependChoices = ['--save', '--save-dev'];
            _context2.next = 12;
            return _inquirer.default.prompt([{
              type: 'list',
              message: 'Please choose a package manager tool you used.',
              name: toolName,
              choices: toolChoices
            }, {
              type: 'list',
              message: 'Please choose the dependency mode.',
              name: dependName,
              choices: dependChoices
            }]);

          case 12:
            wayAnswers = _context2.sent;
            isUseYarn = wayAnswers[toolName] === toolChoices[1];
            lastCommand = wayAnswers[toolName] + (isUseYarn ? ' add ' : ' install ') + 'suchjs ' + (isUseYarn ? wayAnswers[dependName] === dependChoices[1] ? '--dev' : '' : wayAnswers[dependName]);
            _context2.prev = 15;
            spinner = new LoadSpinner('dots', 'green', ' install the suchjs');
            spinner.start();
            _context2.next = 20;
            return run(lastCommand);

          case 20:
            log("".concat(okSymbol, " the suchjs was installed successfully."));
            _context2.next = 27;
            break;

          case 23:
            _context2.prev = 23;
            _context2.t0 = _context2["catch"](15);
            log(_chalk.default.red("Error:install failed(".concat(_context2.t0.message, ")")));
            process.exit(1);

          case 27:
            _context2.prev = 27;

            if (spinner) {
              spinner.stop();
            }

            return _context2.finish(27);

          case 30:
            _context2.next = 32;
            return runAll(true);

          case 32:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, this, [[15, 23, 27, 30]]);
  }))();
} else {
  (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee3() {
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return runAll();

          case 2:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }))();
}