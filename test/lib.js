const _ = require("lodash")

// Import constants
var path = require("path")
var common = require(path.resolve(path.dirname(require.resolve("@screeps/common"))))
var constants = common["configManager"]["config"]["common"]["constants"]

// Import globals
for (const key in constants) {
    global[key] = constants[key]
}
global._ = _

const u = require("./testUtils.js")
const GGame = class {
    constructor() {
        this.gcl = {}
        this.rooms = {}
        this.creeps = {}
        this.spawns = {}
        this.structures = {1: {owner: {username: "Yoner"}}}
        this.constructionSites = {}
        this.powerCreeps = {}
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
            describeExits: function(){
                return []
            },
            getWorldSize: () => 102,
            getRoomLinearDistance: function(r1, r2) {
                const p1 = u.roomNameToPos(r1)
                const p2 = u.roomNameToPos(r2)
                return Math.max(Math.abs(p1[0] - p2[0]), Math.abs(p1[1] - p2[1]))
            },
            getRoomStatus: function(){
                return {status: "normal"}
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
            .forEach(key => delete this[key])
    }
}

global.Game = new GGame()
global.Memory = new MMemory()
global.Cache = new CCache()
global.Structure = {}
global.Spawn = {}
global.Source = {}
global.Flag = {}
global.PServ = false
global.PathFinder = {
    CostMatrix: class {
        constructor() {
            this._bits = Array(2500).fill(0)
        }

        get(x, y) {
            return this._bits[y * 50 + x]
        }

        set(x, y, val) {
            this._bits[y * 50 + x] = 0xff & val
        }
    },

    search: function(){
        return {path: [], cost: 0}
    }
}

global.RawMemory = {
    setActiveSegments: function() {
        return
    },

    segments: [],

    setPublicSegments: function(){
        return
    }
}

const RoomPosition = class {
    constructor(x, y, roomName) {
        this.x = x
        this.y = y
        this.roomName = roomName
    }

    getRangeTo(pos) {
        const dX = Math.abs(this.x - pos.x)
        const dY = Math.abs(this.y - pos.y)
        return Math.min(dX, dY)
    }

    findInRange() {
        return []
    }

    lookFor() {
        return []
    }

    createConstructionSite() {
        return 0
    }
}

global.RoomPosition = RoomPosition

global.Room = class {
    constructor(name) {
        global.Game.rooms[name] = this
        this.name = name
        this.memory = {}
        this._objects = {}
        global.Memory.rooms[name] = this.memory
    }

    find(type, params) {
        let group
        switch(type){
        case FIND_MY_CREEPS:
        case FIND_CREEPS:
            group = FIND_CREEPS
            break
        case FIND_MY_STRUCTURES:
        case FIND_STRUCTURES:
            group = FIND_STRUCTURES
            break
        case FIND_SOURCES:
            group = FIND_SOURCES
            break
        case FIND_MINERALS:
            group = FIND_MINERALS
            break
        default:
            group = -1
        }
        const elems = this._objects[group] || []

        if (!params) {
            return elems
        }
        return _(elems).filter(params.filter).value()
    }

    _addObject(group, object) {
        if (!this._objects[group]) {
            this._objects[group] = []
        }
        this._objects[group].push(object)
    }

    lookAt(){
        return []
    }

    lookForAt(){
        return []
    }

    createConstructionSite(){
        return 0
    }
}

Room.Terrain = class {
    constructor() {
        this._bits = Array(2500).fill(0)
    }

    get(x, y) {
        return this._bits[y * 50 + x]
    }
}

class RoomObject {
    constructor(room, findGroup, pos= new RoomPosition(25, 25, "sim")) {
        this.id = getID()
        global.Game._objects[this.id] = this
        this.room = room
        room._addObject(findGroup, this)
        this.pos = pos
    }
}

global.Creep = class extends RoomObject {
    constructor(room, name) {
        super(room, FIND_CREEPS)
        global.Game.creeps[name] = this
        this.name = name
        this.memory = {}
        global.Memory.creeps[name] = this.memory
        this.owner = {username: "Yoner"}
        this.body = []
    }
    notifyWhenAttacked() {}
    getActiveBodyparts(type) {return}
    harvest() { return 0 }
}

class Structure extends RoomObject {
    constructor(room, structureType) {
        super(room, FIND_STRUCTURES)
        this.structureType = structureType
        this.owner = "Yoner"
    }
}

global.Mineral = class extends RoomObject {
    constructor(room, type) {
        super(room, FIND_MINERALS)
        this.type = type
        this.pos = new RoomPosition(1, 1, room)
    }
}

global.StructureSpawn = class extends Structure {
    constructor(room, name) {
        super(room, STRUCTURE_SPAWN)
        global.Game.spawns[name] = this
        this.name = name
        this.memory = {}
        global.Memory.spawns[name] = this.memory
        this.spawnCreep = function(recipe, name){
            new Creep(this.room, name)
            return 0
        }
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

global.Source = class extends RoomObject {
    constructor(room) {
        super(room, FIND_SOURCES)
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

    getUsedCapacity(mineral) {
        if(mineral){
            return this[mineral] || 0
        }
        const cap =  _(RESOURCES_ALL).map(resource => this[resource] || 0).sum()
        return cap
    }
}

global.Tmp = {}

global.CPU_UNLOCK = "cpuUnlock"

var id = 0
function getID() {
    return id++
}
