import u = require("./utils")

var cU = {    
    getNextLocation: function(current: number, locations) {
        return (current + 1) % locations.length
    },
    
    updateCheckpoints: function(creep) {
        if (Game.time % 50 == 0  && !u.enemyOwned(creep.room)) {
            if (creep.hits < creep.hitsMax) {
                return
            }
            if (!creep.memory.checkpoints) {
                creep.memory.checkpoints = []
            }
            creep.memory.checkpoints.push(creep.pos)
            if (creep.memory.checkpoints.length > 2) {
                creep.memory.checkpoints.shift()
            }
        }
    },

    checkRoom: function(creep: Creep){
        if(creep.hits < creep.hitsMax*0.8){
            //search for hostile towers. if there are towers, room is enemy
            const tower = _.find(u.findHostileStructures(creep.room), s => s.structureType == STRUCTURE_TOWER)
            if(tower){
                if(!Cache[creep.room.name]){
                    Cache[creep.room.name] = {}
                }
                Cache[creep.room.name].enemy = true
            }
        }
    },

    logDamage: function(creep, targetPos, rma = false){
        u.getsetd(Tmp, creep.room.name,{})
        u.getsetd(Tmp[creep.room.name], "attacks",[])
        const ranged = creep.getActiveBodyparts(RANGED_ATTACK)
        const damageMultiplier = creep.memory.boosted ? (ranged * 4) : ranged
        if(rma){
            for(let i = creep.pos.x - 3; i <= creep.pos.x + 3; i++){
                for(let j = creep.pos.y - 3; j <= creep.pos.y + 3; j++){
                    if(i >= 0 && i <= 49 && j >= 0 && j <= 49){
                        const distance = Math.max(Math.abs(creep.pos.x - i),Math.abs(creep.pos.y - j))
                        switch(distance){
                        case 0: 
                        case 1:
                            Tmp[creep.room.name].attacks.push({x: i, y: j, damage: damageMultiplier * 10})
                            break
                        case 2:
                            Tmp[creep.room.name].attacks.push({x: i, y: j, damage: damageMultiplier * 4})
                            break
                        case 3:
                            Tmp[creep.room.name].attacks.push({x: i, y: j, damage: damageMultiplier})
                            break
                        }
                    }
                }
            }
        } else {
            Tmp[creep.room.name].attacks.push({x: targetPos.x, y: targetPos.y, damage: damageMultiplier * RANGED_ATTACK_POWER})
        }

    },

    getCreepDamage: function(creep: Creep, type){
        const creepCache = u.getCreepCache(creep.id)
        if(creepCache[type + "damage"])
            return creepCache[type + "damage"]
        const damageParts = creep.getActiveBodyparts(type)
        const boostedPart = _.find(creep.body, part => part.type == type && part.boost)
        const multiplier = boostedPart ? BOOSTS[type][boostedPart.boost][type] : 1
        const powerConstant = type == RANGED_ATTACK ? RANGED_ATTACK_POWER : ATTACK_POWER
        creepCache[type + "damage"] = powerConstant * multiplier * damageParts
        return creepCache[type + "damage"]
    },

    generateCreepName: function(counter, role){
        return role + "-" + counter
    },

    getGoodPickups: function(creep) {
        var city = creep.memory.city
        var localCreeps = u.splitCreepsByCity()
        var miners = _.filter(localCreeps[city], lcreep => lcreep.memory.role == "remoteMiner")
        var drops = _.flatten(_.map(miners, miner => miner.room.find(FIND_DROPPED_RESOURCES)))
        const runnersBySource = _.groupBy(_.filter(localCreeps[city]), c => c.memory.role == "runner", runner => runner.memory.targetId)
        const containers = _.map(miners, miner => _.find(miner.pos.lookFor(LOOK_STRUCTURES), struct => struct.structureType == STRUCTURE_CONTAINER)) as StructureContainer[]
        const goodContainers = _.filter(containers, 
            function(container){
                if(!container || container.store.getUsedCapacity() <= 0.5 * creep.store.getCapacity())
                    return false
                let store = container.store.getUsedCapacity()
                if(!runnersBySource[container.id])
                    return true
                for(const runner of runnersBySource[container.id])
                    store -= runner.store.getFreeCapacity()
                return store >= 0.5 * creep.store.getCapacity()
            })
        const goodDrops: RoomObject[] = _.filter(drops, 
            function(drop){
                if(drop.amount <= 0.5 * creep.store.getCapacity())
                    return false
                let amount = drop.amount
                if(!runnersBySource[drop.id])
                    return true
                for(const runner of runnersBySource[drop.id])
                    amount -= runner.store.getFreeCapacity()
                return amount >= 0.5 * creep.store.getCapacity()
            }) 
        return goodDrops.concat(goodContainers)
    }
}

export = cU