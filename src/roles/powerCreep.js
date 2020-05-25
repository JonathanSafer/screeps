var a = require("../lib/actions")
var u = require("../lib/utils")
var rU = require("./upgrader")

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
    WORK_SPAWN: 13,
    WORK_CONTROLLER: 14,
}
var CS = CreepState

var rPC = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.shard && creep.shard != Game.shard.name){
            return
        }
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
            } {
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
        case CS.WORK_CONTROLLER:
            a.usePower(creep, creep.room.controller, PWR_OPERATE_CONTROLLER)
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
        case CS.WORK_CONTROLLER: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.WORK_CONTROLLER
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
        case CS.WORK_CONTROLLER:
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
        return target && creep.pos.inRangeTo(target, distance)
    },

    /*
     * Get next job. Priorities:
     * 1. Renew (extend life if time to live is low)
     * 2. Generate Ops (generate additional ops to spend on other work)
     * 3. Power sources (power up any source that requires it. Cost 0)
     * 4. Power factories (power a factor. cost 100)
     */
    getNextWork: function(creep) {
        if (creep.ticksToLive < 300) return CS.WORK_RENEW
        if (rPC.canGenerateOps(creep)) return CS.WORK_GENERATE_OPS
        if (rPC.hasSourceUpdate(creep)) return CS.WORK_SOURCE
        if (rPC.canOperateFactory(creep)) return rPC.getOpsJob(creep, PWR_OPERATE_FACTORY, CS.WORK_FACTORY)
        //if (rPC.canOperateObserver(creep)) return rPC.getOpsJob(creep, PWR_OPERATE_OBSERVER, CS.WORK_OBSERVER)
        if (rPC.canOperateExtension(creep)) return rPC.getOpsJob(creep, PWR_OPERATE_EXTENSION, CS.WORK_EXTENSION)
        if (rPC.canOperateSpawn(creep)) return rPC.getOpsJob(creep, PWR_OPERATE_SPAWN, CS.WORK_SPAWN)
        if (rPC.canOperateController(creep)) return rPC.getOpsJob(creep, PWR_OPERATE_CONTROLLER, CS.WORK_CONTROLLER)
        if (rPC.hasExtraOps(creep)) return CS.WORK_BALANCE_OPS
        return CS.SLEEP
    },

    isPowerEnabled: function(creep) {
        const room = Game.rooms[creep.memory.city]
        return (room.controller && room.controller.isPowerEnabled)
    },

    canGenerateOps: function(creep) {
        return creep.powers[PWR_GENERATE_OPS] &&
            creep.powers[PWR_GENERATE_OPS].cooldown == 0 &&
            _.sum(creep.store) < creep.store.getCapacity()
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
        const spawn = Game.spawns[city]
        const isRunning = spawn && spawn.memory.ferryInfo.factoryInfo.produce !== "dormant"
        const isNew = factory && !factory.level
        const needsBoost = (factory && factory.cooldown < 30 && isRunning) || isNew
        return rPC.canOperate(creep, factory, PWR_OPERATE_FACTORY, needsBoost)
    },

    canOperateObserver: function(creep) {
        const observer = _.find(creep.room.find(FIND_MY_STRUCTURES), struct => struct.structureType == STRUCTURE_OBSERVER)
        return rPC.canOperate(creep, observer, PWR_OPERATE_OBSERVER, true)
    },

    canOperateExtension: function(creep) {
        return rPC.canOperate(creep, creep.room.storage, PWR_OPERATE_EXTENSION,
            creep.room.energyAvailable < 0.8 * creep.room.energyCapacityAvailable)
    },

    canOperateSpawn: function(creep) {
        const spawn = Game.spawns[creep.memory.city + "0"]
        const spawns = spawn && spawn.room.find(FIND_MY_SPAWNS) || []
        if(_.every(spawns, s => s.spawning)){
            const slowSpawn = _.find(spawns, s => !s.effects || s.effects.length == 0)
            if(slowSpawn){
                return rPC.canOperate(creep, slowSpawn, PWR_OPERATE_SPAWN, true)
            }
        }
        return false
    },

    canOperateController: function(creep) {
        if(Game.spawns[creep.memory.city + "0"].memory[rU.name] > 0){
            return rPC.canOperate(creep, creep.room.controller, PWR_OPERATE_CONTROLLER, true)
        } else {
            return false
        }
    },

    canOperate: function(creep, target, power, extraRequirements) {
        if (target &&
            (!target.effects || target.effects.length == 0) &&
            creep.powers[power] &&
            creep.powers[power].cooldown == 0 && extraRequirements) {
            creep.memory.target = target.id
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
