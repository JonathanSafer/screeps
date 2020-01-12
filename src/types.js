function getRecipe(type, energyAvailable, room){
	let d = {};
    let rcl = room.controller.level

    // used at all rcls
    d.runner = scalingBody([2, 1], [CARRY, MOVE], energyAvailable)
    d.miner = minerBody(energyAvailable, rcl)
    d.normal = upgraderBody(energyAvailable, rcl)
    d.transporter = scalingBody([2, 1], [CARRY, MOVE], energyAvailable, 30)
    d.builder = builderBody(energyAvailable, rcl)
    d.defender = defenderBody(energyAvailable, rcl)

    // used at rcl 4+
    d.spawnBuilder = scalingBody([2, 3, 5], [WORK, CARRY, MOVE], energyAvailable)
    d.trooper = scalingBody([1, 1], [RANGED_ATTACK, MOVE], energyAvailable)

    // used at rcl 5+
    d.ferry = scalingBody([2, 1], [CARRY, MOVE], energyAvailable, 30)

    // rcl 8 only
    d.powerMiner = body([20, 20], [MOVE, ATTACK]);
    d.bigMedic = body([11, 10, 29], [TOUGH, MOVE, HEAL]);
    d.bigBreaker = body([10, 30, 10], [TOUGH, WORK, MOVE]);
    d.bigTrooper = body([16, 24, 10], [TOUGH, RANGED_ATTACK, MOVE]);
    d.depositMiner = body([20, 2, 22], [WORK, CARRY, MOVE]);

	switch (rcl) {
		case 4:
			//lvl 4 recipes
            d['medic'] = body([2, 2], [MOVE, HEAL]);
			break;
		case 5:
			//lvl 5 recipes
            d['medic'] = body([5, 5], [MOVE, HEAL]);
            d['robber'] = body([15, 15], [CARRY, MOVE]); 
            break;
		case 6:
			// lvl 6 recipes
            d['mineralMiner'] = body([12, 6, 9], [WORK, CARRY, MOVE]);
            d['medic'] = body([7, 7], [MOVE, HEAL]);
            d['robber'] = body([20, 20], [CARRY, MOVE]);
            break;
		case 7:
			// lvl 7 recipes
            d['mineralMiner'] = body([22, 10, 16], [WORK, CARRY, MOVE]);
            d['harasser'] = body([9, 8, 1], [MOVE, RANGED_ATTACK, HEAL]);
            d['medic'] = body([5, 20, 15], [TOUGH, MOVE, HEAL]);
            d['breaker'] = body([10, 10], [MOVE, WORK]);
            d['robber'] = body([25, 25], [CARRY, MOVE]);
            break;
		case 8:
            // lvl 8 recipes
            d['mineralMiner'] = body([22, 10, 16], [WORK, CARRY, MOVE]);
            d['harasser'] = body([20, 25, 5], [RANGED_ATTACK, MOVE, HEAL]);
            d['medic'] = body([25, 25], [MOVE, HEAL]);
            d['breaker'] = body([25, 25], [MOVE, WORK]);
            d['robber'] = body([25, 25], [CARRY, MOVE]);
            break;
        default:
            break;
	}

    d.basic = body([1,1,1],[WORK, CARRY, MOVE]);
    d.lightMiner = body([2, 2], [MOVE, WORK]);
    d.erunner = body([2, 1], [CARRY, MOVE]);
    d.claimer = body([5, 1], [MOVE, CLAIM]);
    if (type === 'depositMiner'){
        let dMinerCounts = dMinerCalc(room);
        d['depositMiner'] = body(dMinerCounts, [WORK, CARRY, MOVE])
    }
    if (d[type] == null) {
        return [WORK, CARRY, MOVE]
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
    let workTime = 1500 - (distance * 3);//distance x 3 since it'll take 2x as long on return
    let work = 20
    let carryAmount = test(work, workTime, harvested)
    let carry = Math.floor(carryAmount/100)*2 //carry must be an even number for 20 works
    if(carry < 8){// if we're getting less than 400 resource in a lifetime, drop the source
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
    return Math.ceil(DEPOSIT_EXHAUST_MULTIPLY*Math.pow(harvested,DEPOSIT_EXHAUST_POW))
}

function test(hpt, ticks, harvested) {
    const start = harvested;
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
    return (harvested - start);
}

function minerBody(energyAvailable, rcl) {
    // miners. at least 1 move. 5 works until we can afford 10
    let works = Math.floor((energyAvailable - BODYPART_COST[MOVE]) / BODYPART_COST[WORK])
    if (works >= 20 && rcl > 7) works = 20
    else if (works >= 10) works = 10
    else if (works >= 5) works = 5
    else works = Math.max(1, works)
    let energyAfterWorks = energyAvailable - works * BODYPART_COST[WORK]
    let moves = Math.floor(Math.min(works / 2, Math.max(1, energyAfterWorks / BODYPART_COST[MOVE])))
    let energyAfterMoves = energyAfterWorks - moves * BODYPART_COST[MOVE]
    let carries = rcl >= 7 ? Math.floor(Math.min(works / 2.5, energyAfterMoves / BODYPART_COST[CARRY])) : 0
    return body([works, carries, moves], [WORK, CARRY, MOVE])
}

function upgraderBody(energyAvailable, rcl) {
    // upgraders. At least 2 work, at least work/2 carry. at least (w+c)/2 move
    let types = [WORK, CARRY, MOVE]
    return rcl > 7 ? body([15, 15, 15], types) : scalingBody([4, 2, 3], types, energyAvailable)
}

function builderBody(energyAvailable, rcl) {
    let ratio = [2,1,1] // ratio at rcl1
    let ratio4 = [5,9,7]
    let ratio7 = [15,18,17]
    let types = [WORK, CARRY, MOVE]
    if (rcl >= 2) return scalingBody([1, 1, 1], types)
    if (rcl >= 4 && energyAvailable > cost(body(ratio4, types))) ratio = ratio4
    if (rcl >= 7 && energyAvailable > cost(body(ratio7, types))) ratio = ratio7
    return body(ratio, types)
}

function defenderBody(energyAvailable, rcl) {
    let ratio = [1,1,1] // ratio at rcl1
    let ratio4 = [2,4,6]
    let ratio6 = [2,6,10]
    let types = [TOUGH, MOVE, ATTACK]
    if (rcl == 2) ratio = [2,3,1]
    if (rcl == 3) ratio = [0,4,4]
    if (rcl >= 4 && energyAvailable > cost(body(ratio4, types))) ratio = ratio4
    if (rcl >= 6 && energyAvailable > cost(body(ratio6, types))) ratio = ratio6
    return body(ratio, types)
}

/**
 * ratio: ratio of parts in an array. i.e. [2, 1, 2]
 * types: types of part in an array. Must be same length as ratio. i.e. [MOVE, CARRY, MOVE]
 * energyAvailable: energy to use on this creep
 * maxOverride: (optional) max number of body parts to use on this creep
 */
function scalingBody(ratio, types, energyAvailable, maxOverride) {
    let baseCost = cost(body(ratio, types))
    let maxSize = maxOverride || MAX_CREEP_SIZE
    let scale = Math.floor(Math.min(energyAvailable / baseCost, maxSize / _.sum(ratio)))
    return body(ratio.map(x => x * scale), types)
}

module.exports = {
	getRecipe: getRecipe,
	cost: cost,
	carry: carry,
	body: body
};