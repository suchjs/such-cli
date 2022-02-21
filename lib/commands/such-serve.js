const globalSuch = require("suchjs").default;
const { program } = require("commander");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const { URL } = require("url");
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
  .parse(process.argv);

const {
  suchDir,
  server: config = {},
  extensions = [".json"],
} = globalSuch.store.config;

const cliConfig = (() => {
  const { port, timeout } = program.opts();
  const config = {};
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
} = {
  port: 8181,
  ...config,
  ...cliConfig,
};
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
const serverDir = path.join(suchDir, directory);
const genTimeout = Array.isArray(timeout)
  ? () => timeout[0] + Math.round(Math.random() * timeout[1])
  : () => timeout || 0;
const findMatchedFile = (() => {
  const genFileName =
    pathSegSplit === ""
      ? (pathname) =>
          pathname
            .split("/")
            .map((seg, index) => (index > 0 ? capitalize(seg) : seg))
            .join("")
      : (pathname) => pathname.split("/").join(pathSegSplit);
  const matchPrefix = prefix
    ? (pathname) => {
        if (pathname.indexOf(prefix) === 0) {
          return {
            matched: true,
            pathname: pathname.slice(prefix.length).replace(/^\//, ''),
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
  const getFile = async (exts, gen) => {
    // check all files
    for (const ext of exts) {
      const fullname = gen(ext);
      try {
        console.log(`Try to find file => ${fullname}`);
        const stat = await checkStat(fullname);
        if (stat.isFile()) {
          return {
            exist: true,
            file: fullname,
            ext,
          };
        } else {
          console.log(`The file is not a regular file.`);
        }
      } catch (e) {
        // the file not exist
        console.log(`The file is not found.`);
      }
    }
  };
  return async (url, method, exts) => {
    const { matched, pathname } = matchPrefix(url);
    if (matched) {
      const filename = genFileName(pathname);
      let result = await getFile(exts, (ext) =>
        path.join(serverDir, `${filename}${ext}`)
      );
      if (result && result.exist) {
        result.pathname = pathname;
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
            result.pathname = pathname;
            return result;
          }
        }
      } catch (e) {
        // not a directory
      }
    }
    return {
      exist: false,
      pathname,
    };
  };
})();

const server = http.createServer(async (req, res) => {
  const url = new URL(`http://localhost:${port}${req.url}`);
  let { pathname } = url;
  let searchExtensions = extensions;
  // check if pathname include the extension
  const curExt = path.extname(pathname);
  // if true, set the pathname with extension revmoed
  // just find the extension with current extension
  // remove the prefix '/' of the pathname
  if (curExt) {
    pathname = pathname.slice(1, -curExt.length);
    searchExtensions = [curExt];
  } else{
    pathname = pathname.slice(1);
  }
  const {
    exist,
    ext,
    file,
    pathname: lastPathname,
  } = await findMatchedFile(
    pathname,
    req.method.toLowerCase(),
    searchExtensions
  );
  console.log(`Requst => ${pathname}`);
  if (prefix) {
    console.log(`Remove prefix '${prefix}' => ${lastPathname}`);
  }
  console.log(
    `The path segment splitted by => "${pathSegSplit || "CamelCase"}"`
  );
  console.log(`Search files with extension => ${searchExtensions.join("|")}`);
  if (exist) {
    console.log(`Find matched file => ${file}`);
  } else {
    console.log(`No matched file found at last.`);
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
    console.log(`The Content-Type => ${contentType}`);
    // set header
    res.setHeader("Content-Type", contentType);
    // statu code
    res.writeHead(200);
    // timeout
    if (delay > 0) {
      console.log(`Delay with millisecond => ${delay}`);
      await sleep(delay);
    }
    res.end(content);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port);
