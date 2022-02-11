# Such-cli
[![npm version](https://badge.fury.io/js/such-cli.svg)](https://badge.fury.io/js/such-cli)

Command line tool for generating fake data base on suchjs, and configure it too.
## Installation
> `yarn add --dev such-cli` or `npm install --save-dev such-cli` 

## Initialize

Initialize the config for suchjs in node environment.

```bash
such init
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
  "a": ['kce', 'djakf', 'wpwds']
}
```

The output are printted by `console.log`, it may not a standard JSON format. If you want to get a JSON format output, you can use the `-s` or `--stringify` command line option.

```bash
npx such as test.json -s
```



## Questions & Bugs?

Welcome to report to us with issue if you meet any question or bug. [Issue](https://github.com/suchjs/such-cli/issues)

## License

[MIT License](./LICENSE).