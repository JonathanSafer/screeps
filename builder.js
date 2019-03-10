var a = require('actions');
var t = require('types');
var u = require('utils');

var rB = {
    name: "builder",
    type: "builder",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        rB.decideWhetherToBuild(creep);
        if (creep.memory.building) {
            a.build(creep);
        } else {
            var location = rB.getLocation(creep);
            if (a.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES) {
                creep.memory.target = u.getNextLocation(creep.memory.target, targets);
            }
        }
    },

    getLocation: function(creep) {
        var targets = u.getWithdrawLocations(creep);
        var location = targets[creep.memory.target];
        if (location == undefined) {
            location = Game.spawns[creep.memory.city];
        }
    },

    decideWhetherToBuild: function(creep) {
        if(creep.carry.energy == 0 && creep.memory.building) {
            creep.memory.building = false;
        }
        if(creep.carry.energy == creep.carryCapacity && !creep.memory.building) {
            creep.memory.building = true;
        }
    }
};
module.exports = rB;