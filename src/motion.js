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

    getPath: function(creep, goals, avoidEnemies, maxRooms){
        const moveSpeed = m.moveSpeed(creep)//moveSpeed is inverse of fatigue ratio
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
                const room = Game.rooms[roomName]
                if(!room){
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
        //if creep is already in the same room aas destination, route does not need to be checked
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