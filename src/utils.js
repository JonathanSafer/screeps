var settings = require("./settings")

var u = {
    getsetd: function (object, prop, defaultValue) {
        if (object[prop] === undefined) {
            object[prop] = defaultValue
        }
        return object[prop]
    },

    getRoomCache: function(roomName) {
        const roomsCache = u.getsetd(Cache, "rooms", {})
        return u.getsetd(roomsCache, roomName, {})
    },

    getCreepCache: function(creepName) {
        const creepsCache = u.getsetd(Cache, "creeps", {})
        return u.getsetd(creepsCache, creepName, {})
    },

    getWithdrawLocations: function(creep) {
        var city = creep.memory.city
        var spawn = Game.spawns[city]
        var structures = spawn.room.find(FIND_STRUCTURES)
        return _.filter(structures, structure => structure.structureType == STRUCTURE_CONTAINER ||
                                                 structure.structureType == STRUCTURE_STORAGE ||
                                                 structure.structureType == STRUCTURE_TERMINAL)
    },

    isOnEdge: function(pos){//determine if a roomPos is on a room edge
        if(pos.x == 0 || pos.x == 49 || pos.y == 0 || pos.y == 49){
            return true
        } else {
            return false
        }
    },
    
    getTransferLocations: function(creep) {
        var city = creep.memory.city
        var spawn = Game.spawns[city]
        var structures = spawn.room.find(FIND_STRUCTURES)
        return _.filter(structures, structure => structure.structureType == STRUCTURE_STORAGE ||
        //mineral miner error when in use                                        structure.structureType == STRUCTURE_SPAWN ||
                                                structure.structureType == STRUCTURE_CONTAINER)
    },
    
    getNextLocation: function(current, locations) {
        return (current + 1) % locations.length
    },

    getFactory: function(room) {
        if (room.controller.level < 7) return false

        // check for existing
        const roomCache = u.getsetd(Cache, room.name, {})
        const factory = Game.getObjectById(roomCache.factory)
        if (factory) return factory

        // look up uncached factory
        const factories = room.find(FIND_STRUCTURES,{ 
            filter: { structureType: STRUCTURE_FACTORY } 
        })
        if (factories.length) {
            roomCache.factory = factories[0].id
            return factories[0]
        }
        return false
    },

    // Get the room's storage location. Priority for storage:
    // 1. Storage 2. Container 3. Terminal 4. Spawn
    getStorage: function(room) {
        // 1. Storage
        if (room.storage) return room.storage
        const roomCache = u.getsetd(Cache, room.name, {})

        // 2. Container
        const container = Game.getObjectById(roomCache.container)
        if (container) return container     
        const containers = room.find(FIND_STRUCTURES,{ 
            filter: { structureType: STRUCTURE_CONTAINER } 
        })
        if (containers.length) {
            roomCache.container = containers[0].id
            return containers[0]
        }

        // 3. Terminal
        if(room.terminal) return room.terminal
         
        // 4. Spawn   
        const spawn = Game.getObjectById(roomCache.spawn)
        if (spawn) return spawn
        const spawns = room.find(FIND_STRUCTURES, { 
            filter: { structureType: STRUCTURE_SPAWN }
        })
        if (spawns.length) {
            roomCache.spawn = spawns[0].id
            return spawns[0]
        }
        return false
    },
    
    getGoodPickups: function(creep) {
        var city = creep.memory.city
        var localCreeps = u.splitCreepsByCity()
        var miners = _.filter(localCreeps[city], lcreep => lcreep.memory.role == "remoteMiner")
        var drops = _.flatten(_.map(miners, miner => miner.room.find(FIND_DROPPED_RESOURCES)))
        // var allRooms = u.splitRoomsByCity();
        // var rooms = allRooms[city]
        // var drops = _.flatten(_.map(rooms, room => room.find(FIND_DROPPED_RESOURCES)));
        var goodLoads = _.filter(drops, drop => (drop.amount >= 0.5 * creep.store.getCapacity()) || (drop == !RESOURCE_ENERGY))
        //Log.info(JSON.stringify(allRooms));
        return goodLoads
    },
    
    iReservedOrOwn: function(roomName) {
        var room = Game.rooms[roomName]
        var hasController = room && room.controller
        return hasController && (room.controller.my || ((room.controller.reservation) && (room.controller.reservation.username == "Yoner")))
    },
    
    iReserved: function(roomName) {
        var room = Game.rooms[roomName]
        var hasController = room && room.controller
        return hasController && ((room.controller.reservation) && (room.controller.reservation.username == "Yoner"))
    },

    iOwn: function(roomName) {
        var room = Game.rooms[roomName]
        var hasController = room && room.controller
        return hasController && room.controller.my
    },
    
    enemyOwned: function(room) {
        return room.controller && room.controller.owner && !u.isFriendlyRoom(room)
    },
    
    getDropTotals: function() {
        var rooms = Game.rooms
        var drops = _.flatten(_.map(rooms, room => room.find(FIND_DROPPED_RESOURCES)))
        return _.sum(_.map(drops, drop => drop.amount))
    },

    silenceCreeps: function() {
        if (Game.time % 50 == 0) {
            for (const creep of Object.values(Game.creeps)) {
                creep.notifyWhenAttacked(false)
            }
        }
    },
    
    splitCreepsByCity: function(){
        var creeps = _.filter(Game.creeps, creep => creep.my)
        return _.groupBy(creeps, creep => creep.memory.city)
    },
    
    splitRoomsByCity: function(){
        var rooms = _.filter(Game.rooms, room => u.iReservedOrOwn(room.name))
        //Log.info(JSON.stringify(rooms));
        return _.groupBy(rooms, room => room.memory.city)
    },

    getMyCities: function() {
        return _.filter(Game.rooms, (room) => u.iOwn(room.name))
    },

    getAvailableSpawn: function(spawns) {
        var validSpawns = _.filter(spawns, spawn => !spawn.spawning)
        if (validSpawns.length > 0) {
            return validSpawns[0]
        } else {
            return null
        }
    },
    
    updateCheckpoints: function(creep) {
        if (Game.time % 50 == 0  && !u.enemyOwned(creep.room)) {
            if (creep.hits < creep.hitsMax) {
                return
            }
            if (!creep.memory.checkpoints) {
                creep.memory.checkpoints = []
            }
            creep.memory.checkpoints.push(creep.pos)
            if (creep.memory.checkpoints.length > 2) {
                creep.memory.checkpoints.shift()
            }
        }
    },

    highwayMoveSettings: function(maxOps, swampCost, startPos, endPos, avoidEnemies) {
        return {
            range: 1,
            plainCost: 1,
            swampCost: swampCost,
            maxOps: maxOps,
            maxRooms: 64,
            roomCallback: function(roomName) {
                const startRoom = roomName == startPos.roomName
                const isHighway = u.isHighway(roomName)
                const isBad = avoidEnemies && Cache[roomName] && Cache[roomName].enemy
                const nearStart = u.roomInRange(2, startPos.roomName, roomName)
                const nearEnd = u.roomInRange(2, endPos.roomName, roomName)

                if (((!isHighway && !nearStart && !nearEnd) || isBad) && !startRoom) {
                    return false
                }

                const costs = new PathFinder.CostMatrix()
                return isHighway ? costs : _.map(costs, cost => cost * 3)
            }
        }
    },

    findMultiRoomPath: function(startPos, endPos) {
        return PathFinder.search(startPos, {pos: endPos, range: 1 }, 
            u.highwayMoveSettings(10000, 1, startPos, endPos))
    },

    multiRoomMove: function(creep, pos, avoidEnemies) {
        creep.moveTo(pos,
            {reusePath: 50},
            u.highwayMoveSettings(5000, 8, creep.pos, pos),
            avoidEnemies)         
    },

    // E0,E10... W0, 10 ..., N0, N10 ...
    isHighway: function(roomName) {
        const coords = roomName.match(/[0-9]+/g)
        const x = Number(coords[0])
        const y = Number(coords[1])
        return (x % 10 == 0) || (y % 10 == 0)
    },

    isIntersection: function(roomName){
        const coords = roomName.match(/[0-9]+/g)
        const x = Number(coords[0])
        const y = Number(coords[1])
        return (x % 10 == 0) && (y % 10 == 0)
    },

    getAllRoomsInRange: function(d, rooms) {
        const pos = _.map(rooms, u.roomNameToPos)
        const posXY = _.unzip(pos)
        const ranges = _.map(posXY, coords => _.range(_.min(coords) - d, _.max(coords) + 1 + d))
        const roomCoords = _.flatten(_.map(ranges[0], x => _.map(ranges[1], y => [x, y])))
        const roomNames = _.map(roomCoords, u.roomPosToName)
        return roomNames
    },

    roomInRange: function(range, roomName1, roomName2) {
        const pos1 = u.roomNameToPos(roomName1)
        const pos2 = u.roomNameToPos(roomName2)
        return (Math.abs(pos1[0] - pos2[0]) <= range) && (Math.abs(pos1[1] - pos2[1]) <= range)
    },

    roomNameToPos: function(roomName) {
        const quad = roomName.match(/[NSEW]/g)
        const coords = roomName.match(/[0-9]+/g)
        const x = Number(coords[0])
        const y = Number(coords[1])
        return [
            quad[0] === "W" ? -1 - x : x,
            quad[1] === "S" ? -1 - y : y
        ]
    },

    roomPosToName: function(roomPos) {
        const x = roomPos[0]
        const y = roomPos[1]
        return (x < 0 ? "W" + String(-x - 1) : "E" + String(x)) +
            (y < 0 ? "S" + String(-y - 1) : "N" + String(y))
    },

    isFriendlyRoom: function(room){
        if(room.controller 
            && (room.controller.my
                || (room.controller.owner 
                    && settings.allies.includes(room.controller.owner.username))
                || (room.controller.reservation
                    && settings.allies.includes(room.controller.reservation.username)))){
            return true
        } else {
            return false
        }
    },

    findHostileCreeps: function(room){
        return _.filter(room.find(FIND_HOSTILE_CREEPS), c => !settings.allies.includes(c.owner.username))
    },

    findHostileStructures: function(room){
        if(!u.isFriendlyRoom(room)){
            return _.filter(room.find(FIND_STRUCTURES), s => s.hits)
        }
    },

    findExitPos: function(roomName, exit){
        if(Game.rooms[roomName]){
            return Game.rooms[roomName].find(exit)
        }
        const exits = []
        let constSide = 0
        let loopVar = "x"
        let constVar = "y"
        switch(exit){
        case FIND_EXIT_TOP:
            constSide = 0
            loopVar = "x"
            constVar = "y"
            break
        case FIND_EXIT_BOTTOM:
            constSide = 49
            loopVar = "x"
            constVar = "y"
            break
        case FIND_EXIT_RIGHT:
            constSide = 49
            loopVar = "y"
            constVar = "x"
            break
        case FIND_EXIT_LEFT:
            constSide = 0
            loopVar = "y"
            constVar = "x"
            break
        }
        const terrain = new Room.Terrain(roomName)
        for(let i = 0; i < 49; i++){
            const newPos = {}
            newPos[loopVar] = i
            newPos[constVar] = constSide
            if(!terrain.get(newPos.x, newPos.y)){//terrain is plain
                exits.push(new RoomPosition(newPos.x, newPos.y, roomName))
            }
        }
        return exits
    }
}

module.exports = u