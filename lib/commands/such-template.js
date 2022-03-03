const path = require("path");
const chalk = require("chalk");
const commander = require("commander");
const { program } = commander;
const { OPTION_ROOT_DIRECOTRY, ALLOW_METHODS } = require("../config/constants");
const {
  createSuch,
  checkStat,
  deleteFile,
  getFileContent,
  createFile,
  removeDirectory,
} = require("../helpers/utils");
const inquirer = require("inquirer");
const ACTION_DEL = "del";
const ACTION_ADD = "add";
const ACTION_VIEW = "show";
const allowedActions = {
  create: ACTION_ADD,
  add: ACTION_ADD,
  del: ACTION_DEL,
  delete: ACTION_DEL,
  remove: ACTION_DEL,
  rm: ACTION_DEL,
  view: ACTION_VIEW,
  show: ACTION_VIEW,
};
const optionalActions = Array.from(new Set(Object.values(allowedActions))).join(
  "|"
);
const validateAction = function (value) {
  if (!(value in allowedActions)) {
    throw new commander.InvalidArgumentError(
      `The action should be ${optionalActions}`
    );
  }
};
const validatePathanme = function (value) {
  if (typeof value !== "string") {
    throw new commander.InvalidArgumentError(`Invalid pathanme: ${value}`);
  }
  if (!/^\/?[^/\s]+(?:\/[^/\s])*\/?$/.test(value)) {
    throw new commander.InvalidArgumentError(`Invalid pathanme: ${value}`);
  }
};

program
  .argument(
    "<action>",
    `The action of the template operation, which can be ${optionalActions}`,
    validateAction
  )
  .argument("<pathaname>", "The pathname of the request url", validatePathanme)
  .option(...OPTION_ROOT_DIRECOTRY)
  .option("-e, --ext", "Set the extension of the file need be do with.")
  .option("-m, --method [string...]", "Set the method of the request url.")
  .parse(process.argv);

let [actionKey, ...pathnames] = program.args;
(async () => {
  try {
    const options = program.opts();
    const action = allowedActions[actionKey];
    const cliSuch = await createSuch(options);
    // configs
    const config = cliSuch.store("config");
    const { suchDir, server = {}, extensions = [".json"] } = config;
    const serverDir = path.join(suchDir, server.directory || "server");
    const { pathSegSplit = ".", prefix = "" } = server;
    const beginSlashRule = /^\//;
    const lastPrefix = (Array.isArray(prefix) ? prefix[0] : prefix).replace(
      beginSlashRule,
      ""
    );
    let isRestful = false;
    let method = options.method;
    let lastMethods = [];
    const hasMethod = method
      ? (() => {
          if (method === true || (method.length === 1 && method[0] === '*')) {
            lastMethods = ALLOW_METHODS;
            isRestful = true;
            return true;
          }
          lastMethods = method.length === 1 ? method[0].split(",") : method;
          lastMethods = lastMethods.map((curMethod) => {
            const lowerMethod = curMethod.toLowerCase();
            if (ALLOW_METHODS.includes(lowerMethod)) {
              method = lowerMethod;
              return lowerMethod;
            } else {
              throw new Error(
                `Unsupported method '${method}' set by option --method or -m`
              );
            }
          });
          return true;
        })()
      : false;
    const ext = options.ext
      ? (() => {
          const { ext } = options;
          if (!extensions.includes(ext)) {
            throw new Error(
              `The extension '${ext}' set by option --ext or -e is not included in extensions ${extensions}`
            );
          }
          return ext;
        })()
      : extensions[0];
    // files
    const allMaybeFiles = [];
    const allDirs = [];
    let allFiles = [];
    let lastPathnames = [];
    pathnames.forEach((pathname) => {
      pathname = pathname.replace(beginSlashRule, "");
      if (pathname.startsWith(lastPrefix)) {
        pathname = pathname
          .slice(lastPrefix.length)
          .replace(beginSlashRule, "");
      }
      const pathSegs = pathname.replace(/\/$/, "").split("/");
      const maybeFile = path.join(
        serverDir,
        `${pathSegs.join(pathSegSplit)}${ext}`
      );
      const addFile = (file) => {
        lastPathnames.push(pathname);
        allFiles.push(file);
      };
      if (hasMethod) {
        const curDir = path.join(serverDir, pathSegs.join(path.sep));
        const addFileByMethod = (method) => {
          const file = path.join(curDir, `${method}${ext}`);
          addFile(file);
        };
        allMaybeFiles.push(maybeFile);
        // push the directory to the list
        if (lastMethods.length > 1) {
          lastMethods.forEach((method) => {
            addFileByMethod(method);
          });
          allDirs.push(curDir);
        } else {
          addFileByMethod(method);
        }
      } else {
        addFile(maybeFile);
      }
    });
    // add or delete allow multiple files
    if (action === ACTION_ADD || action === ACTION_DEL) {
      // make sure inquire
      const sureName = "sure";
      const genSureMessage =
        allFiles.length === 1
          ? (allFiles) =>
              `Are you sure to ${action} the pathname(${lastPathnames[0]})'s mock template file '${allFiles[0]}'?`
          : (allFiles) =>
              `Are you sure ${action} those mock template files: ${allFiles
                .reduce((ret, file, index) => {
                  ret.push(`${lastPathnames[index]}=>${file}`);
                  return ret;
                }, [])
                .join(",")}`;
      const validateSure = function (value) {
        if (
          typeof value === "string" &&
          ["Y", "N"].includes(value.toUpperCase())
        ) {
          return true;
        }
        return 'Please enter a "Y" for sure or a "N" for not.';
      };
      const inquireSure = {
        type: "input",
        name: sureName,
        validate: validateSure,
        default() {
          return "Y";
        },
      };
      const genFileSucTips = (allFiles) =>
        `The ${
          allFiles.length > 1
            ? "files " + allFiles.join(",")
            : "file " + allFiles[0]
        }`;
      // check action
      if (action === ACTION_ADD) {
        // add one or more mock template file
        const result = await inquirer.prompt(
          Object.assign(inquireSure, {
            message: genSureMessage(allFiles),
          })
        );
        if (result[sureName].toUpperCase() === "Y") {
          await Promise.all(
            allFiles.map((file) =>
              createFile(file, "", {
                dir: hasMethod,
                flag: "a",
              })
            )
          );
          // eslint-disable-next-line no-console
          console.log(
            chalk.green(`${genFileSucTips(allFiles)} has been created.`)
          );
        } else {
          // eslint-disable-next-line no-console
          console.log(chalk.green(`You have exited to create.`));
        }
      } else if (action === ACTION_DEL) {
        const notExistFiles = [];
        // check if all files exist
        for (const [index, file] of allFiles.entries()) {
          // delete the file
          const { exist } = await checkStat(file);
          if (!exist) {
            if (isRestful) {
              notExistFiles.push(index);
            } else {
              throw new Error(`Can't find the file '${file}'`);
            }
          }
        }
        const filterFn = (_, index) => !notExistFiles.includes(index);
        allFiles = allFiles.filter(filterFn);
        lastPathnames = lastPathnames.filter(filterFn);
        const result = await inquirer.prompt(
          Object.assign(inquireSure, {
            message: genSureMessage(allFiles),
          })
        );
        if (result[sureName].toUpperCase() === "Y") {
          await Promise.all(
            allFiles
              .map((file) => deleteFile(file))
              .concat(
                isRestful ? allDirs.map((dir) => removeDirectory(dir)) : []
              )
          );
          // eslint-disable-next-line no-console
          console.log(
            chalk.red(`${genFileSucTips(allFiles)} has been deleted.`)
          );
        } else {
          // eslint-disable-next-line no-console
          console.log(chalk.green(`You have exited to delete.`));
        }
      }
    } else {
      // view the file's content
      const [file] = allFiles;
      let { exist } = await checkStat(file);
      let content;
      if (exist) {
        content = await getFileContent(file);
      } else if (hasMethod) {
        const [maybeFile] = allMaybeFiles[0];
        exist = (await checkStat(maybeFile)).exist;
        if (exist) {
          content = await getFileContent(file);
        }
      }
      if (exist) {
        // eslint-disable-next-line no-console
        console.log(chalk.yellow(`File: ${file}`));
        // eslint-disable-next-line no-console
        console.log(chalk.green(content));
      } else {
        throw new Error(`The file '${file}' is not exist.`);
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(chalk.red(e.message));
  }
})();
