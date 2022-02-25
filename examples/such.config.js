const { port, prefix } = require('./config');
module.exports = {
    "extends": [
        "such:recommend"
    ],
    "config": {
        "suchDir": "suchas",
        "dataDir": "suchas/data",
        "preload": true,
        "server": {
            "port": port,
            "prefix": prefix,
            "directory": "server",
            "pathSegSplit": ".",
            "injectContexnt": true,
            "timeout": [500, 1000]
        }
    },
    "types": {
        "we": ["dict", "&<dataDir>/dict.txt"],
        "province": ["cascader", "&<dataDir>/city.json:#[root=true]"]
    },
    "alias": {}
};