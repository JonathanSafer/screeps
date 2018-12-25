var actions = require('actions');
var t = require('types');
var u = require('utils');

var rF = {
    name: "ferry",
    type: t.ferry,
    target: 0,
    limit: 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.carry.energy < creep.carryCapacity) {
            var targets = u.getWithdrawLocations(creep);
            var location = targets[creep.memory.target];
            if (actions.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES){
                creep.memory.target = u.getNextLocation(creep.memory.target, targets);
            }
        } else {
            location = Game.spawns['Home'];
            actions.charge(creep, location);
        }
    }
};
module.exports = rF;