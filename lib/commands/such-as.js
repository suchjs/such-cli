import globalSuch from "suchjs";
import { program } from "commander";

program
  .option(
    "-c, --count <number>",
    "Generate the fake data for number of times and splitted by new line"
  )
  .parse(process.argv);

let [struct] = program.args;

if (struct) {
  let result;
  const options = program.opts();
  const output = () => {
    console.log(result);
  };
  const { count = 1 } = options;
  
  if (/\.json$/i.test(struct)) {
    (async () => {
      for (let i = 0; i < count; i++) {
        result = await globalSuch.asc(struct);
        output();
      }
    })();
  } else {
    const firstCh = struct.charAt(0);
    if (firstCh === "{" || firstCh === "[") {
      try {
        struct = JSON.parse(struct);
      } catch (e) {
        console.log(e);
      }
    } else if (firstCh !== ":") {
      console.log('当前struct', struct);
      // take it as template
      struct = `:::${struct}`;
    }
    for (let i = 0; i < count; i++) {
      result = globalSuch.as(struct);
      output();
    }
  }
}
