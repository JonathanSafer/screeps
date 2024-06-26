import settings = require("../config/settings")
import observer = require("../buildings/observer")
import u = require("../lib/utils")
import rp = require("../managers/roomplan")
import { cU } from "../lib/creepUtils"
import { cN } from "../lib/creepNames"

const b = {
    SIZE: 10000, // 10K constant cpu bucket size

    manage: function() {
        Memory.avgCpu = Memory.avgCpu == undefined ? 0 : (Memory.avgCpu * .999) + (Game.cpu.getUsed() * .001)
        if(Game.time % 1000 == 2){
            const cities = u.getMyCities()
            if(Memory.avgCpu/Game.cpu.limit > settings.removeRemote || Game.cpu.bucket < 9500)
                rp.dropRemote(cities)
            if(Memory.avgCpu/Game.cpu.limit < settings.addRemote)
                rp.searchForRemote(cities)
        }
        if (b.growingTooQuickly()) {
            const wasteAmount = Game.cpu.bucket == b.SIZE ? 50 : 1
            b.wasteCpu(wasteAmount)
        }
    },

    growingTooQuickly: function() {
        Cache.bucket = Cache.bucket || {}
        Cache.bucket.waste = Cache.bucket.waste || 0
        const oldBucket = Cache.bucket.amount
        const newBucket = Game.cpu.bucket
        Cache.bucket.amount = newBucket

        if (!oldBucket) return false
        const delta = newBucket - oldBucket
        const oldRate = Cache.bucket.fillRate || 0
        Cache.bucket.fillRate = 0.99 * oldRate + 0.01 * delta

        const percentEmpty = 1 - Game.cpu.bucket / b.SIZE
        return (Cache.bucket.fillRate > percentEmpty * settings.bucket.growthLimit || Game.cpu.bucket == b.SIZE)
    },

    wasteCpu: function(amount) {
        Cache.bucket.waste += Math.max(Game.cpu.limit + amount - Game.cpu.getUsed(), 0)
        let spawnedScouts = false
        while (Game.cpu.getUsed() < Game.cpu.limit + amount) {
            //military.attack()
            if(!observer.scanRoom()){
                if(!spawnedScouts){
                    b.spawnScouts()
                    spawnedScouts = true
                }
                if(rp.judgeNextRoom()) break
            }
        }
    },

    spawnScouts: function(){
        if(Game.time % 500 != 0) return
        const cities = u.getMyCities()
        const rcl8 = _.find(cities, city => city.controller.level == 8)
        if(!rcl8) observer.findRoomsForScan()
        for(const city of cities){
            if(city.controller.level < 8){
                const rcache = u.getRoomCache(city.name)
                const targets = u.getsetd(rcache, "scannerTargets", [])
                if(targets.length){
                    const spawn = Game.spawns[city.memory.city]
                    if(spawn)
                        cU.scheduleIfNeeded(cN.SCOUT_NAME, 1, false, spawn, u.splitCreepsByCity()[city.name])
                }
            }
        }
    }
}
export = b