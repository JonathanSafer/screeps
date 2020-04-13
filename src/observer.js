const settings = require("./settings")
const u = require("./utils")
const rp = require("./roomplan")

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
        if (!observer) return

        ob.scanNextRoom(observer)
    },

    recordRoomData: function() {
        const lastScans = u.getsetd(Cache, "lastScans", [])
        const scanRooms = u.getsetd(Cache, "scanRooms", {})
        for (const room of lastScans) {
            scanRooms[room] = ob.recordData(room)
        }
        // Clear lastscans after we process them all
        Cache.lastScans = []
    },

    recordData: function(roomName) {
        const room = Game.rooms[roomName]
        if (!room) { // We don't have vision for some reason
            return
        }
        const roomDataCache = u.getsetd(Cache, "roomData", {})
        const data = {}
        data.enemy = u.enemyOwned(room)
        data.rcl = (room.controller && room.controller.level) || 0
        data.towers = _(room.find(FIND_HOSTILE_STRUCTURES))
            .filter({ structureType: STRUCTURE_TOWER })
            .value().length
        data.template = !!rp.planRoom(roomName)
        roomDataCache[roomName] = data
    },



    getUnusedObserver: function() {
        return _(u.getMyCities())
            .filter(city => !u.getRoomCache(city.name).scanned)
            .map(city => {
                const buildings = city.find(FIND_MY_STRUCTURES)
                return _(buildings).find({ structureType: STRUCTURE_OBSERVER })
            })
            .find(observer => observer) // first non-null observer
    },

    scanNextRoom: function(observer) {
        const target = ob.getScannerTarget(observer)
        observer.observeRoom(target)

        const rcache = u.getRoomCache(observer.room.name)
        rcache.scanned = true // flag scanner as used
        rcache.scans = (rcache.scans || 0) + 1  // Record stats for scans

        const lastScans = u.getsetd(Cache, "lastScans", [])
        lastScans.push(target) // mark room so we collect data from it next tick
    },

    getScannerTarget: function(observer) {
        const rcache = u.getRoomCache(observer.room.name)
        if (!rcache.scannerTargets) {
            ob.findRoomsForScan()
        }
        return rcache.scannerTargets.shift()
    },

    findRoomsForScan: function() {
        const size = Game.map.getWorldSize()
        const rooms = ob.generateRoomList(-size/2, -size/2, size, size)
        for (const room of rooms) {
            for (const city of u.getMyCities()) {
                if (Game.map.getRoomLinearDistance(room, city.name) < 5) {
                    const rcache = u.getRoomCache(city.name)
                    const targets = u.getsetd(rcache, "scannerTargets", [])
                    targets.push(room)
                    break
                }
            }
        }
    },

    generateRoomList: function(minX, minY, sizeX, sizeY) {
        return _(Array(sizeX)).map((oldX, i) => {
            return _(Array(sizeY)).map((oldY, j) => {
                return u.roomPosToName([minX + i, minY + j])
            }).value()
        }).flatten().value()
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
        var modifier = (Math.random() ** (1/4)) * settings.bucket.powerRange
        if (Game.map.getRoomLinearDistance(Game.spawns[city].room.name, roomName) <= settings.powerMiningRange && Game.cpu.bucket >= settings.bucket.powerMining + modifier - (settings.bucket.powerRange/2)) {
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
        const flagName = city + "powerMine"
        if (powerBank && powerBank.power > 1500 && powerBank.ticksToDecay > 2800 && !Memory.flags[flagName] &&
                structures.length < 30 && Game.spawns[city].room.storage.store.energy > settings.energy.powerMine){
            const terrain = Game.rooms[roomName].getTerrain()
            if (!ob.isBlockedByWalls(terrain, powerBank.pos)) {
                //put a flag on it
                Memory.flags[flagName] = powerBank.pos
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

        const depositFlagName = city + "deposit"
        for (let i = 0; i < deposits.length; i++) {
            if(deposits[i].lastCooldown < 5 && !Memory.flags[depositFlagName] && !ob.checkFlags(deposits[i].pos)){
                Memory.flags[depositFlagName] = deposits[i].pos
                Game.spawns[city].memory.deposit = Math.floor(Math.pow((deposits[i].lastCooldown / 0.001), 1/1.2))
                break // only place one flag
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
