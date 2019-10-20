var a = require('actions');
var u = require('utils');

var CreepState = {
  START: 0,
  SPAWN: 1,
  ENABLE_POWER: 2,
  WORK_SOURCE: 3,
  WORK_GENERATE_OPS: 4,
  WORK_RENEW: 4,
  WORK_DECIDE: 5
};
var CS = CreepState;

var rPC = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if (!rPC.hasValidState(creep)) {
            if (creep.ticksToLive > 0) {
                creep.suicide()
                return
            }
            creep.memory.state = CS.START
        }
        switch (creep.memory.state) {
            case CS.START:
                rPC.initializePowerCreep(creep)
                break
            case CS.SPAWN: // do nothing
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
            case CS.SPAWN: 
                return (creep.spawnCooldownTime > Date.now()) ? CS.SPAWN :
                    (creep.room.controller && !creep.room.controller.isPowerEnabled) ?
                        CS.ENABLE_POWER : rPC.getNextWork()
            case CS.ENABLE_POWER: return rPC.atTarget() ? rPC.getNextWork() : CS.ENABLE_POWER
            case CS.WORK_SOURCE: return rPC.atTarget() ? rPC.getNextWork() : CS.WORK_SOURCE
            case CS.WORK_GENERATE_OPS: return rPC.getNextWork()
            case CS.WORK_DECIDE: return rPC.getNextWork()
            case CS.WORK_RENEW: return rPC.atTarget() ? rPC.getNextWork() : CS.WORK_RENEW
        }
        // If state is unknown then restart
        return CS.START
    },

    initializePowerCreep: function(creep) {
        let cities = u.getMyCities()
        let fullPower = _.filter(cities, (city) => city.controller.level == 8)
        creep.memory.city = _.sample(fullPower) // pick a random city
        let city = creep.memory.city
        // spawn creep
        if(!Game.spawns[city]){
            return;
        }
        let structures = Game.spawns[city].room.find(FIND_MY_STRUCTURES)
        let powerSpawn = _.find(structures, structure => structure.structureType === STRUCTURE_POWER_SPAWN)
        if(!powerSpawn){
            return;
        }
        creep.spawn(powerSpawn);
        creep.memory.powerSpawn = powerSpawn.id;
    },

    hasValidState: function(creep) { // TODO. false if creep spawns in city with no power spawn
        return creep.memory.state && creep.memory.city && (!creep.room || creep.room.controller)
    },

    atTarget: function(creep) {
        return creep.pos.isNearTo(Game.getObjectById(creep.memory.target))
    },

    getNextWork: function(creep) {
        return (creep.ticksToLive < 300) ? CS.WORK_RENEW :
            rPC.canGenerateOps(creep) ? CS.WORK_GENERATE_OPS :
            rPC.hasSourceUpdate() ? CS.WORK_SOURCE : CS.WORK_DECIDE
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