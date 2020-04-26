var motion = require("../lib/motion")
var actions = require("../lib/actions")
var sq = require("../lib/spawnQueue")
var rR = require("./runner")
var u = require("../lib/utils")

var rPM = {
    name: "powerMiner",
    type: "powerMiner",
    boosts: [RESOURCE_CATALYZED_GHODIUM_ALKALIDE, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
        RESOURCE_CATALYZED_UTRIUM_ACID],

    /** @param {Creep} creep **/
    run: function(creep) {
        u.checkRoom(creep)//check if in hostile room

        if (!rPM.getBoosted(creep, rPM.boosts)){
            return
        }

        const flagName = creep.memory.city + "powerMine"
        if(!Memory.flags[flagName]){
            creep.suicide()
            return
        }
        if(creep.hits < creep.hitsMax/2){//temp drop operation if under attack
            delete Memory.flags[flagName]
            creep.suicide()
            return
        }

        let target = Game.getObjectById(creep.memory.target)//target is pBank
        if(target){
            actions.attack(creep, target)
            creep.heal(creep)
            rPM.summonRunners(creep, target) 
        } else {
            target = rPM.findBank(creep, flagName)
            if(target){//move to it
                actions.attack(creep, target)
                creep.heal(creep)
            } else if(creep.room.name != Memory.flags[flagName].roomName){ //rally
                motion.newMove(creep, new RoomPosition(Memory.flags[flagName].x, Memory.flags[flagName].y, Memory.flags[flagName].roomName), 1)
            } else {
                //if there's a flag, but no bank under it, retreat
                rPM.retreat(creep, flagName)
            }
        }
    },

    retreat: function(creep, flagName){
        if(creep.pos.inRangeTo(new RoomPosition(Memory.flags[flagName].x, Memory.flags[flagName].y, Memory.flags[flagName].roomName, 4))){
            motion.newMove(creep, new RoomPosition(25, 25, creep.pos.roomName), 5)
        }
    },

    summonRunners: function(creep, bank){
        if(!bank){
            return
        }
        if(!creep.memory.bankInfo){
            creep.memory.bankInfo = {}
            let damage = creep.getActiveBodyparts(ATTACK) * ATTACK_POWER
            if(creep.memory.boosted){
                damage = damage * BOOSTS[ATTACK][RESOURCE_CATALYZED_UTRIUM_ACID][ATTACK]
            }
            const runnersNeeded = Math.ceil(bank.power/1600)
            const distance  = motion.getRoute(Game.spawns[creep.memory.city].pos.roomName, bank.pos.roomName, true).length * 50
            const summonTime = distance + (Math.ceil(runnersNeeded/CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][8]) * MAX_CREEP_SIZE * CREEP_SPAWN_TIME)
            creep.memory.bankInfo.summonHits = summonTime * damage
            creep.memory.bankInfo.runnersNeeded = runnersNeeded
        }

        if(Game.time % 5 == 1 && bank.hits < creep.memory.bankInfo.summonHits && !creep.memory.bankInfo.runnersSummoned){
            creep.memory.bankInfo.runnersSummoned = true
            sq.initialize(Game.spawns[creep.memory.city])
            for(let i = 0; i < creep.memory.bankInfo.runnersNeeded; i++){
                sq.schedule(Game.spawns[creep.memory.city], rR.name)
            }
        }
    },

    findBank: function(creep, flagName){
        const flag = Memory.flags[flagName]
        if(flag && Game.rooms[flag.roomName]){
            const flagPos = new RoomPosition(flag.x, flag.y, flag.roomName)
            const bank = flagPos.lookFor(LOOK_STRUCTURES)
            if(bank.length){
                creep.memory.target = bank[0].id
                return bank[0]
            } else {
                //if no bank, move away
                const look = flagPos.look()
                if(look.length < 2){//terrain always shows up, so if there is anything else there, leave the flag on
                    delete Memory.flags[flagName]
                }
            }
        }
        return null
    },

    roomScan: function(creep){//not in use. Will be used for self defense / harasser summon
        if(!creep.memory.onEdge && Game.time % 20 != 0){
            return []
        }
        if(!creep.memory.onEdge){
            creep.memory.onEdge = false
        }
        const hostiles = _.filter(creep.room.find(FIND_HOSTILE_CREEPS), c => c.getActiveBodyParts(ATTACK) > 0
        || c.getActiveBodyParts(RANGED_ATTACK) > 0 || c.getActiveBodyParts(HEAL) > 0 || c.pos.isNearTo(creep.pos))
        if(!hostiles.length){
            creep.memory.onEdge = false
            return []
        }
        creep.memory.onEdge = true
        return hostiles
    },

    attackHostiles: function(creep, bank, hostiles){ //not in use. Will be used for self defense / harasser summon
        if(creep && bank && hostiles)
            return
    },

    getBoosted: function(creep, boosts){
        const alreadyBoosted = creep.memory.boosted && creep.memory.boosted >= boosts.length
        if (!creep.memory.needBoost || !alreadyBoosted) {
            return true
        }

        if(!creep.memory.boosted){
            creep.memory.boosted = 0
        }
        const boost = boosts[creep.memory.boosted]
        if(creep.spawning){
            return
        }
        const labs = Object.keys(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.receivers)
        for(const labId of labs){
            const lab = Game.getObjectById(labId)
            if(lab.mineralType == boost){
                //boost self
                if (lab.boostCreep(creep) === ERR_NOT_IN_RANGE) {
                    motion.newMove(creep, lab.pos, 1)
                } else {
                    creep.memory.boosted++
                }
                return
            }
        }
    }
}
module.exports = rPM
