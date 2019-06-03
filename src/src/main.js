var rMe = require('medic');
var rBM = require('bigMedic')
var rTr = require('trooper')
var rBT = require('bigTrooper')
var rBB = require('bigBreaker')
var rPM = require('powerMiner');
var rH = require('harasser');
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
var rD = require('defender');
var u = require('utils');
var c = require('city');
var m = require('markets');
var rS = require('scout');
var pC = require('powerCreeps')
const profiler = require('screeps-profiler');
//Game.profiler.profile(1000);
//Game.profiler.output();
//Game.spawns['Home'].memory.counter = 934;
//Game.spawns['Home'].memory["runner"] = 5;
//Game.spawns['Home'].memory["attacker"] = 0;



//profiler.enable();
module.exports.loop = function () {
  profiler.wrap(function() {
    //new code
    var localRooms = u.splitRoomsByCity();
    var localCreeps = u.splitCreepsByCity();
    var myCities = _.filter(Game.rooms, room => rS.iOwn(room.name))
    console.log("Time: " + Game.time);
    //run cities
    for (var i = 0; i < myCities.length; i++){
	    var city = myCities[i].memory.city;
	    if (myCities[i].memory.hermit == true){
	        //c.runHermit
	        //c.updateCountsHermit
	        //c.runTowers
	    } else {
    	    c.runCity(city, localCreeps[city])
    	    c.updateCountsCity(city, localCreeps[city], localRooms[city])
    	    c.runTowers(city)
    	    //TODO: obs runs in dead cities
    	    //c.runObs(city)
	    }
    }
    //run power creeps
    //pC.run103207();
    //pC.run138066();
    //distribute energy and power
    if (Game.time % 100 == 0){
        m.distributeEnergy(myCities);
        m.distributePower(myCities);
    }
    if(Game.time % 50 == 25){
        m.distributeMinerals(myCities);
    }
    //collect taxes
    /*if(Game.time % 10000 == 0){
        let order = Game.market.getOrderById('5ce88792b30b0336207a07f3')
        if (order.remainingAmount < 1000){
            Game.market.extendOrder('5ce88792b30b0336207a07f3', 1000 - order.remainingAmount)
        }
        let transactions = Game.market.outgoingTransactions
        for (i = 0; i < transactions.length; i++){
            let t = transactions[i];
            if(t.order){
                if(t.order.id == '5ce88792b30b0336207a07f3'){
                    let taxee = t.recipient
                    let payed = (t.order.price * t.amount)
                    Game.notify('Tax of ' + payed + ' payed by ' + taxee)
                }
            }
        }
    }*/
    
    // if(Game.time % 100000 === 0){
    //     Game.market.deal('5ce88792b30b0336207a07f3', amount, [yourRoomName])
    // }
    
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
    //clear rooms
    if (Game.time % 50000 == 0){
       for(var name in Memory.rooms) {
            if(!Memory.rooms[name].city) {
                delete Memory.rooms[name];
                console.log('Clearing room memory:', name);
            }
        } 
    }
     
    //market (seems to use about 3 cpu, so we can make this run every few ticks when we start needing cpu)
    if (Game.time % 200 == 0){
        m.manageMarket(myCities);
    }
    //stats
    if (Game.time % 19 == 0){
        if(!Memory.stats){ Memory.stats = {} }
        Memory.stats['cpu.bucket'] = Game.cpu.bucket
        Memory.stats['gcl.progress'] = Game.gcl.progress
        Memory.stats['gcl.progressTotal'] = Game.gcl.progressTotal
        Memory.stats['gcl.level'] = Game.gcl.level
        Memory.stats['gpl.progress'] = Game.gpl.progress
        Memory.stats['gpl.progressTotal'] = Game.gpl.progressTotal
        Memory.stats['gpl.level'] = Game.gpl.level
        Memory.stats['energy'] = u.getDropTotals()
        var cities = [];
        _.forEach(Object.keys(Game.rooms), function(roomName){
          let room = Game.rooms[roomName]
          let city = Game.rooms[roomName].memory.city;
          cities.push(city);
    
          if(room.controller && room.controller.my){
            Memory.stats['rooms.' + city + '.rcl.level'] = room.controller.level
            Memory.stats['rooms.' + city + '.rcl.progress'] = room.controller.progress
            Memory.stats['rooms.' + city + '.rcl.progressTotal'] = room.controller.progressTotal
    
            Memory.stats['rooms.' + city + '.spawn.energy'] = room.energyAvailable
            Memory.stats['rooms.' + city + '.spawn.energyTotal'] = room.energyCapacityAvailable
    
            if(room.storage){
              Memory.stats['rooms.' + city + '.storage.energy'] = room.storage.store.energy
            }
          }
        })
        var counts = _.countBy(Game.creeps, creep => creep.memory.role);
        var roles = [rA, rT, rM, rR, rU, rB, rS, rMM, rF, rC, rSB, rH, rMe, rD, rBr, rPM, rRo] 
        _.forEach(roles, function(role){
            if (counts[role.name]){
                Memory.stats['creeps.' + role.name + '.count'] = counts[role.name]
            } else {
                Memory.stats['creeps.' + role.name + '.count'] = 0
            }
        });
        var cityCounts = _.countBy(Game.creeps, creep => creep.memory.city);
        _.forEach(cities, function(city){
            if (cityCounts[city]){
                Memory.stats['cities.' + city + '.count'] = cityCounts[city]
            } else {
                Memory.stats['cities.' + city + '.count'] = 0
            }
        });
        Memory.stats['market.credits'] = Game.market.credits
        Memory.stats['cpu.getUsed'] = Game.cpu.getUsed()
    }   
    
  });
}
//Yoni TODO

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
