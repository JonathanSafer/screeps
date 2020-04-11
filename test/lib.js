const _ = require("lodash")

// Import constants
var path = require("path")
var common = require(path.resolve(path.dirname(require.resolve("@screeps/common"))))
var constants = common["configManager"]["config"]["common"]["constants"]

// Import globals
for (const key in constants) {
    global[key] = constants[key]
}

global.Game = {
    rooms: {},
    creeps: {},
    spawns: {},
    shard: {
        name: "shard3"
    },
    time: 0,
    cpu: {
        getUsed: function() {
            Game._cpuUsed += 0.1
            return Game._cpuUsed
        }
    },
    getObjectById: function(id) {
        return Game._objects[id]
    },

    _objects: {},
    _cpuUsed: 0
}

global.Structure = {}
global.Spawn = {}
global.RoomPosition = {}
global.Source = {}
global.Flag = {}
global.Memory = {
    creeps: {},
    rooms: {},
    spawns: {}
}
global.RawMemory = {
    setActiveSegments: function() {
        return
    }
}

global.Creep = class {
    constructor(room, name) {
        Game.creeps[name] = this
        this.name = name
        this.room = room
        this.memory = {}
        Memory.creeps[name] = this.memory
    }
    notifyWhenAttacked() {

    }
}

global.Room = class {
    constructor(name) {
        Game.rooms[name] = this
        this.name = name
        this.memory = {}
        this.structures = []
        Memory.rooms[name] = this.memory
    }

    find(type, params) {
        if (!type) return
        return _(this.structures).filter(params.filter).value()
    }
}

class Structure {
    constructor(room, structureType) {
        this.structureType = structureType
        this.id = getID()
        Game._objects[this.id] = this
        this.room = room
        room.structures.push(this)
    }
}

global.StructureSpawn = class extends Structure {
    constructor(room, name) {
        super(room, STRUCTURE_SPAWN)
        Game.spawns[name] = this
        this.name = name
        this.memory = {}
        Memory.spawns[name] = this
    }
}

global.StructureTerminal = class extends Structure {
    constructor(room, store) {
        super(room, STRUCTURE_TERMINAL)
        room.terminal = this
        this.store = store
    }
}

global.StructureController = class extends Structure {
    constructor(room, level) {
        super(room, STRUCTURE_CONTROLLER)
        room.controller = this
        this.level = level
    }
}

global.StructureFactory = class extends Structure {
    constructor(room, level) {
        super(room, STRUCTURE_FACTORY)
        this.level = level
    }
}

var id = 0
function getID() {
    return id++
}