
// Import lodash
var _ = require("lodash")
global._ = _

// Import constants
var path = require("path")
var common = require(path.resolve(path.dirname(require.resolve("@screeps/common"))))
var constants = common["configManager"]["config"]["common"]["constants"]

// Import globals
for (const key in constants) {
    global[key] = constants[key]
}


const rName = "E10N17"
const city = `${rName}0`
const room = {
    controller: {
        my: true
    },
    name: rName,
    memory: {
        city: city
    }
}

const rooms = {
    rName: room
}

const spawns = {
    city: {
        room: room
    }
}

var used = 0
global.Game = {
    shard: { name: "shard3" },
    rooms: rooms,
    spawns: spawns,
    flags: {},
    time: 0,
    cpu: {
        getUsed: function() {
            used += 0.1
            return used
        }
    }
}
global.Room = {}
global.Structure = {}
global.Spawn = {}
global.Creep = {}
global.RoomPosition = {}
global.Source = {}
global.Flag = {}
global.Memory = {}
global.RawMemory = {
    setActiveSegments: function() {
        return
    }
}
console.log("Loaded constants for test")

// Load main
const main = require("../src/main.js")
console.log("Initialized main")

// Loop main
main.loop()
console.log("Completed main loop")

