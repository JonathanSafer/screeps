var actions = require("./actions")
var settings = require("./settings")
var u = require("./utils")

var rDM = {
    name: "depositMiner",
    type: "depositMiner",
    target: () => 0,

    // Keep track of how much is mined for stats. Stat object will clear this when it's recorded
    mined: 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (_.sum(creep.store) === 0 && creep.ticksToLive < 500){//if old and no store, suicide
            creep.suicide()
            return
        }
        if(creep.memory.target === 0){
            if(_.sum(creep.store) === creep.store.getCapacity()){
                creep.memory.target = 1
            }
        }
        switch(creep.memory.target){
        case 0: {
            //newly spawned or empty store
            const flagName = creep.memory.city + "deposit"
            const flag = Memory.flags[flagName]
            if(!flag){//if there is no flag, change city.memory.depositMiner to 0, and suicide
                Game.spawns[creep.memory.city].memory.depositMiner = 0
                creep.suicide()
                return
            }
            const flagPos = new RoomPosition(flag.x, flag.y, flag.roomName)
            if(creep.body.length === 3){
                delete Memory.flags[flagName]
                return
            }
            if (flagPos.roomName !== creep.pos.roomName){//move to flag until it is visible
                u.multiRoomMove(creep, flagPos, true)
                return
            }
            const deposit = Game.rooms[flagPos.roomName].lookForAt(LOOK_DEPOSITS, flagPos)//if flag is visible, check for deposit, if no deposit, remove flag
            if(!deposit.length){
                delete Memory.flags[flagName]
                return
            }
            if(_.sum(creep.store) === 0 && (deposit[0].lastCooldown > 25 && Game.cpu.bucket < settings.bucket.resourceMining)){
                delete Memory.flags[flagName]
                return
            }
            //check for enemies. if there is an enemy, call in harasser
            rDM.checkEnemies(creep, deposit[0])

            //move towards and mine deposit (actions.harvest)
            if(actions.harvest(creep, deposit[0]) === 1){
                //record amount harvested
                const works = _.filter(creep.body, part => part.type == WORK).length
                // record personal work for stats
                if (!creep.memory.mined) {
                    creep.memory.mined = 0
                }
                creep.memory.mined += works
                // update city level tracker for planning purposes
                if(!Game.spawns[creep.memory.city].memory.deposit){
                    Game.spawns[creep.memory.city].memory.deposit = 0
                }
                Game.spawns[creep.memory.city].memory.deposit = Game.spawns[creep.memory.city].memory.deposit + works
            }
            break
        }
        case 1:
            //store is full
            if(_.sum(creep.store) === 0){
                creep.memory.target = 0
                return
            }
            actions.charge(creep, Game.spawns[creep.memory.city].room.storage)

        }
    },

    checkEnemies: function(creep, deposit){
        if(Game.time % 5 == 0 || creep.hits < creep.hitsMax){
            //scan room for hostiles
            const hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
            if(rDM.checkAllies(creep, hostiles)){
                return
            }
            const dangerous = _.find(hostiles, h => h.getActiveBodyparts(ATTACK) > 0 || h.getActiveBodyparts(RANGED_ATTACK) > 0)
            
            //check for tampering with deposit
            const cooldown = deposit.lastCooldown
            const expected = Math.ceil(0.001*Math.pow(Game.spawns[creep.memory.city].memory.deposit,1.2))

            if(cooldown > expected){
                Game.spawns[creep.memory.city].memory.deposit = Math.floor(Math.pow((deposit.lastCooldown / 0.001), 1/1.2))
            }
            if(cooldown > expected || dangerous){
                //call in harasser
                const flagName = creep.memory.city + "harass"
                if(!Memory.flags[flagName]){
                    Memory.flags[flagName] = new RoomPosition(25, 25, creep.room.name)
                }
            }
        }
        if(creep.hits < creep.hitMax){
            //check to see if in enemy room. If so, mark as enemy
            if(creep.room.controller && creep.controller.owner && !creep.controller.my){
                if(!Cache[creep.room.name]){
                    Cache[creep.room.name] = {}
                }
                Cache[creep.room.name].enemy = true
            }
        }
    },

    checkAllies: function(creep, hostiles){
        const owners = _.map(hostiles, hostile => hostile.owner.username)
        const ally = _.find(owners, owner => {
            Log.info(`Is Ally ${owner}: ${settings.allies.includes(owner)}`)
            return settings.allies.includes(owner)
        })
        if (ally) {
            //remove flag
            const flagName = creep.memory.city + "deposit"
            delete Memory.flags[flagName]
            creep.memory.target = 1
            return true
        }
        return false
    }
}
module.exports = rDM