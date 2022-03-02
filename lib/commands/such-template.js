const path = require("path");
const chalk = require("chalk");
const { program } = require("commander");
const { OPTION_ROOT_DIRECOTRY } = require("../config/constants");
const {
  createSuch,
  checkStat,
  deleteFile,
  getFileContent,
  createFile,
} = require("../helpers/utils");
const inquirer = require("inquirer");

program
  .option(...OPTION_ROOT_DIRECOTRY)
  .option("-e, --ext", "Set the extension of the file need be do with.")
  .option("-d, --del", "Delete the mock template file.")
  .option("-m, --method <string>", "Set the method of the request url.")
  .option("-a, --add", "Add a mock template file.")
  .parse(process.argv);

let [pathname] = program.args;
(async () => {
  try {
    if (pathname) {
      const origPathname = pathname;
      const options = program.opts();
      const cliSuch = await createSuch(options);
      const config = cliSuch.store("config");
      const { suchDir, server = {}, extensions = [".json"] } = config;
      const serverDir = path.join(suchDir, server.directory || "server");
      const { pathSegSplit = ".", prefix } = server;
      const beginSlashRule = /^\//;
      const lastPrefix = (Array.isArray(prefix) ? prefix[0] : prefix).replace(
        beginSlashRule,
        ""
      );
      pathname = pathname.replace(beginSlashRule, "");
      if (pathname.startsWith(lastPrefix)) {
        pathname = pathname
          .slice(lastPrefix.length)
          .replace(beginSlashRule, "");
      }
      const pathSegs = pathname.replace(/\/$/, "").split("/");
      if (pathSegs.length) {
        const ext = options.ext || extensions[0];
        const maybeFile = path.join(
          serverDir,
          `${pathSegs.join(pathSegSplit)}${ext}`
        );
        const hasMethod = options.method;
        const file = hasMethod
          ? path.join(
              serverDir,
              pathSegs.join(path.sep),
              `${options.method.toLowerCase()}${ext}`
            )
          : maybeFile;
        const validateSure = function (value) {
          if (
            typeof value === "string" &&
            ["Y", "N"].includes(value.toUpperCase())
          ) {
            return true;
          }
          return 'Please enter a "Y" for sure or a "N" for not.';
        };
        if (options.del) {
          // delete the file
          const { exist } = await checkStat(file);
          if (exist) {
            const name = "sure";
            const result = await inquirer.prompt([
              {
                type: "input",
                name,
                message: `Are you sure to delete the pathname(${origPathname})'s mock template file '${file}'?`,
                validate: validateSure,
                default() {
                  return "Y";
                },
              },
            ]);
            if (result[name].toUpperCase() === "Y") {
              await deleteFile(file);
              // eslint-disable-next-line no-console
              console.log(chalk.red(`The file '${file}' has been deleted.`));
            } else {
              // eslint-disable-next-line no-console
              console.log(chalk.green(`You have exited to delete the file.`));
            }
          } else {
            throw new Error(`Can't find the file '${file}'`);
          }
        } else if (options.add) {
          // add a mock template file
          const name = "sure";
          const result = await inquirer.prompt([
            {
              type: "input",
              name,
              message: `Are you sure to add the pathname(${origPathname})'s mock template file '${file}'?`,
              validate: validateSure,
              default() {
                return "Y";
              },
            },
          ]);
          if (result[name].toUpperCase() === "Y") {
            await createFile(file, hasMethod);
            // eslint-disable-next-line no-console
            console.log(chalk.green(`The file '${file}' has been created.`));
          } else {
            // eslint-disable-next-line no-console
            console.log(chalk.green(`You have exited to add the file.`));
          }
        } else {
          // view the file's content
          let { exist } = await checkStat(file);
          let content;
          if (exist) {
            content = await getFileContent(file);
          } else if (hasMethod) {
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
            throw new Error(
              `The file '${file}' which you want to view is not exist.`
            );
          }
        }
      } else {
        throw new Error("Please provide a valid pathname of the request url.");
      }
    } else {
      throw new Error("Please provide the pathname of your request url.");
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(chalk.red(e.message));
  }
})();
