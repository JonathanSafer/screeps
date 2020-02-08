var a = require('./actions')
var u = require('./utils')

var CreepState = {
  START: 1,
  SPAWN: 2,
  ENABLE_POWER: 3,
  WORK_SOURCE: 4,
  WORK_GENERATE_OPS: 5,
  WORK_RENEW: 6,
  WORK_DECIDE: 7,
  WORK_FACTORY: 8,
  WORK_BALANCE_OPS: 9,
  SLEEP: 10,
  WORK_OBSERVER: 11,
  WORK_EXTENSION: 12,
  WORK_SPAWN: 13
}
var CS = CreepState

var rPC = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.hits < creep.hitsMax && creep.memory.city){
            creep.moveTo(Game.rooms[creep.memory.city].storage)
            return
        }
        if (!rPC.hasValidState(creep)) {
            if (creep.ticksToLive > 0) {
                // disabled suicide bc 8 hour delay. creep.suicide()
                return
            }
            creep.memory.state = CS.START
        }
        switch (creep.memory.state) {
            case CS.START:
                rPC.initializePowerCreep(creep)
                break
            case CS.SPAWN:
                rPC.spawnPowerCreep(creep)
                break
            case CS.ENABLE_POWER:
                a.enablePower(creep)
                break
            case CS.WORK_SOURCE:
                a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_REGEN_SOURCE)
                break
            case CS.WORK_GENERATE_OPS:
                creep.usePower(PWR_GENERATE_OPS)
                break
            case CS.WORK_DECIDE:
                break
            case CS.WORK_RENEW:
                a.renewPowerCreep(creep, Game.getObjectById(creep.memory.powerSpawn))
                break
            case CS.WORK_FACTORY:
                a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_OPERATE_FACTORY)
                break
            case CS.WORK_BALANCE_OPS:
                if (creep.store[RESOURCE_OPS] > POWER_INFO[PWR_OPERATE_FACTORY].ops) {
                    a.charge(creep, creep.room.terminal)
                } else {
                    a.withdraw(creep, creep.room.terminal, RESOURCE_OPS)
                }
                break
            case CS.SLEEP:
                break
            case CS.WORK_OBSERVER:
                a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_OPERATE_OBSERVER)
                break
            case CS.WORK_EXTENSION:
                a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_OPERATE_EXTENSION)
                break
            case CS.WORK_SPAWN:
                a.usePower(creep, Game.getObjectById(creep.memory.target), PWR_OPERATE_SPAWN)
                break
        }
        creep.memory.state = rPC.getNextState(creep)
    },

    getNextState: function(creep) {
        switch (creep.memory.state) {
            case CS.START: return CS.SPAWN
            case CS.SPAWN: return (creep.spawnCooldownTime > Date.now()) ? CS.SPAWN :
                rPC.isPowerEnabled(creep) ? rPC.getNextWork(creep) : CS.ENABLE_POWER
            case CS.ENABLE_POWER: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.ENABLE_POWER
            case CS.WORK_SOURCE: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.WORK_SOURCE
            case CS.WORK_FACTORY: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.WORK_FACTORY
            case CS.WORK_GENERATE_OPS: return rPC.getNextWork(creep)
            case CS.WORK_DECIDE: return rPC.getNextWork(creep)
            case CS.WORK_RENEW: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.WORK_RENEW
            case CS.WORK_BALANCE_OPS: return rPC.atTarget(creep) ? CS.SLEEP : CS.WORK_BALANCE_OPS
            case CS.SLEEP: return Game.time % 10 == 0 ? rPC.getNextWork(creep) : CS.SLEEP
            case CS.WORK_OBSERVER: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.WORK_OBSERVER
            case CS.WORK_EXTENSION: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.WORK_EXTENSION
            case CS.WORK_SPAWN: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.WORK_SPAWN
        }
        // If state is unknown then restart
        return CS.START
    },

    initializePowerCreep: function(creep) {
        if (!creep.memory.city) {
            const cities = u.getMyCities()
            const fullPower = _.filter(cities, (city) => city.controller.level == 8)
            const city = _.sample(fullPower) // pick a random city
            creep.memory.city = city.name
        }
    },

    spawnPowerCreep: function(creep) {
        // spawn creep
        if(!Game.rooms[creep.memory.city]){
            return
        }
        const structures = Game.rooms[creep.memory.city].find(FIND_MY_STRUCTURES)
        const powerSpawn = _.find(structures, structure => structure.structureType === STRUCTURE_POWER_SPAWN)
        if(!powerSpawn){
            return
        }
        creep.spawn(powerSpawn)
        creep.memory.powerSpawn = powerSpawn.id
    },

    hasValidState: function(creep) { // TODO. false if creep spawns in city with no power spawn
        const validSpawn = creep.memory.state == CS.START || 
                         creep.memory.state == CS.SPAWN || (creep.room && creep.room.controller)
        const initialized = creep.memory.state && creep.memory.city
        return initialized && validSpawn
    },

    atTarget: function(creep) {
        var target
        var distance = 1
        switch (creep.memory.state) {
            case CS.WORK_SOURCE:
            case CS.WORK_FACTORY:
            case CS.WORK_OBSERVER:
            case CS.WORK_EXTENSION:
            case CS.WORK_SPAWN:
                target = Game.getObjectById(creep.memory.target)
                distance = 3
                break
            case CS.WORK_BALANCE_OPS:
                target = creep.room.terminal
                break
            case CS.ENABLE_POWER:
                target = creep.room.controller
                break
            case CS.WORK_RENEW:
                target = Game.getObjectById(creep.memory.powerSpawn)
                break
        }
        return creep.pos.inRangeTo(target, distance)
    },

    /*
     * Get next job. Priorities:
     * 1. Renew (extend life if time to live is low)
     * 2. Generate Ops (generate additional ops to spend on other work)
     * 3. Power sources (power up any source that requires it. Cost 0)
     * 4. Power factories (power a factor. cost 100)
     */
    getNextWork: function(creep) {
        return (creep.ticksToLive < 300) ? CS.WORK_RENEW :
            rPC.canGenerateOps(creep) ? CS.WORK_GENERATE_OPS :
            rPC.hasSourceUpdate(creep) ? CS.WORK_SOURCE : 
            rPC.canOperateFactory(creep) ? rPC.getOpsJob(creep, PWR_OPERATE_FACTORY, CS.WORK_FACTORY) :
            rPC.canOperateObserver(creep) ? rPC.getOpsJob(creep, PWR_OPERATE_OBSERVER, CS.WORK_OBSERVER) :
            rPC.canOperateExtension(creep) ? rPC.getOpsJob(creep, PWR_OPERATE_EXTENSION, CS.WORK_EXTENSION) :
            rPC.canOperateSpawn(creep) ? rPC.getOpsJob(creep, PWR_OPERATE_SPAWN, CS.WORK_SPAWN) :
            rPC.hasExtraOps(creep) ? CS.WORK_BALANCE_OPS :
            CS.SLEEP
    },

    isPowerEnabled: function(creep) {
        const room = Game.rooms[creep.memory.city]
        return (room.controller && room.controller.isPowerEnabled)
    },

    canGenerateOps: function(creep) {
        return creep.powers[PWR_GENERATE_OPS] && creep.powers[PWR_GENERATE_OPS].cooldown < 1 && _.sum(creep.store) < creep.store.getCapacity()
    },

    hasSourceUpdate: function(creep) {
        // powerup runs out every 300 ticks
        // get all sources
        // if there is no effect on source then choose it
        if(!creep.powers[PWR_REGEN_SOURCE]){
            return false
        }
        const sourceIds = Object.keys(Game.spawns[creep.memory.city + "0"].memory.sources)
        for (const sourceId of sourceIds) {
            const source = Game.getObjectById(sourceId)
            if (!source.effects || source.effects.length == 0 ||
                source.effects[0].ticksRemaining < 30) {
                creep.memory.target = sourceId
                return true
            }
        }
        return false
    },

    canOperateFactory: function(creep) {
        const factory = _.find(creep.room.find(FIND_MY_STRUCTURES), struct => struct.structureType == STRUCTURE_FACTORY)
        const city = creep.memory.city + "0"
        if (factory &&
            (!factory.effects || factory.effects.length == 0) &&
            factory.cooldown < 30 &&
            creep.powers[PWR_OPERATE_FACTORY] &&
            creep.powers[PWR_OPERATE_FACTORY].cooldown == 0 &&
            Game.spawns[city].memory.ferryInfo.factoryInfo.produce !== 'dormant') {
            creep.memory.target = factory.id
            return true
        }
        return false
    },

    canOperateObserver: function(creep) {
        const observer = _.find(creep.room.find(FIND_MY_STRUCTURES), struct => struct.structureType == STRUCTURE_OBSERVER)
        if (observer && 
            (!observer.effects || observer.effects.length == 0) &&
            creep.powers[PWR_OPERATE_OBSERVER] &&
            creep.powers[PWR_OPERATE_OBSERVER].cooldown == 0) {
            creep.memory.target = observer.id
            return true
        }
        return false
    },

    canOperateExtension: function(creep) {
        const storage = creep.room.storage
        if (storage &&
            creep.powers[PWR_OPERATE_EXTENSION] &&
            creep.powers[PWR_OPERATE_EXTENSION].cooldown == 0 &&
            creep.room.energyAvailable < 0.5 * creep.room.energyCapacityAvailable) {
            creep.memory.target = storage.id
            return true
        }
        return false
    },

    canOperateSpawn: function(creep) {
        const spawn = Game.spawns[creep.memory.city + "0"]
        if (spawn &&
            (!spawn.effects || spawn.effects.length == 0) &&
            creep.powers[PWR_OPERATE_SPAWN] &&
            creep.powers[PWR_OPERATE_SPAWN].cooldown == 0 &&
            spawn.memory.boost) {
            creep.memory.target = spawn.id
            return true
        }
        return false
    },

    hasExtraOps: function(creep) {
        return creep.store[RESOURCE_OPS] == creep.store.getCapacity()
    },

    getOpsJob: function(creep, jobName, jobState) {
        return creep.store[RESOURCE_OPS] >= POWER_INFO[jobName].ops ?
            jobState : CS.WORK_BALANCE_OPS
    }
}
module.exports = rPC
