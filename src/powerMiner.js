var rBr = require("./breaker")

var rPM = {
    name: "powerMiner",
    type: "powerMiner",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        rPM.init(creep)
        const medic = Game.getObjectById(creep.memory.medic)
        if(!medic){
            if(rBr.endLife(creep)){
                return
            } else {
                rBr.medicSearch(creep)
                return
            }
        }
        if(medic.hits < medic.hitsMax/2 || creep.hits < creep.hitsMax/2){//temp drop operation if under attack
            if(Game.flags[creep.memory.city + "powerMine"]){
                Game.flags[creep.memory.city + "powerMine"].remove()
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
            }
        } else {
            const flag = creep.memory.city + "powerMine"
            target = rPM.findBank(creep, flag)
            if(canMove) {
                if(target){//move to it
                    creep.moveTo(target, {range: 1, reusePath: 50})
                    rBr.medicMove(creep, medic)
                } else { //rally
                    rBr.rally(creep, medic, flag)
                }
            }
        }
        rBr.heal(creep, medic)//breaker heal should work for now
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

    findBank: function(creep, flag){
        if(Game.flags[flag] && Game.flags[flag].room){
            const bank = Game.flags[flag].pos.lookFor(LOOK_STRUCTURES)
            if(bank.length){
                return bank[0]
            } else {
                const look = Game.flags[flag].pos.look()
                if(look.length < 3){
                    Game.flags[flag].remove()
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
