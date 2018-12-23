
module.exports = {
    basic: [WORK, CARRY, MOVE],
    normal : [WORK, WORK, CARRY, MOVE, MOVE],
    ferry : [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    miner: [WORK, WORK, WORK, MOVE],
    cost: function(type){
        var subtotal = type.length ;
        var works = _.filter (type, skill => skill == WORK).length
        return (works + subtotal) * 50;
    }
};