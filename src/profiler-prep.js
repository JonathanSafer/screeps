var profiler = require("./screeps-profiler")

var p = {
    prepProfile: function() {
        const fileNames = [
            "actions",
            "bigBreaker",
            "bigMedic",
            "bigTrooper",
            "breaker",
            "builder",
            "city",
            "claimer",
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
            "observer",
            "powerCreep",
            "powerMiner",
            "remoteMiner",
            "robber",
            "roles",
            "roomplan",
            "runner",
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
            var lib = require(`./${fileName}`)
            profiler.registerObject(lib, fileName)
        }
    }
}
module.exports = p