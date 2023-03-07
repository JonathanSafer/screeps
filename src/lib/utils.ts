import settings = require("../config/settings")

const u = {
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
    
    iReservedOrOwn: function(roomName) {
        const room = Game.rooms[roomName]
        const hasController = room && room.controller
        return hasController && (room.controller.my || ((room.controller.reservation) && (room.controller.reservation.username == settings.username)))
    },
    
    iReserved: function(roomName) {
        const room = Game.rooms[roomName]
        const hasController = room && room.controller
        return hasController && ((room.controller.reservation) && (room.controller.reservation.username == settings.username))
    },

    iOwn: function(roomName) {
        const room = Game.rooms[roomName]
        const hasController = room && room.controller
        return hasController && room.controller.my
    },
    
    enemyOwned: function(room) {
        return room.controller && room.controller.owner && !u.isFriendlyRoom(room)
    },
    
    getDropTotals: function() {
        const rooms = Game.rooms
        const drops = _.flatten(_.map(rooms, room => room.find(FIND_DROPPED_RESOURCES)))
        return _.sum(_.map(drops, drop => drop.amount))
    },

    silenceCreeps: function() {
        if (Game.time % 10 == 0) {
            for (const creep of Object.values(Game.creeps)) {
                if(!creep.memory.notify && creep.ticksToLive < CREEP_LIFE_TIME){
                    creep.notifyWhenAttacked(false)
                    creep.memory.notify = true
                }
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

    highwayMoveSettings: function(maxOps, swampCost, startPos, endPos, avoidEnemies=false): PathFinderOpts {
        return {
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
                return costs
            }
        }
    },

    findMultiRoomPath: function(startPos, endPos) {
        return PathFinder.search(startPos, {pos: endPos, range: 24 }, 
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
        if((Memory.remotes && Memory.remotes[room.name]) || room.controller 
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

    isEnemyRoom: function(room){
        if(room.controller 
            && ((room.controller.owner && !settings.allies.includes(room.controller.owner.username))
                || (room.controller.reservation && !settings.allies.includes(room.controller.reservation.username))))
            return true
        return false
    },

    findHostileCreeps: function(room: Room){
        return _.filter((room.find(FIND_HOSTILE_CREEPS) as Array<Creep|PowerCreep>).concat(room.find(FIND_HOSTILE_POWER_CREEPS)), c => !settings.allies.includes(c.owner.username))
    },

    findFriendlyCreeps: function(room: Room){
        return _.filter((room.find(FIND_CREEPS) as Array<Creep|PowerCreep>).concat(room.find(FIND_POWER_CREEPS)), c => settings.allies.includes(c.owner.username))
    },

    findHostileStructures: function(room: Room){
        if(u.isEnemyRoom(room)){
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
            const newPos: Position = {}
            newPos[loopVar] = i
            newPos[constVar] = constSide
            if(!terrain.get(newPos.x, newPos.y)){//terrain is plain
                exits.push(new RoomPosition(newPos.x, newPos.y, roomName))
            }
        }
        return exits
    },

    //combine store of all cities given
    empireStore: function(cities: Array<Room>){
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

    cacheBoostsAvailable: function(cities: Room[]) {
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

    boostsAvailable: function(role, room: Room) {
        if (!Cache.boostsAvailable || Game.time - Cache.boostCheckTime > 1000) {
            const cities = u.getMyCities()
            u.cacheBoostsAvailable(cities)
        }
        const boostsAvailable = Cache.boostsAvailable || []
        return _(role.boosts).every(boost => boostsAvailable.includes(boost)) 
            || (room && room.terminal && _(role.boosts).every(boost => room.terminal.store[boost] >= LAB_MINERAL_CAPACITY))
    },

    removeFlags: function(roomName: string){
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

    placeFlag: function(flagName, roomPos, removeTime = 20000){
        Memory.flags[flagName] = roomPos
        Memory.flags[flagName].removeTime = removeTime + Game.time
    },

    packPos: function(pos){
        return (pos.x * 50) + pos.y
    },

    unpackPos: function(pos, roomName){
        return new RoomPosition(Math.floor(pos/50), pos%50, roomName)
    },

    getTypeFromBoost: function(boost){
        const types = Object.keys(BOOSTS)
        for(let i = 0; i < types.length; i++){
            if(BOOSTS[types[i]][boost]){
                return types[i]
            }
        }
        return null
    },

    getRangeTo: function(pos: RoomPosition, targetPos: RoomPosition){
        if(pos.roomName == targetPos.roomName){
            return pos.getRangeTo(targetPos)
        }
        const worldPos = u.toWorldPosition(pos)
        const targetWorldPos = u.toWorldPosition(targetPos)
        return Math.max(Math.abs(worldPos.x - targetWorldPos.x), Math.abs(worldPos.y - targetWorldPos.y))
        //convert to world position
    },

    toWorldPosition: function(pos) {//based off of theGeneral's WorldPosition from screeps-path
        const kWorldSize = Game.map.getWorldSize()/2 - 1
        const room = /^([WE])([0-9]+)([NS])([0-9]+)$/.exec(pos.roomName)
        return {"x": pos.x + 50 * (kWorldSize + (room[1] === "W" ? -Number(room[2]) : Number(room[2]) + 1)), "y": pos.y + 50 * (kWorldSize + (room[3] === "N" ? -Number(room[4]) : Number(room[4]) + 1))}
    },

    removeConstruction: function(){
        if(Object.keys(Game.constructionSites).length > 1){
            return
        }
        for(const id in Game.constructionSites){
            const site = Game.constructionSites[id]
            if(site.progress == 0)
                site.remove()
        }
    }
}

export = u