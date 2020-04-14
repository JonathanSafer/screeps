var rBr = require("./breaker")
var rDM = require("./depositMiner")

var rPM = {
    name: "powerMiner",
    type: "powerMiner",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        rPM.init(creep)
        rDM.checkRoom(creep)//check if in hostile room
        const medic = Game.getObjectById(creep.memory.medic)
        if(!medic){
            if(rBr.endLife(creep)){
                return
            } else {
                rBr.medicSearch(creep)
                return
            }
        }
        const flagName = creep.memory.city + "powerMine"
        if(medic.hits < medic.hitsMax/2 || creep.hits < creep.hitsMax/2){//temp drop operation if under attack
            if(Memory.flags[flagName]){
                delete Memory.flags[flagName]
            }
        }
        const canMove = rBr.canMove(creep, medic)
        let target = Game.getObjectById(creep.memory.target)//target is pBank
        if(target){
            rPM.hitBank(creep, target)
            rPM.summonRunners(creep, target)
            if(!creep.pos.isNearTo(target) && canMove){//move to target
                creep.moveTo(target, {range: 1, reusePath: 50})
                rBr.medicMove(creep, medic)
            } else if (!medic.pos.isNearTo(creep)){
                medic.moveTo(creep, {range: 1})
            } 
        } else {
            target = rPM.findBank(creep, flagName)
            if(canMove) {
                if(target){//move to it
                    creep.moveTo(target, {range: 1, reusePath: 50})
                    rBr.medicMove(creep, medic)
                } else if(Memory.flags[flagName]){ //rally
                    if(creep.room.name != Memory.flags[flagName].roomName){
                        rBr.rally(creep, medic, flagName)
                    } else {
                        //if there's a flag, but no bank under it, retreat
                        rPM.retreat(creep, medic, flagName)
                    }
                }
            } else if (!medic.pos.isNearTo(creep)){
                medic.moveTo(creep, {range: 1})
            }
        }
        rBr.heal(creep, medic)//breaker heal should work for now
    },

    retreat: function(creep, medic, flagName){
        if(creep.pos.inRangeTo(new RoomPosition(Memory.flags[flagName].x, Memory.flags[flagName].y, Memory.flags[flagName].roomName, 4))){
            motion.newMove(medic, new RoomPosition(25, 25, medic.pos.roomName), 5)
            rBr.medicMove(medic, creep)
        }
    },

    init: function(creep){
        //initialize memory
        if(!creep.memory.medic){
            creep.memory.medic = null
        }
    },

    summonRunners: function(creep, bank){
        if(Game.time % 50 == 1 && bank && bank.hits < 600000){
            Game.spawns[creep.memory.city].memory.runner = Math.ceil(bank.power/1600)
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

    hitBank: function(creep, bank){
        if(creep.pos.isNearTo(bank.pos)){
            creep.attack(bank)
        }
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
    }


}
module.exports = rPM
