#!/usr/bin/env node
const { program } = require('commander');
const { version } = require('../package.json');

program
.version(version)
.command('init','Initialize the suchjs config file.')
.command('as <struct>', 'Generate a fake data.', {
  isDefault: true
})
.parse(process.argv);