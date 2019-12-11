var u = require('utils');
var cM = require('commodityManager')
var rPC = require('powerCreep');
var c = require('city');
var m = require('markets');
var s = require('stats');
var rp = require('roomplan');
var er = require('error');
var em = require('empire');
const profiler = require('screeps-profiler');

profiler.registerObject(c, 'city');
profiler.registerObject(rPC, 'powerCreep');
profiler.registerObject(u, 'utils');
profiler.registerObject(m, 'markets');

var rMe = require('medic');
profiler.registerObject(rMe, 'medic');
var rDM = require('depositMiner');
profiler.registerObject(rDM, 'depositMiner');
var rp = require('roomplan');
profiler.registerObject(rp, 'roomplan');
var rBM = require('bigMedic')
profiler.registerObject(rBM, 'bigMedic');
var rTr = require('trooper')
profiler.registerObject(rTr, 'trooper');
var rBT = require('bigTrooper')
profiler.registerObject(rBT, 'bigTrooper');
var rBB = require('bigBreaker')
profiler.registerObject(rBB, 'bigBreaker');
var rH = require('harasser');
profiler.registerObject(rH, 'harasser');
var rSB = require('spawnBuilder');
profiler.registerObject(rSB, 'spawnBuilder');
var rC = require('claimer');
profiler.registerObject(rC, 'claimer');
var rE = require('eye');
profiler.registerObject(rE, 'eye');
var rRo = require('robber');
profiler.registerObject(rRo, 'robber');
var rF = require('ferry');
profiler.registerObject(rF, 'ferry');
var rMM = require('mineralMiner');
profiler.registerObject(rMM, 'mineralMiner');
var rU = require('upgrader');
profiler.registerObject(rU, 'upgrader');
var rB = require('builder');
profiler.registerObject(rB, 'builder');
var rR = require('runner');
profiler.registerObject(rR, 'runner');
var rBr = require('breaker');
profiler.registerObject(rBr, 'breaker');
var rT = require('transporter');
profiler.registerObject(rT, 'transporter');
var rM = require('remoteMiner');
profiler.registerObject(rM, 'remoteMiner');
var rS = require('scout');
profiler.registerObject(rS, 'scout');
var rA = require('attacker');
profiler.registerObject(rA, 'attacker');
var types = require('types');
profiler.registerObject(types, 'types');
var t = require('tower');
profiler.registerObject(t, 'tower');
var rD = require('defender');
profiler.registerObject(rD, 'defender');
var rPM = require('powerMiner');
profiler.registerObject(rPM, 'pwoerMiner');
var labs = require('labs');
profiler.registerObject(labs, 'labs');
var fact = require('factory');
profiler.registerObject(fact, 'factory');
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
            //em.expand() // grow the empire!
        }
        console.log("Time: " + Game.time);
        //run cities
        for (let i = 0; i < myCities.length; i += 1) {
            try {
                var city = myCities[i].memory.city
                if(!city){
                    myCities[i].memory.city = myCities[i].name + '0'
                }
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
        m.manageMarket(myCities);

        //rp.findRooms();
        //rp.planRooms();
        if (Game.time % 500 == 155){
            rp.buildConstructionSites(); 
        }// TODO: this could go in run city?
        s.collectStats();
        if(Game.time % 400 == 39){//run commodity manager every 400 (lower than lowest batched reaction time, on the 39 so it'll be before dormant period ends)
            cM.runManager(myCities);
        }
        
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

