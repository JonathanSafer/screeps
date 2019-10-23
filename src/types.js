function getRecipe(type, extensions, room){
	let d = {};

    let baseCost = 2 * BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
    let scale = Math.floor(Math.min(room.energyCapacityAvailable / baseCost, MAX_CREEP_SIZE / 3));
    d.runner = body([2 * scale, scale], [CARRY, MOVE]);

	switch (Math.floor(extensions/5)) {
		case 0:
			//lvl 1 recipes
            d.runner = body([2, 2], [CARRY, MOVE]);
            d['normal'] = body([2, 1, 1], [WORK, CARRY, MOVE]);
            d['miner'] = body([2, 2], [MOVE, WORK]);
            d['transporter'] = body([2, 2], [CARRY, MOVE]);
            d['builder'] = body([2, 1, 1], [WORK, CARRY, MOVE]);
            d['scout'] = body([1, 1], [MOVE, CLAIM]);
            d['attacker'] = body([1, 1, 1], [TOUGH, MOVE, ATTACK]);
			break;
		case 1:
			//lvl 2 recipes
            d['normal'] = body([3, 2, 3], [WORK, CARRY, MOVE]);
            d['miner'] = body([1, 5], [MOVE, WORK]);
            d['transporter'] = body([4, 2], [CARRY, MOVE]);
            d['builder'] = body([2, 2, 2], [WORK, CARRY, MOVE]);
            d['scout'] = body([1, 1], [MOVE, CLAIM]);
            d['attacker'] = body([2, 3, 1], [TOUGH, MOVE, ATTACK]);
			break;
		case 2:
		case 3:
			//lvl 3 recipes
            d['normal'] = body([4, 2, 3], [WORK, CARRY, MOVE]);
            d['miner'] = body([3, 5], [MOVE, WORK]);
            d['transporter'] = body([4, 2], [CARRY, MOVE]);
            d['builder'] = body([3, 2, 2], [WORK, CARRY, MOVE]);
            d['scout'] = body([1, 1], [MOVE, CLAIM]);
            d['attacker'] = body([4, 4], [MOVE, ATTACK]);
			break;
		case 4:
		case 5:
			//lvl 4 recipes
            d['normal'] = body([8, 4, 6], [WORK, CARRY, MOVE]);
            d['miner'] = body([3, 5], [MOVE, WORK]);
            d['transporter'] = body([8, 4], [CARRY, MOVE]);
            d['builder'] = body([5, 9, 7], [WORK, CARRY, MOVE]);
            d['scout'] = body([2, 2], [MOVE, CLAIM]);
            d['attacker'] = body([2, 4, 6], [TOUGH, MOVE, ATTACK]);
            d['spawnBuilder'] = body([4, 6, 10], [WORK, CARRY, MOVE]);
    		d['trooper'] = body([3, 3], [RANGED_ATTACK, MOVE]);
    		d['medic'] = body([2, 2], [MOVE, HEAL]);
			break;
		case 6:
		case 7:
			//lvl 5 recipes
    		d['normal'] = body([12, 4, 8], [WORK, CARRY, MOVE]);
    		d['builder'] = body([5, 9, 7], [WORK, CARRY, MOVE]);
    		d['ferry'] = body([6, 3], [CARRY, MOVE]);
    		d['transporter'] = body([8, 4], [CARRY, MOVE]);
    		d['miner'] = body([3, 5], [MOVE, WORK]);
    		d['scout'] = body([5, 2], [MOVE, CLAIM]);
    		d['attacker'] = body([2, 4, 6], [TOUGH, MOVE, ATTACK]);
    		d['spawnBuilder'] = body([5, 10, 15], [WORK, CARRY, MOVE]);
    		d['trooper'] = body([6, 6], [RANGED_ATTACK, MOVE]);
    		d['medic'] = body([5, 5], [MOVE, HEAL]);
    		break;
		case 8:
		case 9:
			// lvl 6 recipes
    		d['normal'] = body([12, 8, 10], [WORK, CARRY, MOVE]);
    		d['builder'] = body([5, 9, 7], [WORK, CARRY, MOVE]);
    		d['ferry'] = body([6, 3], [CARRY, MOVE]);
    		d['transporter'] = body([8, 4], [CARRY, MOVE]);
    		d['miner'] = body([3, 5], [MOVE, WORK]);
    		d['mineralMiner'] = body([12, 6, 9], [WORK, CARRY, MOVE]);
    		d['scout'] = body([8, 3], [MOVE, CLAIM]);
    		d['attacker'] = body([2, 6, 10], [TOUGH, MOVE, ATTACK]);
    		d['spawnBuilder'] = body([5, 10, 15], [WORK, CARRY, MOVE]);
    	    d['trooper'] = body([8, 8], [RANGED_ATTACK, MOVE]);
    		d['medic'] = body([7, 7], [MOVE, HEAL]);
    		d['robber'] = body([20, 20], [CARRY, MOVE]);
    		break;
		case 10:
		case 11:
			// lvl 7 recipes
    		d['normal'] = body([20, 12, 16], [WORK, CARRY, MOVE]);
    		d['builder'] = body([5, 9, 7], [WORK, CARRY, MOVE]);
    		d['ferry'] = body([20, 10], [CARRY, MOVE]);
    		d['transporter'] = body([8, 4], [CARRY, MOVE]);
    		d['miner'] = body([5, 10], [MOVE, WORK]);
    		d['mineralMiner'] = body([22, 10, 16], [WORK, CARRY, MOVE]);
    		d['scout'] = body([15, 6], [MOVE, CLAIM]);
    		d['attacker'] = body([2, 6, 10], [TOUGH, MOVE, ATTACK]);
    		d['spawnBuilder'] = body([10, 15, 25], [WORK, CARRY, MOVE]);
		    d['harasser'] = body([9, 8, 1], [MOVE, RANGED_ATTACK, HEAL]);
		    d['medic'] = body([5, 20, 15], [TOUGH, MOVE, HEAL]);
	        d['breaker'] = body([10, 10], [MOVE, WORK]);
	        d['trooper'] = body([20, 20], [RANGED_ATTACK, MOVE]);
        	d['robber'] = body([25, 25], [CARRY, MOVE]);
    		break;
		case 12:
		    // lvl 8 recipes
    		d['normal'] = body([15, 15, 15],[WORK, CARRY, MOVE]);
    		d['builder'] = body([15, 18, 17], [WORK, CARRY, MOVE]);
    		d['ferry'] = body([20, 10], [CARRY, MOVE]);
    		d['transporter'] = body([8, 4],[CARRY, MOVE]);
    		d['miner'] = body([14, 8, 20],[MOVE, CARRY, WORK]);
    		d['mineralMiner'] = body([22, 10, 16], [WORK, CARRY, MOVE]);
    		d['scout'] = body([20, 8], [MOVE, CLAIM]);
    		d['attacker'] = body([2, 6, 10], [TOUGH, MOVE, ATTACK]);
    		d['spawnBuilder'] = body([10, 15, 25], [WORK,  CARRY, MOVE]);
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
            d['depositMiner'] = body([20, 2, 22], [WORK, CARRY, MOVE]);
            break;
	}

    d.eye = body([1], [MOVE]);
    d.basic = body([1,1,1],[WORK, CARRY, MOVE]);
    d.lightMiner = body([2, 2], [MOVE, WORK]);
    d.erunner = body([2, 1], [CARRY, MOVE]);
    d.claimer = body([5, 1], [MOVE, CLAIM]);
    if (type === 'depositMiner'){
        let dMinerCounts = dMinerCalc(room);
        d['depositMiner'] = body(dMinerCounts, [WORK, CARRY, MOVE])
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
function dMinerCalc(room){
    let city = room.memory.city
    let spawn = Game.spawns[city]
    let flagName = city + "deposit"
    let flag = Game.flags[flagName]
    if(!flag){
        return [1, 1, 1];//return 1,1, 1
    }
    let harvested = spawn.memory.deposit
    if(!harvested){
        harvested = 0
    }
    let distance = PathFinder.search(spawn.pos, {pos: flag.pos, range: 1}, {maxOps: 10000}).path.length
    let workTime = 1500 - (distance * 3) - 100;//100 is arbitrary buffer to be adjusted, distance x 3 since it'll take 2x as long on return
    let work = 20
    let carryAmount = test(work, workTime, harvested)
    let carry = Math.floor(carryAmount/50)
    if(carry < 2){// if we're getting less than 100 resource in a lifetime, drop the source
        flag.remove()
        return [1, 1, 1];
    }
    if(carry > 10){
        //body is impossible so we have to decrease works
        for(var i = 0; i < 2; i++){
            work = work/2
            carryAmount = test(work, workTime, harvested)
            carry = Math.floor(carryAmount/50)
            if(carry < (32 - work)){
                return [work, carry, 16]
            }
        }
        //can't go under 5 works => make min body
        return [work, 27, 16]
    } else {
        return [work, carry, 20]
    }

}
function calcCooldown(harvested) {
    return Math.ceil(0.001*Math.pow(harvested,1.2))
}

function test(hpt, ticks, harvested) {
    let cooldown = 0
    for (let i = 0; i < ticks; i++) {
        if (cooldown == 0) {
            harvested += hpt
            cooldown = calcCooldown(harvested);
        }
        else {
            cooldown--
        }
    }
    return harvested;
}

module.exports = {
	getRecipe: getRecipe,
	cost: cost,
	carry: carry,
	body: body
};