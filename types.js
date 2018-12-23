
module.exports = {
    basic: [WORK, CARRY, MOVE],
    normal : [WORK, WORK, CARRY, MOVE, MOVE, MOVE],
    ferry : [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    miner: [WORK, WORK, WORK, WORK, WORK, MOVE],
    lightMiner: [WORK, WORK, MOVE, MOVE],
    cost: function(type){
        var subtotal = type.length ;
        var works = _.filter (type, skill => skill == WORK).length
        return (works + subtotal) * 50;
    }
};