const globalSuch = require("suchjs").default;
const { program } = require("commander");
const http = require('http');

program
  .option(
    "-p, --port <number>",
    "Set the prot listen on of the http server."
  )
  .option(
    "-t, --timeout <number,number>",
    "Set the timeout range of per request."
  )
  .parse(process.argv);

const { rootDir, server: config  = {}, extensions = ['.json'] } = globalSuch.store.config;
const { port, pathSegSplit, timeout } = {
  port: 8181,
  ...config,
  ...program.opts()
};

const server = http.createServer((req, res) => {
  
});

server.listen(port);