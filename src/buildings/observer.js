const settings = require("../config/settings")
const u = require("../lib/utils")

const ob = {
    run: function(city){
        const roomName = city.substring(0, city.length - 1)
        const rcache = u.getRoomCache(roomName)
        rcache.scanned = false

        const remainder = Game.time % settings.observerFrequency
        if(remainder == 0){
            ob.observeNewRoomForMining(city)
        } else if (remainder == 1){
            ob.placeMiningFlags(city)
        }
    },

    scanRoom: function() {
        const observer = ob.getUnusedObserver()
        if (!observer) return false

        ob.scanNextRoom(observer)
        return true
    },

    recordRoomData: function() {
        const roomsToScan = Cache["roomsToScan"]
        if(!roomsToScan){
            return
        }
        const roomDataCache = u.getsetd(Cache, "roomData", {})
        for(const room in Game.rooms){
            if(roomsToScan.has(room)){
                const roomData = u.getsetd(roomDataCache, room, {})
                ob.recordData(room, roomData)
                roomsToScan.delete(room)
            }
        }
    },

    recordData: function(roomName, roomData) {
        const room = Game.rooms[roomName]
        if (!room) { // We don't have vision for some reason
            return
        }
        if(room.controller){
            roomData.safeModeCooldown = room.controller.safeModeCooldown && (Game.time + room.controller.safeModeCooldown) || 0
            roomData.owner = room.controller.owner && room.controller.owner.username
            roomData.rcl = (room.controller.level) || 0
            roomData.controllerPos = room.controller.pos
            roomData.sourcePos = room.find(FIND_SOURCES).map(source => source.pos)
            roomData.mineral = room.find(FIND_MINERALS)[0].mineralType
            if(room.controller.safeMode){
                roomData.smEndTick = room.controller.safeMode + Game.time
            }
        }
        const sources = room.find(FIND_SOURCES)
        roomData.sources = {}
        for(const source of sources){
            roomData.sources[source.id] = source.pos
        }
        const skLairs = _.filter(room.find(FIND_HOSTILE_STRUCTURES), struct => struct.structureType == STRUCTURE_KEEPER_LAIR)
        if(skLairs && skLairs.length){
            roomData.skLairs = skLairs.map(lair => lair.pos)
            const core = _.find(room.find(FIND_HOSTILE_STRUCTURES), struct => struct.structureType == STRUCTURE_INVADER_CORE)
            roomData.rcl = core ? core.level : 0
        }
        const scoutTime = room.controller ? settings.scouting.controllerRoom[roomData.rcl] :
            skLairs && skLairs.length ? settings.scouting.sk :
                settings.scouting.highway
        roomData.scoutTime = Game.time + scoutTime
    },

    getUnusedObserver: function() {
        const obsCity = _.find(u.getMyCities(), city => !u.getRoomCache(city.name).scanned 
            && u.getRoomCache(city.name).scannerTargets 
            && u.getRoomCache(city.name).scannerTargets.length
            && _.find(city.find(FIND_MY_STRUCTURES), struct => struct.structureType == STRUCTURE_OBSERVER))
        return obsCity && _.find(obsCity.find(FIND_MY_STRUCTURES), struct => struct.structureType == STRUCTURE_OBSERVER)
    },

    scanNextRoom: function(observer) {
        const target = ob.getScannerTarget(observer)
        observer.observeRoom(target)

        const rcache = u.getRoomCache(observer.room.name)
        rcache.scanned = true // flag scanner as used
        rcache.scans = (rcache.scans || 0) + 1  // Record stats for scans
    },

    getScannerTarget: function(observer) {
        const rcache = u.getRoomCache(observer.room.name)
        if (!rcache.scannerTargets) {
            ob.findRoomsForScan()
        }
        return rcache.scannerTargets.shift()
    },

    findRoomsForScan: function() {
        let roomList = []
        const cities = _.filter(u.getMyCities(), c => c.controller.level >= 4)
        const lowLevel = _.filter(u.getMyCities(), c => c.controller.level < 4 && c.energyCapacityAvailable >= 550)
        for(const city of lowLevel){
            const roomPos = u.roomNameToPos(city.name)
            roomList = roomList.concat(u.generateRoomList(roomPos[0] - 1, roomPos[1] - 1, 3, 3))//3 by 3
        }
        for(const city of cities){
            const roomPos = u.roomNameToPos(city.name)
            roomList = roomList.concat(u.generateRoomList(roomPos[0] - OBSERVER_RANGE, roomPos[1] - OBSERVER_RANGE, (OBSERVER_RANGE*2) + 1, (OBSERVER_RANGE*2) + 1))//21 by 21
        }
        const roomsToScan = new Set(roomList)
        const roomDataCache = u.getsetd(Cache, "roomData", {})
        for(const roomName of roomsToScan){
            const roomData = u.getsetd(roomDataCache, roomName, {})
            if(Game.map.getRoomStatus(roomName).status != "normal" || roomData.scoutTime && roomData.scoutTime > Game.time){
                roomsToScan.delete(roomName)
                continue
            }
            const obsRoom = _.find(cities, city => city.controller.level == 8 && Game.map.getRoomLinearDistance(roomName, city.name) <= OBSERVER_RANGE)
            if(obsRoom){
                const rcache = u.getRoomCache(obsRoom.name)
                const targets = u.getsetd(rcache, "scannerTargets", [])
                targets.push(roomName)
                continue
            }
            //if no rooms have an obs in range, we'll need a nearby room to send a scout
            const scoutRooms = _.filter(cities.concat(lowLevel), city => (city.controller.level >= 2 && Game.map.getRoomLinearDistance(roomName, city.name) <= OBSERVER_RANGE)
                || Game.map.getRoomLinearDistance(roomName, city.name) <= 1)
            const scoutRoom = _.min(scoutRooms, city => Game.map.getRoomLinearDistance(roomName, city.name))
            const rcache = u.getRoomCache(scoutRoom.name)
            const targets = u.getsetd(rcache, "scannerTargets", [])
            targets.push(roomName)
        }
        Cache["roomsToScan"] = roomsToScan
    },
    
    observeNewRoomForMining: function(city) {
        const obs = ob.getObsForMining(city)
        if (!obs) return false
        ob.preparePowerRoomsList(city, settings.miningRange)
        const roomNum = ob.timeToRoomNum(Game.time, city)
        //scan next room
        obs.observeRoom(Game.spawns[city].memory.powerRooms[roomNum])
        const rcache = u.getRoomCache(obs.room.name)
        rcache.scanned = true
    },

    placeMiningFlags: function(city) {
        const obs = ob.getObsForMining(city)
        if (!obs || !Game.spawns[city].memory.powerRooms.length) return false

        const roomNum = ob.timeToRoomNum(Game.time - 1, city)
        const roomName = Game.spawns[city].memory.powerRooms[roomNum]
        if(!Game.rooms[roomName]){//early return if room wasn't scanned
            return
        }
        if (Game.rooms[roomName].controller){
            Game.spawns[city].memory.powerRooms.splice(roomNum, 1)
            return
        }
        const structures = Game.rooms[roomName].find(FIND_STRUCTURES)
        var modifier = (Math.random() ** (1/4)) * settings.bucket.range
        if (Game.map.getRoomLinearDistance(Game.spawns[city].room.name, roomName) <= settings.powerMiningRange && Game.cpu.bucket >= settings.bucket.powerMining + modifier - (settings.bucket.range/2)) {
            ob.flagPowerBanks(structures, city, roomName)
        }
        if (Game.cpu.bucket >= settings.bucket.resourceMining) {
            ob.flagDeposits(structures, city, roomName)
        }
    },

    timeToRoomNum: function(time, city) {
        return Math.floor(time / settings.observerFrequency) % Game.spawns[city].memory.powerRooms.length    
    },

    getObsForMining: function(city) {
        if((!Game.spawns[city]) || settings.miningDisabled.includes(city)){
            return false
        }
        const buildings = Game.spawns[city].room.find(FIND_MY_STRUCTURES)
        return _.find(buildings, structure => structure.structureType === STRUCTURE_OBSERVER)
    },

    preparePowerRoomsList: function(city, range) {
        if (Game.spawns[city].memory.powerRooms) {
            return
        }
        Game.spawns[city].memory.powerRooms = []
        const myRoom = Game.spawns[city].room.name
        const pos = u.roomNameToPos(myRoom)
        for (let i = -range; i < +range; i++){
            const jRange = range - Math.abs(i)
            for (let j = -jRange; j < +jRange; j++){
                const coord = [pos[0] + i, pos[1] + j]
                const roomName = u.roomPosToName(coord)
                if (u.isHighway(roomName)) {
                    Game.spawns[city].memory.powerRooms.push(roomName)
                }
            }
        }
    },

    flagPowerBanks: function(structures, city, roomName) {
        const powerBank = _.find(structures, structure => structure.structureType === STRUCTURE_POWER_BANK)
        const flagName = u.generateFlagName(city + "powerMine")
        if (powerBank && powerBank.power > 1500 && powerBank.ticksToDecay > 2800 &&
                structures.length < 30 && Game.spawns[city].room.storage.store.energy > settings.energy.powerMine){
            const terrain = Game.rooms[roomName].getTerrain()
            if (!ob.isBlockedByWalls(terrain, powerBank.pos) && !ob.checkFlags(powerBank.pos)) {
                u.placeFlag(flagName, powerBank.pos, Game.time + powerBank.ticksToDecay)
                Log.info("Power Bank found in: " + roomName)
            }
        }
    },

    flagDeposits: function(structures, city, roomName) {
        //flag deposits
        if (structures.length >= 30) {
            return false
        }

        const deposits = Game.rooms[roomName].find(FIND_DEPOSITS)
        if (!deposits.length) {
            return false
        }

        for (let i = 0; i < deposits.length; i++) {
            const depositFlagName = u.generateFlagName(city + "deposit")
            if(deposits[i].lastCooldown < 5 && !ob.checkFlags(deposits[i].pos)){
                u.placeFlag(depositFlagName, deposits[i].pos, Game.time + settings.depositFlagRemoveTime)
                Memory.flags[depositFlagName] = deposits[i].pos
                Memory.flags[depositFlagName].harvested = Math.floor(Math.pow((deposits[i].lastCooldown / 0.001), 1/1.2))
            }
        }
    },

    checkFlags: function(roomPos){
        const flags = Object.keys(Memory.flags)
        return _(flags).find(flagName => {
            const flag = Memory.flags[flagName]
            const flagPos = new RoomPosition(flag.x, flag.y, flag.roomName)
            return flagPos.isEqualTo(roomPos)
        })
    },

    // True if a point is surrounded by terrain walls
    isBlockedByWalls: function(terrain, pos) {
        let walls = 0
        for(let i = -1; i <= +1; i++){
            for (let j = -1; j <= +1; j++){
                const result = terrain.get(pos.x + i, pos.y + j)
                if (result == TERRAIN_MASK_WALL){
                    walls++
                }
            }
        }
        return walls >= 8
    }
}

module.exports = ob
