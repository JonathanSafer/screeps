var u = require("./utils")
var settings = require("./settings")

var m = {
    //newMove will override all long and short distance motion
    newMove: function(creep, endPos,  range = 0, avoidEnemies = true){
        //check for cached path and cached route
        if(!Cache[creep.name]){
            Cache[creep.name] = {}
        }
        const routeVerified = m.checkRoute(creep, endPos)
        const pathVerified = m.checkPath(creep, endPos)
        //if creep thinks it moved last tick, but pos is the same, it's stuck/needs recalc
        const moveFailed = (Cache[creep.name].lastPos 
            && Cache[creep.name].lastPos.isEqualTo(creep.pos) 
            && Cache[creep.name].lastMove 
            && Cache[creep.name].lastMove == Game.time - 1)
        //if everything is good to go, MBP
        if(pathVerified && routeVerified && !moveFailed){
            //this is where traffic management should happen wrt early recalc if stuck
            const result = creep.moveByPath(Cache[creep.name].path)
            if(result == OK){
                Cache[creep.name].lastMove = Game.time
                Cache[creep.name].lastPos = creep.pos
            }
            if([OK, ERR_TIRED, ERR_BUSY, ERR_NO_BODYPART].includes(result)){//MBP returns OK, OR a different error that we don't mind (like ERR_TIRED)
                return
            }
        }
        //recalc needed
        const pathCalc = m.pathCalc(creep, endPos, avoidEnemies, range)

        if(pathCalc){//if pathing successful, MBP
            if(creep.moveByPath(Cache[creep.name].path) == OK){
                Cache[creep.name].lastMove = Game.time
                Cache[creep.name].lastPos = creep.pos
            }
        } else {
            Log.info(`Pathing failure at ${creep.pos}`)
        }
    },

    pathCalc: function(creep, endPos, avoidEnemies, range){//bool, returns success of pathfinding ops
        //if creep is in same room as target, path to target. Otherwise, path to nearest exit in the right direction
        //IMPORTANT: once we are in target room, we must restrict motion to that room to prevent edge bouncing
        //might be necessary to do this for all pathfinding
        const sameRoom = creep.pos.roomName == endPos.roomName
        if(sameRoom){
            const maxRooms = 1
            const goal = {pos: endPos, range: range}
            const result = m.getPath(creep, goal, avoidEnemies, maxRooms)//limit maxRooms to 1
            if(!result.incomplete){
                Cache[creep.name].route = null //no route since creep is in required room already
                Cache[creep.name].path = result.path
                Cache[creep.name].endPos = endPos
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
            //we can assume that the route has length, 
            //since we already checked to make sure that we are not in the destination room
            //we can also assume that we are moving to the first room in the route, since we just recalculated
            const exit = route[0].exit
            const goals = _.map(creep.room.find(exit), function(e) {
                return { pos: e, range: 0 } 
            })
            const maxRooms = 1//could be 2 (if we can path to the next room's exit rather than our room's exit)
            const result = m.getPath(creep, goals, avoidEnemies, maxRooms)
            if(!result.incomplete){
                Cache[creep.name].route = route
                Cache[creep.name].path = result.path
                Cache[creep.name].endPos = endPos
                return true
            } else {
                return false
            }
        }
    },

    moveSpeed: function(creep){
        //if PC, movespeed = 0.1 aka above max
        if(creep.level){
            return 0.001
        }
        const moves = creep.getActiveBodyparts(MOVE)
        const bodySize = creep.body.length
        const carries = _.filter(creep.body, part => part == CARRY).length//can't use getActive bc inactive carry parts need to be weightless
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
            const newPos = {}
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

    findNoviceWallRooms: function(room){
        //return value will be an object, with lists as values for keys
        //check if current room even has novice walls
        const walls = _.filter(room.find(FIND_STRUCTURES), s => s.structureType == STRUCTURE_WALL && u.isOnEdge(s.pos))
        if(!walls.length){
            return {}
        }
        const noviceWallRooms = {}
        const exits = Game.map.describeExits(room.name)
        for(let i = 0; i < Object.keys(exits).length; i++){
            const exitRoomName = exits[Object.keys(exits)[i]]
            noviceWallRooms[exitRoomName] = []//establish keys as neighboring room names

            //find exit points to each room, and scan for walls on the exit
            const exitName = Game.map.findExit(room.name, exitRoomName)
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

    getPath: function(creep, goals, avoidEnemies, maxRooms){
        const moveSpeed = m.moveSpeed(creep)//moveSpeed is inverse of fatigue ratio
        const noviceWallRooms = m.findNoviceWallRooms(creep.room)
        //if room is highway with novice walls, make an object with each of the neighboring rooms as keys
        //values should be arrays of locations for walls in those rooms
        const result = PathFinder.search(creep.pos, goals, {
            plainCost: Math.ceil(moveSpeed),
            swampCost: Math.ceil(moveSpeed * 5),
            maxRooms: maxRooms,
            roomCallback: function(roomName){
                if(avoidEnemies && Cache[roomName] && Cache[roomName].enemy){
                    return false
                }
                if(Game.map.getRoomStatus(roomName).status != "normal"){
                    return false
                }
                const room = Game.rooms[roomName]
                if(!room){
                    if(noviceWallRooms[roomName] && noviceWallRooms[roomName].length){
                        const costs = new PathFinder.CostMatrix
                        for(let i = 0; i < noviceWallRooms[roomName].length; i++){
                            costs.set(noviceWallRooms[roomName][i].x, noviceWallRooms[roomName][i].y, 0xff)
                        }
                        return costs
                    }
                    //if room is not visible AND is on the novice highway list, set wall spots accordingly
                    return
                }
                const costs = new PathFinder.CostMatrix

                room.find(FIND_STRUCTURES).forEach(function(struct) {
                    if (struct.structureType === STRUCTURE_ROAD) {
                        // Favor roads over plain tiles
                        costs.set(struct.pos.x, struct.pos.y, Math.ceil(moveSpeed/2))
                    } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                             (struct.structureType !== STRUCTURE_RAMPART ||
                              !struct.my)) {
                    // Can't walk through non-walkable buildings
                        costs.set(struct.pos.x, struct.pos.y, 0xff)
                    }
                })

                // Avoid creeps in the room
                room.find(FIND_CREEPS).forEach(function(c) {
                    if(!Cache[c.name] || !Cache[c.name].lastMove || Cache[c.name].lastMove < (Game.time - 1)){
                        costs.set(c.pos.x, c.pos.y, 0xff)
                    }
                })
                room.find(FIND_POWER_CREEPS).forEach(function(c) {
                    costs.set(c.pos.x, c.pos.y, 0xff)
                })
                return costs
            }
        })
        return result
    },

    getRoute: function(start, finish, avoidEnemies){
        const route = Game.map.findRoute(start, finish, {
            routeCallback: function(roomName){
                if(!!Cache[roomName] && Cache[roomName].enemy && avoidEnemies){
                    return Infinity
                }
                if(u.isHighway(roomName)){
                    return 1
                }
                if(Game.map.getRoomStatus(roomName).status != "normal") {
                    return Infinity
                }
                return settings.motion.backRoadPenalty
            }
        })
        return route
    },

    checkRoute: function(creep, endPos){//verify that cached route is up to date
        //if creep is already in the same room as destination, route does not need to be checked
        if (Cache[creep.name].route && endPos.roomName == Cache[creep.name].route[Cache[creep.name].route.length - 1].room){
            return true
        } else if(endPos.roomName == creep.pos.roomName){
            return true
        } else {
            return false
        }
    },

    checkPath: function(creep, endPos){//verify that cached path is up to date
        //destination must match destination of cached path
        if(Cache[creep.name].endPos && endPos.isEqualTo(Cache[creep.name].endPos)){
            return true
        } else {
            return false
        }
    }


}

module.exports = m