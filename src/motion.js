var u = require("./utils")
var settings = require("./settings")

var m = {
    //newMove will override all long and short distance motion
    newMove: function(creep, endPos, avoidEnemies = true, range = 0){
        //check for cached path and cached route
        const routeVerified = m.checkRoute(creep, endPos)
        const pathVerified = m.checkPath(creep, endPos)
        //if everything is good to go, MBP
        if(pathVerified && routeVerified){
            //this is where traffic management should happen wrt early recalc if stuck
            const result = creep.moveByPath(Cache[creep].path)
            if([OK, ERR_TIRED, ERR_BUSY, ERR_NO_BODYPART].includes(result)){//MBP returns OK, OR a different error that we don't mind (like ERR_TIRED)
                return
            }
        }
        //recalc needed
        const pathCalc = m.calcPath(creep, endPos, avoidEnemies, range)

        if(pathCalc){//if pathing successful, MBP
            creep.moveByPath(Cache[creep].path)
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
                Cache[creep].route = null //no route since creep is in required room already
                Cache[creep].path = result.path
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
                return { pos: e.pos, range: 0 } 
            })
            const maxRooms = 1//could be 2 (if we can path to the next room's exit rather than our room's exit)
            const result = m.getPath(creep, goals, avoidEnemies, maxRooms)
            if(!result.incomplete){
                Cache[creep].route = route
                Cache[creep].path = result.path
                return true
            } else {
                return false
            }
        }
    },

    getPath: function(creep, goals, avoidEnemies, maxRooms){
        const result = PathFinder.search(creep.pos, goals, {
            plainCost: 1,
            swampCost: 5,//TODO, change terrain values based on creep mobility
            maxRooms: maxRooms,
            roomCallback: function(roomName){
                if(avoidEnemies && Cache[roomName].enemy){
                    return false
                }
                const room = Game.rooms[roomName]
                if(!room){
                    return
                }
                const costs = new PathFinder.CostMatrix

                room.find(FIND_STRUCTURES).forEach(function(struct) {
                    if (struct.structureType === STRUCTURE_ROAD) {
                        // Favor roads over plain tiles
                        costs.set(struct.pos.x, struct.pos.y, 1)
                    } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                             (struct.structureType !== STRUCTURE_RAMPART ||
                              !struct.my)) {
                    // Can't walk through non-walkable buildings
                        costs.set(struct.pos.x, struct.pos.y, 0xff)
                    }
                })

                // Avoid creeps in the room
                room.find(FIND_CREEPS).forEach(function(c) {
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
                if(Cache[roomName].enemy && avoidEnemies){
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
        if (Cache[creep].route && endPos.roomName == Cache[creep].route[Cache[creep].route.length - 1].room){
            return true
        } else if(endPos.roomName == creep.pos.roomName){
            return true
        } else {
            return false
        }
    },

    checkPath: function(creep, endPos){//verify that cached path is up to date
        //if creep is at the end of the path, moveByPath should return an error code => recalc and try to move again
        if(Cache[creep].path && endPos.isEqualTo == Cache[creep].path[Cache[creep].path.length - 1]){
            return true
        } else {
            return false
        }
    }


}

module.exports = m