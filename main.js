var roleHarvester = require('roleHarvester');
var roleUpgrader = require('Upgrader');
var rB = require('roleBuilder');
var rR = require('roleRunner');
var rF = require('roleFerry');
var types = require('types');
var rT = require('roleTransporter');
var rM = require('remoteMiner');
var T = require('tower');

//Game.spawns['Home'].memory.counter = 0;

function makeCreeps(role, type, target) {
  spawn = Game.spawns['Home'];
  name = spawn.memory.counter.toString();
  if (types.cost(type) < spawn.room.energyAvailable && !spawn.spawning) {
    spawn.memory.counter++;
    spawn.spawnCreep( type, name);
    Game.creeps[name].memory.role = role;
    Game.creeps[name].memory.target = target;
  }
}
//spawn.room.energyAvailable

module.exports.loop = function () {
    var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER);
    var miners = _.filter(Game.creeps, (creep) => creep.memory.role == 'miner');
    var upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'Upgrader');
    var builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'roleBuilder');
    var runners = _.filter(Game.creeps, (creep) => creep.memory.role == 'runner');
    var ferries = _.filter(Game.creeps, (creep) => creep.memory.role == 'ferry');
    var transporters = _.filter(Game.creeps, (creep) => creep.memory.role == 'transporter')
    var remoteMiners = _.filter(Game.creeps, (creep) => creep.memory.role == 'remoteMiner')
    if(miners.length < 2) {makeCreeps('miner', types.miner, 1);}
    else if(runners.length < 5) {makeCreeps('runner', types.ferry, 0)}
    else if(ferries.length < 1) {makeCreeps('ferry', types.ferry, 0)}
    else if(transporters.length < 2) {makeCreeps('transporter', types.normal, 0)}
    else if(upgraders.length < 15) {makeCreeps('Upgrader', types.normal, 0)}
    else if(builders.length < 4) {makeCreeps('roleBuilder', types.normal, 0)}
    //else if(remoteMiners.length < 1) {makeCreeps('remoteMiner', types.lightMiner, 0)}
    console.log('Miners: ' + miners.length + ' Upgraders: ' + upgraders.length + ' Builders: ' + builders.length + ' Ferries: ' + ferries.length + ' Runners: ' + runners.length +
    ' Transporters: ' + transporters.length + ' Remote Miners: ' + remoteMiners.length);
    T.run(towers[0]);
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.memory.role == 'miner') {
            roleHarvester.run(creep);
        }
        if(creep.memory.role == 'Upgrader') {
            roleUpgrader.run(creep);
        }
        if(creep.memory.role == 'roleBuilder') {
            rB.run(creep);
        }
        if(creep.memory.role == 'runner') {
            rR.run(creep);
        }
        if(creep.memory.role == 'ferry') {
            rF.run(creep);
        }
        if(creep.memory.role == 'transporter') {
            rT.run(creep);
        }
        if(creep.memory.role == 'remoteMiner') {
            //rM.run(creep);
        }
    }
}