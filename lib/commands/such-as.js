import * as Such from "suchjs";
import { program } from "commander";



program.parse(process.argv);

let [struct] = program.args;

if (struct) {
  const globalSuch = Such.default;
  const firstCh = struct.charAt(0);
  if (firstCh === "{" || firstCh === "[") {
    try {
      struct = JSON.parse(struct);
    } catch (e) {
      console.log(e);
    }
  }
  console.log('当前such', Such);
  console.log(globalSuch.__proto__);
  const result = globalSuch.as(struct);
  console.log(result);
}
