//const sq = require("./spawnQueue"); sq.initialize(Game.spawns['E8N60']); sq.schedule(Game.spawns['E8N60'], 'quad')
import u = require("../lib/utils")
import rU = require("../lib/roomUtils")
import cU = require("../lib/creepUtils")
import a = require("../lib/actions")
import T = require("../buildings/tower")
import settings = require("../config/settings")
import motion = require("../lib/motion")
import { cN, BodyType } from "../lib/creepNames"

const CreepState = {
    START: 1,
    BOOST: 2,
    FORM: 3,
    ENGAGE: 4,
    RALLY: 5,
    DORMANT: 6,
    PRIVATE: 7
}
const CS = CreepState

const rQ = {
    name: cN.QUAD_NAME,
    type: BodyType.quad,
    boosts: [RESOURCE_CATALYZED_GHODIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
        RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ALKALIDE],

    /** @param {Creep} creep **/
    run: function(creep: Creep) {
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
            //captain finds form up location, jimmys sign up for a jimmy slot, then go brain dead
            //captain checks roster and moves jimmys to necessary positions in formation
            rQ.formUp(creep)
            break
        case CS.ENGAGE:
            rQ.engage(creep)
            break
        case CS.RALLY:
            rQ.rally(creep)
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

    reform: function(quad, creep: Creep){
        const matrix = rQ.getRoomMatrix(creep.pos.roomName) as CostMatrix
        let formPoint = null
        let range = 0
        while(!formPoint){
            for(let i = Math.max(creep.pos.x - range, 2); i <= Math.min(creep.pos.x + range, 46); i++){
                for(let j = Math.max(creep.pos.y - range, 2); j <= Math.min(creep.pos.y + range, 46); j++)
                    if(matrix.get(i,j) < 255){
                        const look = creep.room.lookForAtArea(LOOK_CREEPS, j, i, j+1, i+1, true)
                        if(!look.length || !_.find(look, c => !c.creep.my)){
                            formPoint = new RoomPosition(i, j,creep.pos.roomName)
                            break
                        }
                    }
                if(formPoint)
                    break
            }
            range++
        }
        if(!formPoint){
            Log.info("no form point")
            return
        }
        for(let i = 0; i < quad.length; i++){
            const jimmyPos = new RoomPosition(formPoint.x, formPoint.y, formPoint.roomName)
            switch(i){
            case 0:
                break
            case 1:
                jimmyPos.y++
                break
            case 2:
                jimmyPos.x++
                jimmyPos.y++
                break
            case 3:
                jimmyPos.x++
                break
            }
            new RoomVisual(creep.room.name).text(String(i),jimmyPos)
            if(!quad[i].pos.isEqualTo(jimmyPos))
                motion.newMove(quad[i], jimmyPos)
        }
        quad[0].memory.reform = Game.time + 5
    },

    formUp: function(creep: Creep){
        //maybe creeps could make sure that their entire squad is spawned until determining a captain and forming up, until then
        //they would renew themselves (has to be done before boosting though)
        
        //form up organization:     C 0
        //(byorder in jimmy list) 1 2
        if(creep.memory.captain){
            //find meeting position
            //choose an exit, and path as close to room center as possible from that exit. 2nd to last pos on path is rally point
            let formPos = null
            if(creep.memory.rally){
                formPos = new RoomPosition(creep.memory.rally.x, creep.memory.rally.y, creep.memory.rally.roomName)
            } else {
                const matrix = rQ.getRoomMatrix(creep.pos.roomName) as CostMatrix
                let startPos = null
                const flagName = creep.memory.flag || creep.memory.city + "quadRally"
                let flagRoom = null
                if(Game.map.getRoomStatus(flagName))
                    flagRoom = flagName
                if(Memory.flags[flagName])
                    flagRoom = Memory.flags[flagName].roomName
                if(flagRoom){
                    const rallyExit = Game.map.findExit(creep.pos.roomName, flagRoom) as ExitConstant
                    startPos = _.find(creep.room.find(rallyExit), pos => matrix.get(pos.x,pos.y) == 2)
                } else {
                    startPos = _.find(creep.room.find(FIND_EXIT), pos => matrix.get(pos.x,pos.y) == 2)
                }
                const path = PathFinder.search(startPos, {pos: new RoomPosition(25, 25, creep.pos.roomName), range: 1},
                    {maxRooms: 1, roomCallback: function() { return matrix }}).path
                //TODO: if path is less than 2 in length, find a new startPos and try again

                formPos = path[Math.max(path.length - 2, 0)]
                if(path.length < 2){
                    const spawn = Game.spawns[creep.memory.city]
                    formPos = new RoomPosition(spawn.pos.x + 1, spawn.pos.y + 4, spawn.pos.roomName)
                }
                creep.memory.rally = formPos
            }
            let inLine = 0
            if(!creep.pos.isEqualTo(formPos)){
                motion.newMove(creep, formPos)
            } else {
                inLine++
            }
            for(let i = 0; i < creep.memory.jimmys.length; i++){
                const jimmyPos = new RoomPosition(formPos.x, formPos.y, formPos.roomName)
                switch(i){
                case 0:
                    jimmyPos.x++
                    break
                case 1:
                    jimmyPos.y++
                    break
                case 2:
                    jimmyPos.x++
                    jimmyPos.y++
                    break
                }
                new RoomVisual(creep.room.name).text(String(i),jimmyPos)
                const jimmy = Game.getObjectById(creep.memory.jimmys[i]) as RoomObject
                if(!jimmy){
                    continue
                }
                if(!jimmy.pos.isEqualTo(jimmyPos)){
                    motion.newMove(jimmy, jimmyPos)
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
            const captain = _.find(creep.room.find(FIND_MY_CREEPS), c => c.memory.captain && c.memory.jimmys.length < 3)
            if(captain){//sign up as a jimmy and go brain dead
                captain.memory.jimmys.push(creep.id)
                creep.memory.state = CS.PRIVATE
            } else {//if no captian, become captain
                creep.memory.captain = true
                creep.memory.jimmys = []
            }
        }
    },

    update: function(creep: Creep){
        //generic info gathering at tick start
        const quad = [creep, Game.getObjectById(creep.memory.jimmys[0]),
            Game.getObjectById(creep.memory.jimmys[1]),
            Game.getObjectById(creep.memory.jimmys[2])]

        if(!rQ.allPresent(quad)){//if quad not fully formed, yolo mode
            rQ.yolo(quad)
            return false
        }

        for(let i = 0; i < quad.length; i++){
            if(!Cache[quad[i].room.name] || !Cache[quad[i].room.name].quadMatrix){//this can be combined with the part where we find enemies
                rQ.getRoomMatrix(quad[i].room.name)
            }
        }
        const everythingByRoom = rQ.splitEverythingByRoom(quad)
        return [quad, everythingByRoom]
    },

    isSafe: function(everythingByRoom: _.Dictionary<AllRoomStuff>, quad: Creep[]/*, destination*/){
        for(let i = 0; i < quad.length; i++){
            if(quad[i].hits < quad[i].hitsMax) return false
        }
        const rooms = Object.keys(everythingByRoom)
        for(let i = 0; i < rooms.length; i++){
            const controller = Game.rooms[rooms[i]].controller
            if(controller && controller.owner && !settings.allies.includes(controller.owner.username)){
                const tower = _.find(everythingByRoom[rooms[i]].structures, struct => struct.structureType == STRUCTURE_TOWER)
                if(tower) return false
            }
            const hostile = _.find(everythingByRoom[rooms[i]].hostiles, h => (cU.getCreepDamage(h as Creep, ATTACK) > 0 || cU.getCreepDamage(h as Creep, RANGED_ATTACK) > 0) && 
                h.pos.inRangeTo(quad[0], 3) || h.pos.inRangeTo(quad[1], 3) || h.pos.inRangeTo(quad[2], 3) || h.pos.inRangeTo(quad[3], 3))
            if(hostile) return false
        }
        // const exits = Game.map.describeExits(quad[i].pos.roomName)
        // const nextExit = Game.map.findExit(quad[i].pos.roomName, destination)
        // if(exits[nextExit] == destination && )

        return true
    },

    rally: function(creep: Creep){
        //move in snake-mode
        const info = rQ.update(creep)
        if(!info) return
        const quad = info[0] as Creep[]
        const everythingByRoom = info[1] as _.Dictionary<AllRoomStuff>
        const flagName = quad[0].memory.flag || quad[0].memory.city + "quadRally"
        let flag = Memory.flags[flagName]
        if(Game.map.getRoomStatus(flagName))
            flag = new RoomPosition(25, 25, flagName)

        if(!flag || !rQ.isSafe(everythingByRoom, quad) || creep.room.name == flag.roomName || u.getRangeTo(quad[0].pos, flag as RoomPosition) < 26){
            creep.memory.safeTime = Game.time + 20
            creep.memory.state = CS.ENGAGE
            rQ.engage(creep)
            return
        }
        const flagPos = new RoomPosition(flag.x, flag.y, flag.roomName)

        motion.newMove(quad[3], quad[2].pos, 0)
        if(quad[2].pos.inRangeTo(quad[3].pos, 1) || rU.isOnEdge(quad[2].pos))
            motion.newMove(quad[2], quad[1].pos, 0)
        if(quad[1].pos.inRangeTo(quad[2].pos, 1) || rU.isOnEdge(quad[1].pos))
            motion.newMove(quad[1], quad[0].pos, 0)
        if(quad[0].pos.inRangeTo(quad[1].pos, 1) || rU.isOnEdge(quad[0].pos))
            motion.newMove(quad[0], flagPos, 23)
    },
    

    engage: function(creep: Creep){
        //TODO: check formation status. If formation is broken up, reform
        //if a member has died, go into YOLO mode
        //captain should preemptively send everybody in YOLO mode if it is at 1 ttl

        const info = rQ.update(creep)
        if(!info) return
        const quad = info[0] as Creep[]
        const everythingByRoom = info[1] as _.Dictionary<AllRoomStuff>
        const flagName = quad[0].memory.flag || quad[0].memory.city + "quadRally"
        let flag = Memory.flags[flagName]
        if(Game.map.getRoomStatus(flagName))
            flag = new RoomPosition(25, 25, flagName)

        if(flag && (!creep.memory.safeTime || creep.memory.safeTime < Game.time) && rQ.isSafe(everythingByRoom, quad) && creep.room.name != flag.roomName){
            creep.memory.state = CS.RALLY
            rQ.rally(creep)
            return
        }

        const status = rQ.getQuadStatus(quad)

        if(!status)
            rQ.reform(quad, creep)

        const target = Game.getObjectById(creep.memory.target)

        rQ.shoot(everythingByRoom, target)

        let needRetreat = rQ.heal(quad, everythingByRoom)//if below certain health thresholds, we might need to retreat
        if(!needRetreat && status){
            needRetreat = rQ.checkDamage(quad, everythingByRoom)
        }

        let retreated = false
        if(needRetreat && status){
            retreated = rQ.attemptRetreat(quad, everythingByRoom, status)
            //retreat may fail if there is nothing to retreat from
            //although it might be smart to move to a checkpoint if there is nothing to retreat from
        }

        //if we didn't retreat, move to target or rally point
        if(!retreated && status){
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
        if(Cache[roomName].quadMatrix && (Game.time % 50 != 0 || !Game.rooms[roomName])){//if there is a matrix already, just copy and return
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
                    if(struct.structureType == STRUCTURE_ROAD && costs.get(struct.pos.x, struct.pos.y) != 255){
                        costs.set(struct.pos.x, struct.pos.y, 1)
                    }
                })
                Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES).forEach(function(struct) {
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
                    if(rU.isOnEdge(new RoomPosition(i, j, roomName))){
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
                quad[i].memory.reinforced = true//keeps quad members from trying to call in a boosted harasser
                quad[i].memory.role = cN.HARASSER_NAME
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

    splitEverythingByRoom: function(quad: Creep[]): _.Dictionary<AllRoomStuff> {
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
            everythingByRoom[rooms[i]].structures = u.findHostileStructures(Game.rooms[rooms[i]])

            rQ.updateMatrices(rooms[i])//update matrices while we're at it
        }
        return everythingByRoom
    },

    updateMatrices: function(roomName){
        if(!Cache[roomName] || !Cache[roomName].quadMatrix){//update matrices while we're at it
            rQ.getRoomMatrix(roomName)
        }
    },

    findClosestByPath: function(everythingByRoom: _.Dictionary<AllRoomStuff>){
        const targets = []
        Object.keys(everythingByRoom).forEach(function (roomName) {
            if(everythingByRoom[roomName].hostiles){
                const hostiles = (_.filter(everythingByRoom[roomName].hostiles, h => !rU.isOnEdge(h.pos)) as RoomObject[]).concat(everythingByRoom[roomName].structures)
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

    getDamageTolerance: function(quad: Creep[]){
        if(!quad[0].memory.tolerance){
            const heals = quad[0].getActiveBodyparts(HEAL)
            const boostedPart = _.find(quad[0].body, part => part.type == HEAL && part.boost)
            const multiplier = boostedPart ? BOOSTS[HEAL][boostedPart.boost][HEAL] : 1
            quad[0].memory.tolerance = HEAL_POWER * multiplier * heals * 4
        }
        return quad[0].memory.tolerance
    },

    checkDamage: function(quad: Creep[], everythingByRoom: _.Dictionary<AllRoomStuff>){//bool
        //return true if there is a melee creep adjacent to any of the quad members
        let damage = rQ.getTowerDamage(quad)
        const tolerance = rQ.getDamageTolerance(quad)
        for(const roomName of Object.values(everythingByRoom)){
            const melee = _.filter(roomName.hostiles, c => c instanceof Creep && c.getActiveBodyparts(ATTACK)) as Creep[]
            const ranged = _.filter(roomName.hostiles, c => c instanceof Creep &&c.getActiveBodyparts(RANGED_ATTACK)) as Creep[]
            for(const member of roomName.creeps){
                for(const attacker of melee){
                    if(member.pos.isNearTo(attacker.pos) ||(member.pos.inRangeTo(attacker.pos, 2) && !attacker.fatigue)){
                        damage += cU.getCreepDamage(attacker, ATTACK)
                    }
                }
                for(const ranger of ranged){
                    if(member.pos.inRangeTo(ranger.pos, 3) ||(member.pos.inRangeTo(ranger.pos, 4) && !ranger.fatigue)){
                        damage += cU.getCreepDamage(ranger, RANGED_ATTACK)
                    }
                }
            }
        }
        if(damage > tolerance + 100){
            return true
        }
        return false
    },

    advance: function(creep, quad, everythingByRoom, target, status){
        //if no target, find a target.
        //  a target shouldn't simply be "anything that breathes".
        //  if we aren't in the destination room, a target must be impeding motion to the target room to be considered
        //  if we are in the target room, there should be a certain prioritization to killing essential structures
        //if no viable target found, move to rally flag
        const flagName = quad[0].memory.flag || quad[0].memory.city + "quadRally"
        let flag = Memory.flags[flagName]
        if(Game.map.getRoomStatus(flagName))
            flag = new RoomPosition(25, 25, flagName)
        if(target && rU.isOnEdge(target.pos)){
            target = null
        }
        if(!target){
            if(!flag || Object.keys(everythingByRoom).includes(flag.roomName)){
                const lookRoom = flag && flag.roomName || creep.pos.roomName
                const everythingInRoom = everythingByRoom[lookRoom]
                //we are at destination
                target = rQ.chooseNextTarget(everythingInRoom)
            }
        }
        
        // TODO: Check for creeps in area and react to them. [#153]

        if(!target && creep.memory.targetPos && creep.pos.roomName == creep.memory.targetPos.roomName){
            creep.memory.targetPos = null
        }
        if((target && target.pos) || creep.memory.targetPos){
            const pos = (target && target.pos) || new RoomPosition(creep.memory.targetPos.x, creep.memory.targetPos.y, creep.memory.targetPos.roomName)
            if(target){
                creep.memory.targetPos = target.pos
                creep.memory.target = target.id
            }
            rQ.move(quad, pos, status, 1)
        } else if(flag && !creep.pos.inRangeTo(new RoomPosition(flag.x, flag.y, flag.roomName), 8)) {
            rQ.move(quad, new RoomPosition(flag.x, flag.y, flag.roomName), status, 5)
        }
    },

    // Valuable buildings: everything except walls, ramparts, roads
    // 1. If there are valuable buildings then we need to destroy them
    // 2. Get the target based on the valuable buildings.
    chooseNextTarget: function(everythingInRoom) {
        const valuableStructures = rQ.getValuableStructures(everythingInRoom.structures)
        const creep = everythingInRoom.creeps[0]
        if (valuableStructures.length) {
            return rQ.getTarget(creep, valuableStructures, everythingInRoom.structures)
        }
        if(everythingInRoom.hostiles.length){
            return rQ.getTarget(creep, everythingInRoom.hostiles, everythingInRoom.structures)
        }
        if(everythingInRoom.structures.length){
            return everythingInRoom.structures[0]
        }
        return false
    },

    getValuableStructures: function(structures) {
        const ignoreStructures = [STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_ROAD,
            STRUCTURE_CONTAINER]
        return _(structures)
            .filter(structure => !ignoreStructures.includes(structure.structureType))
            .value()
    },

    // Find an attack vector to a building based on the lowest hits required
    getTarget: function(creep: Creep, valuableStructures: Structure[], structures: Structure[]) {
        const result = PathFinder.search(creep.pos, _.map(valuableStructures, function(e) {
            return { pos: e.pos, range: 0 }}), {
            plainCost: 1,
            swampCost: 1,
            maxOps: 10000,
            roomCallback: (roomName) => {
                const room = Game.rooms[roomName]
                if (!room || roomName != creep.room.name) return false

                // 2 times largest building since quad is 2 wide
                const maxHits = 2 * _(structures).max("hits").hits
                const costs = new PathFinder.CostMatrix

                // count structure 4 times since quad will hit it in 4 positions
                // the path is relative to the top left creep, __ so a structure in the
                // bottom right needs to be counted against a  _S path through the top left
                for (const structure of structures) {
                    for (const pos of [[0, 0], [0, -1], [-1, 0], [-1, -1]]) {
                        const x = structure.pos.x + pos[0]
                        const y = structure.pos.y + pos[1]
                        const oldCost = costs.get(x, y)
                        const cost = rQ.getCost(structure.hits, maxHits, oldCost)
                        costs.set(x, y, cost)
                    }
                }

                const terrain = new Room.Terrain(roomName)
                for(let i = 0; i < 50; i++){
                    for(let j = 0; j < 50; j++){
                        const tile = terrain.get(i, j)
                        const weight = tile & TERRAIN_MASK_WALL  ? 255 : 1
                        costs.set(i, j, Math.max(costs.get(i,j), weight))//high hp should never be overridden by terrain
                        costs.set(Math.max(i - 1, 0), j, Math.max(costs.get(Math.max(i - 1, 0),j), weight))
                        costs.set(Math.max(i - 1, 0), Math.max(j - 1, 0), Math.max(costs.get(Math.max(i - 1, 0), Math.max(j - 1, 0)), weight))
                        costs.set(i, Math.max(j - 1, 0), Math.max(costs.get(i, Math.max(j - 1, 0)), weight))
                    }
                }
                for(const struct of valuableStructures){//destinations reset to walkable in case they got labelled as a terrain wall
                    const obstacles = struct.pos.lookFor(LOOK_STRUCTURES)
                    let totalHits = 0
                    for(const obstacle of obstacles){
                        totalHits += obstacle.hits
                    }
                    costs.set(struct.pos.x, struct.pos.y, rQ.getCost(totalHits, maxHits, 1))
                }
                return costs
            }
        })
        if (result.incomplete || !result.path.length) return false
        
        const path = result.path
        
        const wallInPath = rQ.getWallInQuadPath(creep.room, path)
        if (wallInPath) {
            return wallInPath
        }

        // if nothing is in our path then return the target at the end of the path
        const targetPos = path.pop()
        const targets = (targetPos.lookFor(LOOK_CREEPS) as RoomObject[]).concat(targetPos.lookFor(LOOK_STRUCTURES))
        const target = _(targets).min("hits")
        return target
    },

    // Find the first wall in our path and select it
    getWallInQuadPath: function(room: Room, path) {
        if(u.isFriendlyRoom(room))
            return null
        const blockingStructures: string[] = [STRUCTURE_WALL, STRUCTURE_RAMPART]
        return _(path)
            .map(pos => rQ.getOverlappingStructures(room, pos))
            .flatten<Structure>()
            .find(structure => blockingStructures.includes(structure.structureType))
    },

    getOverlappingStructures: function(room: Room, pos) {
        const quadPoses = [[0, 0], [0, 1], [1, 0], [1, 1]]
        return _(quadPoses)
            .map(quadPos => room.lookForAt(LOOK_STRUCTURES, 
                Math.min(pos.x + quadPos[0], 49), 
                Math.min(pos.y + quadPos[1], 49)))
            .flatten<Structure>()
            .value()
    },

    // get a score between 1 and 254. 255 is "blocked" & 0 is "free" so we don't want these
    getCost: function(hits, maxHits, oldCost) {
        const ratio = Math.round(255 * hits / maxHits)
        return Math.max(1, Math.min(oldCost + ratio, 254)) // 0 < ratio < 255
    },

    getTowerDamage: function(quad){
        const matrix = rQ.getDamageMatrix(quad[0].room.name)
        if(matrix){
            return Math.max(Math.max(matrix.get(quad[0].pos.x,quad[0].pos.y),matrix.get(quad[1].pos.x,quad[1].pos.y)),
                Math.max(matrix.get(quad[2].pos.x,quad[2].pos.y),matrix.get(quad[3].pos.x,quad[3].pos.y)))
        }
        return 0
    },

    attemptRetreat: function(quad: Creep[], everythingByRoom: _.Dictionary<AllRoomStuff>, status: QuadStatus){//bool
        //retreat may fail if there is nothing to retreat from
        //although it might be smart to move to a checkpoint if there is nothing to retreat from
        let allHostiles = []
        for(let i = 0; i < Object.keys(everythingByRoom).length; i++){
            allHostiles = allHostiles.concat(Object.values(everythingByRoom)[i].hostiles)
        }
        const dangerous = _.filter(allHostiles, c => !c.level && (c.getActiveBodyparts(ATTACK) || c.getActiveBodyparts(RANGED_ATTACK)))
        let goals = _.map(dangerous, function(c) {
            return { pos: c.pos, range: 5 }
        })
        let allTowers = []
        for(const everythingInRoom of Object.values(everythingByRoom)){
            allTowers = allTowers.concat(_.filter(everythingInRoom.structures, s => s.structureType == STRUCTURE_TOWER))
        }
        goals = goals.concat(_.map(allTowers, function(t) { return { pos: t.pos, range: 20 } }))
        rQ.move(quad, goals, status, 0, true)
        return true
    },

    shoot: function(everythingByRoom: _.Dictionary<AllRoomStuff>, target: RoomObject){
        //prioritize creeps if the target is a structure
        //ignore creeps that are under a ramp
        //and don't forget to RMA when at melee
        //maybe even RMA if total damage dealt will be greater than RA?
        for(const roomName of Object.values(everythingByRoom)){
            const hostiles = _.filter(roomName.hostiles, hostile => !rQ.isUnderRampart(hostile))
            for(const creep of roomName.creeps){
                if(_.find(hostiles, h => h.pos.isNearTo(creep.pos)) 
                    || _.find(roomName.structures, s => s instanceof OwnedStructure && s.hits && s.pos.isNearTo(creep.pos))){
                    creep.rangedMassAttack()
                    cU.logDamage(creep, creep.pos, true)
                    continue
                }
                const targetInRange = target && target.pos.inRangeTo(creep.pos, 3)
                if(targetInRange && !(target instanceof Structure) && !rQ.isUnderRampart(target)){
                    creep.rangedAttack(target as Structure)
                    cU.logDamage(creep, target.pos)
                    continue
                }
                const newTarget = _.find(hostiles, h => h.pos.inRangeTo(creep.pos, 3))
                if(newTarget){
                    creep.rangedAttack(newTarget)
                    cU.logDamage(creep, newTarget.pos)
                    continue
                }
                if(targetInRange && target instanceof Structure){
                    creep.rangedAttack(target)
                    cU.logDamage(creep, target.pos)
                    continue
                }
                const structureTarget = _.find(roomName.structures, h => h.pos.inRangeTo(creep.pos, 3))
                if(structureTarget){
                    creep.rangedAttack(structureTarget)
                    cU.logDamage(creep, structureTarget.pos)
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

    heal: function(quad: Creep[], everythingByRoom: _.Dictionary<AllRoomStuff>){//bool, TODO: preheal based on positioning/intelligence
        //return true if a retreat is needed
        let hostiles = []
        for(const roomName of Object.values(everythingByRoom)){
            hostiles = hostiles.concat(roomName.hostiles)
        }
        const damaged = _.min(quad, "hits")
        if(damaged.hits < damaged.hitsMax * 0.9){
            for(let i = 0; i < quad.length; i++){
                quad[i].heal(damaged)
            }
        } else if(hostiles.length || damaged.hits < damaged.hitsMax){
            for(let i = 0; i < quad.length; i++){
                quad[i].heal(quad[i])
            }
        }
        if(damaged.hits < damaged.hitsMax * 0.85){
            return true
        }
        return false
    },

    moveByPath: function(leader, quad: Creep[], path, status){
        for(let i = 0; i < quad.length; i++){
            if(quad[i].fatigue || !quad[i].getActiveBodyparts(MOVE)){
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
        } else if(!status.roomEdge && (Game.cpu.bucket > 9000 || _.find(quad, c => c.hits < c.hitsMax))){//if not moving do an idle dance?
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

    longRangeToLocal: function(quad: Creep[], leader, target){
        const route = Game.map.findRoute(leader.pos.roomName, target.roomName, {
            routeCallback(roomName) {
                let returnValue = 2
                if(Game.map.getRoomStatus(roomName).status != "normal") {
                    returnValue = Infinity
                } else {
                    const parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName)
                    const isHighway = (parseInt(parsed[1]) % 10 === 0) || 
                                    (parseInt(parsed[2]) % 10 === 0)
                    const isMyRoom = Game.rooms[roomName] &&
                        Game.rooms[roomName].controller &&
                        Game.rooms[roomName].controller.my
                    if (isHighway || isMyRoom) {
                        returnValue = 1
                    } else if(Cache[roomName] && Cache[roomName].enemy){
                        returnValue = 20
                    } else {
                        returnValue = 2
                    }
                }
                if(rQ.getRoomMatrix(roomName)){
                    returnValue = returnValue * 0.8
                }
                return returnValue
            }
        })
        if(route == -2){
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

    move: function(quad: Creep[], target, status, range, retreat = false){
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
        if(range == 1){
            range = 2
            if(status.leader.pos.inRangeTo(target, 2)
            && _.every(quad, member => !member.pos.isNearTo(target))){
                range = 1
            }
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
                        if(!status.sameRoom && status.leader.pos.roomName != roomName && quad[i].pos.roomName == roomName && !rU.isOnEdge(quad[i].pos)){
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
                                const tolerance = 1
                                if(Math.abs(direction - status.roomEdge) != 4 && Math.abs(direction - status.roomEdge) > tolerance && (!tolerance || Math.abs(direction - status.roomEdge) != 7)){
                                    //because TOP == 1 and TOP_LEFT == 8, a difference of 7 actually signals adjacency
                                    //unwalkable
                                    costs.set(leader.pos.x + i, leader.pos.y + j, 255)
                                }
                            }
                        }
                    }
                }
                if(Game.rooms[roomName]){
                    //if we have vision, add creeps to matrix, otherwise just return it plain
                    const quadNames = []
                    for(let i = 0; i < quad.length; i++){
                        quadNames.push(quad[i].id)
                    }
                    for (const creep of Game.rooms[roomName].find(FIND_CREEPS)) {
                        if(!_(quad).find(member => member.pos.inRangeTo(creep.pos, 8))
                            || (!settings.allies.includes(creep.owner.username) && !_(quad).find(member => member.pos.inRangeTo(creep.pos, 3)))){
                            continue
                        }
                        if(!quadNames.includes(creep.id)){
                            //quad cannot move to any pos that another creep is capable of moving to
                            const attackThreat = cU.getCreepDamage(creep, ATTACK) > rQ.getDamageTolerance(quad)
                            const offset = attackThreat && !creep.fatigue ? 3 :
                                attackThreat ? 2 : 1
                            for(let i = Math.max(0 , creep.pos.x - offset); i < Math.min(50, creep.pos.x + offset); i++){
                                for(let j = Math.max(0 , creep.pos.y - offset); j < Math.min(50, creep.pos.y + offset); j++){
                                    costs.set(i, j, 255)
                                }
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
                //if retreating, block off exits
                if(retreat){
                    for(let i = 0; i < 50; i++){
                        costs.set(i, 0, 255)
                        costs.set(i, 48, 255)
                        costs.set(0, i, 255)
                        costs.set(48, i, 255)
                    }
                }
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
            if(rU.isOnEdge(quad[i].pos)){//if a creep from the squad is on an edge, it can determine which edge we are on
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
        if(!leader)
            return null
        if(!roomEdge)
            for(let i = 0; i < quad.length; i++)
                for(let j = i;j < quad.length; j++)
                    if(!quad[i].pos.isNearTo(quad[j].pos))
                        return null
        if(roomEdge && quad[0].memory.reform && quad[0].memory.reform > Game.time){
            return null
        }

        const result: QuadStatus = {}

        result.leader = leader
        result.roomEdge = roomEdge
        //if all of the creeps in the squad are in the highest room, they must all be in the same room
        result.sameRoom = highRoom.length >= quad.length
        return result
    }    
}
export = rQ