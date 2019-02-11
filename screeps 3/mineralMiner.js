var a = require('actions');
var t = require('types');
var u = require('utils');

var rMM = {
    name: "mineralMiner",
    type: "mineralMiner",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (!creep.memory.source){
            var sources = creep.room.find(FIND_MINERALS);
            creep.memory.source = sources[0].id;
        }
        if (rMM.needEnergy(creep)){
            rMM.harvestTarget(creep);
        } else {
            var targets =  u.getTransferLocations(creep);
            var bucket = targets[creep.memory.target];
            a.charge(creep, bucket);
        }
    },

    needEnergy: function(creep) {
        let carry = _.sum(creep.carry);
        return (carry < creep.carryCapacity);
    },

    harvestTarget: function(creep) {
      var source = Game.getObjectById(creep.memory.source);
      if (a.harvest(creep, source) == ERR_NO_PATH) {
          console.log("no path for mining :/");
      }
    },


};
module.exports = rMM;