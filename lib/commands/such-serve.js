const { program } = require("commander");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const { URL } = require("url");
const chalk = require("chalk");
const parseBody = require("co-body");
const multiparty = require("multiparty");
const typeis = require("type-is");
const { capitalize, hasOwn, createSuch } = require("../helpers/utils");
const checkStat = promisify(fs.stat);
const getFileContent = promisify(fs.readFile);
const sleep = (seconds) =>
  new Promise((resolve) => setTimeout(() => resolve(true), seconds));
program
  .option("-p, --port <number>", "Set the port listen on of the http server.")
  .option(
    "-r, --root <directory>",
    "Set the root directory, the parent directory of the such.config.js file, other directories in config will base on it."
  )
  .option(
    "-t, --timeout <number,number>",
    "Set the timeout range of per request."
  )
  .option("-d, --debug", "Debug the request process.")
  .option(
    "-P, --prefix <string>",
    "Check if the pathname is starts with the prefix and remove it from pathname."
  )
  .option(
    "-D, --directory <string>",
    "Set the directory which the mock data template files saved in."
  )
  .option(
    "-s, --path-seg-split <string>",
    "Set the separator to join the pathname segments as the mock template file's filename."
  )
  .option(
    "-i, --inject-context",
    "If inject the context as a config variable 'ctx' to the mock template file."
  )
  .parse(process.argv);
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
// reload the
const cliSuch = createSuch(cliConfig);
const {
  suchDir,
  server: config = {},
  extensions = [".json"],
} = cliSuch.store.config;

const lastConfig = {
  port: 8181,
  directory: "server",
  pathSegSplit: ".",
  ...config,
  ...cliConfig,
};
const {
  port,
  prefix,
  pathSegSplit,
  directory,
  extContentTypes,
  timeout,
  debug,
  injectContext,
  buildConfig,
} = lastConfig;
const printDebugInfo = (...args) => {
  const [info, result] = args;
  if (args.length >= 2) {
    console.log(
      `${chalk.yellow(info)} => ${chalk.green(JSON.stringify(result, null, 4))}`
    );
  } else {
    console.log(chalk.yellow(info));
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
const typeExtHashs = Object.keys(extTypeHashs).reduce((ret, key) => {
  ret[extTypeHashs[key]] = key;
  return ret;
}, {});
// server directory
const serverDir = path.join(suchDir, directory);
// generate a random timeout
const genTimeout = Array.isArray(timeout)
  ? () => timeout[0] + Math.round(Math.random() * timeout[1])
  : () => timeout || 0;
// find and remove the prefix
const matchPrefix = prefix
  ? (pathname) => {
      const trimPrefix = prefix.replace(/^\//, "");
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
    let result;
    // first, check if is an directory
    try {
      const tplDir = path.join(serverDir, pathname);
      const stat = await checkStat(tplDir);
      if (stat.isDirectory()) {
        result = await getFile(exts, (ext) =>{
          const file = path.join(tplDir, `${method}${ext}`);
          return file;
        });
        if (result && result.exist) {
          return result;
        }
      }
    } catch (e) {
      // not a directory
    }
    // result
    const filename = genFileName(pathname);
    result = await getFile(exts, (ext) =>
      path.join(serverDir, `${filename}${ext}`)
    );
    if (result && result.exist) {
      return result;
    }
    return {
      exist: false,
    };
  };
})();
// check if need parse query and data
const hasQueryDataHandle = typeof buildConfig === "function";
const hasInjectContext = injectContext === true;
// parse multi-part data
let parseMultiparty;
// create the server
const baseURL = `http://localhost:${port}`;
const server = http.createServer(async (req, res) => {
  const addr = `${baseURL}${req.url}`;
  const url = new URL(addr);
  let { pathname, searchParams } = url;
  let matched = true;
  let searchExtensions = extensions;
  printDebugInfo("Request url", addr);
  // print the debug information
  if (debug) printDebugInfo("The request's pathname", pathname);
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
    const reqContentType = req.headers["content-type"];
    const ext = typeExtHashs[reqContentType];
    if (ext) {
      searchExtensions = [ext];
      if (debug)
        printDebugInfo(
          `The request has a content type "${reqContentType}"`,
          `Match exactly extension ${ext}`
        );
    }
    pathname = pathname.slice(1);
  }
  // check if config the prefix
  if (prefix) {
    const prefixData = matchPrefix(pathname);
    matched = prefixData.matched;
    pathname = prefixData.pathname;
    if (debug)
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
    const method = req.method.toLowerCase();
    const { exist, ext, file } = await findMatchedFile(
      pathname,
      method,
      searchExtensions
    );
    if (debug) {
      if (exist) {
        printDebugInfo("Find matched file", file);
      } else {
        printDebugInfo(`No matched file found at last.`);
      }
    }
    if (exist) {
      let content = await getFileContent(file);
      let ctx = {
        method,
        data: {},
      };
      const getAllQuery = () => {
        if (!ctx.query) {
          const query = {};
          for (const [key, value] of searchParams.entries()) {
            if (hasOwn(query, key)) {
              if (Array.isArray(query[key])) {
                query[key].push(value);
              } else {
                query[key] = [query[key], value];
              }
            } else {
              query[key] = value;
            }
          }
          ctx.query = query;
        }
        return ctx.query;
      };
      const getAllData = () => {
        return ctx.data;
      };
      // parse the request body to data
      if ((hasInjectContext || hasQueryDataHandle) && typeis.hasBody(req)) {
        if (typeis(req, ["multipart"])) {
          if (!parseMultiparty) {
            const form = new multiparty.Form();
            parseMultiparty = promisify(form.parse).bind(form);
          }
          ctx.data = await parseMultiparty(req);
        } else if (typeis(req, ["json", "urlencoded"])) {
          ctx.data = await parseBody(req);
        }
      }
      let suchOptions = {};
      if (hasInjectContext) {
        // inject ctx variable to such config
        const context = {
          query: getAllQuery(),
          data: getAllData(),
          method,
        };
        cliSuch.assign("ctx", context);
        if (debug) printDebugInfo("Inject the context", context);
      }
      // query data handle to keys options
      if (hasQueryDataHandle) {
        // gen the context parameter
        const context = { method };
        context.query = (...args) => {
          if (args.length === 0) {
            return getAllQuery();
          }
          const name = args[0];
          return ctx.query ? ctx.query[name] : searchParams.getAll(name);
        };
        context.data = (...args) => {
          const allData = getAllData();
          if (args.length === 0) {
            return allData;
          }
          return allData[args[0]];
        };
        // generate the config
        const keys = buildConfig(pathname, context, lastConfig);
        // set config
        suchOptions = {
          keys,
        };
        if (debug)
          printDebugInfo("Resolve the keys config by handle buildConfig", keys);
      }
      if (ext === ".json") {
        content = await cliSuch.instance(JSON.parse(content)).a(suchOptions);
        content = JSON.stringify(content);
      } else {
        content = cliSuch.instance(":::" + content.toString()).a(suchOptions);
      }
      // get content type
      let respContentType = extTypeHashs[ext];
      if (Array.isArray(respContentType)) {
        respContentType = respContentType[0];
      }
      if (debug)
        printDebugInfo(
          `The Content-Type of extension '${ext}'`,
          respContentType
        );
      // set header
      res.setHeader("Content-Type", respContentType);
      // statu code
      res.writeHead(200);
      // timeout
      const delay = genTimeout();
      if (delay > 0) {
        if (debug) printDebugInfo(`Delay with millisecond`, delay);
        await sleep(delay);
      }
      printDebugInfo("The response is ok", 200);
      res.end(content);
      return;
    }
  }
  printDebugInfo(
    "The request is not match the prefix or any mock template file",
    404
  );
  res.writeHead(404);
  res.end();
});

server.listen(port);
printDebugInfo("The server is running on", baseURL);
if (debug) printDebugInfo("The server config", lastConfig);
