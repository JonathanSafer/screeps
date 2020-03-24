//const sq = require("./spawnQueue"); sq.initialize(Game.spawns['E8N60']); sq.schedule(Game.spawns['E8N60'], 'quad')
const u = require("./utils")
const a = require("./actions")
const rH = require("./harasser")
const settings = require("./settings")
const T = require("./tower")

var CreepState = {
    START: 1,
    BOOST: 2,
    FORM: 3,
    ENGAGE: 4,
    RALLY: 5,
    DORMANT: 6,
    PRIVATE: 7
}
var CS = CreepState

var rQ = {
    name: "quad",
    type: "quad",
    target: () => 0,
   


    /** @param {Creep} creep **/
    run: function(creep) {
        rQ.init(creep)
        switch(creep.memory.state){
        case CS.START:
            //determine whether to get boosted or go form up
            rQ.checkBoost(creep)
            break
        case CS.BOOST:
            if(!creep.memory.boosted){
                a.getBoosted(creep)
            } else {
                creep.memory.state = CS.FORM
            }
            //get boosted, then go form up
            break
        case CS.FORM:
            //find a captain
            //if no captain, become one
            //captain finds form up location, privates sign up for a private slot, then go brain dead
            //captain checks roster and moves privates to necessary positions in formation
            rQ.formUp(creep)
            break
        case CS.ENGAGE:
            rQ.engage(creep)
            break
        case CS.RALLY:
            //...
            break
        case CS.DORMANT:
            //...
            break
        case CS.PRIVATE:
            //mind controlled: do nothing
            break
        }
        
    },
    
    init: function(creep){
        if(!creep.memory.state){
            creep.memory.state = CS.START
        }
    },
    
    checkBoost: function(creep){
        if(creep.room.controller.level == 8){
            creep.memory.state = CS.BOOST
        } else {
            creep.memory.state = CS.FORM
        }
    },

    spawnQuad: function(city){
        const sq = require("./spawnQueue")
        sq.initialize(Game.spawns[city])
        for(let i = 0; i < 4; i++){
            sq.schedule(Game.spawns[city], "quad")
        }
    },
    
    formUp: function(creep){
        //maybe creeps could make sure that their entire squad is spawned until determining a captain and forming up, until then
        //they would renew themselves (has to be done before boosting though)
        
        //form up organization:     C 0
        //(byorder in private list) 1 2
        if(creep.memory.captain){
            //find meeting position
            //choose an exit, and path as close to room center as possible from that exit. 2nd to last pos on path is rally point
            let formPos = null
            if(creep.memory.rally){
                formPos = new RoomPosition(creep.memory.rally.x, creep.memory.rally.y, creep.memory.rally.roomName)
            } else {
                const matrix = rQ.getRoomMatrix(creep.pos.roomName)
                let startPos = null
                for(let i  = 0; i < 50; i++){
                    for(let j = 0; j < 50; j++){
                        if((i == 0 || j == 0 || i == 49 || j == 49) && matrix.get(i,j) == 2){
                            startPos = new RoomPosition(i, j, creep.pos.roomName)
                        }
                    }
                }
                const path = PathFinder.search(startPos, {pos: new RoomPosition(25, 25, creep.pos.roomName), range: 1},
                    {maxRooms: 1, roomCallback: function() { return matrix }}).path
                //TODO: if path is less than 2 in length, find a new startPos and try again

                formPos = path[path.length - 2]
                creep.memory.rally = formPos
            }
            let inLine = 0
            if(!creep.pos.isEqualTo(formPos)){
                creep.moveTo(formPos)
            } else {
                inLine++
            }
            for(let i = 0; i < creep.memory.privates.length; i++){
                const privatePos = new RoomPosition(formPos.x, formPos.y, formPos.roomName)
                switch(i){
                case 0:
                    privatePos.x++
                    break
                case 1:
                    privatePos.y++
                    break
                case 2:
                    privatePos.x++
                    privatePos.y++
                    break
                }
                new RoomVisual(creep.room.name).text(i,privatePos)
                const private = Game.getObjectById(creep.memory.privates[i])
                if(!private){
                    continue
                }
                if(!private.pos.isEqualTo(privatePos)){
                    private.moveTo(privatePos)
                } else{
                    inLine++
                }
                if(inLine == 4){
                    creep.memory.state = CS.ENGAGE
                }
            }
            return
        }
        //find captain
        if(creep.ticksToLive <= 1499){
            const captain = _.find(creep.room.find(FIND_MY_CREEPS), c => c.memory.captain && c.memory.privates.length < 3)
            if(captain){//sign up as a private and go brain dead
                captain.memory.privates.push(creep.id)
                creep.memory.state = CS.PRIVATE
            } else {//if no captian, become captain
                creep.memory.captain = true
                creep.memory.privates = []
            }
        }
    },

    getDamageMatrix: function(roomName){
        if(Cache[roomName].damageMatrix){
            return Cache[roomName].damageMatrix.clone()
        } else{
            return false
        }
    },
    
    getRoomMatrix: function(roomName){
        //always return a copy of the room matrix, in case it needs to be modified
        if(!Cache[roomName]){
            Cache[roomName] = {}
        }
        if(Cache[roomName].quadMatrix && (Game.time != 50 || !Game.rooms[roomName])){//if there is a matrix already, just copy and return
            return Cache[roomName].quadMatrix.clone()
        } else {//no matrix? make one if we have vision
            if(!Game.rooms[roomName]){
                return false
            }
            const damageMatrix = new PathFinder.CostMatrix
            const costs = new PathFinder.CostMatrix
            const terrain = new Room.Terrain(roomName)
            //fill matrix with default terrain values
            for(let i = 0; i < 50; i++){
                for(let j = 0; j < 50; j++){
                    switch(terrain.get(i,j)) {
                    case TERRAIN_MASK_WALL:
                        costs.set(i, j, 255)
                        break
                    case TERRAIN_MASK_SWAMP:
                        costs.set(i, j, 5)
                        break
                    case 0:
                        costs.set(i, j, 1)
                        break
                    }
                }
            }
            
            //if room is visible, fill in structure info
            if(Game.rooms[roomName]){
                Game.rooms[roomName].find(FIND_STRUCTURES).forEach(function(struct) {
                    if (struct.structureType !== STRUCTURE_CONTAINER && struct.structureType !== STRUCTURE_ROAD &&
                             (struct.structureType !== STRUCTURE_RAMPART ||
                              !struct.my)) {
                        // Can't walk through non-walkable buildings
                        costs.set(struct.pos.x, struct.pos.y, 255)
                    }
                    if(struct.structureType == STRUCTURE_ROAD){
                        costs.set(struct.pos.x, struct.pos.y, 1)
                    }
                })
            }
            
            //loop through everything again, if value of pos is greater than any of the positions TOP, TOP_LEFT or LEFT, then reset those postions to the value of original pos
            for(let i = 0; i < 50; i++){
                for(let j = 0; j < 50; j++){
                    const posCost = costs.get(i,j)
                    if(costs.get(Math.max(0, i - 1), Math.max(0, j - 1)) < posCost){//TOP_LEFT
                        costs.set(Math.max(0, i - 1), Math.max(0, j - 1), posCost)
                    }
                    if(costs.get(i, Math.max(0, j - 1)) < posCost){//TOP
                        costs.set(i, Math.max(0, j - 1), posCost)
                    }
                    if(costs.get(Math.max(0, i - 1), j) < posCost){//LEFT
                        costs.set(Math.max(0, i - 1), j, posCost)
                    }
                    if(u.isOnEdge(new RoomPosition(i, j, roomName))){
                        costs.set(i, j, posCost + 1)
                    }
                }
            }

            const towers = _.filter(Game.rooms[roomName].find(FIND_HOSTILE_STRUCTURES), s => s.structureType == STRUCTURE_TOWER)
            if(towers && towers.length){
                for(let i = 0; i < 50; i++){
                    for(let j = 0; j < 50; j++){
                        damageMatrix.set(i, j, T.calcTowerDamage(towers, new RoomPosition(i, j, roomName)))
                    }
                }
            }
            Cache[roomName].damageMatrix = damageMatrix
            Cache[roomName].quadMatrix = costs
            return costs.clone()
        }
    },

    engage: function(creep){
        //TODO: check formation status. If formation is broken up, reform
        //if a member has died, go into YOLO mode
        //captain should preemptively send everybody in YOLO mode if it is at 1 ttl

        //explore exits
        const quad = [creep, Game.getObjectById(creep.memory.privates[0]),
            Game.getObjectById(creep.memory.privates[1]),
            Game.getObjectById(creep.memory.privates[2])]

        for(let i = 0; i < quad.length; i++){
            if(!quad[i] || quad[i].ticksToLive == 1){
                if(!quad[i] && creep.ticksToLive >= creep.body.length * 12 + 200){
                    rQ.spawnQuad(creep.memory.city)
                }
                console.log("yolo")
                for(let j = 0; j < quad.length; j++){
                    if(quad[j]){
                        quad[j].memory.role = rH.name
                    }
                }
                return
            }
            if(!Cache[quad[i].room.name] || !Cache[quad[i].room.name].quadMatrix){//this can be combined with the part where we find enemies
                rQ.getRoomMatrix(quad[i].room.name)
            }
        }

        const status = rQ.getQuadStatus(quad)


        /****************************TEMPORARY LOGIC*********************************/
        if(creep.ticksToLive == creep.body.length * 12 + 200 && Game.flags[creep.memory.city + "quadRally"]){
            rQ.spawnQuad(creep.memory.city)
        } else if(creep.hits < 200 && Game.flags[creep.memory.city + "quadRally"]){
            rQ.spawnQuad(creep.memory.city)
            creep.suicide()
        }
        
        const creepsByRoom = _.groupBy(quad, c => c.pos.roomName)
        const everythingByRoom = {}
        const allHostiles = []
        Object.keys(creepsByRoom).forEach(function (roomName) {
            everythingByRoom.roomName = {}
            everythingByRoom.roomName.creeps = creepsByRoom[roomName]
            everythingByRoom.roomName.hostiles = _.filter(Game.rooms[roomName].find(FIND_HOSTILE_CREEPS), c => !settings.allies.includes(c.owner.username))
            if(Game.rooms[roomName].controller && (Game.rooms[roomName].controller.my //this should be a utils function
                || (Game.rooms[roomName].controller.owner && settings.allies.includes(Game.rooms[roomName].controller.owner.username)) 
                || (Game.rooms[roomName].controller.reservation && settings.allies.includes(Game.rooms[roomName].controller.reservation.username)))){
                everythingByRoom.roomName.structures = _.filter(Game.rooms[roomName].find(FIND_HOSTILE_STRUCTURES), s => !settings.allies.includes(s.owner.username))
            } else {
                everythingByRoom.roomName.structures = _.filter(Game.rooms[roomName].find(FIND_STRUCTURES), s => s.hits)
            }
            if(everythingByRoom.roomName.hostiles.length){
                for(let i = 0; i < everythingByRoom.roomName.hostiles.length; i++){
                    allHostiles.push(everythingByRoom.roomName.hostiles[i])
                }
            }
            for(let i = 0; i < everythingByRoom.roomName.creeps.length; i++){
                rH.shoot(everythingByRoom.roomName.creeps[i], everythingByRoom.roomName.hostiles, everythingByRoom.roomName.structures)
            }
        })

        let needRetreat = rQ.heal(quad, allHostiles.length)
        if(!needRetreat){
            for(let i = 0; i < quad.length; i++){
                if(everythingByRoom[quad[i].pos.roomName]){
                    for(let j = 0; j < everythingByRoom[quad[i].pos.roomName].hostiles.length; j++){
                        if(everythingByRoom[quad[i].pos.roomName].hostiles[j].getActiveBodyparts(ATTACK) && everythingByRoom[quad[i].pos.roomName].hostiles[j].pos.inRangeTo(quad[i], 2)){
                            needRetreat = true
                        }
                    }
                }
            }
        }

        if(needRetreat && allHostiles.length){
            //if we have a member low, move away from all hostiles
            const dangerous = _.filter(allHostiles, c => c.getActiveBodyparts(ATTACK) || c.getActiveBodyparts(RANGED_ATTACK))
            const goals = _.map(dangerous, function(c) {
                return { pos: c.pos, range: 5 }
            })

            const towers = _.filter(creep.room.find(FIND_HOSTILE_STRUCTURES), s => s.structureType == STRUCTURE_TOWER)
            if(towers.length){
                goals.concat(_.map(towers, function(t) { return { pos: t.pos, range: 20 } }))
            }
            rQ.move(quad, goals, status, 0, true)

        }
        let target = null
        if(creep.memory.target){
            const targetCreep = Game.getObjectById(creep.memory.target)
            if(!targetCreep && Object.keys(creepsByRoom).includes(creep.memory.targetPos[2])){
                creep.memory.target = null
            } else if(!targetCreep){
                target = new RoomPosition(creep.memory.targetPos[0], creep.memory.targetPos[1], creep.memory.targetPos[2])
            }
        }
        if(!target && allHostiles.length){
            const targetCreep = rQ.findClosestByPath(everythingByRoom)
            if(targetCreep){
                creep.memory.target = targetCreep.id
                creep.memory.targetPos = [targetCreep.pos.x, targetCreep.pos.y, targetCreep.pos.roomName]
                target = targetCreep.pos
            }
        }
        //target = null

        const flagName = creep.memory.city + "quadRally"
        if(target){
            rQ.move(quad, target, status, 2, false)
        } else if(_.find(creep.room.find(FIND_STRUCTURES), s => s.structureType == STRUCTURE_KEEPER_LAIR)){
            const lairs = _.filter(creep.room.find(FIND_STRUCTURES), s => s.structureType == STRUCTURE_KEEPER_LAIR)
            target = _.min(lairs, "ticksToSpawn").pos
            if(target){
                rQ.move(quad, target, status, 4) 
            }
        } else if(Game.flags[flagName]){
            rQ.move(quad, Game.flags[flagName].pos, status, 3, false)
        }
            
        /****************************TEMPORARY LOGIC*********************************/

    },

    findClosestByPath: function(everythingByRoom){
        const targets = []
        Object.keys(everythingByRoom).forEach(function (roomName) {
            if(everythingByRoom[roomName].hostiles){
                const hostiles = _.filter(everythingByRoom[roomName].hostiles, h => !u.isOnEdge(h.pos)).concat(everythingByRoom[roomName].structures)
                targets.push(everythingByRoom[roomName].creeps[0].pos.findClosestByPath(hostiles))
            }
        })
        if(!targets.length){
            return null
        } else if(targets.length == 1){
            return targets[0]
        } else {
            return targets[0]
        }
    },

    shoot: function(quad){
        const groupedByRoom = _.groupBy(quad, c => c.pos.roomName)
        Object.keys(groupedByRoom).forEach(function (roomName) {
            const creeps = groupedByRoom[roomName]
            const hostiles = _.filter(Game.rooms[roomName].find(FIND_HOSTILE_CREEPS), c => !settings.allies.includes(c.owner.username))
            for(let i = 0; i < creeps.length; i++){
                rH.shoot(creeps[i], hostiles)
            }
        })

    },

    heal: function(quad, hostiles){//TODO: preheal based on positioning/intelligence
        const damaged = _.min(quad, "hits")
        if(damaged.hits < damaged.hitsMax * 0.9){
            for(let i = 0; i < quad.length; i++){
                quad[i].heal(damaged)
            }
        } else if(hostiles || damaged.hits < damaged.hitsMax){
            for(let i = 0; i < quad.length; i++){
                quad[i].heal(quad[i])
            }
        }
        if(damaged.hits < damaged.hitsMax * 0.8){
            return true
        }
        return false
    },

    moveByPath: function(leader, quad, path, status){
        for(let i = 0; i < quad.length; i++){
            if(quad[i].fatigue){
                return
            }
        }
        let direction = null
        if(leader.pos.isNearTo(path[0])){
            direction = leader.pos.getDirectionTo(path[0])
        } else {
            for(let i = 0; i < path.length; i++){
                if(leader.pos.isEqualTo(path[i]) && i < path.length - 1){
                    direction = path[i].getDirectionTo(path[i + 1])
                    break
                }
            }
        }
        if(direction){
            if(status.roomEdge && Math.abs(direction - status.roomEdge) == 4){
                return //if quad wants to move against the grain on exit, stay still
            }
            for(let i = 0; i < quad.length; i++){
                quad[i].move(direction)
            }
        } else if(!status.roomEdge){
            for(let i = 0; i < quad.length; i++){
                let nextCreep = i + 1
                if(nextCreep >= quad.length){
                    nextCreep -= quad.length
                }
                direction = quad[i].pos.getDirectionTo(quad[nextCreep])
                quad[i].move(direction)
            }
        }
    },

    longRangeToLocal: function(quad, leader, target){
        const route = Game.map.findRoute(leader.pos.roomName, target.roomName, {
            routeCallback(roomName) {
                const parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName)
                const isHighway = (parsed[1] % 10 === 0) || 
                                (parsed[2] % 10 === 0)
                const isMyRoom = Game.rooms[roomName] &&
                    Game.rooms[roomName].controller &&
                    Game.rooms[roomName].controller.my
                if (isHighway || isMyRoom) {
                    return 1
                } else {
                    return 2//favor highways
                }
            }
        })
        if(!route.length){
            return null
        }
        for(let i = route.length - 1; i >= 0; i--){
            for(let j = 0; j < quad.length; j++){
                if(quad[j].pos.roomName == route[i].room && i < route.length - 1){
                    //we have gotten to this point, now path to the next room in the room path
                    const exits = quad[j].room.find(route[i + 1].exit)
                    const goals = _.map(exits, function(exit) {
                        return { pos: exit, range: 0 }
                    })
                    return goals
                }
            }
        }
        //if we don't have a creep in the required room, we need to move to route[0]
        for(let i = 0; i < quad.length; i++){
            if(quad[i].pos.roomName == target.roomName){//we are already in required room
                return null
            }
        }
        //quad is at beginning of path
        const exits = leader.room.find(route[0].exit)
        const goals = _.map(exits, function(exit) {
            return { pos: exit, range: 0 }
        })
        return goals
    },

    move: function(quad, target, status, range, retreat){
        if(!retreat){
            retreat = false
        }
        if(!range){
            range = 0
        }
        let destination = null
        if(!retreat){
            const newTarget = rQ.longRangeToLocal(quad, status.leader, target)
            if(newTarget){
                destination = newTarget
            } else {
                destination = {pos: target, range: range}
            }
        } else {
            destination = target
        }
        const matrix = {}

        const search = PathFinder.search(status.leader.pos, destination, {
            maxRooms: 4,
            flee: retreat,
            roomCallback: function(roomName){
                const costs = rQ.getRoomMatrix(roomName)
                if(!costs){
                    return false
                }
                const damageMatrix = rQ.getDamageMatrix(roomName)
                if(status.roomEdge){
                    //if formation is on a roomEdge, and any of members is in a room but not on it's edge, we cannot move into that room
                    //unless they are all in that room
                    for(let i = 0; i < quad.length; i++){//save a little cpu by not using a room we can't move into anyway
                        if(!status.sameRoom && status.leader.pos.roomName != roomName && quad[i].pos.roomName == roomName && !u.isOnEdge(quad[i].pos)){
                            return false
                        }
                    }
                    //otherwise, if this is leader's room, block necessary positions to limit motion in appropriate fashion
                    //see: getQuadStatus()
                    const leader = status.leader
                    for(let i = -1; i < 2; i++){
                        for(let j = -1; j < 2; j++){
                            if(leader.pos.x + i > 0 && leader.pos.x + i < 50 && leader.pos.y + j > 0 && leader.pos.y + j < 50){
                                const direction = leader.pos.getDirectionTo(new RoomPosition(leader.pos.x + i, leader.pos.y + j, roomName))
                                let tolerance = 1//TODO: test with tolerance always at 1, it might work out
                                if(status.sameRoom){
                                    tolerance = 1
                                }
                                if(Math.abs(direction - status.roomEdge) != 4 && Math.abs(direction - status.roomEdge) > tolerance && (!tolerance || Math.abs(direction - status.roomEdge) != 7)){
                                    //because TOP == 1 and TOP_LEFT == 8, a difference of 7 actually signals adjacency
                                    //unwalkable
                                    if(costs){
                                        costs.set(leader.pos.x + i, leader.pos.y + j, 255)
                                    }
                                }
                            }
                        }
                    }
                }
                if(Game.rooms[roomName]){
                    //if we have vision, add creeps to matrix, otherwise just return it plain
                    const quadNames = []
                    for(let i = 0; i < quad.length; i++){
                        quadNames.push(quad[i].name)
                    }
                    Game.rooms[roomName].find(FIND_CREEPS).forEach(function(creep) {
                        if(!quadNames.includes(creep.name)){
                            //quad cannot move to any pos that another creep is capable of moving to
                            if(!creep.fatigue){
                                for(let i = Math.max(0 , creep.pos.x - 2); i < Math.min(50, creep.pos.x + 2); i++){
                                    for(let j = Math.max(0 , creep.pos.y - 2); j < Math.min(50, creep.pos.y + 2); j++){
                                        costs.set(i, j, 255)
                                    }
                                }
                            } else {
                                costs.set(creep.pos.x, creep.pos.y, 255)
                            }
                        }
                    })
                }

                //factor in tower damage
                //TODO: include creep damage as well
                if(damageMatrix){
                    const healPower = status.leader.getActiveBodyparts(HEAL) * 48
                    for(let i = 0; i < 50; i++){
                        for(let j = 0; j < 50; j++){
                            const damage = damageMatrix.get(i, j)
                            if(damage > healPower){
                                costs.set(i, j, costs.get(i, j) + damage - healPower)
                            }
                        }
                    }
                }
                matrix[roomName] = costs
                return costs
            }
        })
        if(search.incomplete){
            //if no path, try looking for structures in the way
        }
        rQ.moveByPath(status.leader, quad, search.path, status)
    },

    getQuadStatus: function(quad){//return squad leader, roomEdge status, and if creeps are all in the same room
        //we need to know which creep is in which position because all pathfinding must be done based on the creep in the top left
        //roomEdge status determines which directions we can move
        //For Example: if roomEdge status == RIGHT && creeps are not all in the same room, we can only move RIGHT,
        //however, if creeps are all in the same room, we can move RIGHT, TOP_RIGHT, or BOTTOM_RIGHT
        //halting on a roomEdge will always result in the edge flipping the following tick i.e. if roomEdge == RIGHT, next tick it'll be LEFT
        let leader = null
        let highRoom = [] //creeps that are in the leftmost or topmost room of creeps in squad
        for(let i = 0; i < quad.length; i++){//if a creep's room is higher than any other squad member's room, it must be in the highest room
            const coords = u.roomNameToPos(quad[i].pos.roomName)
            for(let j = 0; j < quad.length; j++){
                const compCoords = u.roomNameToPos(quad[j].pos.roomName)
                if(coords[0] < compCoords[0] || coords[1] > compCoords[1]){
                    highRoom.push(quad[i])
                    break
                }
            }
        }
        //if highRoom is empty, all creeps are in highRoom
        if(!highRoom.length){
            highRoom = quad
        }
        //amongst creeps in highroom, find toppest leftest one
        for(let i = 0; i < highRoom.length; i++){
            let topLeft = true
            for(let j = 0; j < highRoom.length; j++){//if creep is not top, left, or top left of every other creep, it is not the leader
                if(highRoom[j].pos.getDirectionTo(highRoom[i]) != LEFT 
                    && highRoom[j].pos.getDirectionTo(highRoom[i]) != TOP_LEFT 
                    && highRoom[j].pos.getDirectionTo(highRoom[i]) != TOP
                    && !highRoom[j].pos.isEqualTo(highRoom[i])){
                    topLeft = false
                }
            }
            if(topLeft){
                leader = highRoom[i]
                break
            }
        }

        //determine roomEdge status
        let roomEdge = null //default is null, if we are not on an edge it should stay that way
        for(let i = 0; i < quad.length; i++){
            if(u.isOnEdge(quad[i].pos)){//if a creep from the squad is on an edge, it can determine which edge we are on
                if(quad[i].pos.x == 49){
                    roomEdge = LEFT
                } else if(quad[i].pos.x == 0){
                    roomEdge = RIGHT
                } else if (quad[i].pos.y == 49){
                    roomEdge = TOP
                } else {
                    roomEdge = BOTTOM
                }
                break
            }
        }
        const result = {}
        result.leader = leader
        result.roomEdge = roomEdge
        //if all of the creeps in the squad are in the highest room, they must all be in the same room
        result.sameRoom = highRoom.length < quad.length ? false : true
        return result
    }

    
}
module.exports = rQ