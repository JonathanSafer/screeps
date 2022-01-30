import u = require("../lib/utils")
import rU = require("../lib/roomUtils")
import cU = require("../lib/creepUtils")
import settings = require("../config/settings")
import rMe = require("./medic")
import motion = require("../lib/motion")
import actions = require("../lib/actions")
import rQ = require("./quad")

var rBr = {
    name: cU.BREAKER_NAME,
    type: "breaker",
    boosts: [RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
        RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ACID],

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.needBoost && !creep.memory.boosted){
            return actions.getBoosted(creep)
        }
        cU.updateCheckpoints(creep)
        rBr.init(creep)
        const medic = Game.getObjectById(creep.memory.medic)
        if(!medic){
            if(rBr.endLife(creep)){
                return
            } else {
                rBr.medicSearch(creep)
                return
            }
        }
        //breaker has a medic
        const canMove = rBr.canMove(creep, medic)
        let target = Game.getObjectById(creep.memory.target)
        const targetFlag = Memory.flags[creep.memory.city + "breakTarget"]
        if(targetFlag){
            if(Game.rooms[targetFlag.roomName]){
                const structures = Game.rooms[targetFlag.roomName].lookForAt(LOOK_STRUCTURES, targetFlag.x, targetFlag.y)
                if(structures.length){
                    target = structures[0]
                } else{
                    delete Memory.flags[creep.memory.city + "breakTarget"]
                }
            }
        }
        //attempt to break target,
        //if target is not in range and there is another valid target in range, break new valid target
        //if target cannot be pathed to, choose new target to be saved as target
        rBr.breakStuff(creep, target)
        if(!rBr.maybeRetreat(creep, medic, canMove)){
            rBr.advance(creep, medic, target, canMove)
        }
        rBr.heal(creep, medic)
    },

    init: function(creep){
        //initialize memory
        if(!creep.memory.medic){
            creep.memory.medic = null
        }
    },

    endLife: function(creep) {
        // if creep had a medic but no longer does then suicide
        if(creep.memory.medic){
            creep.suicide()
            return true
        }
        return false
    },

    medicSearch: function(creep){
        //find single medics in your neighborhood
        const creeps = creep.room.find(FIND_MY_CREEPS)
        let medic
        if(creep.memory.boosted && creep.memory.role == rBr.name){
            medic = _.find(creeps, c => c.memory.role == rMe.name && !c.memory.partner && c.memory.boosted)
        } else {
            medic = _.find(creeps, c => c.memory.role == rMe.name && !c.memory.partner && !c.memory.needBoost)
        }
        if(medic){
            medic.memory.partner = creep.id
            creep.memory.medic = medic.id
        }
    },

    canMove: function(creep, medic){
        //can only move if both creeps are not fatigued OR one of the creeps is on a room edge
        if((creep.pos.isNearTo(medic) && !creep.fatigue && !medic.fatigue) || rU.isOnEdge(creep.pos) || rU.isOnEdge(medic.pos)){
            return true
        } else {
            return false
        }
    },

    breakStuff: function(creep, target) {
        if(target && target.pos.isNearTo(creep.pos)){
            creep.dismantle(target)
            return
            // if next to target, break it
        }
        // if next to enemy structure, break it
        if(creep.room.controller && (creep.room.controller.owner && settings.allies.includes(creep.room.controller.owner.username)
            || creep.room.controller.reservation && settings.allies.includes(creep.room.controller.reservation.username)))
            return
        const structures = creep.room.lookForAtArea(LOOK_STRUCTURES,
            Math.max(0, creep.pos.y - 1),
            Math.max(0, creep.pos.x - 1),
            Math.min(49, creep.pos.y + 1),
            Math.min(49, creep.pos.x + 1), true) //returns an array of structures
        if(structures.length){
            creep.dismantle(structures[0].structure)
        }
    },

    maybeRetreat: function(creep, medic, canMove){//always back out (medic leads retreat)
        const checkpoint = creep.memory.checkpoints && new RoomPosition(creep.memory.checkpoints[0].x,
            creep.memory.checkpoints[0].y,
            creep.memory.checkpoints[0].roomName)
        if(!creep.memory.tolerance){
            const heals = medic.getActiveBodyparts(HEAL)
            creep.memory.tolerance = HEAL_POWER * (creep.memory.boosted ? heals * BOOSTS[HEAL][RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE][HEAL]: heals)
        }
        //retreat if necessary
        //if retreating, determine when it is safe to resume attack
        //possibly use avoid towers
        const hostiles = u.findHostileCreeps(creep.room)
        let damage = 0
        const duo = [creep, medic]


        const melee = _.filter(hostiles, c => c instanceof Creep && c.getActiveBodyparts(ATTACK)) as Creep[]
        const ranged = _.filter(hostiles, c => c instanceof Creep && c.getActiveBodyparts(RANGED_ATTACK)) as Creep[]
        for(const member of duo){
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


        if((damage > creep.memory.tolerance || creep.hits < creep.hitsMax * .9 || medic.hits < medic.hitsMax * .9) && checkpoint && canMove){
            motion.newMove(medic, checkpoint, 1)
            rBr.medicMove(medic, creep)
            return true
        }
        return false
    },

    advance: function(creep, medic, target, canMove){
        if(!canMove && !medic.pos.isNearTo(creep)){
            medic.moveTo(creep, {range: 1})
            return
        }
        if(!canMove) return
        if(target){
            if(target.pos.isNearTo(creep)){
                return //nothing to do if already at target
            }
            if(creep.moveTo(target, {range: 1}) == ERR_NO_PATH){
                //no path to target => find new target
                rBr.findTarget(creep, medic)
                return
            }
            rBr.medicMove(creep, medic) //move medic
            return
        }
        //find new target or follow rally path
        rBr.findTarget(creep,medic)
        // TODO if no target, follow rally path, and attempt to acquire targets along the way
        //if breaker peeks into a room and there is no clear path to every exit,
        // clear a path to every exit before continuing the rally
    },

    getTarget: function(creep, valuableStructures: Structure[], structures: Structure[]){
        const result = PathFinder.search(creep.pos, _.map(valuableStructures, function(e) {
            return { pos: e.pos, range: 0 }}), {
            plainCost: 1,
            swampCost: 1,
            maxRooms: 1,
            roomCallback: (roomName) => {

                const maxHits = _(structures).max("hits").hits
                const costs = new PathFinder.CostMatrix

                // count structure 4 times since quad will hit it in 4 positions
                // the path is relative to the top left creep, __ so a structure in the
                // bottom right needs to be counted against a  _S path through the top left
                const terrain = new Room.Terrain(roomName)
                for (const structure of structures) {
                    const oldCost = costs.get(structure.pos.x, structure.pos.y)
                    const cost = rQ.getCost(structure.hits, maxHits, oldCost)
                    costs.set(structure.pos.x, structure.pos.y, cost)
                    if(terrain.get(structure.pos.x, structure.pos.y) & TERRAIN_MASK_WALL)
                        costs.set(structure.pos.x, structure.pos.y, 254)//targettable but otherwise essentially impassable
                }
                const creeps = Game.rooms[roomName].find(FIND_CREEPS)
                for(const c of creeps){
                    costs.set(c.pos.x, c.pos.y, 255)
                }
                return costs
            }
        })
        if (result.incomplete) return false

        const path = result.path

        const wallInPath = rBr.getWallInPath(path)
        if (wallInPath) {
            return wallInPath
        }

        // if nothing is in our path then return the target at the end of the path
        const targetPos = path.pop()
        if(!targetPos) return false
        const targets = targetPos.lookFor(LOOK_STRUCTURES)
        const target = _(targets).min("hits")
        return target
    },

    getWallInPath: function(path: RoomPosition[]) {
        const blockingStructures = [STRUCTURE_WALL, STRUCTURE_RAMPART]
        return _(path)
            .map<Structure[]>(pos => pos.lookFor(LOOK_STRUCTURES))
            .flatten<Structure>()
            .find(structure => (blockingStructures as string[]).includes(structure.structureType))
    },

    findTarget: function(creep: Creep, medic){
        const flag = creep.memory.city + "break"
        const structures = creep.room.find(FIND_STRUCTURES, {
            filter: structure => structure.hits && 
            (!(structure instanceof OwnedStructure) || !settings.allies.includes(structure.owner.username))
        })
        if(!Memory.flags[flag] || creep.pos.roomName == Memory.flags[flag].roomName){
            //we are in destination room, target "valuable" structures
            const valuableStructures = rQ.getValuableStructures(structures)
            if (valuableStructures.length) {
                const target = rBr.getTarget(creep, valuableStructures, structures)
                creep.memory.target = target ? target.id : Log.error(`Error target not found ${creep.name}`)
                return
            }
            if (structures.length) {
                const target = rBr.getTarget(creep, structures, structures)
                creep.memory.target = target ? target.id : Log.error(`Error target not found ${creep.name}`)
                return
            }
        }
        if(Memory.flags[flag] && creep.room.name == Memory.flags[flag].roomName && !structures.length){
            delete Memory.flags[flag]
        }
        //if in a friendly room or my room, ignore structures and rally. Else, set nearest structure as target
        if(creep.room.controller && creep.room.controller.owner
                && (settings.allies.includes(creep.room.controller.owner.username)
                || creep.room.controller.my)){
            rBr.rally(creep, medic, flag)
        } else {
            rBr.rally(creep, medic, flag)//no valid targets, attempt to continue rally
        }
    },

    rally: function(creep, medic, flagName){
        const flag = Memory.flags[flagName]
        if(flag && creep.room.name != flag.roomName){
            motion.newMove(creep, new RoomPosition(flag.x, flag.y, flag.roomName), 24)
            rBr.medicMove(creep, medic)
        }
    },

    medicMove: function(creep, medic){
        if(medic.pos.isNearTo(creep.pos)){
            medic.move(medic.pos.getDirectionTo(creep))
        } else {
            motion.newMove(medic, creep.pos, 1)
        }
    },

    heal: function(creep, medic){
        //placeholder logic
        //if creep is in an owned room, heal. Else, only heal if hurt
        if(creep.pos.roomName == medic.pos.roomName){
            if(medic.hits < 0.6 * medic.hitsMax){
                medic.heal(medic)
            } else if(creep.hits < creep.hitsMax){
                medic.heal(creep)
            } else if(medic.hits < medic.hitsMax){
                medic.heal(medic)
            } else if(medic.room.controller && medic.room.controller.owner && !medic.room.controller.my){
                medic.heal(medic)
            }
        } else {
            medic.heal(medic)
        }
    }
}
export = rBr
