var u = require('utils');
var c = require('city');
var m = require('markets');
const profiler = require('screeps-profiler');
//Game.profiler.profile(1000);
//Game.profiler.output();
//Game.spawns['Home'].memory.counter = 934;
//Game.spawns['Home'].memory["runner"] = 5;
//Game.spawns['Home'].memory["attacker"] = 0;



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
	    c.runCity(city, localCreeps)
	    c.updateCountsCity(city, localCreeps, localRooms)
	    c.runTowers(city)
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
