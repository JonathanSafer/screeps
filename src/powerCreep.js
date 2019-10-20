var a = require('actions');
var u = require('utils');

var CreepState = {
  START: 1,
  SPAWN: 2,
  ENABLE_POWER: 3,
  WORK_SOURCE: 4,
  WORK_GENERATE_OPS: 5,
  WORK_RENEW: 6,
  WORK_DECIDE: 7
};
var CS = CreepState;

var rPC = {

    /** @param {Creep} creep **/
    run: function(creep) {
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
                a.powerSource(creep, Game.getObjectById(creep.memory.target))
                break
            case CS.WORK_GENERATE_OPS:
                creep.usePower(PWR_GENERATE_OPS)
                break
            case CS.WORK_DECIDE:
                rPC.updateSource(creep)
                break
            case CS.WORK_RENEW:
                a.renewPowerCreep(creep, Game.getObjectById(creep.memory.powerSpawn))
                break

        }
        creep.memory.state = rPC.getNextState(creep)
    },

    getNextState: function(creep) {
        switch (creep.memory.state) {
            case CS.START: return CS.SPAWN
            case CS.SPAWN: return (creep.spawnCooldownTime > Date.now()) ? CS.SPAWN :
                rPC.isPowerEnabled(creep) ? CS.ENABLE_POWER : rPC.getNextWork(creep)
            case CS.ENABLE_POWER: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.ENABLE_POWER
            case CS.WORK_SOURCE: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.WORK_SOURCE
            case CS.WORK_GENERATE_OPS: return rPC.getNextWork(creep)
            case CS.WORK_DECIDE: return rPC.getNextWork(creep)
            case CS.WORK_RENEW: return rPC.atTarget(creep) ? rPC.getNextWork(creep) : CS.WORK_RENEW
        }
        // If state is unknown then restart
        return CS.START
    },

    initializePowerCreep: function(creep) {
        if (!creep.memory.city) {
            let cities = u.getMyCities()
            let fullPower = _.filter(cities, (city) => city.controller.level == 8)
            let city = _.sample(fullPower) // pick a random city
            creep.memory.city = city.name
        }
    },

    spawnPowerCreep: function(creep) {
        // spawn creep
        if(!Game.rooms[creep.memory.city]){
            return;
        }
        let structures = Game.rooms[creep.memory.city].find(FIND_MY_STRUCTURES)
        let powerSpawn = _.find(structures, structure => structure.structureType === STRUCTURE_POWER_SPAWN)
        if(!powerSpawn){
            return;
        }
        creep.spawn(powerSpawn);
        creep.memory.powerSpawn = powerSpawn.id;
    },

    hasValidState: function(creep) { // TODO. false if creep spawns in city with no power spawn
        let validSpawn = creep.memory.state == CS.START || 
                         creep.memory.state == CS.SPAWN || (creep.room && creep.room.controller)
        let initialized = creep.memory.state && creep.memory.city
        return initialized && validSpawn
    },

    atTarget: function(creep) {
        var target
        switch (creep.memory.state) {
            case CS.WORK_SOURCE:
                target = creep.memory.target
                break
            case CS.ENABLE_POWER:
                target = creep.room.controller
                break
            case CS.WORK_RENEW:
                target = creep.memory.powerSpawn
                break
        }
        return creep.pos.isNearTo(Game.getObjectById(target))
    },

    getNextWork: function(creep) {
        return (creep.ticksToLive < 300) ? CS.WORK_RENEW :
            rPC.canGenerateOps(creep) ? CS.WORK_GENERATE_OPS :
            rPC.hasSourceUpdate() ? CS.WORK_SOURCE : CS.WORK_DECIDE
    },

    isPowerEnabled: function(creep) {
        let room = Game.rooms[creep.memory.city]
        return (room.controller && room.controller.isPowerEnabled)
    },

    canGenerateOps: function(creep) {
        return creep.powers[PWR_GENERATE_OPS].cooldown < 1 && _.sum(creep.carry) < creep.carryCapacity
    },

    hasSourceUpdate: function() {
        return Game.time % 125 == 0
    },

    updateSource: function(creep) {
        if (rPC.hasSourceUpdate()) {
            creep.memory.source = creep.memory.source == 0 ? 1 : 0
            let sources = Object.keys(Game.spawns[creep.memory.city].memory.sources)
            creep.memory.target = sources[creep.memory.source] 
        }
    }
};
module.exports = rPC;
