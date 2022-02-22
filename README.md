# Such-cli
[![npm version](https://badge.fury.io/js/such-cli.svg)](https://badge.fury.io/js/such-cli)

Command line tool for generating fake data base on suchjs, and configure it too.
## Installation

### For project use suchjs library

```bash 
# npm
npm install --save-dev such-cli
# yarn
yarn add -D such-cli
# pnpm
pnpm add -D such-cli
```

### For command line use `such`
```bash 
# npm
npm install -g such-cli
# yarn
yarn global add such-cli
# pnpm
pnpm add -g such-cli
```


## Initialize

Initialize the config for suchjs in node environment.

```bash
# init suchjs config in local project
such init
# init command line suchjs config
such init --cli # or -> such init -c
```

## Generate fake data

Since you have installed the `such-cli` package, now you can use the command `such as` to generate fake datas.

```bash
# mock some string, the `such as` is the default sub command
# so `such as` is the same as `such`
npx such as :string # same as `npx such :string`, also `npx such as ":string"`
# mock a json data
npx such as '{"a{3}":":string"}'
```

After you initialized the suchjs config after you execute the `such init`, then you can use the types you defined in the `such.config.js`, and mock from a json file.

```json
{
  "types": {
    "word": ["string", "[97,122]:{3,5}"]
  },
  "config": {
    "suchDir": "suchas",
    "dataDir": "suchas/data"
  }
}
```

Then in the directory of `suchDir` -> `suchas/`, you can create a `test.json` file:

#### `suchas/test.json`

```json
{
  "a{3}": ":word"
}
```

```bash
# This command will find the .json file base on your config of `suchDir`
npx such as test.json
```

then you may got the output:

```javascript
{
  a: ['kce', 'djakf', 'wpwds']
}
```

The output are printted by `console.log`, it may not a standard JSON format. If you want to get a JSON format output, you can use the `-s` or `--stringify` command line option.

```bash
npx such as test.json -s
```

then in the above example you will got the output:

```json
{
  "a": ["kce", "djakf", "wpwds"]
}
```

## Run a mock server

```bash
# -p, --port: the server's listen port
# -t, --timeout: the response's timeout, a specified number or a range for random
# -d, --debug: print the debug information
npx such serve -p 8080 -t 500,3000 -d
```

```json
{
  "types": {
    "word": ["string", "[97,122]:{3,5}"]
  },
  "config": {
    "suchDir": "suchas",
    "dataDir": "suchas/data",
    "extensions": [".json", ".txt"], // the file extesions need to match
    "server": {
      // default port 8181
      // can set in the server config
      // or overwrite by the command option --port
      "port": 8181,
      // the global prefix need to match from the pathname
      // the last pathname will remove the prefix
      // e.g. a pathname '/api/v1/hello/world'
      // when the prefix is '/api/v1'
      // at last, the left pathname will be 'hello/world'
      "prefix": "",
      // the directory saving the mock template file
      // default is 'server', base on the suchDir
      "directory": "server",
      // the pathname segment will join by the splitter.
      // so when the last pathname is 'hello/world'
      // the mock template file's name should be 'hello.world'
      // the file name and each the extension in the 'extensions' config 
      // will determine a file need to be checked whether it exists in the serverDir  
      "pathSegSplit": ".",
      // when the file has an extension key in extContentTypes
      // the response headers will add a Content-Type header with the value
      "extContentTypes": {
        ".json": "application/json"
      },
      // the timeout of the response for each request
      // also can be defined in the command line option -t
      "timeout": [],
    }
  }
}
```

## Questions & Bugs?

Welcome to report to us with issue if you meet any question or bug. [Issue](https://github.com/suchjs/such-cli/issues)

## License

[MIT License](./LICENSE).