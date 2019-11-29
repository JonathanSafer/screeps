var rDM = require('depositMiner');
var rMe = require('medic');
var rH = require('harasser');
var rSB = require('spawnBuilder');
var rC = require('claimer');
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
var u = require('utils');
var rD = require('defender');
var rPM = require('powerMiner');

var stats = {
    collectStats: function() {
        //stats
        if(Game.time % 19 == 0){
            //activate segment
            RawMemory.setActiveSegments([0])
        }
        if (Game.time % 19 == 1){
            RawMemory.setActiveSegments([])
            let stats = {}
            stats['cpu.bucket'] = Game.cpu.bucket
            stats['cpu.bucket'] = Game.cpu.bucket
            stats['gcl.progress'] = Game.gcl.progress
            stats['gcl.progressTotal'] = Game.gcl.progressTotal
            stats['gcl.level'] = Game.gcl.level
            stats['gpl.progress'] = Game.gpl.progress
            stats['gpl.progressTotal'] = Game.gpl.progressTotal
            stats['gpl.level'] = Game.gpl.level
            stats['energy'] = u.getDropTotals()
            var cities = [];
            _.forEach(Object.keys(Game.rooms), function(roomName){
              let room = Game.rooms[roomName]
              let city = Game.rooms[roomName].memory.city;
              cities.push(city);
        
              if(room.controller && room.controller.my){
                stats['rooms.' + city + '.rcl.level'] = room.controller.level
                stats['rooms.' + city + '.rcl.progress'] = room.controller.progress
                stats['rooms.' + city + '.rcl.progressTotal'] = room.controller.progressTotal
        
                stats['rooms.' + city + '.spawn.energy'] = room.energyAvailable
                stats['rooms.' + city + '.spawn.energyTotal'] = room.energyCapacityAvailable
        
                if(room.storage){
                  stats['rooms.' + city + '.storage.energy'] = room.storage.store.energy
                }
              }
            })
            var counts = _.countBy(Game.creeps, creep => creep.memory.role);
            var roles = [rA, rT, rM, rR, rU, rB, rS, rMM, rF, rC, rSB, rH, rMe, rD, rBr, rPM, rRo] 
            _.forEach(roles, function(role){
                if (counts[role.name]){
                    stats['creeps.' + role.name + '.count'] = counts[role.name]
                } else {
                    stats['creeps.' + role.name + '.count'] = 0
                }
            });
            var cityCounts = _.countBy(Game.creeps, creep => creep.memory.city);
            _.forEach(cities, function(city){
                if (cityCounts[city]){
                    stats['cities.' + city + '.count'] = cityCounts[city]
                } else {
                    stats['cities.' + city + '.count'] = 0
                }
            });
            stats['market.credits'] = Game.market.credits
            stats['cpu.getUsed'] = Game.cpu.getUsed()
            
            RawMemory.segments[0] = JSON.stringify(stats)
        }  
    }
}

module.exports = stats;