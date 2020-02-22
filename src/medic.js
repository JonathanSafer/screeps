var a = require('actions');
var t = require('types');
var u = require('utils');

var rMe = {
    name: "medic",
    type: "medic",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.tickToLive === 1490) {
            creep.notifyWhenAttacked(false);
        }
        rMe.init(creep)
        let partner = Game.getObjectById(creep.memory.partner);
        if(!partner){
            //if partner is dead, suicide
            if(rMe.endlife(creep)){
                return
            }
            //if creep not matched, wait to be picked up
        }
    },  

    init: function(creep){
        if (!creep.memory.partner){
            creep.memory.partner = null
        }
    },

    endLife: function(creep){
        if(creep.memory.partner == null){
            return false
        } else {
            creep.suicide()
            return true
        }
    }


   
};
module.exports = rMe;