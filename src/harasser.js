const settings = require("./settings")
var rH = {
    name: "harasser",
    type: "harasser",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        if(Game.time % 50 == 0){
            //check to remove flag
            rH.removeFlag(creep)
        }
        if(rH.dormant(creep)){
            return
        }
        rH.init(creep)
        const hostiles = _.filter(creep.room.find(FIND_HOSTILE_CREEPS), c => !settings.allies.includes(c.owner.username))
        rH.maybeHeal(creep, hostiles)
        if(!hostiles.length){
            if(rH.rally(creep)){
                return
            }
        }
        creep.memory.dormant = false
        const needRetreat = rH.maybeRetreat(creep, hostiles)
        if(!needRetreat && hostiles.length){
            rH.aMove(creep, hostiles)
        }
        rH.shoot(creep, hostiles)
    },

    shoot: function(creep, hostiles){
        //RMA if anybody is touching
        for(var i = 0; i < hostiles.length; i++){
            if(hostiles[i].pos.isNearTo(creep.pos)){
                creep.rangedMassAttack()
                return
            }
        }
        //if target and in range, shoot target, otherwise shoot anybody in range
        if(creep.memory.target){
            const target = Game.getObjectById(creep.memory.target)
            if(target && target.pos.inRangeTo(creep.pos, 3)){
                creep.rangedAttack(target)
                return
            }
        }
        const newTarget = creep.pos.findClosestByRange(hostiles)
        if(newTarget && newTarget.pos.getRangeTo(creep) <= 3){
            creep.rangedAttack(newTarget)
        }
    },

    dormant: function(creep){
        if(creep.memory.dormant){
            if(Game.time % 5 != 0){
                return true
            }
        }
        return false
    },

    maybeRetreat: function(creep, hostiles) {
        const attacker = _.find(hostiles, h => h.getActiveBodyparts(ATTACK) > 0
                && (h.fatigue === 0 || h.pos.isNearTo(creep.pos))
                && h.pos.inRangeTo(creep.pos, 2))
        if(attacker || creep.hits < creep.hitsMax){
            //retreat
            if(creep.saying === "hold"){
                //get less angry
                creep.memory.anger = creep.memory.anger/2
            }
            const dangerous = _.filter(hostiles, h => h.getActiveBodyparts(ATTACK) > 0 || h.getActiveBodyparts(RANGED_ATTACK) > 0)
            const goals = _.map(dangerous, function(d) {
                return { pos: d.pos, range: 8 }
            })
            const retreatPath = PathFinder.search(creep.pos, goals, {maxOps: 200, flee: true, maxRooms: 1,
                roomCallBack: function(roomName){
                    const room = Game.rooms[roomName]
                    const costs = new PathFinder.CostMatrix
                    room.find(FIND_CREEPS).forEach(function(c) {
                        costs.set(c.pos.x, c.pos.y, 0xff)
                    })

                    return costs
                }
            })
            creep.moveByPath(retreatPath.path)
            return true
        }
        return false
    },

    aMove: function(creep, hostiles){
        const attacker = _.find(hostiles, h => h.getActiveBodyparts(ATTACK) > 0
                && (h.fatigue === 0 || h.pos.isNearTo(creep.pos))
                && h.pos.inRangeTo(creep.pos, 3))
        if(attacker){
            if(creep.saying === "attack"){
                //get more angry
                creep.memory.anger++
            }
            const rand = Math.floor(Math.random() * 101)
            if(creep.memory.anger > rand){
                //give chase
                creep.say("attack")
                creep.moveTo(attacker)
            } else {
                //hold position
                creep.say("hold")
            }
        } else {
            if(creep.memory.target){
                const target = Game.getObjectById(creep.memory.target)
                if(target){
                    creep.moveTo(target, { range: 2 })
                    return
                }
            }
            const target = creep.pos.findClosestByRange(hostiles)
            creep.moveTo(target, { range: 2 })
            creep.memory.target = target.id
        }
        //move toward an enemy
    },

    removeFlag: function(creep){
        const flagName = creep.memory.city + "harass"
        if(!Game.flags[flagName]){
            return
        }
        if(creep.pos.roomName == Game.flags[flagName].pos.roomName){
            const flags = creep.room.find(FIND_FLAGS)
            for(var i = 0; i < flags.length; i++){
                if(flags[i].name.includes("deposit") || flags[i].name.includes("powerMine")){
                    return
                }
            }
            Game.flags[flagName].remove()
        }
    },

    init: function(creep){
        if(!creep.memory.target){
            creep.memory.target = null
        }
        if(!creep.memory.anger){//the more angry the creep gets, the more aggressive it'll get
            creep.memory.anger = 0//anger increases when hostiles run away, and decreases when hostiles give chase
        }
    },

    maybeHeal: function(creep, hostiles){
        const damager = _.find(hostiles, c => c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0)
        if(creep.hits < creep.hitsMax || damager){
            creep.heal(creep)
        }
    },

    rally: function(creep){
        const rallyFlag = creep.memory.city + "harasserRally"
        if (Game.flags[rallyFlag] && !creep.memory.rally){
            creep.moveTo(Game.flags[rallyFlag], {reusePath: 50})
            if (Game.flags[rallyFlag].pos.x == creep.pos.x && Game.flags[rallyFlag].pos.y == creep.pos.y && Game.flags[rallyFlag].pos.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
        } else {
            const destFlag = creep.memory.city + "harass"
            if(Game.flags[destFlag]){
                if(creep.pos.roomName === Game.flags[destFlag].pos.roomName){
                    //move to center of room
                    if(!creep.pos.inRangeTo(25, 25, 8)){
                        creep.moveTo(25, 25, {range: 5})
                    } else {
                        creep.memory.dormant = true
                        return true
                    }
                } else {
                    //move to flag
                    creep.moveTo(Game.flags[destFlag], {reusePath: 50})
                }
            }
        }
        return false
    }
   
}
module.exports = rH