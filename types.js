// WORK, CARRY, MOVE, ATTACK, RANGED_ATTACK, HEAL, CLAIM, TOUGH

//starter types
var extensions = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_EXTENSION).length;
if (extensions < 5){
    module.exports ={
        basic: [WORK, CARRY, MOVE],
        normal:[WORK, WORK, CARRY, MOVE],
        runner:[CARRY, CARRY, MOVE, MOVE],
        miner:[WORK, WORK, MOVE, MOVE],
        lightMiner: [WORK, WORK, MOVE, MOVE],
        erunner: [CARRY, CARRY, MOVE],
        transporter: [WORK, CARRY, CARRY, MOVE, MOVE],
        cost: function(type){
            var costList = _.map(type, part => BODYPART_COST[part]);
            return _.sum(costList);
        },
        carry: function(type){
            return _.filter(type, part => part == CARRY).length * CARRY_CAPACITY;
        }
        
    };
}
else if (extensions < 10){
    module.exports ={
        basic: [WORK, CARRY, MOVE],
        normal:[WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
        runner:[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
        miner:[WORK, WORK, WORK, WORK, WORK, MOVE],
        lightMiner: [WORK, WORK, MOVE, MOVE],
        erunner: [CARRY, CARRY, MOVE],
        transporter: [WORK, CARRY, CARRY, CARRY, MOVE, MOVE],
        cost: function(type){
            var costList = _.map(type, part => BODYPART_COST[part]);
            return _.sum(costList);
        },
        carry: function(type){
            return _.filter(type, part => part == CARRY).length * CARRY_CAPACITY;
        }
        
    };
}
else if(extensions < 20){
    module.exports ={
        basic: [WORK, CARRY, MOVE],
        normal:[WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
        runner:[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
        miner:[WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE],
        lightMiner: [WORK, WORK, MOVE, MOVE],
        erunner: [CARRY, CARRY, MOVE],
        transporter: [WORK, CARRY, CARRY, CARRY, MOVE, MOVE],
        scout: [CLAIM, MOVE],
        attacker: [TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK],
        cost: function(type){
            var costList = _.map(type, part => BODYPART_COST[part]);
            return _.sum(costList);
        },
        carry: function(type){
            return _.filter(type, part => part == CARRY).length * CARRY_CAPACITY;
        }
        
    };
}

else module.exports = {
    basic: [WORK, CARRY, MOVE],
    normal : [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
    ferry : [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    runner: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    transporter: [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    miner: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE],
    lightMiner: [WORK, WORK, MOVE, MOVE],
    scout: [CLAIM, MOVE],
    erunner: [CARRY, CARRY, MOVE],
    attacker: [TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK],
    cost: function(type){
        var costList = _.map(type, part => BODYPART_COST[part]);
        return _.sum(costList);
    },
    carry: function(type){
        return _.filter(type, part => part == CARRY).length * CARRY_CAPACITY;
    }
};