function getRecipe(type, extensions){
	let d = {};
	switch (Math.floor(extensions/5)) {
		case 0:
			//lvl 1 recipes
			//console.log('hi')
			d['basic'] = [WORK, CARRY, MOVE];
			d['runner'] = [CARRY, CARRY, MOVE, MOVE];
			d['normal'] = [WORK, WORK, CARRY, MOVE];
			d['miner'] = [MOVE, MOVE, WORK, WORK];
			d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
			d['erunner'] = [CARRY, CARRY, MOVE];
			d['transporter'] = [WORK, CARRY, CARRY, MOVE, MOVE];
			d['builder'] = [WORK, WORK, CARRY, MOVE];
			d['scout'] = [CLAIM, MOVE];
			d['attacker'] = [TOUGH, MOVE, ATTACK];
			break;
		case 1:
			//lvl 2 recipes
			d['basic'] = [WORK, CARRY, MOVE];
			d['runner'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
			d['normal'] = [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
			d['miner'] = [MOVE, WORK, WORK, WORK, WORK, WORK];
			d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
			d['erunner'] = [CARRY, CARRY, MOVE];
			d['transporter'] = [WORK, CARRY, CARRY, CARRY, MOVE, MOVE];
			d['builder'] = [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
			d['scout'] = [CLAIM, MOVE];
			d['attacker'] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK];
			break;
		case 2:
		case 3:
			//lvl 3 recipes
			d['basic'] = [WORK, CARRY, MOVE];
			d['runner'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
			d['normal'] = [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
			d['miner'] = [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK];
			d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
			d['erunner'] = [CARRY, CARRY, MOVE];
			d['transporter'] = [WORK, CARRY, CARRY, CARRY, MOVE, MOVE];
			d['builder'] = [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
			d['scout'] = [CLAIM, MOVE];
			d['attacker'] = [MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK];
			break;
		case 4:
		case 5:
			//lvl 4 recipes
			d['basic'] = [WORK, CARRY, MOVE];
			d['runner'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,CARRY, CARRY, CARRY, CARRY,CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,MOVE, MOVE];
			d['normal'] =  [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
			d['miner'] = [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK];
			d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
			d['erunner'] = [CARRY, CARRY, MOVE];
			d['transporter'] = [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
			d['builder'] = [WORK,WORK, WORK, WORK, WORK,CARRY, CARRY, CARRY, CARRY,CARRY, CARRY, CARRY, CARRY,CARRY,MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
			d['scout'] = [CLAIM, MOVE];
			d['attacker'] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK];
			break;
		case 6:
		case 7:
			//lvl 5 recipes
			d['basic'] = [WORK, CARRY, MOVE];
    		d['normal'] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['builder'] = [WORK,WORK, WORK, WORK, WORK,CARRY, CARRY, CARRY, CARRY,CARRY, CARRY, CARRY, CARRY,CARRY,MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['ferry'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
    		d['runner'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['transporter'] = [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    		d['miner'] = [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK];
    		d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
    		d['scout'] = [CLAIM, MOVE];
    		d['erunner'] = [CARRY, CARRY, MOVE];
    		d['attacker'] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK];
    		break;
		case 8:
		case 9:
			// lvl 6 recipes
			d['basic'] = [WORK, CARRY, MOVE];
    		d['normal'] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['builder'] = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,CARRY,MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['ferry'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
    		d['runner'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
            	CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
            	MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['transporter'] = [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    		d['miner'] = [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK];
    		d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
    		d['mineralMiner'] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
            	MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['scout'] = [CLAIM, MOVE];
    		d['erunner'] = [CARRY, CARRY, MOVE];
    		d['attacker'] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK];
    		break;
		case 10:
		case 11:
			// lvl 7 recipes
			d['eye'] = [MOVE];
    		d['basic'] = [WORK, CARRY, MOVE];
    		d['normal'] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
   				WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE,
    			MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['builder'] = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,CARRY,MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['ferry'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
    		d['runner'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        		CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        		MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['transporter'] = [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    		d['miner'] = [MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK];
    		d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
    		d['mineralMiner'] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
				WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        		MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['scout'] = [CLAIM, MOVE];
    		d['erunner'] = [CARRY, CARRY, MOVE];
    		d['attacker'] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK];
    		d['spawnBuilder'] = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
    		    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,];
    		break;
		case 12:
		    // lvl 8 recipes
		    d['eye'] = [MOVE];
    		d['basic'] = [WORK, CARRY, MOVE];
    		d['normal'] = [WORK, CARRY, MOVE];
    		d['builder'] = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,CARRY,MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['ferry'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
    		d['runner'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        		CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        		MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['transporter'] = [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    		d['miner'] = [MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK];
    		d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
    		d['mineralMiner'] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
				WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        		MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['scout'] = [CLAIM, MOVE];
    		d['erunner'] = [CARRY, CARRY, MOVE];
    		d['attacker'] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK];
    		d['spawnBuilder'] = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
    		    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,];
	}
	return d[type]//recipe
}
//cost and carry functions
function cost(recipe){
    var costList = _.map(recipe, part => BODYPART_COST[part]);
    return _.sum(costList);
}
function carry(recipe){
    return _.filter(recipe, part => part == CARRY).length * CARRY_CAPACITY;
}


module.exports = {
	getRecipe: getRecipe,
	cost: cost,
	carry: carry
};