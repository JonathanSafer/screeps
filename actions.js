var actions = {
    interact: function(creep, location, fnToTry) {
        var result = fnToTry();
        switch (result) {
            case ERR_NOT_IN_RANGE:
                if(false) {//creep.memory.test) {
                    actions.move(creep, location);
                } else {
                    creep.moveTo(location, {reusePath: 10});
                }
                return result;
            case OK:
            case ERR_BUSY:
            case ERR_FULL:
            case ERR_NOT_ENOUGH_RESOURCES:
                creep.memory.path = null;
                return result;
            default:
                console.log(creep.memory.role + " at " + creep.pos.x + "," + creep.pos.y + ": " + result.toString());
                return result;
      }
    },

    move: function(creep, location) {
        // check if there's a path. try moving along it
        var plannedPath = creep.memory.path;
        if (plannedPath) {
            //console.log(plannedPath + " Hi");
            var result = creep.moveByPath(plannedPath);
            switch (result) {
                case OK:
                case ERR_TIRED: // tired is fine
                    return result;
                case ERR_NOT_FOUND:
                    //break; // let's get a new path
                default:
                    console.log(creep.memory.role + " at " + creep.pos.x + "," + creep.pos.y + ": " + result.toString());
                    break;
            }
        }
        console.log(creep.name)
        console.log("need new path");
        //console.log(plannedPath);
        // Get here if there's no planned path or plan failed
        var newPath = creep.pos.findPathTo(location);
        //console.log(newPath);
        creep.memory.path = newPath;
        return actions.move(creep);
    },
    
    reserve: function(creep, target){
        return actions.interact(creep, target, () => creep.reserveController(target));
    },

    dismantle: function(creep, target){
        return actions.interact(creep, target, () => creep.dismantle(target));
    },
    
    attack: function(creep, target){
        return actions.interact(creep, target, () => creep.attack(target));
    },
    
    withdraw: function(creep, location) {
      return actions.interact(creep, location, () => creep.withdraw(location, RESOURCE_ENERGY));
    },

    harvest: function(creep, target) {
      return actions.interact(creep, target, () => creep.harvest(target));
    },
    
    pickup: function(creep) {
        if(creep.memory.targetId) {
            var target = Game.getObjectById(creep.memory.targetId);
            //room1 = 
            result = actions.interact(creep, target, () => creep.pickup(target));
            switch (result) {
              case OK:
              case ERR_INVALID_TARGET:
                  creep.memory.targetId = null;
                  break;
              default:
                  break;
            }
            return result;
        }
        console.log("finding a target");
        
        var rooms = Game.rooms;
        var drops = _.flatten(_.map(rooms, room => room.find(FIND_DROPPED_RESOURCES)));
        targets = _.sortBy(drops, drop => -1*drop.amount + 28*PathFinder.search(creep.pos, drop.pos).cost);
        creep.memory.targetId = targets[0].id;

        return actions.pickup(creep);
    },

    upgrade: function(creep) {
      location = creep.room.controller;
      return actions.interact(creep, location, () => creep.upgradeController(location));
    },

    charge: function(creep, location) {
      return actions.interact(creep, location, () => creep.transfer(location, RESOURCE_ENERGY));
    },

    build: function(creep) {
      var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
      if(targets.length) {
        return actions.interact(creep, targets[0], () => creep.build(targets[0]));
      }
    }
};

module.exports = actions;