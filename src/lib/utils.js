var settings = require("../config/settings")

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

    getCreepCache: function(creepId) {
        const creepsCache = u.getsetd(Cache, "creeps", {})
        return u.getsetd(creepsCache, creepId, {})
    },

    getLabCache: function(labId){
        const labsCache = u.getsetd(Cache, "labs", {})
        return u.getsetd(labsCache, labId, {})
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
        return pos.x == 0 || pos.x == 49 || pos.y == 0 || pos.y == 49
    },

    isNearEdge: function(pos){
        return pos.x <= 1 || pos.x >= 48 || pos.y <= 1 || pos.y >= 48
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
        const structures = room.find(FIND_STRUCTURES)
        const spawn = _.find(structures, struct => struct.structureType == STRUCTURE_SPAWN)
        const newContainer = spawn && _.find(structures, struct => struct.structureType == STRUCTURE_CONTAINER
            && struct.pos.inRangeTo(spawn, 3))
        if (newContainer) {
            roomCache.container = newContainer.id
            return newContainer
        }

        // 3. Terminal
        if(room.terminal) return room.terminal
         
        // 4. Spawn   
        if (spawn) return spawn
        return false
    },
    
    getGoodPickups: function(creep) {
        var city = creep.memory.city
        var localCreeps = u.splitCreepsByCity()
        var miners = _.filter(localCreeps[city], lcreep => lcreep.memory.role == "remoteMiner")
        var drops = _.flatten(_.map(miners, miner => miner.room.find(FIND_DROPPED_RESOURCES)))
        const runnersBySource = _.groupBy(_.filter(localCreeps[city]), c => c.memory.role == "runner", runner => runner.memory.targetId)
        const containers = _.map(miners, miner => _.find(miner.pos.lookFor(LOOK_STRUCTURES), struct => struct.structureType == STRUCTURE_CONTAINER))
        const goodContainers = _.filter(containers, 
            function(container){
                if(!container || container.store.getUsedCapacity() <= 0.5 * creep.store.getCapacity())
                    return false
                let store = container.store.getUsedCapacity()
                if(!runnersBySource[container.id])
                    return true
                for(const runner of runnersBySource[container.id])
                    store -= runner.store.getFreeCapacity()
                return store >= 0.5 * creep.store.getCapacity()
            })
        const goodDrops = _.filter(drops, 
            function(drop){
                if(drop.amount <= 0.5 * creep.store.getCapacity())
                    return false
                let amount = drop.amount
                if(!runnersBySource[drop.id])
                    return true
                for(const runner of runnersBySource[drop.id])
                    amount -= runner.store.getFreeCapacity()
                return amount >= 0.5 * creep.store.getCapacity()
            }) 
        return goodDrops.concat(goodContainers)
    },
    
    iReservedOrOwn: function(roomName) {
        var room = Game.rooms[roomName]
        var hasController = room && room.controller
        return hasController && (room.controller.my || ((room.controller.reservation) && (room.controller.reservation.username == settings.username)))
    },
    
    iReserved: function(roomName) {
        var room = Game.rooms[roomName]
        var hasController = room && room.controller
        return hasController && ((room.controller.reservation) && (room.controller.reservation.username == settings.username))
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
        if(!Tmp.creepsByCity)
            Tmp.creepsByCity = _.groupBy(Game.creeps, creep => creep.memory.city)
        return Tmp.creepsByCity
    },
    
    splitRoomsByCity: function(){
        if(!Tmp.roomsByCity){
            const rooms = _.filter(Game.rooms, room => u.iReservedOrOwn(room.name))
            Tmp.roomsByCity = _.groupBy(rooms, room => room.memory.city)
        }
        return Tmp.roomsByCity
    },

    getMyCities: function() {
        if(!Tmp.myCities)
            Tmp.myCities = _.filter(Game.rooms, (room) => u.iOwn(room.name))
        return Tmp.myCities
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
        const size = 2 * d + 1
        return _(rooms)
            .map(u.roomNameToPos)
            .map(pos => u.generateRoomList(pos[0] - d, pos[1] - d, size, size))
            .flatten()
            .value()
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
        return _.filter(room.find(FIND_HOSTILE_CREEPS).concat(room.find(FIND_HOSTILE_POWER_CREEPS)), c => !settings.allies.includes(c.owner.username))
    },

    findHostileStructures: function(room){
        if(!u.isFriendlyRoom(room)){
            return _.filter(room.find(FIND_STRUCTURES), s => s.hits)
        }
        return []
    },

    generateRoomList: function(minX, minY, sizeX, sizeY) {
        return _(Array(sizeX)).map((oldX, i) => {
            return _(Array(sizeY)).map((oldY, j) => {
                return u.roomPosToName([minX + i, minY + j])
            }).value()
        }).flatten().value()
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
    },

    requestBoosterFill: function(spawn, boosts){
        if(!spawn.memory.ferryInfo || !spawn.memory.ferryInfo.labInfo){
            return
        }
        const receivers = spawn.memory.ferryInfo.labInfo.receivers
        for(const mineral of boosts){
            let receiver = _.find(Object.keys(receivers), lab => receivers[lab].boost == mineral)
            if(!receiver){
                receiver = _.find(Object.keys(receivers), lab => !receivers[lab].boost)
            }
            if(receiver){
                receivers[receiver].boost = mineral
                const lab = Game.getObjectById(receiver)
                if(lab){
                    receivers[receiver].fill = Math.ceil((LAB_MINERAL_CAPACITY - (lab.store[mineral] || 0))/1000)
                }
            }
        }
    },

    isNukeRampart: function(roomPos){
        const structures = roomPos.lookFor(LOOK_STRUCTURES)
        if(_.find(structures, struct => settings.nukeStructures.includes(struct.structureType))){
            return true
        }
        return false
    },

    //combine store of all cities given
    empireStore: function(cities){
        const empireStore = {}
        for (const resource of RESOURCES_ALL){
            if(!cities.length){
                empireStore[resource] = 0
            } else {
                empireStore[resource] = _.sum(cities, city => {
                    const terminal = city.terminal
                    const terminalAmount = (terminal && terminal.store.getUsedCapacity(resource)) || 0
                    const storage = city.storage
                    const storageAmount = (storage && storage.store.getUsedCapacity(resource)) || 0

                    return (terminal && terminalAmount + storageAmount) || 0
                })
            }
        }
        return empireStore
    },

    cacheBoostsAvailable: function(cities) {
        const empireStore = u.empireStore(cities)
        const cityCount = _.filter(cities, city => city.controller.level >= 7).length || 1
        const boosts = settings.civBoosts.concat(settings.militaryBoosts)
        const boostQuantityRequired = settings.boostsNeeded * cityCount
        const boostsAvailable = _(boosts)
            .filter(boost => empireStore[boost] >= boostQuantityRequired)
            .value()
        Cache.boostsAvailable = boostsAvailable
        Cache.boostCheckTime = Game.time
    },

    boostsAvailable: function(role, room) {
        if (!Cache.boostsAvailable || Game.time - Cache.boostCheckTime > 1000) {
            const cities = u.getMyCities()
            u.cacheBoostsAvailable(cities)
        }
        const boostsAvailable = Cache.boostsAvailable || []
        return _(role.boosts).every(boost => boostsAvailable.includes(boost)) 
            || (room && room.terminal && _(role.boosts).every(boost => room.terminal.store[boost] >= LAB_MINERAL_CAPACITY))
    },

    checkRoom: function(creep){
        if(creep.hits < creep.hitsMax*0.8){
            //search for hostile towers. if there are towers, room is enemy
            const tower = _.find(u.findHostileStructures(creep.room), s => s.structureType == STRUCTURE_TOWER)
            if(tower){
                if(!Cache[creep.room.name]){
                    Cache[creep.room.name] = {}
                }
                Cache[creep.room.name].enemy = true
            }
        }
    },

    logDamage: function(creep, targetPos, rma = false){
        u.getsetd(Tmp, creep.room.name,{})
        u.getsetd(Tmp[creep.room.name], "attacks",[])
        const ranged = creep.getActiveBodyparts(RANGED_ATTACK)
        const damageMultiplier = creep.memory.boosted ? (ranged * 4) : ranged
        if(rma){
            for(let i = creep.pos.x - 3; i <= creep.pos.x + 3; i++){
                for(let j = creep.pos.y - 3; j <= creep.pos.y + 3; j++){
                    if(i >= 0 && i <= 49 && j >= 0 && j <= 49){
                        const distance = Math.max(Math.abs(creep.pos.x - i),Math.abs(creep.pos.y - j))
                        switch(distance){
                        case 0: 
                        case 1:
                            Tmp[creep.room.name].attacks.push({x: i, y: j, damage: damageMultiplier * 10})
                            break
                        case 2:
                            Tmp[creep.room.name].attacks.push({x: i, y: j, damage: damageMultiplier * 4})
                            break
                        case 3:
                            Tmp[creep.room.name].attacks.push({x: i, y: j, damage: damageMultiplier})
                            break
                        }
                    }
                }
            }
        } else {
            Tmp[creep.room.name].attacks.push({x: targetPos.x, y: targetPos.y, damage: damageMultiplier * RANGED_ATTACK_POWER})
        }

    },

    getCreepDamage: function(creep, type){
        const creepCache = u.getCreepCache(creep.id)
        if(creepCache[type + "damage"])
            return creepCache[type + "damage"]
        const damageParts = creep.getActiveBodyparts(type)
        const boostedPart = _.find(creep.body, part => part.type == type && part.boost)
        const multiplier = boostedPart ? BOOSTS[type][boostedPart.boost][type] : 1
        const powerConstant = type == RANGED_ATTACK ? RANGED_ATTACK_POWER : ATTACK_POWER
        creepCache[type + "damage"] = powerConstant * multiplier * damageParts
        return creepCache[type + "damage"]
    },

    generateCreepName: function(counter, role){
        return role + "-" + counter
    },

    removeFlags: function(roomName){
        for(const flagName of Object.keys(Memory.flags)){
            if(Memory.flags[flagName].roomName == roomName){
                delete Memory.flags[flagName]
            }
        }
    },

    generateFlagName: function(baseName){
        let counter = 0
        while(Memory.flags[baseName + counter]){
            counter++
        }
        return baseName + counter
    },

    cleanFlags: function(){
        if(!Memory.flags) return
        for(const flagName of Object.keys(Memory.flags)){
            Memory.flags[flagName].removeTime = Memory.flags[flagName].removeTime || Game.time + 20000
            if(Game.time > Memory.flags[flagName].removeTime){
                delete Memory.flags[flagName]
            }
        }
    },

    placeFlag: function(flagName, roomPos, removeTime = null){
        Memory.flags[flagName] = roomPos
        Memory.flags[flagName].removeTime = removeTime
    }
}

module.exports = u