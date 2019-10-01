var rS = require('scout');
var u = require('utils');
var pC = require('powerCreeps');
var c = require('city');
var m = require('markets');
var s = require('stats');
var rp = require('roomplan');
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
    //new code
        var localRooms = u.splitRoomsByCity();
        var localCreeps = u.splitCreepsByCity();
        var myCities = _.filter(Game.rooms, (room) => rS.iOwn(room.name));
        let closestRoom = null;
        if(Game.time % 500 == 0){
            closestRoom = c.chooseColonizerRoom(myCities);
        }
        console.log("Time: " + Game.time);
        //run cities
        for (let i = 0; i < myCities.length; i += 1) {
            var city = myCities[i].memory.city;
            if (city !== "pit") {
                c.runCity(city, localCreeps[city]);
                c.updateCountsCity(city, localCreeps[city], localRooms[city], closestRoom);
                c.runTowers(city);
                // TODO: obs runs in dead cities
                c.runObs(city)
            }
        }
        //run power creeps
        //pC.run103207();
        pC.run138066();
        //distribute energy, power and upgrade boost
        if (Game.time % 100 === 0) {
            m.distributeEnergy(myCities);
            m.distributePower(myCities);
            m.distributeUpgrade(myCities);
        }

        if (Game.time % 50 === 25) {
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
        
 
        
        //clear labs in a room
        /*let creep = Game.creeps['a'];
        let labs = _.filter(creep.room.find(FIND_STRUCTURES), structure => structure.structureType === STRUCTURE_LAB)
        for(var i = 0; i < labs.length; i++){
            if(labs[i].mineralAmount > 0){
                let sum = _.sum(creep.carry)
                if(sum > 0){
                    creep.drop(Object.keys(creep.carry)[1])
                    return;
                }
                if(creep.withdraw(labs[i], labs[i].mineralType) == ERR_NOT_IN_RANGE){
                    creep.moveTo(labs[i]);
                }
                return;
            }
        }*/
    });
};

