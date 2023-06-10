import motion = require("../lib/motion")
import sq = require("../lib/spawnQueue")
import u = require("../lib/utils")
import cU = require("../lib/creepUtils")
import military = require("../managers/military")
import { cN, BodyType } from "../lib/creepNames"

const rH = {
    name: cN.HARASSER_NAME,
    type: BodyType.harasser,
    boosts: [RESOURCE_CATALYZED_GHODIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
        RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ALKALIDE],

    run: function(creep: Creep) {
        if(cU.maybeBoost(creep)) // get boosted if needed
            return

        const flagName = creep.memory.flag || creep.memory.city + "harass"

        rH.maybeRespawn(creep, flagName)

        if(rH.dormant(creep))
            return
        
        rH.init(creep)

        const hostiles = _.filter(creep.room.find(FIND_HOSTILE_CREEPS), c => !Memory.settings.allies.includes(c.owner.username))
        
        rH.maybeHeal(creep, hostiles)
        
        if(hostiles.length){
            creep.memory.dormant = false

            if(creep.memory.target && Game.getObjectById(creep.memory.target) && Game.getObjectById(creep.memory.target) instanceof Structure)
                creep.memory.target = null

            const needRetreat = rH.maybeRetreat(creep, hostiles)

            if(!needRetreat && (hostiles.length || Game.getObjectById(creep.memory.target)))
                rH.aMove(creep, hostiles)
            rH.shoot(creep, hostiles)
        } else {
            if(rH.rally(creep, flagName))
                return

            const injuredFriendlies = _.filter(u.findFriendlyCreeps(creep.room), c => c.hits < c.hitsMax)
            if(injuredFriendlies.length)
                return rH.healFriend(creep, injuredFriendlies[0])
            
            const hostileStructures = u.findHostileStructures(creep.room)
            if(hostileStructures.length)
                return rH.attackStruct(creep, hostileStructures[0])
            // go dormant
            rH.goDormant(creep)
        }
    },

    goDormant: function(creep: Creep){
        const roomCenter = new RoomPosition(25, 25, creep.room.name)
        if(creep.pos.inRangeTo(roomCenter, 10))
            creep.memory.dormant = true
        motion.newMove(creep, roomCenter, 9)
    },

    healFriend: function(creep: Creep, friend: Creep | PowerCreep){
        creep.pos.isNearTo(friend.pos) ? creep.heal(friend) : creep.rangedHeal(friend)
        motion.newMove(creep, friend.pos, 0)
    },

    attackStruct: function(creep: Creep, struct: Structure){
        creep.rangedAttack(struct)
        motion.newMove(creep, struct.pos, 3)
    },
    // Respawn if damaged or dying of old age. Don't respawn if flag is missing.
    maybeRespawn: function(creep: Creep, flagName: string){
        if(!Memory.flags[flagName])
            return

        // respawn if damaged
        if(creep.hits < creep.hitsMax * 0.2 && !creep.memory.reinforced){
            creep.memory.reinforced = true
            sq.respawn(creep, true)

            // add a quad if claiming
            if(Memory.flags["claim"] && creep.room.name == Memory.flags["claim"].roomName)
                military.spawnQuad(creep.memory.city, true, creep.room.name)
        }

        // update TTL to respawn if needed
        if(!creep.memory.respawnTime){
            const route = motion.getRoute(Memory.flags[flagName].roomName, Game.spawns[creep.memory.city].room.name, true)
            if(route != -2 && route.length)
                creep.memory.respawnTime = (route.length * 50) + (creep.body.length * CREEP_SPAWN_TIME)
            else  // if path planning fails, don't set a respawn time
                creep.memory.respawnTime = -1
        }

        // check if flag can be removed early
        if(Game.time % 51 == 0)
            rH.removeFlag(creep, flagName)
        
        if(creep.ticksToLive == creep.memory.respawnTime){
            if(!_.find(creep.room.find(FIND_MY_CREEPS), c => c.memory.role == rH.name && c.name != creep.name))
                sq.respawn(creep)
        }
    },

    shoot: function(creep: Creep, hostiles: Creep[]){
        //RMA if anybody is touching
        for(let i = 0; i < hostiles.length; i++){
            if(hostiles[i].pos.isNearTo(creep.pos)){
                creep.rangedMassAttack()
                cU.logDamage(creep, creep.pos, true)
                return
            }
        }
        //if target and in range, shoot target, otherwise shoot anybody in range
        if(creep.memory.target){
            const target = Game.getObjectById(creep.memory.target) as Creep
            if(target && target.pos.inRangeTo(creep.pos, 3)){
                creep.rangedAttack(target)
                cU.logDamage(creep, target.pos)
                return
            }
        }
        const newTarget = creep.pos.findClosestByRange(hostiles)
        if(newTarget && newTarget.pos.getRangeTo(creep) <= 3){
            creep.rangedAttack(newTarget)
            cU.logDamage(creep, newTarget.pos)
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

    maybeRetreat: function(creep: Creep, hostiles: Creep[]) {
        const attacker = _.find(hostiles, h => h.getActiveBodyparts(ATTACK) > 0
                && (h.fatigue === 0 || h.pos.isNearTo(creep.pos))
                && h.pos.inRangeTo(creep.pos, 2))
        if(attacker || creep.hits < creep.hitsMax){
            //retreat
            if(creep.saying === "hold"){
                //get less angry
                creep.memory.anger = creep.memory.anger/2
            }
            motion.retreat(creep, hostiles)
            return true
        }
        return false
    },

    aMove: function(creep: Creep, hostiles: Creep[]){
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
                motion.newMove(creep, attacker.pos, 2)
            } else {
                //hold position
                creep.say("hold")
            }
        } else {
            if(creep.memory.target){
                const target = Game.getObjectById(creep.memory.target)
                if(target){
                    motion.newMove(creep, target.pos, 2)
                    return
                }
            }
            const target = creep.pos.findClosestByRange(hostiles)
            motion.newMove(creep, target.pos, 2)
            creep.memory.target = target.id
        }
        //move toward an enemy
    },

    // remove harass flag if it's the only flag in a highway room
    removeFlag: function(creep, flagName){
        if(!Memory.flags[flagName] || !u.isHighway(Memory.flags[flagName].roomName)){
            return
        }
        for(const flag in Memory.flags){
            if(flag != flagName && Memory.flags[flag].roomName == Memory.flags[flagName].roomName){
                return
            }
        }
        delete Memory.flags[flagName]
    },

    // initialize target and anger
    init: function(creep){
        if(!creep.memory.target){
            creep.memory.target = null
        }
        if(!creep.memory.anger){//the more angry the creep gets, the more aggressive it'll get
            creep.memory.anger = 0//anger increases when hostiles run away, and decreases when hostiles give chase
        }
    },

    // heal if needed
    maybeHeal: function(creep: Creep, hostiles: Creep[]){
        const damager = _.find(hostiles, c => c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0)
        if(creep.hits < creep.hitsMax || damager){
            creep.heal(creep)
        }
    },

    // rally if outside of target room
    rally: function(creep, flagName){
        let dFlag = Memory.flags[flagName]
        if (!dFlag && Game.map.getRoomStatus(flagName))
            dFlag = new RoomPosition(25, 25, flagName)
        if (dFlag && creep.pos.roomName != dFlag.roomName){
            motion.newMove(creep, new RoomPosition(dFlag.x, dFlag.y, dFlag.roomName), 5)
            return true
        }
        return false
    }
   
}
export = rH