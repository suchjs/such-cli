#!/usr/bin/env node
const { program } = require("commander");
const { version } = require("../package.json");

program
  .version(version)
  .command("init", "Initialize the suchjs config file.")
  .command("as <struct>", "Generate a fake data.", {
    isDefault: true,
  })
  .command("serve", "Run a mock server for requests.")
  .command("template <pathaname>", "Create a mock template file by api information.")
  .parse(process.argv);
