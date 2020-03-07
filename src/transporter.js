var actions = require("./actions")
var u = require("./utils")
var sq = require("./spawnQueue")

var rT = {
    name: "transporter",
    type: "transporter",
    target: () => 0,
    validTargets: [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_LAB,
        STRUCTURE_NUKER, STRUCTURE_POWER_SPAWN, STRUCTURE_FACTORY, STRUCTURE_TOWER],

    /** @param {Creep} creep **/
    run: function(creep) {
        if (Game.time % 5000 == 0) {
            rT.clearCache(creep.room)
        }

        if(rT.endLife(creep)){
            return
        }
        var city = creep.memory.city
        if (creep.saying > 0){
            creep.say(creep.saying - 1)
            return
        }
        if (creep.carry.energy == 0) {
            //refill on energy
            if(rT.refill(creep, city) === 1){
                //start moving to target
                const target = rT.findTarget(creep, null)
                if(!target){
                    creep.say(20)
                    return
                }
                if(!creep.pos.isNearTo(target.pos)){
                    creep.moveTo(target, {reusePath: 15, range: 1})
                }
            }
        } else {
            // TODO use findTargetCached for one room
            const testRoom = creep.room.name == "E11S22" 
            const target = testRoom ? rT.findTargetCached(creep) : rT.findTarget(creep, null)
            if(!target){
                creep.say(20)
                return
            }

            const result = actions.charge(creep, target)
            if(result === 1){//successful deposit
                //if creep still has energy, start moving to next target
                if(creep.store[RESOURCE_ENERGY] > target.store.getFreeCapacity(RESOURCE_ENERGY)){
                    //start moving to next target if target not already in range
                    const newTarget = testRoom ? rT.findTargetCached(creep) : rT.findTarget(creep, target)
                    if(!newTarget){
                        creep.say(20)
                        return
                    }
                    if(!newTarget.pos.isNearTo(creep.pos)){
                        creep.moveTo(newTarget, {reusePath: 15, range: 1})
                    }
                } else {
                    //start moving to storage already
                    rT.refill(creep, city)
                }
            }
        }
    },
 
    findTarget: function(creep, oldTarget){
        let id = 0
        if(oldTarget){
            id = oldTarget.id
        }
        return creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.id !== id 
                    && rT.validTargets.includes(structure.structureType)
                    && rT.needsEnergy(structure)
                )
            },
            maxOps: 10
        })
    },

    findTargetCached: function(creep) {
        if (!rT.hasCachedTargets(creep))
            rT.cacheTargets(creep)
        return rT.getNextTarget(creep)
    },

    hasCachedTargets: function(creep) {
        return Cache[creep.room.name] && Cache[creep.room.name].targets
        && Cache[creep.room.name].targets.length
    },

    cacheTargets: function(creep) {
        const room = creep.room
        const targets = room.find(FIND_STRUCTURES, {
            filter: (structure) => rT.validTargets.includes(structure.structureType)
        })
        const orderedTargets = []
        const storage = u.getStorage(room)
        var currentPos = storage.pos
        while (targets.length > 0) {
            const next = currentPos.findClosestByPath(targets, {
                ignoreCreeps: true
            })
            _.remove(targets, target => target.id == next.id)
            orderedTargets.push(next.id)
            currentPos = next.pos
        }
        Cache[room.name] = Cache[room.name] || {}
        Cache[room.name].targets = orderedTargets
    },

    clearCache: function(room) {
        if (Cache[room.name]) Cache[room.name].targets = null
    },

    getNextTarget: function(creep) {
        creep.memory.i = creep.memory.i || 0 // default 0
        const targets = Cache[creep.room.name].targets
        for (var i = 0; i < targets.length; i++) {
            const target = Game.getObjectById(targets[creep.memory.i])
            if (rT.needsEnergy(target)) 
                return target
            else
                creep.memory.i = (creep.memory.i + 1) % targets.length
        }
    },

    needsEnergy: function(structure){
        switch(structure.structureType){
        case STRUCTURE_EXTENSION:
        case STRUCTURE_SPAWN:
        case STRUCTURE_LAB:
        case STRUCTURE_NUKER:
            //if there is any room for energy, needs energy
            return (structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
        case STRUCTURE_TOWER:
        case STRUCTURE_POWER_SPAWN:
            //arbitrary buffer
            return (structure.store.getFreeCapacity(RESOURCE_ENERGY) > 400)
        case STRUCTURE_FACTORY:
            //arbitrary max value
            return (structure.store.getUsedCapacity(RESOURCE_ENERGY) < 10000)
        }
    },

    endLife: function(creep){
        if(creep.ticksToLive == 200){
            const transporters = _.filter(creep.room.find(FIND_MY_CREEPS), c => c.memory.role == "transporter")
            if(transporters.length < 2){
                sq.respawn(creep)
            }
        }
        if(creep.ticksToLive > 10 || !creep.room.storage){
            return false
        }
        if(creep.store.getUsedCapacity() > 0){
            actions.charge(creep, creep.room.storage)
        } else {
            creep.suicide()
        }
        return true
    },

    refill: function(creep, city){
        let result = 0
        if (Game.getObjectById(creep.memory.location)) {
            var bucket = Game.getObjectById(creep.memory.location)
            if(creep.carry.getUsedCapacity() > 0){
                if(!creep.pos.isNearTo(bucket.pos)){
                    creep.moveTo(bucket, {reusePath: 15, range: 1})
                }
                return result
            }
            result = actions.withdraw(creep, bucket)
            if (result == ERR_NOT_ENOUGH_RESOURCES){
                const targets = u.getWithdrawLocations(creep)
                creep.memory.target = u.getNextLocation(creep.memory.target, targets)
                if (targets[creep.memory.target]){
                    creep.memory.location = targets[creep.memory.target].id
                }
            }
        } else {
            const targets = u.getWithdrawLocations(creep)
            var location = targets[creep.memory.target]
            if (location == undefined) {
                location = Game.spawns[city]
                creep.memory.noContainers = true
            } else {
                creep.memory.noContainers = false
            }
            creep.memory.location = location.id
            if(creep.carry.getUsedCapacity() > 0){
                if(!creep.pos.isNearTo(location.pos)){
                    creep.moveTo(location, {reusePath: 15, range: 1})
                }
                return result
            }
            result = actions.withdraw(creep, location)
            if (result == ERR_NOT_ENOUGH_RESOURCES){
                creep.memory.target = u.getNextLocation(creep.memory.target, targets)
            }
        }
        return result
    }
}
module.exports = rT