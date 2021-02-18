var motion = require("../lib/motion")

function getRecipe(type, energyAvailable, room, boosted, flagName){
    const energy = energyAvailable || 0
    const d = {}
    const rcl = room.controller.level

    // used at all rcls
    d.scout = [MOVE]
    d.quad = quadBody(energy, rcl, room, boosted)
    d.runner = rcl == 1 ? scalingBody([1, 1], [CARRY, MOVE], energy) : scalingBody([2, 1], [CARRY, MOVE], energy)
    d.miner = minerBody(energy, rcl)
    d.normal = upgraderBody(energy, rcl, room)
    d.transporter = scalingBody([2, 1], [CARRY, MOVE], energy, 30)
    d.builder = builderBody(energy, rcl)
    d.defender = defenderBody(energy, rcl, boosted)
    d.unclaimer = scalingBody([2, 1], [MOVE, CLAIM], energy)
    d.harasser = harasserBody(energy, boosted, rcl)

    // used at rcl 4+
    d.spawnBuilder = scalingBody([2, 3, 5], [WORK, CARRY, MOVE], energy)
    d.trooper = scalingBody([1, 1], [RANGED_ATTACK, MOVE], energy)

    // used at rcl 5+
    d.ferry = scalingBody([2, 1], [CARRY, MOVE], energy, 30)
    d.breaker = breakerBody(energy, rcl, boosted)
    d.medic = medicBody(energy, rcl, boosted)

    // rcl 8 only
    d.powerMiner = pMinerBody(boosted)

    switch (rcl) {
    case 4:
        //lvl 4 recipes
        break
    case 5:
        //lvl 5 recipes
        d["robber"] = body([15, 15], [CARRY, MOVE]) 
        break
    case 6:
        // lvl 6 recipes
        d["mineralMiner"] = body([12, 6, 9], [WORK, CARRY, MOVE])
        d["robber"] = body([20, 20], [CARRY, MOVE])
        break
    case 7:
        // lvl 7 recipes
        d["mineralMiner"] = body([22, 10, 16], [WORK, CARRY, MOVE])
        d["robber"] = body([25, 25], [CARRY, MOVE])
        break
    case 8:
        // lvl 8 recipes
        d["mineralMiner"] = body([22, 10, 16], [WORK, CARRY, MOVE])
        d["robber"] = body([25, 25], [CARRY, MOVE])
        break
    default:
        break
    }

    d.basic = body([1,1,1],[WORK, CARRY, MOVE])
    d.lightMiner = body([2, 2], [MOVE, WORK])
    d.erunner = body([2, 1], [CARRY, MOVE])
    d.claimer = body([5, 1], [MOVE, CLAIM])
    if (type === "depositMiner"){
        const dMinerCounts = dMinerCalc(room, boosted, flagName)
        d["depositMiner"] = body(dMinerCounts, [WORK, CARRY, MOVE])
    }
    if (d[type] == null) {
        return [WORK, CARRY, MOVE]
    }
    return d[type]//recipe
}
function body(counts, order) { // order is list of types from move, work, attack, store, heal, ranged, tough, claim
    // assert counts.length == order.length
    const nestedPartsLists = _.map(counts, (count, index) => Array(count).fill(order[index]))
    return _.flatten(nestedPartsLists)
}

//cost and store functions
function cost(recipe){
    var costList = _.map(recipe, part => BODYPART_COST[part])
    return _.sum(costList)
}
function store(recipe){
    return _.filter(recipe, part => part == CARRY).length * CARRY_CAPACITY
}
function dMinerCalc(room, boosted, flagName){
    const city = room.memory.city
    const spawn = Game.spawns[city]
    const baseBody = [1, 1, 1]
    const flag = Memory.flags[flagName]
    if(!flag){
        return baseBody
    }
    let harvested = flag.harvested
    if(!harvested){
        harvested = 0
    }
    //distance calculated using method of travel for consistency
    const distance = motion.getRoute(spawn.pos.roomName, flag.roomName, true).length * 50
    const workTime = CREEP_LIFE_TIME - (distance * 3)//distance x 3 since it'll take 2x as long on return
    
    const result = depositMinerBody(workTime, harvested, boosted, baseBody)
    if (_.isEqual(result, baseBody)) {
        delete Memory.flags[flagName]
    }
    return result
}

function depositMinerBody(workTime, harvested, boosted, baseBody) {
    let works = 20
    let carries = getCarriesFromWorks(works, workTime, harvested, boosted)
    if(carries < 8){// if we're getting less than 400 resource in a lifetime, drop the source
        return baseBody
    }
    if(carries > 10){
        //body is impossible so we have to decrease works
        for(var i = 0; i < 2; i++){
            works = works/2
            carries = getCarriesFromWorks(works, workTime, harvested, boosted)
            const moves = Math.max(Math.ceil((works + carries)/2), works)
            if(works + carries + moves <= MAX_CREEP_SIZE){
                return [works, carries, moves]
            }
        }
        //can't go under 5 works => make max body
        const moves = Math.floor(MAX_CREEP_SIZE / 3)
        carries = 2 * moves - works
        return [works, carries, moves]
    } else {
        const moves = works
        return [works, carries, moves]
    }
}

function getCarriesFromWorks(works, workTime, alreadyHarvested, boosted) {
    const workPower = getWorkPower(works, boosted)
    const carryAmount = 
        getHarvestResults(workPower, workTime, alreadyHarvested) - alreadyHarvested
    return getCarriesNeeded(carryAmount, boosted)
}

function getWorkPower(work, boosted) {
    if (boosted) return work * BOOSTS[WORK][RESOURCE_CATALYZED_UTRIUM_ALKALIDE].harvest
    else return work
}

function getCarriesNeeded(resourceAmount, boosted) {
    const boostMultiple = BOOSTS[CARRY][RESOURCE_CATALYZED_KEANIUM_ACID].capacity
    const resourcesPerCarry = boosted ? CARRY_CAPACITY * boostMultiple : CARRY_CAPACITY
    return Math.floor(resourceAmount/resourcesPerCarry)
}

function calcCooldown(harvested) {
    return Math.ceil(DEPOSIT_EXHAUST_MULTIPLY*Math.pow(harvested,DEPOSIT_EXHAUST_POW))
}

function getHarvestResults(works, ticks, harvested){
    if(ticks <= 0){
        return harvested
    } else {
        return getHarvestResults(works, ticks - calcCooldown(harvested + works) - 1, harvested + works)
    }
}

function pMinerBody(boosted){
    if(boosted){
        return body([3, 16, 19], [TOUGH, ATTACK, MOVE])
    }
    return body([20, 20], [MOVE, ATTACK])
}

function minerBody(energyAvailable, rcl) {
    // miners. at least 1 move. 5 works until we can afford 10
    let works = Math.floor((energyAvailable) / BODYPART_COST[WORK])
    if (works >= 25 && rcl > 7 && !PServ) works = 25
    else if (works > 10 && (!PServ || rcl >= 6)) works = 10
    else if (works > 6) works = 6
    else works = Math.max(1, works)
    const energyAfterWorks = energyAvailable - works * BODYPART_COST[WORK]
    const moves = rcl >= 6 ? Math.floor(Math.min(Math.ceil(works / 2), Math.max(1, energyAfterWorks / BODYPART_COST[MOVE]))): 0
    const energyAfterMoves = energyAfterWorks - moves * BODYPART_COST[MOVE]
    const minCarries = energyAfterMoves/BODYPART_COST[CARRY] >= 1 ? 1 : 0
    
    // Figure out how many carries we can afford/will fill the link in fewest ticks
    const carriesPerLinkFill = Game.cpu.bucket < 9500 ? Math.ceil(LINK_CAPACITY / CARRY_CAPACITY) : Math.ceil(LINK_CAPACITY / CARRY_CAPACITY)/4
    const loadsNeeded = (c => c <= 0 ? Infinity : Math.ceil(carriesPerLinkFill / c))
    const storeChoices = [...Array(carriesPerLinkFill + 1).keys()] // range [0,n + 1]
        .filter(c => loadsNeeded(c) < loadsNeeded(c - 1)) // more carries => fewer loads?
        .filter(c => c <= energyAfterMoves / BODYPART_COST[CARRY])  // how many can we afford?
        .filter(c => works + c + moves <= MAX_CREEP_SIZE)
    const carries = rcl >= 6 ? Math.max(...storeChoices, minCarries) : minCarries
    return body([works, carries, moves], [WORK, CARRY, MOVE])
}

function upgraderBody(energyAvailable, rcl, room) {
    const controller = room.controller
    const isBoosted = controller.effects && controller.effects.length > 0
    const boost = isBoosted ? 
        POWER_INFO[PWR_OPERATE_CONTROLLER].effect[controller.effects[0].level - 1] : 0
    const maxWorks = CONTROLLER_MAX_UPGRADE_PER_TICK + boost
    const types = [WORK, CARRY, MOVE]
    if ([6, 7].includes(rcl)) { // use boost ratio 5 work, 3 store
        return scalingBody([5, 3, 4], types, energyAvailable)
    } else if (isBoosted) {
        return scalingBody([4, 1, 1], types, energyAvailable, Math.min(maxWorks * 1.5, MAX_CREEP_SIZE))
    } else if (rcl == 8){// don't go over 15 work for rcl8
        return scalingBody([5, 3, 4], types, energyAvailable, 36)
    } else {
        return scalingBody([1, 1, 1], types, energyAvailable)
    }
}

function builderBody(energyAvailable, rcl) {
    let ratio = [2,1,1] // ratio at rcl1
    const ratio4 = [5,9,7]
    const ratio7 = [15,18,17]
    const types = [WORK, CARRY, MOVE]
    if (rcl >= 2) return scalingBody([1, 1, 1], types, energyAvailable)
    if (rcl >= 4 && energyAvailable > cost(body(ratio4, types))) ratio = ratio4
    if (rcl >= 7 && energyAvailable > cost(body(ratio7, types))) ratio = ratio7
    return body(ratio, types)
}

function quadBody(energyAvailable, rcl, room, boosted){
    if(boosted){
        //make boosted variant
        if(rcl == 8){
            return body([2, 18, 9, 8, 1, 12], [TOUGH, RANGED_ATTACK, MOVE, TOUGH, MOVE, HEAL])
        }
        if(rcl == 7){
            const ratio = [1, 4, 1, 1, 1, 2]
            const types = [TOUGH, RANGED_ATTACK, MOVE, TOUGH, MOVE, HEAL]
            return scalingBody(ratio, types, energyAvailable)
        }
    }
    //make unboosted variant
    const types = [RANGED_ATTACK, MOVE, HEAL]
    let ratio = [0, 1, 0]
    switch(rcl){
    case 2:
        ratio = [1, 2, 1]
        break
    case 3:
        ratio = [2, 3, 1]
        break
    case 4:
        ratio = [5, 6, 1]
        break
    case 5:
        ratio = [3, 4, 1]
        break
    case 6:
        ratio = [7, 10, 3]
        break
    case 7:
        ratio = [19, 25, 6]
        break
    case 8:
        ratio = [15, 25, 10]
        break
    }
    return scalingBody(ratio, types, energyAvailable)
}

function defenderBody(energyAvailable, rcl, boosted) {
    if(boosted){
        if(rcl == 8){
            return body([6, 22, 10, 12], [TOUGH, RANGED_ATTACK, MOVE, HEAL])
        }
        if(rcl == 7){
            return scalingBody([1, 9, 3, 2], [TOUGH, RANGED_ATTACK, MOVE, HEAL], energyAvailable)
        }
    }
    const ratio = [3, 4, 1]
    const types = [RANGED_ATTACK, MOVE, HEAL]
    const baseCost = cost(body(ratio, types))
    if(baseCost > energyAvailable){
        return body([1, 1], [RANGED_ATTACK, MOVE])
    }
    return scalingBody(ratio, types, energyAvailable)
}

function harasserBody(energyAvailable, boosted, rcl){
    if(boosted){
        if(rcl == 8)
            return body([3, 31, 10, 6], [TOUGH, RANGED_ATTACK, MOVE, HEAL])
        if(rcl == 7)
            return scalingBody([1, 9, 3, 2], [TOUGH, RANGED_ATTACK, MOVE, HEAL], energyAvailable)
    }
    return scalingBody([4, 5, 1], [RANGED_ATTACK, MOVE, HEAL], energyAvailable)
}

function breakerBody(energyAvailable, rcl, boosted){
    if(!boosted){
        return scalingBody([1 , 1], [WORK, MOVE], energyAvailable)
    }
    return scalingBody([1, 3, 1], [TOUGH, WORK, MOVE], energyAvailable)
}

function medicBody(energyAvailable, rcl, boosted){
    if(!boosted){
        return scalingBody([1 , 1], [HEAL, MOVE], energyAvailable)
    }
    return scalingBody([1, 3, 1], [TOUGH, HEAL, MOVE], energyAvailable)
}

/** TODO support for fractional scaling
 * ratio: ratio of parts in an array. i.e. [2, 1, 2]
 * types: types of part in an array. Must be same length as ratio. i.e. [MOVE, CARRY, MOVE]
 * energyAvailable: energy to use on this creep
 * maxOverride: (optional) max number of body parts to use on this creep
 */
function scalingBody(ratio, types, energyAvailable, maxOverride) {
    const baseCost = cost(body(ratio, types))
    const maxSize = maxOverride || MAX_CREEP_SIZE
    const energy = energyAvailable || 0
    const scale = Math.max(Math.floor(Math.min(energy / baseCost, maxSize / _.sum(ratio))), 1)
    return body(ratio.map(x => x * scale), types)
}

module.exports = {
    getRecipe: getRecipe,
    cost: cost,
    store: store,
    body: body,
    depositMinerBody: depositMinerBody,
}