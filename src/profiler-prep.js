var profiler = require("./screeps-profiler")

var p = {
    prepProfile: function() {
        const fileNames = [
            "commodityManager",
            "defender",
            "depositMiner",
            "error",
            "factory",
            "ferry",
            "harasser",
            "labs",
            "link",
            "markets",
            "medic",
            "mineralMiner",
            "powerCreep",
            "powerMiner",
            "remoteMiner",
            "robber",
            "roles",
            "roomplan",
            "runner",
            "screeps-profiler",
            "settings",
            "spawnBuilder",
            "spawnQueue",
            "stats",
            "template",
            "tower",
            "transporter",
            "trooper",
            "types",
            "unclaimer",
            "upgrader",
            "utils",
        ]
        for (const fileName of fileNames) {
            var lib = require(fileName)
            profiler.registerObject(lib, fileName)
        }
    }
}
module.exports = p