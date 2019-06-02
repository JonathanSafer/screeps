var a = require('actions');
var t = require('types');
var u = require('utils');
var rTr = require('trooper')

var rBT = {
    name: "bigTrooper",
    type: "bigTrooper",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.boosted){
            rTr.run(creep)
            return
        }
        a.getBoosted(creep)
        return
    }
   
};
module.exports = rBT;