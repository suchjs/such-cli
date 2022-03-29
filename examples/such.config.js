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
      cors: true,
      prefix: [
        prefix,
        {
          exclude: [
            {
              path: "/list/:id?",
              method: "post",
            },
          ],
        },
      ],
      route: {
        "list/:id?": {
          method: "post",
        },
      },
      directory: "server",
      pathSegSplit: ".",
      injectContext: true,
      timeout: [500, 1000],
      buildConfig: function (pathname, ctx) {
        if (pathname === "list/1" && ctx.method === "get") {
          return {
            timeout: [100, 300],
            headers: {
              From: "www.suchjs.com",
            },
            instance: {
              config: {
                dynamics: {
                  "/errmsg": [
                    "/errno",
                    (errno) => {
                      return {
                        key: {
                          exist: errno.value !== 0,
                        },
                      };
                    },
                  ],
                  "/data": [
                    "/errno",
                    (errno) => {
                      return {
                        key: {
                          exist: errno.value === 0,
                        },
                      };
                    },
                  ],
                },
              },
            },
            options: {
              // keys: {
              //   "/errno": {
              //     index: 0,
              //   },
              //   "/data": {
              //     exist: true,
              //   },
              // },
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
