//for now this just gets utrium from storage and puts in the terminal, but in the future this will also transport other minerals to and from the terminal, storage, and labs.
var actions = require('actions');
var t = require('types');
var u = require('utils');

var rF = {
    name: "ferry",
    type: "ferry",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        let carry = _.sum(creep.carry);
        //console.log(carry)
        if (carry < 1){
            let energy = creep.room.storage.store.energy;
            //console.log(energy)
            let storage = creep.room.storage;
            let location = _.clone(storage, true);
            delete location._store.energy//_.find(location.store, resource => resource == RESOURCE_ENERGY)
            let mineral =_.keys(location._store)[0];
            //console.log(creep.room.storage.store.energy)
            //console.log(mineral)
            //console.log(JSON.stringify(location.store))
            //console.log(((creep.room.terminal.store.energy < 150000) || (creep.room.terminal.store.energy == undefined)) && (storage.store.energy > 150000))
            //console.log(energy)
            if (((creep.room.terminal.store.energy < 150000) || (creep.room.terminal.store.energy == undefined)) && (energy > 150000)){
                actions.withdraw(creep, storage, RESOURCE_ENERGY);
            } else if (location._store[mineral] > 0){
                actions.withdraw(creep, storage, mineral);
            } else if (creep.room.terminal.store.energy > 155000){
                actions.withdraw(creep, creep.room.terminal, RESOURCE_ENERGY);
            }
        } else {
            if (creep.room.terminal.store.energy < 150000){
                let location = creep.room.terminal;
                actions.charge(creep, location);
            } else {
                let location = creep.room.storage;
                actions.charge(creep, location);
            }
        }
    }
};
module.exports = rF;