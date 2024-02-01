import actions = require("../lib/actions")
import settings = require("../config/settings")
import motion = require("../lib/motion")
import u = require("../lib/utils")
import cU = require("../lib/creepUtils")
import rPM = require("./powerMiner")
import { cN, BodyType } from "../lib/creepNames"
import { CreepActions as cA } from "../lib/boosts"

const rDM = {
    name: cN.DEPOSIT_MINER_NAME,
    type: BodyType.depositMiner,
    target: 0,
    boosts: [RESOURCE_CATALYZED_UTRIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ACID],
    actions: [cA.CARRY, cA.HARVEST],

    // Keep track of how much is mined for stats. Stat object will clear this when it's recorded
    mined: 0,

    run: function(creep: Creep) {
        cU.checkRoom(creep)
        if (_.sum(Object.values(creep.store)) === 0 && creep.ticksToLive < 500){//if old and no store, suicide
            creep.suicide()
            return
        }

        if (!rPM.getBoosted(creep, rDM.boosts)){
            return
        }

        if(creep.memory.mode === 0){
            if(_.sum(Object.values(creep.store)) === creep.store.getCapacity()){
                creep.memory.mode = 1
            }
        }
        switch(creep.memory.mode){
        case 0: {
            //newly spawned or empty store
            const flagName = creep.memory.flag
            const flag = Memory.flags[flagName]
            if(!flag){//if there is no flag, change city.memory.depositMiner to 0, and suicide
                creep.suicide()
                return
            }
            const flagPos = new RoomPosition(flag.x, flag.y, flag.roomName)
            if(creep.body.length === 3){
                delete Memory.flags[flagName]
                return
            }
            if (flagPos.roomName !== creep.pos.roomName){//move to flag until it is visible
                motion.newMove(creep, flagPos, 1)
                return
            }
            const deposit = Game.rooms[flagPos.roomName].lookForAt(LOOK_DEPOSITS, flagPos)//if flag is visible, check for deposit, if no deposit, remove flag
            if(!deposit.length){
                delete Memory.flags[flagName]
                return
            }
            if(_.sum(Object.values(creep.store)) === 0 && (deposit[0].lastCooldown > 25 && Game.cpu.bucket < settings.bucket.resourceMining)){
                delete Memory.flags[flagName]
                return
            }
            //check for enemies. if there is an enemy, call in harasser
            rDM.checkEnemies(creep, deposit[0])

            //move towards and mine deposit (actions.harvest)
            if(actions.harvest(creep, deposit[0]) === 1){
                //record amount harvested
                let works = _.filter(creep.body, part => part.type == WORK).length
                if(creep.memory.boosted){
                    works = works * BOOSTS.work[RESOURCE_CATALYZED_UTRIUM_ALKALIDE].harvest
                }
                // record personal work for stats
                if (!creep.memory.mined) {
                    creep.memory.mined = 0
                }
                creep.memory.mined += works
                // update harvest total tracker for planning purposes
                if(!Memory.flags[creep.memory.flag])
                    break
                if(!Memory.flags[creep.memory.flag].harvested)
                    Memory.flags[creep.memory.flag].harvested = 0
                Memory.flags[creep.memory.flag].harvested += works
            }
            break
        }
        case 1:
            //store is full
            if(_.sum(Object.values(creep.store)) === 0){
                creep.memory.mode = 0
                return
            }
            actions.charge(creep, Game.spawns[creep.memory.city].room.storage)
        }
    },

    checkEnemies: function(creep: Creep, deposit){
        if(Game.time % 5 == 0 || creep.hits < creep.hitsMax){
            //scan room for hostiles
            const hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
            if(rDM.checkAllies(creep, hostiles)){
                return
            }
            const dangerous = _.find(hostiles, h => h.getActiveBodyparts(ATTACK) > 0 || h.getActiveBodyparts(RANGED_ATTACK) > 0)
            
            //check for tampering with deposit
            const cooldown = deposit.lastCooldown
            const expected = Math.ceil(0.001*Math.pow(Memory.flags[creep.memory.flag].harvested,1.2))

            if(cooldown > expected){
                Memory.flags[creep.memory.flag].harvested = Math.ceil(Math.pow((deposit.lastCooldown / 0.001), 1/1.2))
            }
            if(cooldown > expected || dangerous){
                //call in harasser
                const flagName = u.generateFlagName(creep.memory.city + "harass")
                if(!_.find(Object.keys(Memory.flags), flag => Memory.flags[flag].roomName == creep.room.name && flag.includes("harass")))
                    u.placeFlag(flagName, new RoomPosition(25, 25, creep.room.name))
            }
        }
    },

    checkAllies: function(creep: Creep, hostiles: Creep[]){
        const owners = _.map(hostiles, hostile => hostile.owner.username)
        const ally = _.find(owners, owner => {
            Cache.enemies = Cache.enemies || {}
            Cache.enemies[owner] = Cache.enemies[owner] || 0
            Cache.enemies[owner]++
            return Memory.settings.allies.includes(owner)
        })
        if (ally) {
            //remove flag
            const flag = Memory.flags[creep.memory.flag]
            const allies = _.filter(creep.room.find(FIND_HOSTILE_CREEPS), c => Memory.settings.allies.includes(c.owner.username))
            for(const friendly of allies){
                if(friendly.getActiveBodyparts(WORK) > 0 && friendly.pos.isNearTo(flag.x, flag.y)){
                    delete Memory.flags[creep.memory.flag]
                    creep.memory.mode = 1
                    return true
                }
            }
        }
        return false
    }
}
export = rDM