var a = require("./actions")
var rBr = require("./breaker")

var rBB = {
    name: "bigBreaker",
    type: "bigBreaker",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.boosted){
            rBr.run(creep)
            return
        }
        a.getBoosted(creep)
        return
    }
   
}
module.exports = rBB