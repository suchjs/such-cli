import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import * as utils from '../helpers/utils';
const { promisify, LoadSpinner } = utils;
const run = promisify(exec, null);
const log = console.log;
const okSymbol = chalk.green('√');

log('');
const rootDir = process.cwd();
let packages;
try{
  packages = require(path.resolve(rootDir,'./package.json'));
}catch(e){
  log(chalk.red('Error:You must execute the command in the root dir.'));
  process.exit(1);
}

const runAll = async (isOnlyInstall) => {
  const confFileName = 'such.config.js';
  const configFile = path.join(rootDir, confFileName);
  const isFileOk = promisify(fs.access, fs);
  const successInfo = `${okSymbol} Everything is ok,enjoy it!thanks!`;
  try{
    await isFileOk(configFile);
    log(isOnlyInstall ? successInfo : `${okSymbol} you'r config file is exists,just config it.`);
  }catch(e){
    log(chalk.bgBlue.white('Now,config the suchjs'));
    const extendsChoices = ['such:recommend','no,i will extends the types by myself.'];
    const extendsName = 'extends';
    const suchDirName = 'suchDir';
    const suchDirDef = 'suchas';
    const dataDirName = 'dataDir';
    const dataDirDef = 'data';
    const preloadName = 'preload';
    const preloadChoices = ['yes','no'];
    const dirnameValidator = (value) => {
      if(/^[\w$-]+$/.test(value)){
        return true;
      }
      return 'please enter a regular directory name';
    };
    const results = await inquirer.prompt([{
      type: 'list',
      name: extendsName,
      message: 'Do you need to use an extends file for support more types?',
      choices: extendsChoices
    },{
      type: 'input',
      name: suchDirName,
      message: 'Please enter the such directory(save template files,base on project root directory)',
      validate: dirnameValidator,
      default(){
        return suchDirDef;
      }
    },{
      type: 'input',
      name: dataDirName,
      message: 'Please enter the data directory(dict files and other data files,base on such directory)',
      validate: dirnameValidator,
      default(){
        return dataDirDef;
      }
    },{
      type: 'list',
      name: preloadName,
      message: 'Do you need to preload your data files,so you can use it without async functions.',
      choices: preloadChoices
    }]);
    const confSuchDir = results[suchDirName];
    const confDataDir = results[dataDirName];
    const confConfig =  {
      suchDir: confSuchDir,
      dataDir: confSuchDir + path.sep + confDataDir,
    };
    if(results[preloadName] === preloadChoices[0]){
      confConfig.preload = true;
    }
    const lastConf = {
      extends: results[extendsName] === extendsChoices[extendsChoices.length - 1] ? [] : [results[extendsName]],
      config: confConfig,
      types: {
      },
      alias: {
      }
    };
    const mkdir = promisify(fs.mkdir, fs);
    const createFile = promisify(fs.writeFile,fs);
    const spinner = new LoadSpinner('dots','green',' Create directories and the config file');
    try{
      spinner.start();
      const lastSuchDir = path.join(rootDir,confConfig.suchDir);
      await mkdir(lastSuchDir);
      await mkdir(path.join(lastSuchDir,confDataDir),{
        recursive: true
      });
      await createFile(configFile, 'module.exports = ' + JSON.stringify(lastConf, null, 4) + ';', 'utf8');
      log(successInfo);
      process.exit(0);
    }catch(e){
      log(chalk.red(`Error:create failed(${e.message})`));
      process.exit(1);
    }finally{
      if(spinner){
        spinner.stop();
      }
    }
  }
};
// judge if suchjs has installed
const isInstallSuchjs = (() => {
  return packages && ((packages.dependencies && 'suchjs' in packages.dependencies) || (packages.devDependencies && 'suchjs' in packages.devDependencies));
})();
if(!isInstallSuchjs){
  // check if need install
  (async () => {
    const installChoices = ['Yes,install now.', 'No,i will install it later by myself.'];
    const installName = 'install';
    const installAnswer = await inquirer.prompt([{
      type: 'list',
      message: 'You haven\'t install the suchjs yet,install it now?',
      name: installName,
      choices: installChoices
    }]);
    if(installAnswer[installName] === installChoices[0]){
      const toolChoices = ['npm', 'yarn'];
      const toolName = 'tool';
      const dependName = 'depend';
      const dependChoices = ['--save', '--save-dev'];
      const wayAnswers = await inquirer.prompt([{
        type: 'list',
        message: 'Please choose a package manager tool you used.',
        name: toolName,
        choices: toolChoices
      },{
        type: 'list',
        message: 'Please choose the dependency mode.',
        name: dependName,
        choices: dependChoices
      }]);
      const isUseYarn = wayAnswers[toolName] === toolChoices[1];
      const lastCommand = wayAnswers[toolName] + (isUseYarn ? ' add ' : ' install ') + 'suchjs ' + (
        isUseYarn ? (wayAnswers[dependName] === dependChoices[1] ? '--dev' : '') : wayAnswers[dependName]
      );
      let spinner;
      try{
        spinner = new LoadSpinner('dots','green',' install the suchjs');
        spinner.start();
        await run(lastCommand);
        log(`${okSymbol} the suchjs was installed successfully.` );
      }catch(e){
        log(chalk.red(`Error:install failed(${e.message})`));
        process.exit(1);
      }finally{
        if(spinner){
          spinner.stop();
        }
      }
    }
    await runAll(true);
  })();
}else{
  (async () => {
    await runAll();
  })();
}