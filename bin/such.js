#!/usr/bin/env node
import { program } from 'commander/esm.mjs';
import { createRequire } from "module";

const requireJSON = createRequire(import.meta.url);
const { version } = requireJSON('../package.json');

program
.version(version)
.command('init','Initialize the suchjs config file.')
.command('as <struct>', 'Generate a fake data.', {
  isDefault: true
})
.parse(process.argv);