const { program } = require("commander");
const http = require("http");
const path = require("path");
const { promisify } = require("util");
const { URL } = require("url");
const chalk = require("chalk");
const parseBody = require("co-body");
const multiparty = require("multiparty");
const typeis = require("type-is");
const chokidar = require("chokidar");
const {
  capitalize,
  hasOwn,
  createSuch,
  isObject,
  reloadConfig,
  getFileContent,
  checkStat,
} = require("../helpers/utils");
const { OPTION_ROOT_DIRECOTRY } = require("../config/constants");
const sleep = (seconds) =>
  new Promise((resolve) => setTimeout(() => resolve(true), seconds));
program
  .option("-p, --port <number>", "Set the port listen on of the http server.")
  .option(...OPTION_ROOT_DIRECOTRY)
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
  .option(
    "-w, --watch",
    "If true, the mock server will watch the changes of the such config file and auto reload the server."
  )
  .parse(process.argv);

(async () => {
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
  // print debug information
  const printDebugInfo = (...args) => {
    const [info, result] = args;
    if (args.length >= 2) {
      // eslint-disable-next-line no-console
      console.log(
        `${chalk.yellow(info)} => ${chalk.green(
          JSON.stringify(result, null, 4)
        )}`
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(chalk.yellow(info));
    }
  };
  // reload
  const cliSuch = await createSuch(cliConfig);
  // get directories and watch config
  const {
    rootDir,
    suchDir,
    dataDir,
    server: { watch: configWatch } = {},
  } = cliSuch.store("config");
  // watch mode
  let httpServer;
  let watch = cliConfig.watch || configWatch;
  let watcher;
  const startOrCloseWatcher = async (isWatch) => {
    if (isWatch) {
      if (watcher) return;
      const suchConfigJs = path.join(rootDir, "such.config.js");
      const reloadConfigData = (filePath, action = "Change") => {
        printDebugInfo(
          `${action} a data file`,
          path.relative(dataDir, filePath)
        );
        printDebugInfo("<--------Now reload the data-------->");
        cliSuch.reloadData();
      };
      watcher = chokidar.watch([suchConfigJs, dataDir], {
        persistent: true,
        ignoreInitial: true,
      });
      watcher.on("change", (filePath) => {
        try {
          const isChangeConfig = path.relative(filePath, suchConfigJs) === "";
          // change the config file
          if (isChangeConfig) {
            delete require.cache[suchConfigJs];
            require(suchConfigJs);
            // restart the server
            if (httpServer) {
              printDebugInfo("Change the config file", "Reload the config.");
              printDebugInfo("<--------Now restart the server-------->");
              httpServer.close(() => {
                // reload the config file
                cliSuch.clearStore({
                  reset: true,
                  exclude: 'fileCache'
                });
                reloadConfig(cliSuch, rootDir);
                startHttpServer();
              });
            }
          } else {
            reloadConfigData(filePath);
          }
        } catch (e) {
          // the config file or data file not correct
        }
      });
      // when add a data file
      watcher.on("add", (filePath) => {
        reloadConfigData(filePath, "Add");
      });
      // when remove a data file
      watcher.on("unlink", (filePath) => {
        reloadConfigData(filePath, "Add");
      });
    } else {
      // stop the watcher
      if (watcher) {
        await watcher.close();
        watcher = null;
        // eslint-disable-next-line no-console
        console.warn(
          chalk.cyan(
            `The wather has been closed, the changes of the config and data files won't be watched anymore. You need to restart the server to let the changes make sence.`
          )
        );
      }
    }
  };
  // http server
  const startHttpServer = async () => {
    const suchStoreConfig = cliSuch.store("config");
    // such directory and server config
    const { server: config = {}, extensions = [".json"] } = suchStoreConfig;
    // get the last config
    const lastConfig = {
      port: 8181,
      directory: "server",
      pathSegSplit: ".",
      404: {},
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
      404: http404,
    } = lastConfig;
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
    const genTimeoutHandle = (timeout) =>
      Array.isArray(timeout) && timeout.length > 1
        ? () => timeout[0] + Math.round(Math.random() * timeout[1])
        : () => timeout || 0;
    const genTimeout = genTimeoutHandle(timeout);
    const hasPrefixExclude = Array.isArray(prefix);
    // find and remove the prefix
    const matchPrefix = prefix
      ? hasPrefixExclude
        ? (pathname, method) => {
            const [curPrefix, { exclude = [] } = {}] = prefix;
            // check if is in exclude
            const isInExclude = exclude.some((item) => {
              if (typeof item === "string") {
                return pathname === item;
              } else if (isObject(item) && item.path) {
                let isMatch = false;
                if (typeof item.path === "string") {
                  isMatch = item.path === pathname;
                } else if (item.path instanceof RegExp) {
                  isMatch = item.path.test(pathname);
                }
                if (isMatch && item.method) {
                  return item.method === method;
                }
                return isMatch;
              }
              return false;
            });
            if (isInExclude) {
              return {
                matched: true,
                pathname,
                exclude: true,
              };
            }
            // not in exclude
            const trimPrefix = curPrefix.replace(/^\//, "");
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
          if (debug)
            printDebugInfo(
              "Try to find file",
              path.relative(suchDir, fullname)
            );
          const { exist } = await checkStat(fullname);
          if (exist) {
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
          const { exist, dir: isDirectory } = await checkStat(tplDir);
          if (exist && isDirectory) {
            result = await getFile(exts, (ext) => {
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
    httpServer = http.createServer(async (req, res) => {
      const addr = `${baseURL}${req.url}`;
      const url = new URL(addr);
      let { pathname, searchParams } = url;
      const method = req.method.toLowerCase();
      let matched = true;
      let searchExtensions = extensions;
      let reason = "";
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
        const prefixData = matchPrefix(pathname, method);
        matched = prefixData.matched;
        pathname = prefixData.pathname;
        if (!matched)
          reason = `The url's pathname not match a prefix ${
            hasPrefixExclude
              ? "'" + prefix[0] + "' or in the exclude pathnames."
              : ""
          }`;
        if (debug)
          printDebugInfo(
            `Try to match and remove the prefix "${
              hasPrefixExclude ? prefix[0] : prefix
            }"`,
            matched
              ? prefixData.exclude
                ? "jump this step because the pathname is excluded by the config."
                : `After remove prefix: '${pathname}'`
              : "No prefix matched."
          );
      }
      // judge if matched
      if (matched) {
        if (debug) {
          printDebugInfo(
            "The path segment splitted by",
            pathSegSplit || "CamelCase"
          );
          printDebugInfo(
            "Search files with extension",
            searchExtensions.join("|")
          );
        }
        const { exist, ext, file } = await findMatchedFile(
          pathname,
          method,
          searchExtensions
        );
        if (debug) {
          if (exist) {
            printDebugInfo("Find matched file", path.relative(suchDir, file));
          } else {
            printDebugInfo(`No matched file found at last.`);
          }
        }
        if (exist) {
          let content = await getFileContent(file);
          const baseContext = {
            method,
            extension: ext,
          };
          let ctx = {
            data: {},
            ...baseContext,
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
          if (hasInjectContext) {
            // inject ctx variable to such config
            const context = {
              query: getAllQuery(),
              data: getAllData(),
              ...baseContext,
            };
            // assign ctx to the such instance
            cliSuch.assign("ctx", context);
            // debug
            if (debug) printDebugInfo("Inject the context", context);
          }
          let suchOptions = {};
          let delay;
          let respHeaders = {};
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
            const overrideConfig = buildConfig(pathname, context, lastConfig);
            const { instance, timeout, headers = {} } = overrideConfig || {};
            // override the timeout/headers
            delay = timeout ? genTimeoutHandle(timeout)() : undefined;
            respHeaders = headers;
            // set config
            if (instance) {
              suchOptions = instance;
              if (debug)
                printDebugInfo(
                  "Resolve the such instance's config by handle buildConfig",
                  suchOptions
                );
            }
          }
          try {
            if (ext === ".json") {
              content = await cliSuch
                .instance(JSON.parse(content))
                .a(suchOptions);
              content = JSON.stringify(content);
            } else {
              content = cliSuch
                .instance(":::" + content.toString())
                .a(suchOptions);
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.log(
              chalk.red(`Call such.as cause an error => ${e.message}`)
            );
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
          // if external headers
          if (isObject(respHeaders)) {
            for (const field in respHeaders) {
              if (hasOwn(respHeaders, field)) {
                res.setHeader(field, respHeaders[field]);
              }
            }
          }
          // set statu code
          res.writeHead(200);
          // timeout
          delay = typeof delay === "number" ? delay : genTimeout();
          if (delay > 0) {
            if (debug) printDebugInfo(`Delay with millisecond`, `${delay}ms`);
            await sleep(delay);
          }
          printDebugInfo("The response is ok", 200);
          res.end(content);
          return;
        } else {
          reason = `Not found a matched mock data template file, extensions: ${extensions}`;
        }
      }
      printDebugInfo(
        "The request is not match the prefix or any mock template file",
        404
      );
      // set 404 response
      const {
        headers = {
          "Content-Type": "text/html",
        },
        body = `<h2>404 Not Found</h2><p>No matching request response found in mock service.</p><p>Reason: ${
          reason || "unkown"
        }</p>`,
      } = http404;
      for (const field in headers) {
        if (hasOwn(headers, field)) {
          res.setHeader(field, headers[field]);
        }
      }
      res.writeHead(404);
      res.end(body);
    });
    // start the server
    httpServer.listen(port);
    // print the server information
    printDebugInfo("The server is running at", baseURL);
    // print the config
    if (debug) printDebugInfo("The server config", lastConfig);
    // reset the watch
    const curWatch =
      cliConfig.watch ||
      (suchStoreConfig.server && suchStoreConfig.server.watch);
    if (curWatch !== watch) {
      await startOrCloseWatcher(curWatch);
      watch = curWatch;
    }
    // return the server
    return httpServer;
  };
  // start the server
  await startHttpServer();
  // start the watcher if watch is true
  await startOrCloseWatcher(watch);
})();
