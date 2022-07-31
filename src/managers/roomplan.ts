import u = require("../lib/utils")
import template = require("../config/template")
import rM = require("../roles/remoteMiner")
import rU = require("../roles/upgrader")
import rR = require("../roles/runner")
import rH = require("../roles/harasser")
import rQ = require("../roles/quad")
import settings = require("../config/settings")
import types = require("../config/types")

const p = {
    frequency: 2000,

    judgeNextRoom: function(){
        if(!Cache.roomData) return true
        const roomData = Cache.roomData
        const nextRoom = _.find(Object.keys(roomData), roomName => roomData[roomName].ctrlP && !roomData[roomName].s)
        if(nextRoom){
            p.scoreRoom(nextRoom)
            return false
        }
        p.expand()
        return true
    },

    scoreRoom: function(roomName: string){
        const roomData = Cache.roomData[roomName]
        if (Object.keys(roomData.src).length < 2){
            roomData.s = -1
            return
        }
        const terrain = Game.map.getRoomTerrain(roomName)
        const exits = u.findExitPos(roomName, FIND_EXIT_TOP).concat(u.findExitPos(roomName, FIND_EXIT_BOTTOM), u.findExitPos(roomName, FIND_EXIT_LEFT), u.findExitPos(roomName, FIND_EXIT_RIGHT))
        const wallMap = new PathFinder.CostMatrix
        for(let i = 0; i < 50; i++){
            for(let j = 0; j < 50; j++){
                if(!(terrain.get(i,j) & TERRAIN_MASK_WALL) && !p.isNearExit(i, j, exits)){
                    wallMap.set(i, j, 255)
                }
            }
        }
        let level = 0
        let changed = true
        while(changed == true){
            changed = false
            for(let i = 0; i < 50; i++){
                for(let j = 0; j < 50; j++){
                    if(wallMap.get(i,j) == level){
                        p.spreadWall(i, j, wallMap, level)
                        changed = true
                    }
                }
            }
            level++
        }
        const levelNeeded = Math.ceil(Math.max(template.dimensions.x, template.dimensions.y)/2)
        if(level - 2 < levelNeeded){
            roomData.s = -1
            return //template won't fit
        }
        const candidates = {} as _.Dictionary<CandidateData>
        for(let i = 0; i < 50; i++){
            for(let j = 0; j < 50; j++){
                if(wallMap.get(i,j) >= levelNeeded){
                    candidates[i * 50 + j] = {}
                }
            }
        }
        if(Object.keys(candidates).length > 1) p.narrowByControllerPos(candidates, roomData, roomName, levelNeeded)
        if(Object.keys(candidates).length > 1) p.narrowBySourcePos(candidates, roomData, roomName)

        const center = Object.values(candidates)[0]
        const centerPoint = parseInt(Object.keys(candidates)[0])

        if(!center.sourceDistance){
            //TODO sources should be map from src
            const sources = [u.unpackPos(Object.values(roomData.src)[0], roomName), u.unpackPos(Object.values(roomData.src)[1], roomName)]
            const realPos = new RoomPosition(Math.floor(centerPoint/50), centerPoint%50, roomName)
            center.sourceDistance = PathFinder.search(realPos, {pos: sources[0], range: 1}, {plainCost: 1, swampCost: 1}).cost +
                PathFinder.search(realPos, {pos: sources[1], range: 1}, {plainCost: 1, swampCost: 1}).cost
        }
        if(!center.controllerDistance){
            const controllerPos = u.unpackPos(roomData.ctrlP, roomName)
            center.controllerDistance = PathFinder.search(new RoomPosition(Math.floor(centerPoint/50), centerPoint%50, roomName), {pos: controllerPos, range: 1}, {plainCost: 1, swampCost: 1}).cost
        }

        const controllerScore = center.controllerDistance < levelNeeded + template.wallDistance ? 5 : Math.max(25 - center.controllerDistance, 0)
        const sourceScore = Math.max((70 - center.sourceDistance)/5, 0)
        const mineralScore = roomData.min == RESOURCE_CATALYST ? 5 : 0
        roomData.s = controllerScore + sourceScore + mineralScore
        roomData.c = centerPoint
    },

    narrowBySourcePos: function(candidates: _.Dictionary<CandidateData>, roomData, roomName){
        //TODO sources should be map from src
        const sources = [u.unpackPos(Object.values(roomData.src)[0], roomName), u.unpackPos(Object.values(roomData.src)[1], roomName)]
        for(const pos of Object.keys(candidates)){
            const intPos = parseInt(pos)
            const realPos = new RoomPosition(Math.floor(intPos/50), intPos%50, roomName)
            candidates[pos].sourceDistance = PathFinder.search(realPos, {pos: sources[0], range: 1}, {plainCost: 1, swampCost: 1}).cost +
                PathFinder.search(realPos, {pos: sources[1], range: 1}, {plainCost: 1, swampCost: 1}).cost
        }
        const bestSourceDist = _.min(candidates, "sourceDistance").sourceDistance
        for(const pos of Object.keys(candidates)){
            if(candidates[pos].sourceDistance > bestSourceDist)
                delete candidates[pos]
        }
    },

    narrowByControllerPos: function(candidates: _.Dictionary<CandidateData>, roomData, roomName, levelNeeded){
        const controllerPos = u.unpackPos(roomData.ctrlP, roomName)
        for(const pos of Object.keys(candidates)){
            const intPos = parseInt(pos)
            candidates[pos].controllerDistance = PathFinder.search(new RoomPosition(Math.floor(intPos/50), intPos%50, roomName), {pos: controllerPos, range: 1}, {plainCost: 1, swampCost: 1}).cost
        }
        const topCandidates = _.filter(candidates, pos => pos.controllerDistance >= levelNeeded + template.wallDistance)
        if(topCandidates.length){
            for(const pos of Object.keys(candidates)){
                if(!topCandidates.includes(candidates[pos]))
                    delete candidates[pos]
            }
        }
        const bestControllerDist = _.min(candidates, "controllerDistance").controllerDistance
        for(const pos of Object.keys(candidates)){
            if(candidates[pos].controllerDistance > bestControllerDist)
                delete candidates[pos]
        }
    },

    spreadWall: function(x, y, wallMap, level){
        const maxX = Math.min(x + 1, 49)
        const minX = Math.max(x - 1, 0)
        const maxY = Math.min(y + 1, 49)
        const minY = Math.max(y - 1, 0)
        for(let i = minX; i <= maxX; i++){
            for(let j = minY; j <= maxY; j++){
                if(wallMap.get(i, j) > level){
                    wallMap.set(i, j, level + 1)
                }
            }
        }
    },

    isNearExit: function(x ,y, exits){
        const distance = 2 + template.wallDistance
        if((x > distance && x < 49 - distance) && (y > distance && y < 49 - distance)){
            return false
        }
        for(const exit of exits){
            if(exit.inRangeTo(x,y, distance)){
                return true
            }
        }
        return false
    },

    expand: function(){
        if(Game.cpu.bucket != 10000 || Memory.flags["claim"] || !PServ) return
        const myCities = u.getMyCities()
        if(Game.gcl.level == myCities.length) return
        const candidates = _.reject(Object.keys(Cache.roomData), roomName => !Cache.roomData[roomName].s 
            || Cache.roomData[roomName].s == -1 
            || Cache.roomData[roomName].rcl 
            || Cache.roomData[roomName].sct < Game.time + CREEP_LIFE_TIME 
            || (Cache.roomData[roomName].cB && Cache.roomData[roomName].cB > Game.time)
            || (Cache.roomData[roomName].sMC && Cache.roomData[roomName].sMC > Game.time + CREEP_LIFE_TIME))
        if(!candidates.length) return
        //Log.info("attempting expansion")
        const expoRooms = _.sortBy(candidates, roomName => Cache.roomData[roomName].s).reverse()
        let expoRoomName = null
        for(const candidate of expoRooms){
            if(expoRoomName) break
            for(const room of myCities){
                const controllerPos = u.unpackPos(Cache.roomData[candidate].ctrlP, candidate)
                const result = PathFinder.search(room.controller.pos, {pos: controllerPos, range: 1}, {
                    plainCost: 1, swampCost: 1, maxOps: 10000, roomCallback: (roomName) => {
                        if(!Cache.roomData[roomName] || (Cache.roomData[roomName].rcl && CONTROLLER_STRUCTURES[STRUCTURE_TOWER][Cache.roomData[roomName].rcl] && !settings.allies.includes(Cache.roomData[roomName].own)))
                            return false
                    }
                })
                if(!result.incomplete && result.path.length < CREEP_CLAIM_LIFE_TIME){
                    expoRoomName = controllerPos.roomName
                    break
                }
            }
        }
        if(!expoRoomName){
            Log.info("No valid rooms in range for expansion")
            return
        }
        const expoRoom = Cache.roomData[expoRoomName]
        u.placeFlag("claim", new RoomPosition(25, 25, expoRoomName))
        u.placeFlag("plan", new RoomPosition(Math.floor(expoRoom.c/50) - template.centerOffset.x, expoRoom.c%50 - template.centerOffset.y, expoRoomName))
    },

    searchForRemote: function(cities){
        let remote = null
        Log.info("Searching for new remotes")
        if(!Memory.remotes) Memory.remotes = {}
        for(const city of cities){
            const result = p.findBestRemote(city)
            if(result && (!remote || result.score < remote.score))
                remote = result
        }//result object will have roomName, score, and homeName
        if(remote){
            p.addRemote(remote.roomName, remote.homeName)
            Log.info(`Remote ${remote.roomName} added to ${remote.homeName}`)
        } else {
            Log.info("No valid remotes found")
        }
    },

    addRemote: function(roomName, homeName){
        Memory.remotes[roomName] = 1
        const memory = Memory.spawns[homeName + "0"]
        const roomInfo = Cache.roomData[roomName]
        for(const sourceId in roomInfo.src){
            //return memory, sourceId
            //uncomment this to activate
            memory.sources[sourceId] = u.unpackPos(roomInfo.src[sourceId], roomName)
        }
    },

    findBestRemote: function(city) {
        let remote = null
        const spawn = Game.spawns[city.name + "0"]
        if(!spawn) return null
        const memory = spawn.memory
        const spawnFreeTime = memory.spawnAvailability
        if(spawnFreeTime < settings.spawnFreeTime) return null
        let distance = 1
        const roomCoords = u.roomNameToPos(city.name)
        while(!remote){
            if(distance > 2) break
            const min = 0 - distance
            const max = distance + 1
            for(let i = min; i < max; i++){
                for(let j = min; j < max; j++){
                    if(j != min && j != max - 1 && i != min && i != max - 1)
                        continue
                    const roomPos = [roomCoords[0] + i, roomCoords[1] + j]
                    const roomName = u.roomPosToName(roomPos)
                    const score = p.scoreRemoteRoom(roomName, spawn)
                    //lower score is better
                    if(score > 0 && (!remote || score < remote.score))
                        remote = {roomName: roomName, homeName: city.name, score: score}
                }
            }
            if(remote) break
            distance++
        }
        //make sure we can afford this remote in terms of spawn time and that it is profitable
        if(remote){
            const resourcesNeeded = p.calcSpawnTimeNeeded(remote.roomName, spawn)
            const spawnTimeNeeded = resourcesNeeded.time
            const profitMargin = resourcesNeeded.profit
            Log.info(`Remote found at ${remote.roomName} with spawn time of ${spawnTimeNeeded} and profit of ${profitMargin}`)
            if(spawnFreeTime - spawnTimeNeeded < settings.spawnFreeTime || profitMargin < 0)
                return null
        }
        return remote
    },

    reassessRemote: function(roomName, spawn){
        const roomInfo = Cache.roomData[roomName]
        if(!roomInfo) 
            return -1
        if(roomInfo.rcl || (roomInfo.sT && roomInfo.sT > Game.time))
            return 100000 //very high number bc this remote should've been dropped anyway
        let totalDistance = 0
        for(const source in roomInfo.src){
            const sourcePos = u.unpackPos(roomInfo.src[source], roomName)
            const result = PathFinder.search(spawn.pos, {pos: sourcePos, range: 1}, {
                plainCost: 1,
                swampCost: 1,
                maxOps: 20000,
                roomCallback: function(rN){
                    const safe = Memory.remotes[rN] 
                        || (Cache.roomData[rN] && Cache.roomData[rN].own == settings.username)
                        || u.isHighway(rN)
                        || rN == roomName
                    if(!safe) return false
                }
            })
            if(result.incomplete) return 100000
            totalDistance += result.cost
        }
        return totalDistance/Object.keys(roomInfo.src).length
    },

    scoreRemoteRoom: function(roomName, spawn){
        const roomInfo = Cache.roomData[roomName]
        if(!roomInfo || roomInfo.rcl || !roomInfo.src || !Object.keys(roomInfo.src).length 
            || Memory.remotes[roomName] || (spawn.room.energyCapacityAvailable < 2300 && !roomInfo.ctrlP)) return -1
        let totalDistance = 0
        for(const source in roomInfo.src){
            const sourcePos = u.unpackPos(roomInfo.src[source], roomName)
            const result = PathFinder.search(spawn.pos, {pos: sourcePos, range: 1}, {
                plainCost: 1,
                swampCost: 1,
                maxOps: 10000,
                roomCallback: function(rN){
                    const safe = Memory.remotes[rN] 
                        || (Cache.roomData[rN] && Cache.roomData[rN].own == settings.username)
                        || u.isHighway(rN)
                        || rN == roomName
                    if(!safe) return false
                }
            })
            if(result.incomplete) return -1
            totalDistance += result.cost
        }
        if(roomInfo.d >= 4){
            Cache.roomData[roomName].d = 3
        }
        return totalDistance/Object.keys(roomInfo.src).length
    },

    dropRemote: function(cities){
        let remote = null
        Log.info("CPU too high, dropping least profitable remote...")
        if(!Memory.remotes) Memory.remotes = {}
        for(const city of cities){
            const result = p.findWorstRemote(city)
            if(result && (!remote || result.score > remote.score))
                remote = result
        }//result object will have roomName, score, and homeName
        if(remote){
            p.removeRemote(remote.roomName, remote.homeName)
            Log.info(`Remote ${remote.roomName} removed from ${remote.homeName}`)
        } else {
            Log.info("No remotes to remove")
        }
    },

    removeRemote: function(roomName, room){
        delete Memory.remotes[roomName]
        const memory = Memory.spawns[room + "0"]
        for(const sourceId in memory.sources){
            if(memory.sources[sourceId].roomName == roomName)
                delete memory.sources[sourceId]
        }
    },

    findWorstRemote: function(room){
        let remote = null
        const spawn = Game.spawns[room.name + "0"]
        if(!spawn) return null
        const remotes = Object.keys(_.countBy(spawn.memory.sources, s => s.roomName))
        for(const roomName of remotes){
            const roomInfo = Cache.roomData[roomName]
            if(roomInfo.own == settings.username)
                continue
            const score = p.reassessRemote(roomName, spawn)
            if(score > 0 && (!remote || score > remote.score))
                remote = {roomName: roomName, homeName: room.name, score: score}
        }
        return remote
    },

    calcSpawnTimeNeeded: function(roomName, spawn){
        //return 3 for invalid (no room can handle 3 spawns worth of spawn time)
        //reserver = 2 body parts every lifetime - distance from controller to spawn
        let totalTime = 0
        let totalCost = 0//cost per tick
        const roomInfo = Cache.roomData[roomName]
        if(roomInfo.ctrlP){
            const controllerPos = u.unpackPos(roomInfo.ctrlP, roomName)
            const path = PathFinder.search(spawn.pos, {pos: controllerPos, range: 1}, {
                plainCost: 1,
                swampCost: 1,
                maxOps: 10000
            })
            if(path.incomplete) return {profit: 0, time: 3}
            totalTime += (2 * CREEP_SPAWN_TIME)/ (CREEP_CLAIM_LIFE_TIME - path.cost)
            totalCost += types.cost([MOVE, CLAIM])/ (CREEP_CLAIM_LIFE_TIME - path.cost)
        }

        const minerBody = types.getRecipe(rM.type, spawn.room.energyCapacityAvailable, spawn.room)
        const minerCost = types.cost(minerBody)
        const minerSize = minerBody.length   
        const runnerBody = types.getRecipe(rR.type, spawn.room.energyCapacityAvailable, spawn.room)
        const runnerCost = types.cost(runnerBody)
        const runnerSize = runnerBody.length
        const energyCarried = types.store(runnerBody)
        const harasserBody = types.getRecipe(rH.type, spawn.room.energyCapacityAvailable, spawn.room)
        const harasserCost = types.cost(harasserBody)
        const harasserSize = harasserBody.length
        const quadBody = types.getRecipe(rQ.type, spawn.room.energyCapacityAvailable, spawn.room)
        const quadCost = types.cost(quadBody) * 4
        const quadSize = quadBody.length * 4
        const roadUpkeep = ROAD_DECAY_AMOUNT/ROAD_DECAY_TIME * REPAIR_COST
        const sourceEnergy = roomInfo.ctrlP ? SOURCE_ENERGY_CAPACITY : SOURCE_ENERGY_KEEPER_CAPACITY

        totalTime += harasserSize * CREEP_SPAWN_TIME/CREEP_LIFE_TIME
        totalCost += harasserCost/CREEP_LIFE_TIME

        if(!roomInfo.ctrlP){
            totalTime += quadSize * CREEP_SPAWN_TIME/(CREEP_LIFE_TIME - quadSize)//subtracting quad size to account for prespawn
            totalCost += quadCost/(CREEP_LIFE_TIME - quadSize)
        }

        for(const source in roomInfo.src){
            const sourcePos = u.unpackPos(roomInfo.src[source], roomName)
            const result = PathFinder.search(spawn.pos, {pos: sourcePos, range: 1}, {
                plainCost: 1,
                swampCost: 1,
                maxOps: 10000
            })
            if(result.incomplete) return {profit: 0, time: 3}
            const energyProduced = 2 * result.cost * sourceEnergy/ENERGY_REGEN_TIME
            const runnersNeeded = energyProduced / energyCarried
            totalTime += ((minerSize * CREEP_SPAWN_TIME)/ (CREEP_LIFE_TIME - result.cost)) + (runnersNeeded * runnerSize * CREEP_SPAWN_TIME/CREEP_LIFE_TIME)
            totalCost += (minerCost/ (CREEP_LIFE_TIME - result.cost)) + (roadUpkeep * result.cost) + (runnersNeeded * runnerCost/CREEP_LIFE_TIME)
        }

        const revenue = sourceEnergy * Object.keys(roomInfo.src).length/ENERGY_REGEN_TIME
        const profit = revenue - totalCost
        return {profit: profit, time: totalTime}
    },

    findRooms: function() {
        if (!p.newRoomNeeded()) {
            return
        }
        const rooms = u.getAllRoomsInRange(10, p.roomsSelected())
        const validRooms = p.getValidRooms(rooms)
        const rankings = p.sortByScore(validRooms)
        if (rankings.length) {
            p.addRoom(rankings[0])
        }
        return
    },

    planRooms: function() {
        // TODO

        // 1. for rooms I own. If room has a spawn or a plan, ignore. otherwise plan.
        // 2. if bucket is less than 3k, return
        // 

    },

    buildConstructionSites: function() {
        const noobMode = Object.keys(Game.rooms).length < 5 // We've seen less than 5 rooms
        for(const roomName of Object.keys(Game.rooms)){
            const room = Game.rooms[roomName]
            if(!room.controller || !room.controller.my){
                continue
            }
            if (!room.memory.plan && Game.spawns[roomName + "0"]) {
                const spawnPos = Game.spawns[roomName + "0"].pos
                room.memory.plan = {}
                room.memory.plan.x = spawnPos.x + template.offset.x - template.buildings.spawn.pos[0].x
                room.memory.plan.y = spawnPos.y + template.offset.y - template.buildings.spawn.pos[0].y
            }
            const planFlag = Memory.flags.plan
            if(planFlag && planFlag.roomName == roomName && room.controller.owner && room.controller.owner.username == "Yoner"){
                room.memory.plan = {}
                room.memory.plan.x = planFlag.x
                room.memory.plan.y = planFlag.y
                delete Memory.flags.plan
                p.clearAllStructures(room)
            }
            if (room.memory.plan) {
                const plan = room.memory.plan
                let spawnCount = 0
                _.forEach(template.buildings, function(locations, structureType) {
                    locations.pos.forEach(location => {
                        const pos = {"x": plan.x + location.x - template.offset.x, 
                            "y": plan.y + location.y - template.offset.y}
                        const name = roomName + spawnCount
                        spawnCount = structureType == STRUCTURE_SPAWN ? spawnCount + 1 : spawnCount
                        if (Game.cpu.getUsed() + 20 > Game.cpu.tickLimit) {
                            return
                        }
                        if(!noobMode || room.controller.level >= 3 || structureType != STRUCTURE_ROAD){
                            p.buildConstructionSite(room, structureType, pos, name)
                        }
                    })
                })
                if(room.controller.level >= 2)
                    p.buildControllerLink(room, room.controller.level)
                if(!noobMode || room.energyCapacityAvailable >= 800){//rcl3 with extensions done
                    p.buildRoads(room, plan)
                }
                if (room.controller.level >= 4 && room.storage) {
                    p.buildWalls(room, plan)
                }
                if (room.controller.level >= 6) {
                    p.buildExtractor(room)
                    p.buildSourceLinks(room)
                }
            }
        }
    },

    buildConstructionSite: function(room: Room, structureType, pos, name?: string) {
        //Log.info(room.lookAt(pos.x, pos.y)[0].type)
        if((structureType == STRUCTURE_FACTORY || structureType == STRUCTURE_POWER_SPAWN) && PServ){
            return
        }
        if(structureType == STRUCTURE_TOWER && room.controller.safeMode > 2000){
            return
        }
        const look = room.lookAt(pos.x, pos.y)
        if(room.controller.level < 5 && room.controller.level > 1 && structureType == STRUCTURE_TERMINAL && !room.storage){
            structureType = STRUCTURE_CONTAINER
        } else if(structureType == STRUCTURE_TERMINAL){
            const struct = _.find(look, object => object.type == "structure")
            if(struct && struct.structure.structureType == STRUCTURE_CONTAINER){
                struct.structure.destroy()
            }
        }
        const terrain = _.find(look, item => item.type == LOOK_TERRAIN)
        if (terrain && (terrain[LOOK_TERRAIN] == "wall") || _.find(look, item => item.type == "structure")) 
            return
        room.createConstructionSite(pos.x, pos.y, structureType, name)
    },

    buildExtractor: function(room) {
        const minerals = room.find(FIND_MINERALS)
        if (!minerals) {
            return
        }

        const mineralPos = minerals[0].pos
        if (mineralPos.lookFor(LOOK_STRUCTURES).length > 0) {
            return
        }

        Log.info("Building extractor: " + room.name)
        mineralPos.createConstructionSite(STRUCTURE_EXTRACTOR)
    },

    buildWalls: function(room: Room, plan){
        //first identify all locations to be walled, if there is a road there,
        //place a rampart instead. if there is a terrain wall don't make anything
        const startX = plan.x - template.wallDistance 
        const startY = plan.y - template.wallDistance
        const wallSpots = []
        for(let i = startX; i < startX + template.dimensions.x + (template.wallDistance * 2); i++){
            if(i > 0 && i < 49){
                if(startY > 0 && startY < 49){
                    wallSpots.push(new RoomPosition(i, startY, room.name))
                }
                if(startY + template.dimensions.y + (template.wallDistance * 2) - 1 > 0 && startY + template.dimensions.y + (template.wallDistance * 2) - 1 < 49){
                    wallSpots.push(new RoomPosition(i, startY + template.dimensions.y + (template.wallDistance * 2) - 1, room.name))
                }
            }
        }
        for(let i = startY; i < startY + template.dimensions.y + (template.wallDistance * 2); i++){
            if(i > 0 && i < 49){
                if(startX > 0 && startX < 49){
                    wallSpots.push(new RoomPosition(startX, i, room.name))
                }
                if(startX + template.dimensions.x + (template.wallDistance * 2) - 1 > 0 && startX + template.dimensions.x + (template.wallDistance * 2) - 1 < 49){
                    wallSpots.push(new RoomPosition(startX + template.dimensions.x + (template.wallDistance * 2) - 1, i, room.name))
                }
            }  
        }
        const terrain = new Room.Terrain(room.name)

        const costs = new PathFinder.CostMatrix()
        _.forEach(wallSpots, function(wallSpot) {//CM of just walls
            costs.set(wallSpot.x, wallSpot.y, 0xff)
        })
        room.wallCosts = costs

        let counter = 0
        const csites = room.find(FIND_MY_CONSTRUCTION_SITES)
        if(csites.length){
            counter = csites.length
        }

        for(let i = 0; i < wallSpots.length; i++){//build stuff
            if(terrain.get(wallSpots[i].x, wallSpots[i].y) === TERRAIN_MASK_WALL){
                continue
            }
            const structures = room.lookForAt(LOOK_STRUCTURES, wallSpots[i])
            let wall = false
            for(let j = 0; j < structures.length; j++){
                if(structures[j].structureType === STRUCTURE_WALL || structures[j].structureType === STRUCTURE_RAMPART){
                    wall = true
                    break
                }
            }
            if(wall){
                continue
            }
            //if we make it here, no wall or rampart has been placed on this spot
            //first we will check to see if we even need a barrier
            //then, if we do need one, it'll be a ramp if structures.length, else it'll be a wall

            //check by attempting to path to all exits
            let wallNeeded = false
            const roomExits = Object.keys(Game.map.describeExits(room.name))
            const origin = new RoomPosition(wallSpots[i].x, wallSpots[i].y, room.name)
            const searchSettings: PathFinderOpts = {
                plainCost: 1,
                swampCost: 1,
                maxOps: 1000,
                maxRooms: 1,
                roomCallback: function(roomName: string) {
                    return Game.rooms[roomName].wallCosts
                }
            }
            for(const exitDirection of roomExits){
                const exits = room.find(parseInt(exitDirection) as FindConstant) as Array<RoomPosition>
                const path = PathFinder.search(origin, exits, searchSettings)
                //if path is complete, we need a wall
                if(!path.incomplete){
                    wallNeeded = true
                    break
                }
            }
            const interiorPos = new RoomPosition(plan.x, plan.y, room.name)
            const spawnPath = PathFinder.search(origin, {pos: interiorPos, range: 1}, searchSettings)
            if(!wallNeeded || spawnPath.incomplete){
                continue
            }

            //now we need a wall
            if(structures.length || wallSpots[i].getRangeTo(room.controller) == 3){//rampart
                room.createConstructionSite(wallSpots[i], STRUCTURE_RAMPART)
                room.visual.circle(wallSpots[i], {fill: "transparent", radius: 0.25, stroke: "green"})
            } else {//wall
                room.createConstructionSite(wallSpots[i], STRUCTURE_WALL)
                room.visual.circle(wallSpots[i], {fill: "transparent", radius: 0.25, stroke: "blue"})
            }
            counter++
            if(counter > 10){
                break
            }
        }
    },

    buildControllerLink: function(room: Room, rcl: number) {
        const spawn = Game.spawns[room.name + "0"]
        if(!spawn) return
        if(spawn.memory.upgradeLinkPos){
            const pos = spawn.memory.upgradeLinkPos
            if(rcl < 5){
                p.buildConstructionSite(room, STRUCTURE_CONTAINER, new RoomPosition(Math.floor(pos/50), pos%50, room.name))
            } else {
                const look = room.lookAt(Math.floor(pos/50), pos%50)
                for(const item of look){
                    if(item.type == LOOK_STRUCTURES && item[LOOK_STRUCTURES].structureType == STRUCTURE_CONTAINER)
                        item[LOOK_STRUCTURES].destroy()
                }
                p.buildConstructionSite(room, STRUCTURE_LINK, new RoomPosition(Math.floor(pos/50), pos%50, room.name))
            }
            return
        }
        const creeps = room.controller.pos.findInRange(FIND_MY_CREEPS, 3)
        const upgrader = _.find(creeps, c => c.memory.role == rU.name)
        if(!upgrader)
            return
        let location = null
        let bestScore = 0
        for(let i = upgrader.pos.x - 1; i <= upgrader.pos.x + 1; i++){
            for(let j = upgrader.pos.y - 1; j <= upgrader.pos.y + 1; j++){
                const look = room.lookAt(i, j)
                let isValidPos = true
                for(const item of look){
                    if(item.type == LOOK_STRUCTURES 
                        || (item.type == LOOK_TERRAIN && item[LOOK_TERRAIN] == "wall"))
                        isValidPos = false
                }
                if(isValidPos){
                    //score by empty positions in range of controller
                    let currentScore = 0
                    for(let k = i - 1; k <= i + 1; k++){
                        for(let l = j - 1; l <= j + 1; l++){
                            const look2 = room.lookAt(k,l)
                            for(const item of look2){
                                if(!((item.type == LOOK_STRUCTURES && item[LOOK_STRUCTURES].structureType != STRUCTURE_ROAD && item[LOOK_STRUCTURES].structureType != STRUCTURE_RAMPART) 
                                    || (item.type == LOOK_TERRAIN && item[LOOK_TERRAIN] == "wall")) && room.controller.pos.inRangeTo(k,l,3))
                                    currentScore++
                            }
                        }
                    }
                    if(currentScore > bestScore){
                        location = i*50+j
                        bestScore = currentScore
                    }
                }
            }
        }
        if(location){
            spawn.memory.upgradeLinkPos = location
            p.buildConstructionSite(room, STRUCTURE_LINK, new RoomPosition(Math.floor(location/50), location%50, room.name))
        } else {
            Log.info(`No link placement for controller in ${room.name}`)
        }
    },

    buildSourceLinks: function(room: Room) {
        const sources = room.find(FIND_SOURCES)
        const spawn = Game.spawns[room.name + "0"]
        if(!spawn) return
        for(const source of sources){
            if(spawn.memory.sources[source.id][STRUCTURE_LINK + "Pos"]){
                const pos = spawn.memory.sources[source.id][STRUCTURE_LINK + "Pos"]
                p.buildConstructionSite(room, STRUCTURE_LINK, new RoomPosition(Math.floor(pos/50), pos%50, room.name))
                continue
            }
            const creeps = source.pos.findInRange(FIND_MY_CREEPS, 1)
            const miner = _.find(creeps, c => c.memory.source = source.id)
            if(!miner)
                continue
            let location = null
            for(let i = miner.pos.x - 1; i <= miner.pos.x + 1; i++){
                if(location)
                    break
                for(let j = miner.pos.y - 1; j <= miner.pos.y + 1; j++){
                    if(miner.pos.isEqualTo(i,j) || i <= 2 || j <= 2)
                        continue
                    const look = room.lookAt(i, j)
                    let go = true
                    for(const item of look){
                        if(item.type == LOOK_STRUCTURES 
                            || (item.type == LOOK_CREEPS && item[LOOK_CREEPS].memory.role == rM.name)
                            || (item.type == LOOK_TERRAIN && item[LOOK_TERRAIN] == "wall"))
                            go = false
                    }
                    if(go){
                        location = i*50+j
                        break 
                    } 
                }
            }
            if(location){
                spawn.memory.sources[source.id][STRUCTURE_LINK + "Pos"] = location
                p.buildConstructionSite(room, STRUCTURE_LINK, new RoomPosition(Math.floor(location/50), location%50, room.name))
            } else {
                Log.info(`No link placement for source at ${source.pos}`)
            }
        }
    },

    makeRoadMatrix: function(room, plan){
        const costs = new PathFinder.CostMatrix()
        if(plan){
            _.forEach(template.buildings, function(locations, structureType) {//don't make roads anywhere that a structure needs to go
                locations.pos.forEach(location => {
                    const pos = {"x": plan.x + location.x - template.offset.x, 
                        "y": plan.y + location.y - template.offset.y}
                    if(structureType !== STRUCTURE_ROAD){
                        costs.set(pos.x, pos.y, 0xff)
                    }
                })
            })
        } 
        room.find(FIND_STRUCTURES).forEach(function(struct) {
            if (struct.structureType === STRUCTURE_ROAD) {
                // Favor roads over plain tiles
                costs.set(struct.pos.x, struct.pos.y, 1)
            } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                        (struct.structureType !== STRUCTURE_WALL) && //allow roads on walls so that path to controller still works
                         (struct.structureType !== STRUCTURE_RAMPART)) {
                // Can't walk through non-walkable buildings
                costs.set(struct.pos.x, struct.pos.y, 0xff)
            } else if(!struct.my){//allow roads on walls so that path to controller still works
                costs.set(struct.pos.x, struct.pos.y, 5)
            }
        })
        room.find(FIND_MY_CONSTRUCTION_SITES).forEach(function(site) {
            if (site.structureType === STRUCTURE_ROAD) {
                // Favor roads over plain tiles
                costs.set(site.pos.x, site.pos.y, 1)
            }
        })
        return costs
    },

    getSourcePaths: function(room: Room, exits, roadMatrix){
        const sources = Object.keys(Game.spawns[room.memory.city].memory.sources).reverse()
        const sourcePaths = []
        for (let i = 0; i < sources.length; i++) {
            const source: Source = Game.getObjectById(sources[i])
            if(!source) continue
            const sourcePos = source.pos
            const sourcePath = PathFinder.search(sourcePos, exits, {
                plainCost: 4, swampCost: 5, maxRooms: 5, 
                roomCallback: function(roomName){
                    if(roomName == room.name)
                        return roadMatrix
                    if(Game.rooms[roomName]){
                        return p.makeRoadMatrix(Game.rooms[roomName], Game.rooms[roomName].memory.plan)
                    }
                }
            })
            for(let j = 0; j < sourcePath.path.length; j++){
                sourcePaths.push(sourcePath.path[j])
            }
        }
        return sourcePaths.reverse()
    },

    getMineralPath: function(room: Room, exits, roadMatrix){
        const mineralPos = room.find(FIND_MINERALS)[0].pos
        const mineralPath = PathFinder.search(mineralPos, exits, {
            plainCost: 4, swampCost: 4, maxRooms: 1, 
            roomCallback: () => roadMatrix
        })
        return mineralPath.path.reverse()
    },

    getControllerPath: function(room: Room, exits, roadMatrix){
        const path = []
        const structures = room.find(FIND_MY_STRUCTURES)
        const controller = _.find(structures, structure => structure.structureType === STRUCTURE_CONTROLLER)
        const controllerPos = controller.pos
        const controllerPath = PathFinder.search(controllerPos, exits, {
            plainCost: 4, swampCost: 4, maxRooms: 1, 
            roomCallback: () => roadMatrix
        })
        for(let i = 2; i < controllerPath.path.length; i++){// don't include first two paths (not needed)
            path.push(controllerPath.path[i])
        } 
        return path.reverse()
    },

    getExitPaths: function(room, exits, plan, roadMatrix){
        const roomExits = Object.keys(Game.map.describeExits(room.name))
        const path = []

        const startPoint = template.buildings.storage.pos[0]
        const startPos = new RoomPosition(plan.x + startPoint.x - template.offset.x, plan.y + startPoint.y - template.offset.y, room.name)
        for(const exitDirection of roomExits){
            const exitSpots = room.find(parseInt(exitDirection))
            const exitPath0 = PathFinder.search(startPos, exitSpots, {
                plainCost: 4, swampCost: 4, maxRooms: 1, 
                roomCallback: () => roadMatrix
            })
            const exitPoint = exitPath0.path[exitPath0.path.length - 1]
            //now path from this point to template exits
            const exitPath = PathFinder.search(exitPoint, exits, {
                plainCost: 4, swampCost: 4, maxRooms: 1, 
                roomCallback: () => roadMatrix
            })
            const exitPathPath = exitPath.path
            exitPathPath.reverse()
            const safeZoneDimensions = {
                "x": [plan.x - template.wallDistance, plan.x + template.dimensions.x + template.wallDistance - 1],
                "y": [plan.y - template.wallDistance, plan.y + template.dimensions.y + template.wallDistance - 1]
            }
            for(const pathPoint of exitPathPath){
                if(pathPoint.x < safeZoneDimensions.x[0] 
                    || pathPoint.x > safeZoneDimensions.x[1]
                    || pathPoint.y < safeZoneDimensions.y[0]
                    || pathPoint.y > safeZoneDimensions.y[1]){
                    break
                }
                path.push(pathPoint)
            }
        }
        return path
    },

    compileRoads: function(a, b, c, d){
        return a.concat(b, c, d)
    },

    buildRoads: function(room, plan){
        //need roads to sources, mineral, controller (3 spaces away), exits (nearest exit point for each)
        if(!(room.memory.city && Game.spawns[room.memory.city] && Game.spawns[room.memory.city].memory.sources)){
            return
        }
        const exits = []
        for(let i = 0; i < template.exits.length; i++){
            const posX = plan.x + template.exits[i].x - template.offset.x
            const posY = plan.y + template.exits[i].y - template.offset.y
            const roomPos = new RoomPosition(posX, posY, room.name)
            exits.push(roomPos)
        }//exits now filled with roomPos of all exits from template

        //generateCM
        const roadMatrix = p.makeRoadMatrix(room, plan)

        //roads from sources
        const sourcePaths = p.getSourcePaths(room, exits, roadMatrix)

        //road from mineral
        const mineralPath = p.getMineralPath(room, exits, roadMatrix)

        //road from controller
        const controllerPath = p.getControllerPath(room, exits, roadMatrix)

        //roads from exits
        const exitPaths = p.getExitPaths(room, exits, plan, roadMatrix)

        //push all paths onto big list
        const roads = p.compileRoads(controllerPath, sourcePaths, mineralPath, exitPaths)
        
        //place Csites
        let counter = 0
        const csites = room.find(FIND_MY_CONSTRUCTION_SITES)
        if(csites.length){
            counter = csites.length
        }
        const maxSites = Object.keys(Game.constructionSites).length / MAX_CONSTRUCTION_SITES > 0.5 ? 2 : 20
        for(let i = 0; i < roads.length; i++){
            new RoomVisual(roads[i].roomName).circle(roads[i], {fill: "#ff1111", radius: 0.1, stroke: "red"})
            if(counter < maxSites){//doesn't update during the tick
                const look = room.lookForAt(LOOK_STRUCTURES, roads[i])
                if(look.length){
                    if(look[0].structureType != STRUCTURE_RAMPART){
                        continue
                    }
                }
                if(Game.rooms[roads[i].roomName] && !roads[i].createConstructionSite(STRUCTURE_ROAD)){
                    counter++
                }
            }
        }
    },

    clearAllStructures: function(room) {
        const structures = room.find(FIND_STRUCTURES)
        _.forEach(structures, structure => {
            if(!structure.my){
                structure.destroy()
            }
        })
    },

    planRoom: function(roomName) {
        const ter = Game.map.getRoomTerrain(roomName)
        const sqd = _(Array(50)).map((r, i) => { 
            return _(Array(50))
                .map((v, j) => ter.get(i, j) == TERRAIN_MASK_WALL ? 0 : Infinity)
                .value()
        }).value()
        const b = 4 // buffer
        const r = 50 // room size
        const min = b 
        const max = r - b - 1

        for (let i = min; i <= max; i++) {
            for (let j = min; j <= max; j++) {
                sqd[i][j] = Math.min(sqd[i][j], sqd[i - 1][j] + 1, sqd[i - 1][j - 1] + 1)     
            }
        }
        
        for (let i = max; i >= min; i--) {
            for (let j = min; j <= max; j++) {
                sqd[i][j] = Math.min(sqd[i][j], sqd[i][j - 1] + 1, sqd[i + 1][j - 1] + 1)
            }
        }
        
        for (let i = max; i >= min; i--) {
            for (let j = max; j >= min; j--) {
                sqd[i][j] = Math.min(sqd[i][j], sqd[i + 1][j] + 1, sqd[i + 1][j + 1] + 1)
            }
        }
        
        for (let i = min; i <= max; i++) {
            for (let j = max; j >= min; j--) {
                sqd[i][j] = Math.min(sqd[i][j], sqd[i][j + 1] + 1, sqd[i - 1][j + 1] + 1)
            }
        }

        return _(sqd).find(row => _(row).find(score => score >= 7))
    },

    newRoomNeeded: function() {    
        return (Game.time % p.frequency === 0) &&
            (Game.gcl.level > p.roomsSelected.length) &&
            p.hasCpu() &&
            p.totalEnergy() > 200000 &&
            p.isRcl4() &&
            p.myRooms().length === p.roomsSelected().length
    },

    getValidRooms: function(rooms) {
        return _.filter(rooms, p.isValidRoom)
    },

    isValidRoom: function(roomName) {
        if (!Game.map.isRoomAvailable(roomName)) return false
        return false
    },

    sortByScore: function(rooms) {
        return rooms // TODO
    },

    addRoom: function(room) {
        const selected = p.roomsSelected()
        selected.push(room.name)
    },

    roomsSelected: function() {
        let selected = Memory.roomsSelected
        if (!selected) {
            selected = p.myRoomNames()
            Memory.roomsSelected = selected
        }
        return selected
    },

    isRcl4: function() {
        const rooms = p.myRooms()
        const rcls = _.map(rooms, (room) => room.controller.level)
        return _.max(rcls) >= 4
    },

    totalEnergy: function() {
        const rooms = p.myRooms()
        const energy = _.map(rooms, p.getStorageEnergy)
        return _.sum(energy)
    },

    getStorageEnergy: function(room) {
        return room.storage ? room.storage.store.energy : 0
    },

    myRooms: function() {
        return _.filter(Game.rooms, (room) => u.iOwn(room.name))
    },

    myRoomNames: function() {
        return _.map(p.myRooms(), (room) => room.name)
    },

    hasCpu: function () {
        const used = Memory.stats["cpu.getUsed"]
        return (used !== undefined) && (used < Game.cpu.tickLimit / 2)
    }
}

export = p
