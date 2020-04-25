const _ = require("lodash")

// Import constants
var path = require("path")
var common = require(path.resolve(path.dirname(require.resolve("@screeps/common"))))
var constants = common["configManager"]["config"]["common"]["constants"]

// Import globals
for (const key in constants) {
    global[key] = constants[key]
}


const u = require("../src/utils.js")
const GGame = class {
    constructor() {
        this.rooms = {}
        this.creeps = {}
        this.spawns = {}
        this.shard = {
            name: "shard3"
        }
        this.time = 0
        this.cpu = {
            getUsed: function() {
                this._cpuUsed += 0.1
                return this._cpuUsed
            }
        }
        this.map = {
            getWorldSize: () => 102,
            getRoomLinearDistance: function(r1, r2) {
                const p1 = u.roomNameToPos(r1)
                const p2 = u.roomNameToPos(r2)
                return Math.max(Math.abs(p1[0] - p2[0]), Math.abs(p1[1] - p2[1]))
            }
        }
        this._objects = {}
        this._cpuUsed = 0
    }

    reset() {
        this.rooms = {}
        this.creeps = {}
        this.spawns = {}
        this.time = 0
        this._objects = {}
        this._cpuUsed = 0
    }
   
    getObjectById(id) {
        return this._objects[id]
    }
}

const MMemory = class {
    constructor () {
        this.creeps = {}
        this.rooms = {}
        this.spawns = {}
    }
    reset () {
        constructor()
    }
}

const CCache = class {
    constructor () {}

    reset() {
        _(Object.keys(this))
            .filter(key => key == "constructor" || key == "reset")
            .forEach(key => delete this[key])
    }
}

global.Game = new GGame()
global.Memory = new MMemory()
global.Cache = new CCache()
global.Structure = {}
global.Spawn = {}
global.RoomPosition = {}
global.Source = {}
global.Flag = {}

global.RawMemory = {
    setActiveSegments: function() {
        return
    }
}

global.Creep = class {
    constructor(room, name) {
        global.Game.creeps[name] = this
        this.name = name
        this.room = room
        room.creeps.push(this)
        this.memory = {}
        global.Memory.creeps[name] = this.memory
    }
    notifyWhenAttacked() {}
}

global.Room = class {
    constructor(name) {
        global.Game.rooms[name] = this
        this.name = name
        this.memory = {}
        this.structures = []
        this.creeps = []
        global.Memory.rooms[name] = this.memory
    }

    find(type, params) {
        const elems = type == FIND_MY_CREEPS ? this.creeps : this.structures

        if (!params) {
            return elems
        }
        return _(elems).filter(params.filter).value()
    }
}

class Structure {
    constructor(room, structureType) {
        this.structureType = structureType
        this.id = getID()
        global.Game._objects[this.id] = this
        this.room = room
        room.structures.push(this)
    }
}

global.StructureSpawn = class extends Structure {
    constructor(room, name) {
        super(room, STRUCTURE_SPAWN)
        global.Game.spawns[name] = this
        this.name = name
        this.memory = {}
        global.Memory.spawns[name] = this
    }
}

global.StructureTerminal = class extends Structure {
    constructor(room, store) {
        super(room, STRUCTURE_TERMINAL)
        room.terminal = this
        this.store = new Store(store || {}, TERMINAL_CAPACITY)
    }
}

global.StructureStorage = class extends Structure {
    constructor(room, store) {
        super(room, STRUCTURE_STORAGE)
        room.storage = this
        this.store = new Store(store || {}, STORAGE_CAPACITY)
    }
}

global.StructureController = class extends Structure {
    constructor(room, level, my) {
        super(room, STRUCTURE_CONTROLLER)
        room.controller = this
        this.level = level || 8
        this.my = my || true
    }
}

global.StructureFactory = class extends Structure {
    constructor(room, level, store) {
        super(room, STRUCTURE_FACTORY)
        this.level = level || 0
        this.store = new Store(store || {}, FACTORY_CAPACITY)
    }

    produce() {}
}

global.StructureExtension = class extends Structure {
    constructor(room, store) {
        super(room, STRUCTURE_EXTENSION)
        this.store = new Store(store || {}, 
            EXTENSION_ENERGY_CAPACITY[room.controller.level])
    }
}

global.Store = class {
    constructor(store, capacity) {
        for (const resource in store) {
            this[resource] = store[resource]
        }
        this.capacity = capacity
    }

    getCapacity() {
        return this.capacity
    }

    getFreeCapacity() {
        return this.capacity - this.getUsedCapacity()
    }

    getUsedCapacity() {
        const cap =  _(RESOURCES_ALL).map(resource => this[resource] || 0).sum()
        return cap
    }
}

var id = 0
function getID() {
    return id++
}
