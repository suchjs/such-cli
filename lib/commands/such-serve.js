const globalSuch = require("suchjs").default;
const { program } = require("commander");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const { URL } = require("url");
const chalk = require("chalk");
const { capitalize } = require("../helpers/utils");
const checkStat = promisify(fs.stat);
const getFileContent = promisify(fs.readFile);
const sleep = (seconds) =>
  new Promise((resolve) => setTimeout(() => resolve(true), seconds));
program
  .option("-p, --port <number>", "Set the prot listen on of the http server.")
  .option(
    "-t, --timeout <number,number>",
    "Set the timeout range of per request."
  )
  .option("-d, --debug", "Debug the request process.")
  .parse(process.argv);

const {
  suchDir,
  server: config = {},
  extensions = [".json"],
} = globalSuch.store.config;
// command line config
const cliConfig = (() => {
  const { port, timeout, ...config } = program.opts();
  if (Array.isArray(timeout)) {
    config.timeout = port.slice(0, 2);
  } else if (typeof timeout === "string") {
    const minAndMax = timeout.split(",");
    if (minAndMax.length === 2) {
      config.timeout = minAndMax.map((num) => Number(num));
    } else if (minAndMax.length === 1) {
      config.timeout = Number(minAndMax[0]);
    }
  }
  if (!isNaN(port)) {
    config.port = Number(port);
  }
  return config;
})();
const {
  port,
  prefix,
  pathSegSplit = ".",
  directory = "server",
  extContentTypes,
  timeout,
  debug,
} = {
  port: 8181,
  ...config,
  ...cliConfig,
};
const printDebugInfo = (info, result) => {
  if (result) {
    console.log(`${chalk.yellow(info)} => ${chalk.green(result)}`);
  } else {
    console.log(chalk.green(info));
  }
};
// extension mime-type
const extTypeHashs = Object.assign(
  {
    ".json": "application/json",
    ".txt": "text/plain",
    ".css": "text/css",
    ".html": "text/html",
    ".js": "text/javascript",
  },
  extContentTypes
);
// server directory
const serverDir = path.join(suchDir, directory);
// generate a random timeout
const genTimeout = Array.isArray(timeout)
  ? () => timeout[0] + Math.round(Math.random() * timeout[1])
  : () => timeout || 0;
// find and remove the prefix
const matchPrefix = prefix
  ? (pathname) => {
      const trimPrefix = prefix.replace(/^\//, '');
      if (pathname.indexOf(trimPrefix) === 0) {
        return {
          matched: true,
          pathname: pathname.slice(trimPrefix.length).replace(/^\//, ""),
        };
      } else {
        return {
          matched: false,
          pathname,
        };
      }
    }
  : (pathname) => {
      return {
        matched: true,
        pathname,
      };
    };
// generate the filename
const genFileName =
  pathSegSplit === ""
    ? (pathname) =>
        pathname
          .split("/")
          .map((seg, index) => (index > 0 ? capitalize(seg) : seg))
          .join("")
    : (pathname) => pathname.split("/").join(pathSegSplit);
// get the correct matched file
const getFile = async (exts, gen) => {
  // check all files
  for (const ext of exts) {
    const fullname = gen(ext);
    try {
      if (debug) printDebugInfo("Try to find file", fullname);
      const stat = await checkStat(fullname);
      if (stat.isFile()) {
        return {
          exist: true,
          file: fullname,
          ext,
        };
      } else {
        if (debug) printDebugInfo(`The file is not a regular file.`);
      }
    } catch (e) {
      // the file not exist
      if (debug) printDebugInfo(`The file is not found.`);
    }
  }
};
// find the matched file
const findMatchedFile = (() => {
  return async (pathname, method, exts) => {
    const filename = genFileName(pathname);
    let result = await getFile(exts, (ext) =>
      path.join(serverDir, `${filename}${ext}`)
    );
    if (result && result.exist) {
      return result;
    }
    // check if is in directory
    try {
      const dir = await checkStat(filename);
      if (dir.isDirectory()) {
        result = await getFile(exts, (ext) =>
          path.join(serverDir, filename, `${method}${ext}`)
        );
        if (result && result.exist) {
          return result;
        }
      }
    } catch (e) {
      // not a directory
    }
    return {
      exist: false,
    };
  };
})();
// create the server
const baseURL = `http://localhost:${port}`;
const server = http.createServer(async (req, res) => {
  const addr = `${baseURL}${req.url}`;
  const url = new URL(addr);
  let { pathname } = url;
  let matched = true;
  let searchExtensions = extensions;
  // print the debug information
  if (debug) printDebugInfo("Requst the path", pathname);
  // check if pathname include the extension
  const curExt = path.extname(pathname);
  // if true, set the pathname with extension revmoed
  // just find the extension with current extension
  // remove the prefix '/' of the pathname
  if (curExt) {
    pathname = pathname.slice(1, -curExt.length);
    searchExtensions = [curExt];
    if (debug)
      printDebugInfo(
        `The pathname has an extension "${curExt}"`,
        `Match exactly extension ${curExt}`
      );
  } else {
    pathname = pathname.slice(1);
  }
  // check if config the prefix
  if (prefix) {
    const prefixData = matchPrefix(pathname);
    matched = prefixData.matched;
    pathname = prefixData.pathname;
    printDebugInfo(
      `Try to match and remove the prefix "${prefix}"`,
      matched ? pathname : "No prefix matched."
    );
  }
  // judge if matched
  if (matched) {
    if (debug) {
      printDebugInfo(
        "The path segment splitted by",
        pathSegSplit || "CamelCase"
      );
      printDebugInfo("Search files with extension", searchExtensions.join("|"));
    }
    const { exist, ext, file } = await findMatchedFile(
      pathname,
      req.method.toLowerCase(),
      searchExtensions
    );
    if (exist) {
      printDebugInfo("Find matched file", file);
    } else {
      printDebugInfo(`No matched file found at last.`);
    }
    if (exist) {
      let content = await getFileContent(file);
      const delay = genTimeout();
      if (ext === ".json") {
        content = await globalSuch.as(JSON.parse(content));
        content = JSON.stringify(content);
      } else {
        content = globalSuch.template(content.toString()).a();
      }
      const contentType = extTypeHashs[ext];
      if (debug)
        printDebugInfo(`The Content-Type of extension '${ext}'`, contentType);
      // set header
      res.setHeader("Content-Type", contentType);
      // statu code
      res.writeHead(200);
      // timeout
      if (delay > 0) {
        if (debug) printDebugInfo(`Delay with millisecond`, delay);
        await sleep(delay);
      }
      res.end(content);
      return;
    }
  }
  res.writeHead(404);
  res.end();
});

server.listen(port);
printDebugInfo(`The server is running on`, baseURL);