var actions = {
    interact: function(creep, location, fnToTry) {
       var result = fnToTry();
        switch (result) {
            case ERR_NOT_IN_RANGE:
               return creep.moveTo(location);
               break;
            case OK:
            case ERR_BUSY:
            case ERR_FULL:
                return result;
                break;
            case ERR_NOT_ENOUGH_RESOURCES:
                return result;
                break;
            default:
                console.log(creep.memory.role + " at " + location.pos.x + "," + location.pos.y + ": " + result.toString());
                return result;
      }
      
      if(result == ERR_NOT_IN_RANGE) {
        return creep.moveTo(location);
      } else if(result == ERR_FULL) {
        return ERR_FULL;  
      } else if(result != 0) {
          console.log(creep.memory.role + " at " + location.id + ": " + result.toString());
      }
    },
    
    withdraw: function(creep, location) {
      actions.interact(creep, location, () => creep.withdraw(location, RESOURCE_ENERGY));
    },

    harvest: function(creep, target) {
      return actions.interact(creep, target, () => creep.harvest(target));
    },
    
    pickup: function(creep) {
        var rooms = Game.rooms;
        var targets = _.flatten(_.map(rooms, room => room.find(FIND_DROPPED_RESOURCES)));
        if(targets.length) {
            actions.interact(creep, targets[0], () => creep.pickup(targets[0]));
        }
    },

    upgrade: function(creep) {
      location = creep.room.controller;
      actions.interact(creep, location, () => creep.upgradeController(location));
    },

    charge: function(creep, location) {
      return actions.interact(creep, location, () => creep.transfer(location, RESOURCE_ENERGY));
    },

    build: function(creep) {
      var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
      if(targets.length) {
        actions.interact(creep, targets[0], () => creep.build(targets[0]));
      }
    }
};

module.exports = actions;