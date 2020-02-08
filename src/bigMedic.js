var a = require('./actions')
var rMe = require('./medic')

var rBM = {
    name: "bigMedic",
    type: "bigMedic",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.boosted){
            rMe.run(creep)
            return
        }
        a.getBoosted(creep)
        return
    }
   
}
module.exports = rBM