const fs = require("fs");
const path = require("path");
const os = require("os");
const { promisify } = require("util");
const { exec } = require("child_process");
const inquirer = require("inquirer");
const { program } = require("commander");
const chalk = require("chalk");
const { createSpinner } = require("../helpers/utils.js");
const createSpinnerWithClear = (...args) => {
  let spinner = createSpinner(...args);
  spinner.clear = () => {
    if (spinner) {
      spinner.stop();
      console.log();
    }
  };
  return spinner;
};

program
  .option("-c, --cli", "Initialize the suchjs config file for command line.")
  .parse(process.argv);

const cliOptions = program.opts();
const { cli: isForCli = false } = cliOptions;
const run = promisify(exec, null);
const log = console.log;
const okSymbol = chalk.green("√");
const SUCH_DIR = ".such";

log("");
const rootDir = isForCli ? path.join(os.homedir(), SUCH_DIR) : process.cwd();
let packages = {};

/* if not cli, need use */
if (!isForCli) {
  try {
    packages = require(path.resolve(rootDir, "./package.json"));
  } catch (e) {
    log(chalk.red("Error: `such init` should executed in the root directory."));
    process.exit(1);
  }
}

const runAll = async (isOnlyInstall) => {
  const confFileExt =
    packages.type && packages.type === "module" ? "cjs" : "js";
  const confFileName = `such.config.${confFileExt}`;
  const configFile = path.join(rootDir, confFileName);
  const isFileOk = promisify(fs.access, fs);
  const successInfo = isForCli
    ? (function () {
        const infos = [
          `The config file "${confFileName}" has installed in the directory(${rootDir}).`,
        ];
        if (os.platform() === "win32") {
          infos.push(
            `Please add the environment variable:`,
            `Variable name: SUCH_ROOT`,
            `Variable value: ${rootDir}`
          );
        } else {
          infos.push(
            `Add the below bash code into your bash profile:`,
            "",
            `export SUCH_ROOT=${rootDir}`,
            "",
            `Then source it to make the variable effective.`
          );
        }
        infos.push(
          `After that,you can config the "${configFile}", define your own types/alias/..., or add the mock json data under the 'suchDir' directory, etc. Enjoy it!`
        );
        return infos.join("\n");
      })()
    : `${okSymbol} Everything is ok now! Enjoy it!`;
  try {
    await isFileOk(configFile);
    log(
      isOnlyInstall
        ? successInfo
        : `${okSymbol} The config file "${configFile}" is exist, just config it.`
    );
  } catch (e) {
    log(chalk.bgBlue.white("Now, config the suchjs"));
    const extendsChoices = ["such:recommend", "No, i don't need."];
    const extendsName = "extends";
    const suchDirName = "suchDir";
    const suchDirDef = "suchas";
    const dataDirName = "dataDir";
    const dataDirDef = "data";
    const dirnameValidator = (value) => {
      if (/^[\w$-]+$/.test(value)) {
        return true;
      }
      return "Please enter a regular directory name";
    };
    const results = await inquirer.prompt([
      {
        type: "list",
        name: extendsName,
        message: "Do you need to use the built-in extended types?",
        choices: extendsChoices,
      },
      {
        type: "input",
        name: suchDirName,
        message:
          "Please enter the such directory:(used for saving mock json data files, etc., base on root directory)",
        validate: dirnameValidator,
        default() {
          return suchDirDef;
        },
      },
      {
        type: "input",
        name: dataDirName,
        message:
          "Please enter the data directory:(used for saving dict files,json data files, etc., base on such directory)",
        validate: dirnameValidator,
        default() {
          return dataDirDef;
        },
      },
    ]);
    const confSuchDir = results[suchDirName];
    const confDataDir = results[dataDirName];
    const confConfig = {
      suchDir: confSuchDir,
      dataDir: confSuchDir + path.sep + confDataDir,
    };
    const lastConf = {
      extends:
        results[extendsName] === extendsChoices[extendsChoices.length - 1]
          ? []
          : [results[extendsName]],
      config: confConfig,
      types: {},
      alias: {},
    };
    const mkdir = promisify(fs.mkdir, fs);
    const createFile = promisify(fs.writeFile, fs);
    const spinner = createSpinnerWithClear(
      " Create directories and the config file"
    );
    try {
      spinner.start();
      // cli, create the cli root directory
      if (isForCli) {
        await mkdir(rootDir);
      }
      const lastSuchDir = path.join(rootDir, confConfig.suchDir);
      await mkdir(lastSuchDir);
      await mkdir(path.join(lastSuchDir, confDataDir), {
        recursive: true,
      });
      await createFile(
        configFile,
        "module.exports = " + JSON.stringify(lastConf, null, 4) + ";",
        "utf8"
      );
      spinner.clear();
      log(successInfo);
      process.exit(0);
    } catch (e) {
      spinner.clear();
      log(chalk.red(`Error: create failed "${e.message}"`));
      process.exit(1);
    }
  }
};
// judge if suchjs has installed
const isInstallSuchjs = (() => {
  return (
    packages &&
    ((packages.dependencies && "suchjs" in packages.dependencies) ||
      (packages.devDependencies && "suchjs" in packages.devDependencies))
  );
})();
if (!isInstallSuchjs && !isForCli) {
  // check if need install
  (async () => {
    const installChoices = [
      "Yes, install now.",
      "No, i will install it later by myself.",
    ];
    const installName = "install";
    const installAnswer = await inquirer.prompt([
      {
        type: "list",
        message: "You haven't install the suchjs yet,install it now?",
        name: installName,
        choices: installChoices,
      },
    ]);
    if (installAnswer[installName] === installChoices[0]) {
      const toolChoices = ["npm", "yarn", "pnpm"];
      const toolName = "tool";
      const dependName = "depend";
      const dependChoices = ["--save", "--save-dev"];
      const wayAnswers = await inquirer.prompt([
        {
          type: "list",
          message: "Please choose the package manager tool you used.",
          name: toolName,
          choices: toolChoices,
        },
        {
          type: "list",
          message: "Please choose the dependency mode.",
          name: dependName,
          choices: dependChoices,
        },
      ]);
      const isUseYarnOrPnpm = toolChoices.indexOf(wayAnswers[toolName]) > 0;
      const lastCommand =
        wayAnswers[toolName] +
        (isUseYarnOrPnpm ? " add " : " install ") +
        "suchjs " +
        (isUseYarnOrPnpm
          ? wayAnswers[dependName] === dependChoices[1]
            ? "--dev"
            : ""
          : wayAnswers[dependName]);
      let spinner = createSpinnerWithClear(" Install the suchjs library");
      spinner.start();
      try {
        await run(lastCommand);
        spinner.clear();
        log(`${okSymbol} The suchjs library was installed successfully.`);
      } catch (e) {
        spinner.clear();
        log(chalk.red(`Error: install failed "${e.message}"`));
        process.exit(1);
      }
    }
    await runAll(true);
  })();
} else {
  (async () => {
    await runAll();
  })();
}
