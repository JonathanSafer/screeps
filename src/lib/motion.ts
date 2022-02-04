import u = require("./utils")
import rU = require("./roomUtils")
import settings = require("../config/settings")
import template = require("../config/template")
import cN = require("./creepNames")

var m = {
    BoundingBox: class {
        top: number
        left: number
        bottom: number
        right: number
        thickness: number
        constructor(top, left, bottom, right, thickness = 2) {
            this.top = top // minY
            this.left = left // minX
            this.bottom = bottom // maxY
            this.right = right // maxX
            this.thickness = thickness
        }
    },

    //newMove will override all long and short distance motion
    // optional bounding box of form: [top, left, bottom, right]
    newMove: function(creep, endPos,  range = 0, avoidEnemies = true, boundingBox = null){
        //check for cached path and cached route
        const ccache = u.getCreepCache(creep.id)
        const routeVerified = m.checkRoute(creep, endPos)
        const pathVerified = m.checkPath(creep, endPos)
        //if creep thinks it moved last tick, but pos is the same, it's stuck/needs recalc
        const moveFailed = (ccache.lastPos 
            && ccache.lastPos.isEqualTo(creep.pos) 
            && ccache.lastMove 
            && ccache.lastMove == Game.time - 1)
        //if everything is good to go, MBP
        if(pathVerified && routeVerified && !moveFailed){ 
            //check for portals
            if(!ccache.lastPos || ccache.lastPos.roomName == creep.pos.roomName
                || !u.isIntersection(creep.pos.roomName)){//if new room is an intersection, check for portals
                const result = creep.moveByPath(ccache.path)
                if(result == OK){
                    ccache.lastMove = Game.time
                    ccache.lastPos = creep.pos
                }
                if([OK, ERR_TIRED, ERR_BUSY, ERR_NO_BODYPART].includes(result)){//MBP returns OK, OR a different error that we don't mind (like ERR_TIRED)
                    return
                }
            }
        }
        //recalc needed
        if(ccache.pathFail > 2){
            if(Game.time % 50 != 0){
                return
            }
            ccache.pathFail = 0 
        }
        const routeFound = 
            m.getRouteAndPath(creep, endPos, avoidEnemies, range, boundingBox)

        if(routeFound){//if pathing successful, MBP
            if(creep.moveByPath(ccache.path) == OK){
                ccache.lastMove = Game.time
                ccache.lastPos = creep.pos
                const nextPos = ccache.path[0]
                if(Game.rooms[nextPos.roomName]){
                    const creeps = nextPos.lookFor(LOOK_CREEPS).concat(nextPos.lookFor(LOOK_POWER_CREEPS))
                    if(creeps.length && creeps[0].my && creeps[0].memory.moveStatus != "static"){
                        const scache = u.getCreepCache(creeps[0].id)
                        if(!scache.lastMove || scache.lastMove < (Game.time - 1)){
                            creeps[0].move(creeps[0].pos.getDirectionTo(creep.pos))
                        }
                    }
                }

            }
        } else {
            Log.info(`Pathing failure at ${creep.pos}. Target: ${endPos}. Range: ${range}`)
            if(ccache.pathFail){
                ccache.pathFail++
                return
            }
            ccache.pathFail = 1
        }
    },

    //bool, returns success of pathfinding ops
    getRouteAndPath: function(creep: Creep, endPos, avoidEnemies, range, boundingBox){
        const ccache = u.getCreepCache(creep.id)

        //if creep is in same room as target, path to target. Otherwise, path to nearest exit in the right direction
        const sameRoom = creep.pos.roomName == endPos.roomName
        if(sameRoom){
            const maxRooms = 1
            const goal = {pos: endPos, range: range}
            const result = m.getPath(creep, goal, avoidEnemies, maxRooms, boundingBox)
            if(!result.incomplete){
                ccache.route = null //no route since creep is in required room already
                ccache.path = result.path
                ccache.endPos = endPos
                return true
            } else {
                return false
            }
        } else {
            const route = m.getRoute(creep.pos.roomName, endPos.roomName, avoidEnemies)
            if(route == ERR_NO_PATH){
                Log.info(`No route from ${creep.pos} to ${endPos}`)
                return false
            }
            //we can assume that the route has length 
            //since we already checked to make sure that we are not in the destination room
            //we can also assume that we are outside the first room in the route, since we just recalculated
            let goals
            if(route.length < 3){
                goals = {pos: endPos, range: range}
            } else {
                const exits = u.findExitPos(route[1].room, route[2].exit)
                goals = _.map(exits, function(e) {
                    return { pos: e, range: 0 } 
                })
            }
            const maxRooms = 16
            const result = m.getPath(creep, goals, avoidEnemies, maxRooms, boundingBox)
            if(!result.incomplete){
                ccache.route = route
                ccache.path = result.path
                ccache.endPos = endPos
                return true
            } else {
                return false
            }
        }
    },

    moveSpeed: function(creep: Creep | PowerCreep){
        //if PC, movespeed = 0.1 aka above max
        if(creep instanceof PowerCreep){
            return 0.001
        }
        let bodySize = 0
        if(creep.memory.tug && creep.memory.pullee){
            const pullee: Creep = Game.getObjectById(creep.memory.pullee)
            bodySize = pullee.body.length
        }
        const moves = creep.getActiveBodyparts(MOVE)
        bodySize += creep.body.length
        const carries = _.filter(creep.body, part => part.type == CARRY).length//can't use getActive bc inactive carry parts need to be weightless
        const usedCarries = Math.ceil(creep.store.getUsedCapacity() / CARRY_CAPACITY)//used carries have weight
        const fatigues = bodySize - moves - carries + usedCarries
        return Math.max(fatigues, 0.001)/Math.max(moves, 0.001)
    },

    findNoviceWallSpots: function(pos, direction, roomName){
        const wallSpots = []
        let loopStart = 0
        let loopEnd = 25
        let loopVar = "x"
        let constVar = "y"
        switch(direction){
        case TOP:
            loopStart = 25
            loopEnd = 50
            loopVar = "y"
            constVar = "x"
            break
        case BOTTOM:
            loopStart = 0
            loopEnd = 25
            loopVar = "y"
            constVar = "x"
            break
        case RIGHT:
            loopStart = 0
            loopEnd = 25
            loopVar = "x"
            constVar = "y"
            break
        case LEFT:
            loopStart = 25
            loopEnd = 50
            loopVar = "x"
            constVar = "y"
            break
        }

        for(let i = loopStart; i < loopEnd; i++){
            const newPos: Position = {}
            newPos[loopVar] = i
            newPos[constVar] = pos[constVar]
            wallSpots.push(new RoomPosition(newPos.x, newPos.y, roomName))
        }
        return wallSpots
        //find wall spots in room adjacent to this spot
        // |---------------|    |---------------|
        // | (current room)|    |(x=wallSpot)   |
        // |               |    |               |
        // |               x    xxxxxxxxx       |
        // |               |    |               |
        // |               |    |               |
        // |_______________|    |_______________|
    },

    findNoviceWallRooms: function(room: Room){
        //return value will be an object, with lists as values for keys
        //check if current room even has novice walls
        const walls = _.filter(room.find(FIND_STRUCTURES), s => s.structureType == STRUCTURE_WALL && rU.isOnEdge(s.pos))
        if(!walls.length){
            return {}
        }
        const noviceWallRooms = {}
        const exits = Game.map.describeExits(room.name)
        for(let i = 0; i < Object.keys(exits).length; i++){
            const exitRoomName = exits[Object.keys(exits)[i]]
            noviceWallRooms[exitRoomName] = []//establish keys as neighboring room names

            //find exit points to each room, and scan for walls on the exit
            const exitName = Game.map.findExit(room.name, exitRoomName) as ExitConstant
            const exitPositions = room.find(exitName)//list of roomPos on that exit
            let found = 0
            for(let j = 0; j < exitPositions.length; j++){
                for(let k = 0; k < walls.length; k++){
                    if(exitPositions[j].isEqualTo(walls[k].pos)){
                        //find necessary wallSpots
                        noviceWallRooms[exitRoomName] = (m.findNoviceWallSpots(exitPositions[j], Object.keys(exits)[i], exitRoomName))
                        found++
                        break
                    }
                }
                if(found > 1){
                    break//no need to loop more than needed, a room won't have more than 2 wall lines
                }
            }
        }
        return noviceWallRooms
    },

    getPath: function(creep, goals, avoidEnemies, maxRooms, boundingBox){
        const moveSpeed = m.moveSpeed(creep)//moveSpeed is inverse of fatigue ratio
        const noviceWallRooms = m.findNoviceWallRooms(creep.room)
        //if room is highway with novice walls, make an object with each of the neighboring rooms as keys
        //values should be arrays of locations for walls in those rooms
        const roomDataCache = u.getsetd(Cache, "roomData", {})
        const result = PathFinder.search(creep.pos, goals, {
            plainCost: Math.ceil(moveSpeed),
            swampCost: Math.ceil(moveSpeed * 5),
            maxRooms: maxRooms,
            maxOps: 10000,
            roomCallback: function(roomName){
                const roomData = u.getsetd(roomDataCache, roomName, {})
                if(roomName != creep.pos.roomName && roomData.own && !settings.allies.includes(roomData.own) 
                    && (goals.length || goals.pos.roomName != roomName)
                    && roomData.rcl 
                    && CONTROLLER_STRUCTURES[STRUCTURE_TOWER][roomData.rcl] 
                    && (!creep.memory.tolerance 
                    || creep.memory.tolerance < CONTROLLER_STRUCTURES[STRUCTURE_TOWER][roomData.rcl] * TOWER_POWER_ATTACK - (TOWER_POWER_ATTACK * TOWER_FALLOFF))){
                    return false
                }
                if(roomData.skL && roomData.rcl) return false
                if(Game.map.getRoomStatus(roomName).status != "normal"){
                    return false
                }
                const costs = new PathFinder.CostMatrix
                if(roomData.skL && roomData.skL.length){
                    if(!Memory.remotes[roomName] && avoidEnemies && creep.memory.role != cN.SCOUT_NAME) return false
                    const terrain = Game.map.getRoomTerrain(roomName)
                    for(const lairPos of roomData.skL){
                        const lair = u.unpackPos(lairPos, roomName)
                        const minX = Math.max(lair.x - 5, 0)
                        const maxX = Math.min(lair.x + 5, 49)
                        const minY = Math.max(lair.y - 5, 0)
                        const maxY = Math.min(lair.y + 5, 49)
                        for(let i = minX; i < maxX; i++){
                            for (let j = minY; j < maxY; j++){
                                if(!(terrain.get(i,j) & TERRAIN_MASK_WALL)){
                                    costs.set(i, j, Math.ceil(50/Math.min(Math.abs(i - lair.x), Math.abs(j - lair.y))))
                                }
                            }
                        }
                    }
                }
                const room = Game.rooms[roomName]
                if(!room){
                    if(noviceWallRooms[roomName] && noviceWallRooms[roomName].length){
                        for(let i = 0; i < noviceWallRooms[roomName].length; i++){
                            costs.set(noviceWallRooms[roomName][i].x, noviceWallRooms[roomName][i].y, 0xff)
                        }
                        return costs
                    }
                    //if room is not visible AND is on the novice highway list, set wall spots accordingly
                    return
                }

                room.find(FIND_STRUCTURES).forEach(function(struct) {
                    if (struct.structureType === STRUCTURE_ROAD || (struct.structureType == STRUCTURE_PORTAL && struct.pos.isEqualTo(goals))) {
                        // Favor roads over plain tiles
                        if(costs.get(struct.pos.x, struct.pos.y) != 0xff){
                            costs.set(struct.pos.x, struct.pos.y, Math.ceil(moveSpeed/2))
                        }
                    } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                             (struct.structureType !== STRUCTURE_RAMPART ||
                              !(struct.my || (settings.allies.includes(struct.owner.username) && struct.isPublic)))) {
                    // Can't walk through non-walkable buildings
                        costs.set(struct.pos.x, struct.pos.y, 0xff)
                    }
                })
                room.find(FIND_MY_CONSTRUCTION_SITES).forEach(function(struct) {
                    if(struct.structureType != STRUCTURE_ROAD && struct.structureType != STRUCTURE_RAMPART && struct.structureType != STRUCTURE_CONTAINER){
                        costs.set(struct.pos.x, struct.pos.y, 0xff)
                    }
                })
                // Avoid creeps in the room
                room.find(FIND_CREEPS).forEach(function(c) {
                    const ccache = u.getCreepCache(c.id)
                    if(!ccache.lastMove || ccache.lastMove < (Game.time - 1)){
                        if(!creep.my || creep.memory.moveStatus == "static"){
                            costs.set(c.pos.x, c.pos.y, 0xff)
                        } else {
                            costs.set(c.pos.x, c.pos.y, 30)
                        }
                    }
                    if(c.pos.isEqualTo(goals)){
                        costs.set(c.pos.x, c.pos.y, 1)
                    }
                })
                room.find(FIND_POWER_CREEPS).forEach(function(c) {
                    c.my ? costs.set(c.pos.x, c.pos.y, 30): costs.set(c.pos.x, c.pos.y, 0xff)
                })
                if (boundingBox) {
                    m.enforceBoundingBox(costs, boundingBox)
                }
                const goalList = goals.length ? goals : [goals]
                for(const goal of goalList){
                    if(goal.pos.roomName != roomName)
                        continue
                    const terrain = Game.map.getRoomTerrain(roomName)
                    const range = goal.range
                    const minX = Math.max(goal.pos.x - range, 0)
                    const maxX = Math.min(goal.pos.x + range, 49)
                    const minY = Math.max(goal.pos.y - range, 0)
                    const maxY = Math.min(goal.pos.y + range, 49)
                    for(let i = minX; i <= maxX; i++){
                        if(costs.get(i,minY) < 30 && !(terrain.get(i,minY) & TERRAIN_MASK_WALL))
                            costs.set(i,minY, 1)
                        if(costs.get(i,maxY) < 30 && !(terrain.get(i,maxY) & TERRAIN_MASK_WALL))
                            costs.set(i,maxY, 1)
                    }
                    for(let i = minY; i <= maxY; i++){
                        if(costs.get(minX,i) < 30 && !(terrain.get(minX,i) & TERRAIN_MASK_WALL))
                            costs.set(minX,i, 1)
                        if(costs.get(maxX, i) < 30 && !(terrain.get(maxX, i) & TERRAIN_MASK_WALL))
                            costs.set(maxX, i, 1)
                    }
                }
                return costs
            }
        })
        return result
    },

    enforceBoundingBox: function(costs, boundingBox) {
        const d = boundingBox.thickness // thickness of barrier
        for (let y = boundingBox.top - d; y <= boundingBox.bottom + d; y++) {
            for (let x = boundingBox.left - d; x <= boundingBox.right + d; x++) {
                const inBox = boundingBox.top <= y && y <= boundingBox.bottom
                    && boundingBox.left <= x && x <= boundingBox.right
                if (!inBox) {
                    costs.set(x, y, 30)
                }
            }
        }
    },

    getRoute: function(start, finish, avoidEnemies){
        const roomDataCache = Cache.roomData
        const route = Game.map.findRoute(start, finish, {
            routeCallback: function(roomName){
                if(u.isHighway(roomName)){
                    return 1
                }
                if(Game.map.getRoomStatus(roomName).status != "normal") {
                    return Infinity
                }
                const roomData = u.getsetd(roomDataCache, roomName, {})
                if(roomData.own && !settings.allies.includes(roomData.own) && roomData.rcl && CONTROLLER_STRUCTURES[STRUCTURE_TOWER][roomData.rcl] && avoidEnemies){
                    return 5
                }
                return settings.motion.backRoadPenalty
            }
        })
        return route
    },

    checkRoute: function(creep, endPos){//verify that cached route is up to date
        const ccache = u.getCreepCache(creep.id)
        //if creep is already in the same room as destination, route does not need to be checked
        if (ccache.route && endPos.roomName == ccache.route[ccache.route.length - 1].room){
            return true
        } else if(endPos.roomName == creep.pos.roomName){
            return true
        } else {
            return false
        }
    },

    checkPath: function(creep, endPos){//verify that cached path is up to date
        const ccache = u.getCreepCache(creep.id)
        //destination must match destination of cached path
        if(ccache.endPos && endPos.isEqualTo(ccache.endPos)){
            return true
        } else {
            return false
        }
    },

    getBoundingBox: function(room) {
        if (!room.memory.plan) {
            return
        }
        const top = room.memory.plan.y
        const left = room.memory.plan.x
        const bottom = top + template.dimensions.y - 1
        const right = left + template.dimensions.x - 1
        return new m.BoundingBox(top, left, bottom, right)
    }
}

export = m