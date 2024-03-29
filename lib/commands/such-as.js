const { program } = require("commander");
const { OPTION_ROOT_DIRECOTRY } = require("../config/constants");
const { createSuch } = require("../helpers/utils");

program
  .argument("<struct>", "Set the fake data structure")
  .option(
    "-c, --count <number>",
    "Generate the fake data for number of times and splitted by new line"
  )
  .option(...OPTION_ROOT_DIRECOTRY)
  .option(
    "-s, --stringify",
    "Stringify the fake data before output to the sdtout."
  )
  .parse(process.argv);

let [struct] = program.args;
(async () => {
  let result;
  const options = program.opts();
  const output = options.stringify
    ? () => {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(result, null, 4));
      }
    : () => {
        // eslint-disable-next-line no-console
        console.log(result);
      };
  const { count = 1 } = options;
  const cliSuch = await createSuch(options);
  // test if is a file with extension in config extesions
  const { extensions = [".json"] } = cliSuch.store('config');
  const useFile =
    extensions.length &&
    (() => {
      const exts = extensions.map((name) => name.slice(1)).join("|");
      return new RegExp(`\\.(?:${exts})`);
    })().test(struct);

  if (useFile) {
    for (let i = 0; i < count; i++) {
      result = await cliSuch.asc(struct);
      output();
    }
  } else {
    const firstCh = struct.charAt(0);
    if (firstCh === "{" || firstCh === "[") {
      try {
        struct = JSON.parse(struct);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
      }
    } else if (firstCh !== ":") {
      // take it as template
      struct = `:::${struct}`;
    }
    for (let i = 0; i < count; i++) {
      result = cliSuch.as(struct);
      output();
    }
  }
})();
