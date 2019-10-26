var u = require('utils');
var rPC = require('powerCreep');
var c = require('city');
var m = require('markets');
var s = require('stats');
var rp = require('roomplan');
var er = require('error');
var em = require('empire');
const profiler = require('screeps-profiler');
//Game.profiler.profile(1000);
//Game.profiler.output();
//Game.spawns['Home'].memory.counter = 934;
//Game.spawns['Home'].memory["runner"] = 5;
//Game.spawns['Home'].memory["attacker"] = 0;



//profiler.enable();
module.exports.loop = function () {
    "use strict";
    profiler.wrap(function () {
        er.reset()

        var localRooms = u.splitRoomsByCity()
        var localCreeps = u.splitCreepsByCity()
        var myCities = u.getMyCities()
        let closestRoom = null;

        // TODO add a setup function to validate memory etc
        if (!Memory.flags) Memory.flags = {}
        if(Game.time % 500 == 0){
            closestRoom = c.chooseColonizerRoom(myCities);
            em.expand() // grow the empire!
        }
        console.log("Time: " + Game.time);
        //run cities
        for (let i = 0; i < myCities.length; i += 1) {
            try {
                var city = myCities[i].memory.city
                if (city !== "pit") {
                    c.runCity(city, localCreeps[city])
                    c.updateCountsCity(city, localCreeps[city], localRooms[city], closestRoom)
                    c.runTowers(city)
                    // TODO: obs runs in dead cities
                    c.runObs(city)
                } 
            } catch (failedCityError) {
                er.reportError(failedCityError)
            }
            
        }
        //run power creeps
        _.forEach(Game.powerCreeps, function(powerCreep) {
            rPC.run(powerCreep)
        })

        //distribute energy, power and upgrade boost
        if (Game.time % 100 === 10) {
            m.distributeEnergy(myCities);
            m.distributePower(myCities);
            m.distributeUpgrade(myCities);
        }

        if (Game.time % 50 === 20) {
            m.distributeMinerals(myCities);
        }


        // if(Game.time % 100000 === 0){
        //     Game.market.deal('5ce88792b30b0336207a07f3', amount, [yourRoomName])
        // }
        //clear old creeps
        if (Game.time % 100 === 0) {
            for (let name in Memory.creeps) {
                if (!Game.creeps[name]) {
                    delete Memory.creeps[name];
                    console.log('Clearing non-existing creep memory:', name);
                }
            }
        }
        //clear rooms
        if (Game.time % 5000 === 0) {
           for (let name in Memory.rooms) {
                if (!Memory.rooms[name].city) {
                    delete Memory.rooms[name];
                    console.log('Clearing room memory:', name);
                }
            }
        }

        //market (seems to use about 3 cpu, so we can make this run every few ticks when we start needing cpu)
        if (Game.time % 200 === 0) {
            m.manageMarket(myCities);
        }

        //rp.findRooms();
        //rp.planRooms();
        if (Game.time % 500 == 155){
            rp.buildConstructionSites(); 
        }// TODO: this could go in run city?
        s.collectStats();
        
        //calc for deposit mining
        function calcCooldown(harvested) {
            return Math.ceil(0.001*Math.pow(harvested,1.2))
        }
        
        function test(hpt, ticks) {
            let harvested = 4000
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
            console.log("Harvested so far:", harvested);
            console.log("Last cooldown", calcCooldown(harvested));
        }
        //test(20,100)


        //clear labs in a room
        /*let creep = Game.creeps['a'];
        if(creep){
            let labs = _.filter(creep.room.find(FIND_STRUCTURES), structure => structure.structureType === STRUCTURE_LAB)
            for(var i = 0; i < labs.length; i++){
                if(labs[i].mineralAmount > 0){
                    let sum = _.sum(creep.carry)
                    if(sum > 0){
                        creep.drop(Object.keys(creep.store)[0])
                        return;
                    }
                    if(creep.withdraw(labs[i], labs[i].mineralType) == ERR_NOT_IN_RANGE){
                        creep.moveTo(labs[i]);
                    }
                    return;
                }
            }
        }*/
        // This will always be last. Throw an exception if any city failed.
        er.finishTick()
    });
};

