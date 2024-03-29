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
# -w, --watch: watch the changes of the such.config.js or data files and start a hot reload. 
# more options can seen by `such server --help`
# the command line options can override the field configured in the such.config.js 
npx such serve -p 8080 -t 500,3000 -d -w

```

```javascript
{
  "types": {
    "word": ["string", "[97,122]:{3,5}"]
  },
  "config": {
    "suchDir": "suchas",
    "dataDir": "suchas/data",
    // the file extesions need to search for matching
    "extensions": [".json", ".txt"], 
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
      // you can also set the prefix with exclude config just like nestjs
      // prefix: ["/api/v1", {
      //   // when the pathname is "/user/login" and "/user/reg" & method is post
      //   exclude: ["user/login", { path: "user/reg", method: "post" }]
      // }]
      // 
      "prefix": "",
      // the directory saving the mock template file
      // default is 'server', base on the suchDir
      "directory": "server",
      // whether watch the config file's change and start a hot reload 
      // if true, also watch the data files's changes and reload the datas. 
      "watch": false,
      // set the CORS to allow cross-domain requests.
      // true | "*" | "https://foo.example" | ...
      "cors": true,
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
      // dynamic routes or route rewrite
      // without the global prefix if the global prefix
      route: {
        "/article/:id?": true,
        "/user/:id?": {
          method: "get",
          rewrite: "/user/id"
        },
        "/product/:action/:id": "/product/done"
      },
      // the timeout of the response for each request
      // also can be defined in the command line option -t
      "timeout": [],
      // should inject the context as a 'ctx' into suchjs's config
      // contains query and request body data
      injectContext: false,
      // if the handle is set
      // you can set a keys config for such.a(options)
      // that can generate an exact data what you want 
      buildConfig: function(pathname, { query, data, method }, config){
        // return a data config the request
        return {
          // override the global timeout
          timeout: 100,
          // add external headers to response
          headers: {
            "From": "www.suchjs.com"
          },
          // set the instance's options
          instance: {
            config: {
              dynamics: {
                // set the instance's dynamic options
                // this means when errno's value is not zero
                // the optional errmsg should exist, otherwise is not exist in the value
                '/errmsg': ['/errno', (errno) => {
                  return {
                    key: {
                      exist: errno.value !== 0
                    }
                  }
                }]
              }
            }
          },
          // set the options of current instance's generation
          options: {
            keys: {
              "/data": {
                exists: true
              }
            }
          }
        };
      }
    }
  }
}
```
See the demo in the [examples](./examples/)

### Manage mock template files

```bash
# Assume the pathSegSplit is '.' and first extension is '.json'
###### Add ######
# Create list.1.json list.2.json
npx such template add list/1 list/2 -r .
# Restful apis, create 
# list/1/get.json, list/1/post.json
# list/1/put.json, list/1/delete.json
npx such template add list/1 -r . -m
npx such template add list/1 -r . -m '*'
# Create only get and post request template
npx such template add list/1 -r . -m get post
npx such template add list/1 -r . -m 'get,post'
# Change extension
npx such template add list/1 -r . -m get post -e '.js'
###### Remove ######
# Remove list.1.json list.2.json
npx such template rm list/1 list/2 -r .
# Just like `add` 
# But also remove the directory list/1
# And the file list.1.json if it exists.
npx such template rm list/1 list/2 -r . -m
npx such template rm list/1 -r . -m '*'
# More usage just refer to the above `add` command
###### View ######
# view the mock template file's content
npx such template view list/1 -e '.json' -m get -r .
```

## Questions & Bugs?

Welcome to report to us with issue if you meet any question or bug. [Issue](https://github.com/suchjs/such-cli/issues)

## License

[MIT License](./LICENSE).