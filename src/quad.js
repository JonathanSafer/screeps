//const sq = require("./spawnQueue"); sq.initialize(Game.spawns['E8N60']); sq.schedule(Game.spawns['E8N60'], 'quad')
const u = require("./utils")
const a = require("./actions")
const rH = require("./harasser")
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
    target: function(spawn, boosted){
        if(boosted){
            const boosts = [RESOURCE_CATALYZED_GHODIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
                RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ALKALIDE]
            u.requestBoosterFill(spawn, boosts)
        }
        return 0
    },

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
        if(creep.memory.needBoost){
            creep.memory.state = CS.BOOST
        } else {
            creep.memory.state = CS.FORM
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

    engage: function(creep){
        //TODO: check formation status. If formation is broken up, reform
        //if a member has died, go into YOLO mode
        //captain should preemptively send everybody in YOLO mode if it is at 1 ttl

        const quad = [creep, Game.getObjectById(creep.memory.privates[0]),
            Game.getObjectById(creep.memory.privates[1]),
            Game.getObjectById(creep.memory.privates[2])]

        if(!rQ.allPresent(quad)){//if quad not fully formed, yolo mode
            rQ.yolo(quad)
            return
        }

        const status = rQ.getQuadStatus(quad)

        const target = Game.getObjectById(creep.memory.target)

        for(let i = 0; i < quad.length; i++){
            if(!Cache[quad[i].room.name] || !Cache[quad[i].room.name].quadMatrix){//this can be combined with the part where we find enemies
                rQ.getRoomMatrix(quad[i].room.name)
            }
        }
        //everythingByRoom should be an object with keys being roomNames
        //values should be objects, with keys "creeps", "hostiles", "structures"
        //each of those keys will be paired with arrays
        //"creeps" will never be empty, the other two could be
        const everythingByRoom = rQ.splitEverythingByRoom(quad)
        //each creep shoots best target in room
        rQ.shoot(everythingByRoom, target)

        let needRetreat = rQ.heal(quad)//if below certain health thresholds, we might need to retreat
        if(!needRetreat){
            needRetreat = rQ.checkMelee(quad, everythingByRoom)
        }

        let retreated = false
        if(needRetreat){
            retreated = rQ.attemptRetreat(quad, everythingByRoom, status)
            //retreat may fail if there is nothing to retreat from
            //although it might be smart to move to a checkpoint if there is nothing to retreat from
        }

        //if we didn't retreat, move to target or rally point
        if(!retreated){
            rQ.advance(creep, quad, everythingByRoom, target, status)
        }

        //auto respawn can be requested directly from quad, but overarching manager should actually make it happen

        // if(creep.ticksToLive == creep.body.length * 12 + 200 && Game.flags[creep.memory.city + "quadRally"]){
        //     rQ.spawnQuad(creep.memory.city)
        // } else if(creep.hits < 200 && Game.flags[creep.memory.city + "quadRally"]){
        //     rQ.spawnQuad(creep.memory.city)
        //     creep.suicide()
        // }
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
                Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES).forEach(function(struct) {
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

    yolo: function(quad){//disband quad into harassers
        for(let i = 0; i < quad.length; i++){
            if(quad[i]){
                quad[i].memory.role = rH.name
            }
        }
    },

    allPresent: function(quad){//make sure all members are alive and above 1 ttl
        for(let i = 0; i < quad.length; i++){
            if(!quad[i] || quad[i].ticksToLive == 1){
                return false
            }
        }
        return true
    },

    splitEverythingByRoom: function(quad){
        const everythingByRoom = {}
        const creepsByRoom = _.groupBy(quad, c => c.pos.roomName)
        for(let i = 0; i < Object.keys(creepsByRoom).length; i++){
            everythingByRoom[Object.keys(creepsByRoom)[i]] = {}
            everythingByRoom[Object.keys(creepsByRoom)[i]].creeps = creepsByRoom[Object.keys(creepsByRoom)[i]]
        }
        //everyThingByRoom now has keys defined, with creep categories filled

        //now add creeps and structures based on creeps[0] in each room
        const rooms = Object.keys(everythingByRoom)
        for(let i = 0; i < rooms.length; i++){
            everythingByRoom[rooms[i]].hostiles = u.findHostileCreeps(Game.rooms[rooms[i]])
            const allStructures = u.findHostileStructures(Game.rooms[rooms[i]])
            everythingByRoom[rooms[i]].structures = _(allStructures)
                .reject(structure => [STRUCTURE_ROAD, STRUCTURE_CONTAINER]
                    .includes(structure.structureType))
                .value()

            rQ.updateMatrices(rooms[i])//update matrices while we're at it
        }
        return everythingByRoom
    },

    updateMatrices: function(roomName){
        if(!Cache[roomName] || !Cache[roomName].quadMatrix){//update matrices while we're at it
            rQ.getRoomMatrix(roomName)
        }
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

    checkMelee: function(quad, everythingByRoom){//bool
        //return true if there is a melee creep adjacent to any of the quad members
        for(const roomName of Object.values(everythingByRoom)){
            const melee = _.filter(roomName.hostiles, c => c.getActiveBodyparts(ATTACK))
            for(const member of roomName.creeps){
                for(const attacker of melee){
                    if(member.pos.isNearTo(attacker.pos) ||(member.pos.inRangeTo(attacker.pos, 2) && !attacker.fatigue)){
                        return true
                    }
                }
            }
        }
        return false
    },

    advance: function(creep, quad, everythingByRoom, target, status){
        //if no target, find a target.
        //  a target shouldn't simply be "anything that breathes".
        //  if we aren't in the destination room, a target must be impeding motion to the target room to be considered
        //  if we are in the target room, there should be a certain prioritization to killing essential structures
        //if no viable target found, move to rally flag
        const flagName = quad[0].memory.city + "quadRally"
        const flag = Memory.flags[flagName]
        if(!target){
            if(!flag || Object.keys(everythingByRoom).includes(flag.roomName)){
                const lookRoom = flag && flag.roomName || creep.pos.roomName
                const everythingInRoom = everythingByRoom[lookRoom]
                //we are at destination
                if(everythingInRoom.structures && everythingInRoom.structures.length){
                    target = everythingInRoom.creeps[0].pos.findClosestByPath(everythingInRoom.structures)
                } else if(everythingInRoom.hostiles && everythingInRoom.hostiles.length) {
                    target = everythingInRoom.creeps[0].pos.findClosestByPath(everythingInRoom.hostiles)
                } else if(flag){
                    //delete Memory.flags[flagName]
                }
            } else {
                //we are not at destination
                //only target something if it is in the way
            }
        }
        if(target){
            creep.memory.target = target.id
            rQ.move(quad, target.pos, status, 1)
        } else if(flag && flag.roomName != creep.pos.roomName) {
            rQ.move(quad, new RoomPosition(flag.x, flag.y, flag.roomName), status, 5)
        }
    },

    attemptRetreat: function(quad, everythingByRoom, status){//bool
        //retreat may fail if there is nothing to retreat from
        //although it might be smart to move to a checkpoint if there is nothing to retreat from
        let allHostiles = []
        for(let i = 0; i < Object.keys(everythingByRoom).length; i++){
            allHostiles = allHostiles.concat(Object.values(everythingByRoom)[i].hostiles)
        }
        const dangerous = _.filter(allHostiles, c => c.getActiveBodyparts(ATTACK) || c.getActiveBodyparts(RANGED_ATTACK))
        const goals = _.map(dangerous, function(c) {
            return { pos: c.pos, range: 5 }
        })
        let allTowers = []
        for(let i = 0; i < Object.keys(everythingByRoom).length; i++){
            allTowers = allTowers.concat(_.filter(Object.values(everythingByRoom)[i].structures), s => s.structureType == STRUCTURE_TOWER)
        }
        //goals = goals.concat(_.map(allTowers, function(t) { return { pos: t.pos, range: 20 } }))
        rQ.move(quad, goals, status, 0, true)
        return true
    },

    shoot: function(everythingByRoom, target){
        //prioritize creeps if the target is a structure
        //ignore creeps that are under a ramp
        //and don't forget to RMA when at melee
        //maybe even RMA if total damage dealt will be greater than RA?
        for(const roomName of Object.values(everythingByRoom)){
            const hostiles = _.filter(roomName.hostiles, hostile => !rQ.isUnderRampart(hostile))
            for(const creep of roomName.creeps){
                if(_.find(hostiles, h => h.pos.isNearTo(creep.pos)) 
                    || _.find(roomName.structures, s => s.owner && s.hits && s.pos.isNearTo(creep.pos))){
                    creep.rangedMassAttack()
                    continue
                }
                const targetInRange = target && target.pos.inRangeTo(creep.pos, 3)
                if(targetInRange && !target.structureType && !rQ.isUnderRampart(target)){
                    creep.rangedAttack(target)
                    continue
                }
                const newTarget = _.find(hostiles, h => h.pos.inRangeTo(creep.pos, 3))
                if(newTarget){
                    creep.rangedAttack(newTarget)
                    continue
                }
                if(targetInRange && target.structureType){
                    creep.rangedAttack(target)
                    continue
                }
                const structureTarget = _.find(roomName.structures, h => h.pos.inRangeTo(creep.pos, 3))
                if(structureTarget){
                    creep.rangedAttack(structureTarget)
                }
            }
        }
    },

    isUnderRampart: function(creep){
        const structures = creep.pos.lookFor(LOOK_STRUCTURES)
        if(structures.length) {
            for(let i = 0; i < structures.length; i++){
                if(structures[i].structureType == STRUCTURE_RAMPART){
                    return true
                }
            }
        }
        return false
    },

    heal: function(quad, hostiles){//bool, TODO: preheal based on positioning/intelligence
        //return true if a retreat is needed
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
        } else if(!status.roomEdge){//if not moving do an idle dance?
            const nextLocation = Math.floor(Math.random() * 3) + 1//1, 2, or 3
            for(let i = 0; i < quad.length; i++){
                let nextCreep = i + nextLocation
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
        for(let i = 0; i < route.length; i++){
            if(!rQ.getRoomMatrix(route[i].room)){
                const start = route[i-1] && route[i-1].room || leader.pos.roomName
                const exits = u.findExitPos(start, route[i].exit)
                const goals = _.map(exits, function(exit) {
                    return { pos: exit, range: 0 }
                })
                return goals
            }
        }

        //if we don't have a creep in the required room, we need to move to route[0]
        for(let i = 0; i < quad.length; i++){
            if(quad[i].pos.roomName == target.roomName){//we are already in required room
                return null
            }
        }
    },

    move: function(quad, target, status, range, retreat = false){
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
                    for (const creep of Game.rooms[roomName].find(FIND_CREEPS)) {
                        if(!_(quad).find(member => member.pos.inRangeTo(creep.pos, 3))){
                            continue
                        }
                        if(!quadNames.includes(creep.name)){
                            //quad cannot move to any pos that another creep is capable of moving to
                            if(!creep.fatigue || creep.getActiveBodyparts(ATTACK)){
                                const offset = (creep.getActiveBodyparts(ATTACK) && !creep.fatigue) ? 3 : 2
                                for(let i = Math.max(0 , creep.pos.x - offset); i < Math.min(50, creep.pos.x + (offset - 1)); i++){
                                    for(let j = Math.max(0 , creep.pos.y - offset); j < Math.min(50, creep.pos.y + (offset - 1)); j++){
                                        costs.set(i, j, 255)
                                    }
                                }
                            } else {
                                costs.set(creep.pos.x, creep.pos.y, 255)
                            }
                        }
                    }
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