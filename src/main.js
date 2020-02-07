var u = require('./utils');
var cM = require('./commodityManager')
var rPC = require('./powerCreep');
var c = require('./city');
var m = require('./markets');
var s = require('./stats');
var rp = require('./roomplan');
var er = require('./error');
var settings = require('./settings');
const profiler = require('./screeps-profiler');
var pp = require('./profiler-prep');
pp.prepProfile()

//Game.profiler.profile(1000);
//Game.profiler.output();
//Game.spawns['Home'].memory.counter = 934;
//Game.spawns['Home'].memory["runner"] = 5;
//Game.spawns['Home'].memory["attacker"] = 0;



profiler.enable();
module.exports.loop = function () {
    "use strict";
    profiler.wrap(function () {
        er.reset()

        var localRooms = u.splitRoomsByCity()
        var localCreeps = u.splitCreepsByCity()
        var myCities = u.getMyCities()
        let claimRoom, unclaimRoom

        // TODO add a setup function to validate memory etc
        if (!Memory.flags) Memory.flags = {}
        if(Game.time % 500 == 0){
            claimRoom = c.chooseClosestRoom(myCities,
                Game.flags.claimRally || Game.flags.claim)
            unclaimRoom = c.chooseClosestRoom(myCities,
                Game.flags.unclaimRally || Game.flags.unclaim)
            //em.expand() // grow the empire!
        }
        console.log("Time: " + Game.time);
        //run cities
        var prevCpu = Game.cpu.getUsed()
        for (let i = 0; i < myCities.length; i += 1) {
            try {
                var city = myCities[i].memory.city
                if(!city){
                    myCities[i].memory.city = myCities[i].name + '0'
                }
                let rcl = myCities[i].controller.level
                if (rcl < 8 && Game.cpu.bucket < settings.bucket.colony) {
                    continue // skip this city
                }
                c.runCity(city, localCreeps[city])
                c.updateCountsCity(city, localCreeps[city], localRooms[city], 
                    claimRoom, unclaimRoom)
                c.runTowers(city)
                // TODO: obs runs in dead cities
                c.runObs(city)
                let currentCpu = Game.cpu.getUsed()
                s.cityCpuMap[city] = currentCpu - prevCpu
                prevCpu = currentCpu
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
        if (Game.time % settings.roomplanTime == settings.roomplanOffset){
            rp.buildConstructionSites(); 
        }// TODO: this could go in run city?
        s.collectStats();
        if(Game.time % 400 == 39){//run commodity manager every 400 (lower than lowest batched reaction time, on the 39 so it'll be before dormant period ends)
            cM.runManager(myCities);
        }
        
        if (Game.time % settings.profileFrequency == 0) {
            Game.profiler.profile(settings.profileLength);
        }

        // This will always be last. Throw an exception if any city failed.
        er.finishTick()
    });
};

