// WORK, CARRY, MOVE, ATTACK, RANGED_ATTACK, HEAL, CLAIM, TOUGH

module.exports = {
    basic: [WORK, CARRY, MOVE],
    normal : [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
    ferry : [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    runner: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    transporter: [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    miner: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE],
    lightMiner: [WORK, WORK, MOVE, MOVE],
    scout: [CLAIM, MOVE],
    attacker: [TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK],
    cost: function(type){
        var costs = {'work': 100, 'carry': 50, 'move': 50, 
                    'attack': 80, 'claim': 600, 'heal': 250, 
                    'ranged_attack': 150, 'tough': 10};
        var costList = _.map(type, part => costs[part]);
        return _.sum(costList);
    },
    carry: function(type){
        return _.filter(type, part => part == CARRY).length * 50;
    }
};