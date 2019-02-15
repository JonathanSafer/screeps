var actions = require('actions');
var t = require('types');
var u = require('utils');

var rR = {
    name: "runner",
    type: "runner",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
       // notice if there's stuff next to you before wandering off!  
      if (Game.time % 2) {
        actions.notice(creep); // cost: 15% when running, so 7% now
      }

      // if there's room for more energy, go find some more
      // else find storage
      if (creep.carry.energy < 0.5 * creep.carryCapacity) {
          actions.pickup(creep);
      } else {
          // check if we are walking on sidewalk/construction, and adjust as needed.
          var myPos = creep.pos;
          if (!myPos.lookFor(LOOK_STRUCTURES).length && !myPos.lookFor(LOOK_CONSTRUCTION_SITES).length) {
              // temp
              if(creep.memory.new) {
                  //console.log("new road");
                  myPos.createConstructionSite(STRUCTURE_ROAD); // let's build more road
              }
          }
          if (creep.memory.location){
              var target = Game.getObjectById(creep.memory.location)
              if (target){
                  actions.charge(creep, target);
                  if (actions.charge(creep, target) == ERR_FULL) {
                        console.log('Container Full');
                        var locations = u.getTransferLocations(creep)
                        var nextLocation = u.getNextLocation(creep.memory.target, locations);
                        if (locations[nextLocation] == undefined){
                            creep.memory.location = Game.spawns[creep.memory.city].id
                        } else {
                            creep.memory.location = locations[nextLocation].id
                        }
                  }
              }
          } else {
              var targets =  u.getTransferLocations(creep);
              var bucket = targets[creep.memory.target];
              if (bucket == undefined) {
                  var city = creep.memory.city;
                  bucket = Game.spawns[city];
              }
              creep.memory.location = bucket.id;
              if (actions.charge(creep, bucket) == ERR_FULL) {
                    console.log('Container Full');
                    rR.flipTarget(creep);
              }
          }
      }
    },
    flipTarget: function(creep) {
        creep.memory.target = u.getNextLocation(creep.memory.target, u.getTransferLocations(creep));
    }
    
};
module.exports = rR;