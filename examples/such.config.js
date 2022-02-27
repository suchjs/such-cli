const { port, prefix } = require("./config");
module.exports = {
  extends: ["such:recommend"],
  config: {
    suchDir: "suchas",
    dataDir: "suchas/data",
    preload: true,
    server: {
      port: port,
      watch: true,
      prefix: [prefix, {
        exclude: [{
          path: 'list/1',
          method: 'post'
        }]
      }],
      directory: "server",
      pathSegSplit: ".",
      injectContexnt: true,
      timeout: [500, 1000],
      buildConfig: function (pathname, ctx) {
        if (pathname === "list/1" && ctx.method === "get") {
          if (ctx.query("_t") % 3 === 1) {
            return {
              timeout: 200,
              instance: {
                keys: {
                  "/errno": {
                    index: 2,
                  },
                  "/data": {
                    exist: false,
                  },
                },
              },
            };
          }
          return {
            timeout: [100, 300],
            headers: {
              "From": "www.suchjs.com"
            },
            instance: {
              keys: {
                "/errno": {
                  index: 0,
                },
                "/data": {
                  exist: true,
                },
              },
            },
          };
        }
      },
    },
  },
  types: {
    we: ["dict", "&<dataDir>/dict.txt"],
    province: ["cascader", "&<dataDir>/city.json:#[root=true]"],
  },
  alias: {},
};
