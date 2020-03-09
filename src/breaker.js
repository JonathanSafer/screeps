var u = require("./utils")
var settings = require("./settings")
var rMe = require("./medic")

var rBr = {
    name: "breaker",
    type: "breaker",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        u.updateCheckpoints(creep)
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
        const target = Game.getObjectById(creep.memory.target)
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
        const medic = _.find(creeps, c => c.memory.role == rMe.name && !c.memory.partner)
        if(medic){
            medic.memory.partner = creep.id
            creep.memory.medic = medic.id
        }
    },

    canMove: function(creep, medic){
        //can only move if both creeps are not fatigued OR one of the creeps is on a room edge
        if((creep.pos.isNearTo(medic) && !creep.fatigue && !medic.fatigue) || u.isOnEdge(creep.pos) || u.isOnEdge(medic.pos)){
            return true
        } else {
            return false
        }
    },

    breakStuff: function(creep, target) {
        const flagName = creep.memory.city + "break"
        const reachedFlag = creep.pos.roomName == Memory.flags[flagName].roomName
        if(target && target.pos.isNearTo(creep.pos)){
            creep.dismantle(target)
            return
            // if next to target, break it
        }
        // if room is claimed by us, stop coming
        if(creep.room.controller && creep.room.controller.my){
            if (reachedFlag) delete Memory.flags[flagName]
            return
        }
        // if next to enemy structure, break it
        const structures = creep.room.lookForAtArea(LOOK_STRUCTURES, 
            Math.max(0, creep.pos.y - 1),
            Math.max(0, creep.pos.x - 1), 
            Math.min(49, creep.pos.y + 1), 
            Math.min(49, creep.pos.x + 1), true) //returns an array of structures
        if(structures.length){
            creep.dismantle(structures[0].structure)
        } else if (reachedFlag) {
            delete Memory.flags[flagName]
        }
    },

    maybeRetreat: function(creep, medic, canMove){//always back out (medic leads retreat)
        //retreat if necessary
        //if retreating, determine when it is safe to resume attack
        //possibly use avoid towers
        if(creep && medic && canMove){//placeholder
            return false
        }
        //for now we never retreat
        return false
    },

    advance: function(creep, medic, target, canMove){
        if(!canMove && !medic.pos.isNearTo(creep)){
            medic.moveTo(creep, {range: 1})
            return
        }
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

    findTarget: function(creep, medic){
        const flag = creep.memory.city + "break"
        const structures = creep.room.find(FIND_STRUCTURES, {
            filter: structure => [STRUCTURE_WALL, STRUCTURE_RAMPART].includes(structure.structureType)
        })
        //if in a friendly room or my room, ignore structures and rally. Else, set nearest structure as target
        if(creep.room.controller && creep.room.controller.owner 
                && (settings.allies.includes(creep.room.controller.owner.username) 
                || creep.room.controller.my)){
            rBr.rally(creep, medic, flag)
        } else {
            const target = creep.pos.findClosestByPath(structures, {range: 1})
            if(target){
                creep.moveTo(target, {range: 1})
                rBr.medicMove(creep, medic)
            } else {
                rBr.rally(creep, medic, flag)//no valid targets, attempt to continue rally
            }
        }
    },

    rally: function(creep, medic, flagName){
        const flag = Memory.flags[flagName]
        if(flag && creep.room.name != flag.roomName){
            u.multiRoomMove(creep, new RoomPosition(flag.x, flag.y, flag.roomName), true)
            rBr.medicMove(creep, medic)
        }
    },

    medicMove: function(creep, medic){
        if(medic.pos.isNearTo(creep.pos)){
            medic.move(medic.pos.getDirectionTo(creep))
        } else {
            medic.moveTo(creep, {range: 1})
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
            } else if(medic.room.controller && medic.room.controller.owner){
                medic.heal(medic)
            }
        } else {
            medic.heal(medic)
        }
    } 
}
module.exports = rBr