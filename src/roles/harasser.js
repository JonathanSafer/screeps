const settings = require("../config/settings")
const motion = require("../lib/motion")
const sq = require("../lib/spawnQueue")

var rH = {
    name: "harasser",
    type: "harasser",
   

    /** @param {Creep} creep **/
    run: function(creep) {
        if(Game.time % 51 == 0){
            //check to remove flag and respawn
            rH.removeFlag(creep)
            if(Memory.flags[creep.memory.city + "harass"] && !creep.memory.respawnTime){
                const route = motion.getRoute(Memory.flags[creep.memory.city + "harass"].roomName, Game.spawns[creep.memory.city].room.name, true)
                if(route && route.length){
                    creep.memory.respawnTime = (route.length * 50) + (creep.body.length * CREEP_SPAWN_TIME)
                }
            }
        }
        if(creep.memory.respawnTime && creep.ticksToLive == creep.memory.respawnTime && Memory.flags[creep.memory.city + "harass"]){
            const reinforcement = _.find(creep.room.find(FIND_MY_CREEPS), c => c.memory.role == rH.name && c.name != creep.name)
            if(!reinforcement){
                sq.respawn(creep)
            }
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
        if(!Memory.flags[flagName]){
            return
        }
        if(creep.pos.roomName == Memory.flags[flagName].roomName){
            const flags = Object.keys(Memory.flags)
            for(var i = 0; i < flags.length; i++){
                if(!flags[i].includes("harass") && Memory.flags[flags[i]].roomName == creep.pos.roomName){
                    return
                }
            }
            delete Memory.flags[flagName]
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
        const rallyFlagName = creep.memory.city + "harasserRally"
        const flag = Memory.flags[rallyFlagName]
        if (flag && !creep.memory.rally){
            creep.moveTo(new RoomPosition(flag.x, flag.y, flag.roomName), {reusePath: 50})
            if (flag.x == creep.pos.x && flag.y == creep.pos.y && flag.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
        } else {
            const destFlagName = creep.memory.city + "harass"
            const dFlag = Memory.flags[destFlagName]
            if (dFlag){
                if(creep.pos.roomName === dFlag.roomName){
                    //move to center of room
                    if(!creep.pos.inRangeTo(25, 25, 8)){
                        creep.moveTo(25, 25, {range: 5})
                    } else {
                        creep.memory.dormant = true
                        return true
                    }
                } else {
                    //move to flag
                    motion.newMove(creep, new RoomPosition(dFlag.x, dFlag.y, dFlag.roomName), 5)
                }
            }
        }
        return false
    }
   
}
module.exports = rH