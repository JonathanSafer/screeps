// WORK, CARRY, MOVE, ATTACK, RANGED_ATTACK, HEAL, CLAIM, TOUGH

module.exports = {
    basic: [WORK, CARRY, MOVE],
    normal : [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
    ferry : [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    runner: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    transporter: [WORK, CARRY, CARRY, CARRY, MOVE, MOVE],
    miner: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE],
    lightMiner: [WORK, WORK, MOVE, MOVE],
    scout: [CLAIM, MOVE, MOVE],
    cost: function(type){
        var subtotal = type.length ;
        var works = _.filter (type, skill => skill == WORK).length
        var claims = _.filter (type, skill => skill == CLAIM).length
        return (works + subtotal + (claims * 11)) * 50;
    }
};