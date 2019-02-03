var rSB = require('spawnBuilder');
var rC = require('claimer');
var rE = require('eye');
var rRo = require('robber');
var rF = require('ferry');
var rMM = require('mineralMiner');
var rU = require('upgrader');
var rB = require('builder');
var rR = require('runner');
var rBr = require('breaker');
var rT = require('transporter');
var rM = require('remoteMiner');
var rS = require('scout');
var rA = require('attacker');
var types = require('types');
var u = require('utils');
var T = require('tower');
var m = require('markets');
const profiler = require('screeps-profiler');
//Game.profiler.profile(1000);
//Game.profiler.output();
//Game.spawns['Home'].memory.counter = 934;
//Game.spawns['Home'].memory["runner"] = 5;
//Game.spawns['Home'].memory["attacker"] = 0;


function makeCreeps(role, type, target, city) {
    let extensions = _.filter(Game.structures, (structure) => (structure.structureType == STRUCTURE_EXTENSION) && (structure.room.controller.sign.text == [city])).length
    //console.log(extensions)
    //console.log(types.getRecipe('basic', 2));
    let recipe = types.getRecipe(type, extensions);
    //console.log(recipe)
    let spawns = Game.spawns[city].room.find(FIND_MY_SPAWNS);
    let name = Game.spawns['Home'].memory.counter.toString();
    if (types.cost(recipe) <= Game.spawns[city].room.energyAvailable){
        spawn = u.getAvailableSpawn(spawns);

        if(spawn != null) {
            Game.spawns['Home'].memory.counter++;
            spawn.spawnCreep(recipe, name);

            Game.creeps[name].memory.role = role;
            Game.creeps[name].memory.target = target;
            Game.creeps[name].memory.city = city;
            Game.creeps[name].memory.new = true;
        }
	}
}
//runCity function
function runCity(city, localCreeps){
    if (Game.spawns[city]){
    	var roles = [rA, rT, rM, rR, rS, rU, rB, rMM, rF, rC, rSB, rBr] // order roles for priority
    	var nameToRole = _.groupBy(roles, role => role.name); // map from names to roles
    	var counts = _.countBy(localCreeps[city], creep => creep.memory.role); // lookup table from role to count
    
    	// Get counts for all roles, make first thing that doesn't have enough
        _.forEach(_.filter(roles, role => !counts[role.name]), role => counts[role.name] = 0);
        //console.log(JSON.stringify(roles));
        let nextRole = _.find(roles, role => (typeof counts[role.name] == "undefined" 
                    && Game.spawns[city].memory[role.name]) || (counts[role.name] < Game.spawns[city].memory[role.name]));
        // console.log(Game.spawns[city].memory.rM);
        if (nextRole) {
            //console.log(JSON.stringify(nextRole));
            makeCreeps(nextRole.name, nextRole.type, nextRole.target(), city);
        }
    
        // Print out each role & number of workers doing it
        var printout = _.map(roles, role => role.name + ": " + counts[role.name]);
        console.log(city + ': ' + printout.join(', ' ));
    
        // Run all the creeps in this city
        _.forEach(localCreeps[city], (creep, name) => nameToRole[creep.memory.role][0].run(creep));
    }
}
//updateCountsCity function
function updateCountsCity(city, localCreeps, localRooms){
    if (Game.spawns[city]){
    	if (Game.time % 500 === 0){
    	    //claimer and spawnBuilder reset
    	    Game.spawns[city].memory[rSB.name] = 0;
    	    Game.spawns[city].memory[rC.name] = 0;
            // automated upgrader count based on money
            var controller = Game.spawns[city].room.controller
            if (controller.level > 7){
                if (controller.ticksToDowngrade < 100000){
                    Game.spawns[city].memory[rU.name] = 1;
                } else if (controller.ticksToDowngrade > 180000){
                    Game.spawns[city].memory[rU.name] = 0;
                }
            } else {
                var banks = u.getWithdrawLocations(localCreeps[city][0]);
                //console.log(banks);
                var money = _.sum(_.map(banks, bank => bank.store[RESOURCE_ENERGY]));
                var capacity = _.sum(_.map(banks, bank => bank.storeCapacity));
                console.log('money: ' + money + ', ' + (100*money/capacity));
                if(money < (capacity * .5)){
                    Game.spawns[city].memory[rU.name] = Math.max(Game.spawns[city].memory[rU.name] - 1, 1); 
                }
                else if (money > (capacity * .52)){
                    Game.spawns[city].memory[rU.name] = Math.min(Game.spawns[city].memory[rU.name] + 1, 7);
                } else {
                    Game.spawns[city].memory[rU.name] = 1;
                }
            }
            // automated count for builders Game.rooms.controller.sign.text = city
            var constructionSites = _.flatten(_.map(localRooms[city], room => room.find(FIND_MY_CONSTRUCTION_SITES)));
            var buildings = _.flatten(_.map(localRooms[city], room => room.find(FIND_STRUCTURES)));
            var repairSites = _.filter(buildings, structure => (structure.hits < (structure.hitsMax*0.3)) && (structure.structureType != STRUCTURE_WALL));
            let totalSites = (Math.floor((repairSites.length)/10) + constructionSites.length);
            //console.log(constructionSites.length)
            //console.log(buildings)
            //console.log(repairSites.length + constructionSites.length)
            //console.log(totalSites)
            Game.spawns[city].memory[rB.name] = (totalSites > 0) ? 1 : 0;
            // automated count for transporters
            var extensions = _.filter(Game.structures, (structure) => (structure.structureType == STRUCTURE_EXTENSION) && (structure.room.controller.sign.text == [city])).length
            if (extensions < 1){
            	Game.spawns[city].memory[rT.name] = 0;
        	} else if (extensions < 10){
        		Game.spawns[city].memory[rT.name] = 1;
        	} else if (extensions < 20){
        		Game.spawns[city].memory[rT.name] = 2;
        	} else if (extensions < 60){
        	    Game.spawns[city].memory[rT.name] = 3;
        	} else {
        	    Game.spawns[city].memory[rT.name] = 2;
        	}
            
            // automated count for scouts
            if (Game.spawns[city].room.controller.level < 4){
            	var proxyRooms = 0;
        	} else if (Game.spawns[city].room.controller.level < 5){
        		var proxyRooms = 1;
        	} else if (Game.spawns[city].room.controller.level >= 5){
        		var proxyRooms = 2;
        	}
            Game.spawns[city].memory[rS.name] = 2 * proxyRooms;
        	
        }
    
        if (Game.time % 50 == 0) {
            // automated runner count based on miner distances
            var miners = _.filter(localCreeps[city], creep => creep.memory.role == "miner" || creep.memory.role == "remoteMiner");
            var distances = _.map(miners, miner => PathFinder.search(Game.spawns[city].pos, miner.pos).cost);
            var totalDistance = _.sum(distances);
            var extensions = _.filter(Game.structures, (structure) => (structure.structureType == STRUCTURE_EXTENSION) && (structure.room.controller.sign.text == [city])).length
            //console.log(Math.max(Math.ceil(1.0 * totalDistance * 10 / types.carry(types.getRecipe('runner', extensions))), 2));
            if (extensions < 5){
                var runners = Math.max(Math.ceil(1.0 * totalDistance * 10 / types.carry(types.getRecipe('runner', extensions))), 2);
                Game.spawns[city].memory[rR.name] = runners;
            } else {
                Game.spawns[city].memory[rR.name] = Math.max(Math.ceil(1.0 * totalDistance * 20 / types.carry(types.getRecipe('runner', extensions))), 2);
            }
            console.log(city + ': runners needed: ' + Game.spawns[city].memory[rR.name]);
            //automated ferry count
            //check if we have a terminal
            var terminal = Game.spawns[city].room.terminal
            var storage = Game.spawns[city].room.storage;
            if (!(terminal === undefined)){
                if (terminal.store.energy < 150000){
                    Game.spawns[city].memory[rF.name] = 1;
                } else if (storage.store['Utrium'] > 0){
                    Game.spawns[city].memory[rF.name] = 1;
                }
            } else {
                Game.spawns[city].memory[rF.name] = 0;
            }
            
            //emergency reproduction
            if (extensions >= 5){
                if (_.filter(localCreeps[city], creep => creep.memory.role == 'runner') < 1){
                    console.log('Making Emergency Runner')
                    makeCreeps('runner', 'erunner', 1, city);
                }
                if (_.filter(localCreeps[city], creep => creep.memory.role == 'remoteMiner') < 1){
                    console.log('Making Emergency Miner');
                    makeCreeps('remoteMiner', "lightMiner", 1, city);
                }
        
                    if (_.filter(localCreeps[city], creep => creep.memory.role == 'transporter') < 1){
                    console.log('Making Emergency Transporter');
                    makeCreeps('transporter', 'basic', 0, city);
                }
            }
        }
        
        if (Game.time % 30 == 0) {
            // Automated mineralMiner creation based on source status
            if (Game.spawns[city].room.controller.level > 5){
                var buildings = _.flatten(_.map(localRooms[city], room => room.find(FIND_STRUCTURES)));
                var extractor = _.find(buildings, structure => structure.structureType == STRUCTURE_EXTRACTOR);
                if(extractor){
                    var cityObject = Game.spawns[city].room;
                    var minerals = cityObject.find(FIND_MINERALS);
                    Game.spawns[city].memory[rMM.name] = (minerals[0].mineralAmount < 1) ? 0 : 1;
                } else {
                    Game.spawns[city].memory[rMM.name] = 0;
                }
            } else {
                Game.spawns[city].memory[rMM.name] = 0;
            }
            // Automated miner count based on sources
            var extensions = _.filter(Game.structures, (structure) => (structure.structureType == STRUCTURE_EXTENSION) && (structure.room.controller.sign.text == [city])).length
            var sources = _.flatten(_.map(localRooms[city], room => room.find(FIND_SOURCES)));
            //console.log(JSON.stringify(localRooms[city]));
            
            if (extensions < 5){
                Game.spawns[city].memory[rM.name] = sources.length*2;
            }
            else Game.spawns[city].memory[rM.name] = sources.length;
            
            // Automated attacker count for defense
            var enemyCounts = _.map(localRooms[city], room => {
                var allBadCreeps = room.find(FIND_HOSTILE_CREEPS);
                var invaders = _.reject(allBadCreeps, creep => creep.owner.username == "Source Keeper");
                return invaders.length;
            });
            Game.spawns[city].memory[rA.name] = _.sum(enemyCounts);
        }
    }
}

// Run the tower function
function runTowers(city){
    if (Game.spawns[city]){
        var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER && structure.room.controller.sign.text == city);
        var hostiles = Game.spawns[city].room.find(FIND_HOSTILE_CREEPS);
        for (i = 0; i < towers.length; i++){
            if(hostiles.length > 0){
                T.defend(towers[i]);
            }
            else {
                T.run(towers[i]);
                T.defend(towers[i]);
                T.heal(towers[i]);
            }
        }
    }
}


profiler.enable();
module.exports.loop = function () {
  profiler.wrap(function() {
    //new code
    var localRooms = u.splitRoomsByCity();
    var localCreeps = u.splitCreepsByCity();
    var myCities = _.filter(Game.rooms, room => rS.iOwn(room.name))
    console.log("Time: " + Game.time + ". " + u.getDropTotals() +  " lying on ground.");
    //run cities
    for (var i = 0; i < myCities.length; i++){
	    var city = myCities[i].controller.sign.text;
	    runCity(city, localCreeps)
	    updateCountsCity(city, localCreeps, localRooms)
	    runTowers(city)
    }
    //clear old creeps
    if (Game.time % 100 == 0) {
        for(var name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
                console.log('Clearing non-existing creep memory:', name);
            }
        }
    }
    //clear roads use for new expansions
    if (Game.time % 50000 == 0) {
        var roadSites = _.filter(Game.constructionSites, site => site.structureType == STRUCTURE_ROAD && !site.progress)
        for (var i = 0; i < roadSites.length; i++){
            var result = roadSites[i].remove();
        }
    }
      
      
      
      
      
    
    //market (seems to use about 3 cpu, so we can make this run every few ticks when we start needing cpu)
    if (Game.time % 10 == 1){
        var orders = Game.market.getAllOrders(order => order.resourceType == RESOURCE_UTRIUM &&     order.type == ORDER_BUY &&
            Game.market.calcTransactionCost(1000, 'W46N42', order.roomName) < 1000 && (order.price > 0.30) );
        if (orders.length && Game.spawns['Home'].room.terminal.store['U'] > orders[0].remainingAmount){
            Game.market.deal(orders[0].id, orders[0].remainingAmount, 'W46N42')
            console.log('order processed for ' + orders[0].remainingAmount + ' UTRIUM at a price of ' + orders[0].price);
        } else if(orders.length && Game.spawns['Home'].room.terminal.store['U'] > 0){
            Game.market.deal(orders[0].id, Game.spawns['Home'].room.terminal.store['U'], 'W46N42')
            console.log('order processed for ' + Game.spawns['Home'].room.terminal.store['U'] + ' UTRIUM at a price of ' + orders[0].price);
        }
        var energyOrders = Game.market.getAllOrders(order => order.resourceType == RESOURCE_ENERGY &&     order.type == ORDER_BUY &&
                Game.market.calcTransactionCost(1000, 'W46N42', order.roomName) < 1000 && (order.price > 0.09));

        if (energyOrders.length && (Game.spawns['Home'].room.terminal.store.energy > 70000)){ // we have energy orders and energy to sell
            sortedOrders = m.sortOrder(energyOrders).reverse();

            if (sortedOrders[0].remainingAmount > (Game.spawns['Home'].room.terminal.store.energy/2)){
                var store = Game.spawns['Home'].room.terminal.store.energy;
                var quantity = Math.floor(store/2);
                var result = Game.market.deal(sortedOrders[0].id, quantity, 'W46N42');
                console.log('order processed for ' + quantity + ' ENERGY at a price of ' + sortedOrders[0].price);
            } else{
                Game.market.deal(sortedOrders[0].id, sortedOrders[0].remainingAmount, 'W46N42')
                console.log('order processed for ' + sortedOrders[0].remainingAmount + ' ENERGY at a price of ' + sortedOrders[0].price);
            }
        }
        var sellOrders = Game.market.getAllOrders(order => order.resourceType == RESOURCE_UTRIUM &&     order.type == ORDER_SELL &&
            Game.market.calcTransactionCost(1000, 'W46N42', order.roomName) < 1000 && (order.price < 0.15) );
        if (sellOrders.length && Game.spawns['Home'].room.terminal.store['U'] < 50000){
            Game.market.deal(sellOrders[0].id, sellOrders[0].remainingAmount, 'W46N42')
            console.log('order processed for ' + sellOrders[0].remainingAmount + ' UTRIUM at a price of ' + sellOrders[0].price);
        }
    }
       
    
    
    //test stuff
    /*if (Game.time % 10 == 3){
        var creeps = Game.creeps;
	    var groupedCreeps = _.groupBy(creeps, creep => creep.memory.role);
	    //console.log(JSON.stringify(groupedCreeps[0]));
	    var myCities = _.filter(Game.rooms, room => rS.iOwn(room.name))
	    var city = myCities[0];
	    //console.log(JSON.stringify(city.controller.sign));
	    //console.log(JSON.stringify(Object.values(Game.creeps)[0]));
    }*/
    
  });
}
//Yoni TODO
//leap frog to W34N41 to conquer W28N37
// Ferry/lab work
//save CPU: save pos and id of all sources and remote controllers in memory so creeps can find them w/o vision
//save CPU: give scouts more claims, only send a scout to a controller when it drops below a certain threshold. store game.time when threshold will be hit in memory

//stolen strats:
/*the miners mine until the container is full, then they stop
and only continue mining when someone fetched its contents
no cpu go wasted, and all transportable energy is used
and the miners themselves repair the containers in their free time*/
//additional comments: manually placed containers at each source. Using above solution, miner goes to container pos instead of to the source container and source pos get paired using near


//Jordan TODO
//refine movement code


/*

lodash things:
_.chunk(array, [size=1]) (break array into chunks)
_.concat(array, 2, [3], [[4]]); (combine things to list)
_.difference([2, 1], [2, 3]);
_.flatten
_.flattenDeep (make list of lists into list)
_.join(array, [separator=',']) (combine strings)
_.union (combine sets)
_.head, _.tail, _.take, _.drop,
_.uniq (makes array into set)
_.zip/_.unzip, merge multiple arrays of same length by element, or split


_.countBy() // dictionary of counts
_.groupBy() // dictionary of groups
_.filter()
_.forEach()
_.keyBy(items, item => item.key) // make a dictionary of items
_.partition() make sublists
_.reduce(items, (a,b) => a + b) // combine all elements
_.reject() // opposite of filter, removes everything that's true
_.sample() //pick a random elem
_.size() // size/length

_.now() // date in ms

_.bind(fn, arg1, _, arg3) // put some args in fn
_.memoize(fn) // uses memoization on fn calls
_.clone
_.flow // sequence of fns

https://lodash.com/docs/4.17.11

*/
