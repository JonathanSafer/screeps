function getRecipe(type, extensions){
	let d = {};
	switch (Math.floor(extensions/5)) {
		case 0:
			//lvl 1 recipes
			//console.log('hi')
			d['basic'] = [CARRY, MOVE];
			d['runner'] = [CARRY, CARRY, MOVE, MOVE];
			d['normal'] = [WORK, WORK, CARRY, MOVE];
			d['miner'] = [MOVE, MOVE, WORK, WORK];
			d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
			d['erunner'] = [CARRY, CARRY, MOVE];
			d['transporter'] = [CARRY, CARRY, MOVE, MOVE];
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
			d['transporter'] = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
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
			d['transporter'] = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
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
			d['transporter'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
			d['builder'] = [WORK,WORK, WORK, WORK, WORK,CARRY, CARRY, CARRY, CARRY,CARRY, CARRY, CARRY, CARRY,CARRY,MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
			d['scout'] = [MOVE, MOVE, CLAIM, CLAIM];
			d['attacker'] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK];
			d['spawnBuilder'] = [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
    		d['claimer'] = [CLAIM, MOVE]
    		d['trooper'] = [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE]
    		d['medic'] = [HEAL, HEAL, MOVE, MOVE]
			break;
		case 6:
		case 7:
			//lvl 5 recipes
			d['basic'] = [WORK, CARRY, MOVE];
    		d['normal'] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['builder'] = [WORK,WORK, WORK, WORK, WORK,CARRY, CARRY, CARRY, CARRY,CARRY, CARRY, CARRY, CARRY,CARRY,MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['ferry'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
    		d['runner'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['transporter'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    		d['miner'] = [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK];
    		d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
    		d['scout'] = [MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM, CLAIM];
    		d['erunner'] = [CARRY, CARRY, MOVE];
    		d['attacker'] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK];
    		d['spawnBuilder'] = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]
    		d['claimer'] = [CLAIM, MOVE]
    		d['trooper'] = [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    		d['medic'] = [MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, HEAL, HEAL]
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
    		d['transporter'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    		d['miner'] = [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK];
    		d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
    		d['mineralMiner'] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
            	MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['scout'] = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM, CLAIM, CLAIM];
    		d['erunner'] = [CARRY, CARRY, MOVE];
    		d['attacker'] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK];
    		d['spawnBuilder'] = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]
    		d['claimer'] = [CLAIM, MOVE]
    	    d['trooper'] = [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    		d['medic'] = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL]
    		d['robber'] = body([20, 20], [CARRY, MOVE]);
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
    		d['ferry'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['runner'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        		CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        		MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['transporter'] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    		d['miner'] = [MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK];
    		d['lightMiner'] = [MOVE, MOVE, WORK, WORK];
    		d['mineralMiner'] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
				WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        		MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    		d['scout'] = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM, CLAIM, CLAIM, CLAIM, CLAIM, CLAIM];
    		d['erunner'] = [CARRY, CARRY, MOVE];
    		d['attacker'] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK];
    		d['spawnBuilder'] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
    		    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,];
		    d['claimer'] = [CLAIM, MOVE];
		    d['harasser'] = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, HEAL];
		    d['medic'] = [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL,
		        HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL]
	        d['breaker'] = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK]
	        d['trooper'] = [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, 
	        	RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, 
	        	MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
        	d['robber'] = body([25, 25], [CARRY, MOVE]);
    		break;
		case 12:
		    // lvl 8 recipes
		    d['eye'] = body([1], [WORK]);
    		d['basic'] = body([1,1,1],[WORK, CARRY, MOVE]);
    		d['normal'] = body([15, 15, 15],[WORK, CARRY, MOVE]);
    		d['builder'] = body([15, 9, 12], [WORK, CARRY, MOVE]);
    		d['ferry'] = body([20, 10], [CARRY, MOVE]);
    		d['runner'] = body([32, 16], [CARRY, MOVE]);
    		d['transporter'] = body([8, 4],[CARRY, MOVE]);
    		d['miner'] = body([14, 8, 20],[MOVE, CARRY, WORK]);
    		d['lightMiner'] = body([2, 2], [MOVE, WORK]);
    		d['mineralMiner'] = body([22, 10, 16], [WORK, CARRY, MOVE]);
    		d['scout'] = body([20, 8], [MOVE, CLAIM]);
    		d['erunner'] = body([2, 1], [CARRY, MOVE]);
    		d['attacker'] = body([2, 6, 10], [TOUGH, MOVE, ATTACK]);
    		d['spawnBuilder'] = body([10, 15, 25], [WORK,  CARRY, MOVE]);
		    d['claimer'] = body([1, 1], [CLAIM, MOVE]);
		    d['harasser'] = body([20, 25, 5], [RANGED_ATTACK, MOVE, HEAL]);
		    d['medic'] = body([25, 25], [MOVE, HEAL]);
	        d['breaker'] = body([25, 25], [MOVE, WORK]);
            d['defender'] = body([25, 25], [MOVE, ATTACK]);
            d['powerMiner'] = body([20, 20], [MOVE, ATTACK]);
            d['bigMedic'] = body([11, 10, 29], [TOUGH, MOVE, HEAL]);
            d['bigBreaker'] = body([10, 30, 10], [TOUGH, WORK, MOVE]);
            d['bigTrooper'] = body([16, 24, 10], [TOUGH, RANGED_ATTACK, MOVE]);
            d['trooper'] = body([25, 25], [RANGED_ATTACK, MOVE]);
            d['robber'] = body([25, 25], [CARRY, MOVE]);
            break;
	}
	return d[type]//recipe
}
function body(counts, order) { // order is list of types from move, work, attack, carry, heal, ranged, tough, claim
    // assert counts.length == order.length
    let nestedPartsLists = _.map(counts, (count, index) => Array(count).fill(order[index]));
    return _.flatten(nestedPartsLists);
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
	carry: carry,
	body: body
};