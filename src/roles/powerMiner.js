var motion = require("../lib/motion")
var sq = require("../lib/spawnQueue")
var rR = require("./runner")
var u = require("../lib/utils")
var rBr = require("./breaker")
var settings = require("../config/settings")

var rPM = {
    name: "powerMiner",
    type: "powerMiner",
    boosts: [RESOURCE_CATALYZED_GHODIUM_ALKALIDE, RESOURCE_CATALYZED_UTRIUM_ACID],

    /** @param {Creep} creep **/
    run: function(creep) {
        u.checkRoom(creep)//check if in hostile room

        if (!rPM.getBoosted(creep, rPM.boosts)){
            return
        }

        const medic = Game.getObjectById(creep.memory.medic)
        if(!medic){
            if(rBr.endLife(creep)){
                return
            } else {
                rBr.medicSearch(creep)
                return
            }
        }

        const flagName = creep.memory.flag || creep.memory.city + "powerMine"
        if(!Memory.flags[flagName]){
            creep.suicide()
            medic.suicide()
            return
        }
        if(creep.hits < creep.hitsMax/2 || medic.hits < medic.hitsMax/2){//temp drop operation if under attack
            delete Memory.flags[flagName]
            creep.suicide()
            medic.suicide()
            return
        }

        const canMove = rBr.canMove(creep, medic)

        let bank = Game.getObjectById(creep.memory.target)//target is pBank
        if(!bank) 
            bank = rPM.findBank(creep, flagName)
        const flag = Memory.flags[flagName]
        if(!flag)
            return
        if(!bank && flag.roomName != creep.pos.roomName){
            if(canMove){
                motion.newMove(creep, new RoomPosition(flag.x, flag.y, flag.roomName), 1)
            }
            rBr.medicMove(creep, medic)
            return
        }
        if(!bank){
            rPM.retreat(creep, medic, flagName)
            return
        }
        const hostile = rPM.roomScan(creep)
        if(hostile && (hostile.pos.inRangeTo(medic.pos, 3) || hostile.pos.inRangeTo(creep.pos, 3))){
            if(!creep.memory.reinforced){
                const harassFlag = u.generateFlagName(creep.memory.city + "harass")
                Memory.flags[harassFlag] = new RoomPosition(25, 25, creep.room.name)
                creep.memory.reinforced = true
            }
            creep.attack(hostile)
            rBr.heal(creep,medic)
            if(canMove)
                motion.newMove(creep, hostile.pos, 0)
            rBr.medicMove(creep, medic)
            return
        }
        rPM.hitBank(creep, medic, bank, canMove)
        if(!canMove && !medic.pos.isNearTo(creep.pos)){
            rBr.medicMove(creep, medic)
        }
    },

    hitBank: function(creep, medic, bank, canMove){
        if(canMove && !bank.pos.isNearTo(creep.pos)){
            motion.newMove(creep, bank.pos, 1)
            rBr.medicMove(creep, medic)
        }
        if(bank.pos.isNearTo(creep.pos)){
            if(creep.hits == creep.hitsMax)
                creep.attack(bank)
            medic.heal(creep)
        }
        rPM.summonRunners(creep, bank)
    },

    retreat: function(creep, medic, flagName){
        if(creep.pos.inRangeTo(new RoomPosition(Memory.flags[flagName].x, Memory.flags[flagName].y, Memory.flags[flagName].roomName, 4))){
            rBr.medicMove(medic, creep)
            motion.newMove(medic, new RoomPosition(25, 25, creep.pos.roomName), 5)
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
                sq.schedule(Game.spawns[creep.memory.city], rR.name, false, creep.memory.flag)
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
        if(!creep.memory.aware && Game.time % 5 != 0){
            return null
        }
        const hostiles = _.filter(creep.room.find(FIND_HOSTILE_CREEPS), c => settings.allies.includes(creep.owner.username) 
            && c.pos.inRangeTo(creep.pos, 9) 
            && (c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0 || c.pos.isNearTo(creep.pos)))
        if(!hostiles.length){
            creep.memory.aware = false
            return null
        }
        creep.memory.aware = true
        const closestHostile = creep.pos.findClosestByRange(hostiles)
        return closestHostile
    },

    attackHostiles: function(creep, bank, hostiles){ //not in use. Will be used for self defense / harasser summon
        if(creep && bank && hostiles)
            return
    },

    getBoosted: function(creep, boosts){
        const alreadyBoosted = creep.memory.boosted && creep.memory.boosted >= boosts.length
        if (!creep.memory.needBoost || alreadyBoosted) {
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
            if(!lab){
                continue
            }
            const type = u.getTypeFromBoost(boost)
            const unboosted = _.filter(creep.body, p => p.type == type && !p.boost).length
            const boostNeeded = LAB_BOOST_MINERAL * unboosted
            if(lab.mineralType == boost && lab.store[lab.mineralType] >= LAB_BOOST_MINERAL){
                //boost self
                if (lab.boostCreep(creep) === ERR_NOT_IN_RANGE) {
                    motion.newMove(creep, lab.pos, 1)
                } else if(lab.store[lab.mineralType] >= boostNeeded){
                    creep.memory.boosted++
                }
                return
            }
        }
    }
}
module.exports = rPM
