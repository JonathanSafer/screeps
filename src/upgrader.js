var actions = require('actions');
var t = require('types');
var u = require('utils');

var rU = {
    name: "Upgrader",
    type: "normal",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
      var city = creep.memory.city;
      if(!creep.memory.state){
        creep.memory.state = 0
      }
      rU.checkBoost(creep, city);
      rU.getBoosted(creep, city);

      if (creep.memory.state == 2){
        if(creep.memory.upgrading && creep.carry.energy == 0) {
          creep.memory.upgrading = false;
        } else if(!creep.memory.upgrading && creep.carry.energy == creep.carryCapacity) {
          creep.memory.upgrading = true;
        }
        var targets = u.getWithdrawLocations(creep);
        var location = targets[creep.memory.target];
        if (!location){
          location = Game.spawns[city];  
        }
        if (creep.memory.upgrading ? actions.upgrade(creep) : actions.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES){
            creep.memory.target = u.getNextLocation(creep.memory.target, targets);
        };
      }
    },


    checkBoost: function(creep, city){
      if(creep.memory.state != 0){
        return;
      }
      if(Game.spawns[city].room.controller.level < 6 || !creep.room.terminal){
          creep.memory.state = 2
          return;
      }
      if(Game.spawns[city].room.controller.level < 8){
        let lab = _.find(Game.spawns[city].room.find(FIND_STRUCTURES), structure => structure.structureType === STRUCTURE_LAB)
        if(lab && lab.room.terminal){
          if(rU.checkMaterials(lab, creep)){
            creep.memory.lab = lab.id
            creep.memory.state = 1
            return;
          }
        }
        creep.memory.state = 2
        return;
      }
      if(!Game.spawns[city].memory.ferryInfo || !Game.spawns[city].memory.ferryInfo.boosterInfo){
          creep.memory.state = 2
          return;
      }
      let lab = Game.getObjectById(Game.spawns[city].memory.ferryInfo.boosterInfo[0][0])
      if(rU.checkMaterials(lab, creep)){
            creep.memory.lab = lab.id
            creep.memory.state = 1
      } else {
        creep.memory.state = 2
      }
    },

    checkMaterials: function(lab, creep){
      let terminal = lab.room.terminal
      let work = _.filter(creep.body, bodypart => bodypart.type == WORK).length
      if(terminal.store['XGH2O'] > (LAB_BOOST_MINERAL * work) && lab.mineralAmount == 0){
        return 1
      } else {
        return 0
      }
    },


    getBoosted: function(creep, city){
      if(creep.memory.state != 1){
        return;
      }
      let lab = Game.getObjectById(creep.memory.lab)
      if(_.sum(creep.carry) == 0 && !creep.pos.isNearTo(lab.pos)){
        if(Game.time % 50 == 0){
          creep.memory.state = 0
          return;
        }
        let work = _.filter(creep.body, bodypart => bodypart.type == WORK).length
        actions.withdraw(creep, creep.room.terminal, 'XGH2O', LAB_BOOST_MINERAL * work)
        return;
      }
      if(_.sum(creep.carry) > 0){
        actions.charge(creep, lab)
        return;
      }
      if(creep.body[0].boost){
        creep.memory.state = 2
        return;
      } else {
        lab.boostCreep(creep)
        creep.memory.state = 2
        return;
      }
    }
};
module.exports = rU;