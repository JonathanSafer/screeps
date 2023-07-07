import u = require("./lib/utils")
import cM = require("./managers/commodityManager")
import rPC = require("./roles/powerCreep")
import c = require("./managers/city")
import m = require("./managers/markets")
import s = require("./operations/stats")
import rp = require("./managers/roomplan")
import er = require("./operations/error")
import settings = require("./config/settings")
import profiler = require("./operations/screeps-profiler")
import b = require("./operations/bucket")
import observer = require("./buildings/observer")
import "./operations/profiler-prep"
import "./lib/globals"
import rr = require("./roles/roles")
import data = require("./operations/data")
import rU = require("./lib/roomUtils")
import cU = require("./lib/creepUtils")

//Code to manually profile:
//Game.profiler.profile(1000);
//Game.profiler.output();

//Code to claim a new room:
//Memory.flags["W11N190break"] = new RoomPosition(25,25,"W16N21")
//Memory.flags["claim"] = new RoomPosition(25,25,"W16N21")
//Memory.flags["plan"] = new RoomPosition(30,33,"W16N21")

//  Resources/CPU    | Buying Price (CR) | Selling Price (CR)
//   250 energy      |    20   CR        |   10 CR
//   1.6 commodities |    25   CR        |   25   CR
//   .85 power       |    3.45 CR        |   3.45 CR

// Control vs Power
// Power =>   4 CR / power
// Control => 50 control / CPU. 25 CR/CPU => 2 CR / control
c.setGameState()

profiler.enable()
export function loop() {
    "use strict"
    profiler.wrap(function () {
        RawMemory.setActiveSegments([])
        global.Tmp = {}
        data.updateData()
        er.reset()
        if (Game.cpu.bucket < 50 && Game.shard.name != "shard1" && Game.time > 50){
            Log.error("Bucket too low")
            Game.notify(`Bucket hit minimum threshold at tick ${Game.time}`)
            return
        }

        if(Game.shard.name == "shard1" && Game.cpu.bucket == 10000){
            Game.cpu.generatePixel()
        }
        const localRooms = u.splitRoomsByCity() // only used for remote mining?
        const localCreeps = u.splitCreepsByCity()
        const myCities = u.getMyCities()
        let claimRoom, unclaimRoom

        if(Memory.gameState == 0)
            c.runEarlyGame()

        // TODO add a setup function to validate memory etc
        if (!Memory.flags) Memory.flags = {}
        if(Game.time % 500 == 0){
            const f = Memory.flags
            claimRoom = c.chooseClosestRoom(myCities,
                (f.claim && f.claimRally) || f.claim)
            unclaimRoom = c.chooseClosestRoom(myCities,
                (f.unclaim && f.unclaimRally) || f.unclaim)
            //em.expand() // grow the empire!
        }
        //run cities
        let prevCpu = Game.cpu.getUsed()
        for (let i = 0; i < myCities.length; i += 1) {
            try {
                if(Game.cpu.bucket - prevCpu < 10){
                    return
                }
                const city = u.getsetd(myCities[i].memory, "city", myCities[i].name + "0")
                const rcl = myCities[i].controller.level
                const rclLimit =
                    settings.bucket.colony - rcl * settings.bucket.rclMultiplier
                if (rcl < 8 && Game.cpu.bucket < rclLimit && Game.gcl.level > 1) {
                    continue // skip this city
                }
                c.updateCountsCity(city, localCreeps[city] || [], localRooms[city], 
                    claimRoom, unclaimRoom)
                c.runCity(city, localCreeps[city])
                c.runTowers(city)
                // TODO: obs runs in dead cities
                observer.run(city)
                const currentCpu = Game.cpu.getUsed()
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

        //gather homeless creeps
        if(Game.time % 50 == 1){
            _.forEach(Game.creeps, function(creep) {
                if(!creep.memory.role){
                    creep.memory.role = creep.name.split("-")[0]
                }
                if(!creep.memory.city){
                    creep.memory.city = "homeless"
                    creep.memory.mode = 0
                }
            })
        }

        //run homeless creeps (1 tick delay)
        if(localCreeps["homeless"]){
            const allRoles = rr.getRoles()
            const nameToRole = _.groupBy(allRoles, role => role.name)
            _.forEach(localCreeps["homeless"], (creep) => {
                nameToRole[creep.memory.role][0].run(creep)
            })
        }

        //clear old creeps
        if (Game.time % 100 === 0) {
            for (const name in Memory.creeps) {
                if (!Game.creeps[name]) {
                    delete Memory.creeps[name]
                }
            }
        }
        //clear rooms
        if (Game.time % 5000 === 0) {
            for (const name in Memory.rooms) {
                if (!Memory.rooms[name].city) {
                    delete Memory.rooms[name]
                }
            }
            u.removeConstruction()
        }

        m.manageMarket(myCities)

        const noobMode = Object.keys(Game.rooms).length < 5
        if (Game.time % settings.roomplanTime == settings.roomplanOffset 
            || (Game.time % 10 == 0 && noobMode && Game.cpu.bucket > 1000) 
            || (Game.time % 50 == 0 && Game.cpu.bucket > 9900)){
            rp.buildConstructionSites() 
        }// TODO: this could go in run city?

        observer.recordRoomData()
        if(Game.time % settings.scouting.assessTime == 0) observer.findRoomsForScan()
        if(Game.time % settings.cMTime == settings.cMOffset && !PServ){//run commodity manager every 400 (lower than lowest batched reaction time, on the 39 so it'll be before dormant period ends)
            if(Game.time % settings.cMTime * 10 == settings.cMOffset){
                cM.cleanCities(myCities)
            } else {
                cM.runManager(myCities)
            }
        }

        if(Game.time % settings.flagCleanup) u.cleanFlags()

        data.makeVisuals()
        data.backupData()

        // disable emailing
        u.silenceCreeps()

        // clean room memory
        if (Game.time % 50 === 0) {
            rU.removeOldRoomMemory()
        }

        const e25s13observer = Game.rooms["E25S13"] && _.find(Game.rooms["E25S13"].find(FIND_MY_STRUCTURES), struct => struct.structureType == STRUCTURE_OBSERVER) as StructureObserver
        if(e25s13observer) {
            e25s13observer.observeRoom("E25S15")
        }

        if(Game.rooms["E25S15"]) {
            const room = Game.rooms["E25S15"]
            const reactor = _.find(room.find(FIND_REACTORS)) as StructureStorage
            let needClaimer = false
            let needHaulers = false
            if(!reactor.owner
                || !["Yoner", "Geir1983"].includes(reactor.owner.username)
                || (reactor.store.getFreeCapacity(RESOURCE_THORIUM) > 500 && reactor.owner.username == "Geir1983")){
                needHaulers = true
                needClaimer = true
            } else if(reactor.owner.username == "Yoner") {
                needHaulers = true
            }
            if(needHaulers) {
                const haulersNeeded = Math.ceil((reactor.store.getFreeCapacity(RESOURCE_THORIUM) + 100) / 200)
                // determine if we should send from E24S13 or E25S13
                let sender = "E25S13"
                if(Cache.roomData && Cache.roomData["E25S14"] && Cache.roomData["E25S14"].rcl > 0){
                    sender = "E24S13"
                }
                if(sender == "E25S13") {
                    if(needClaimer) {
                        cU.scheduleIfNeeded("reserver", 1, false, Game.spawns["E25S130"], localCreeps["E25S130"], "E25S15")
                    }
                    cU.scheduleIfNeeded("runner", haulersNeeded, false, Game.spawns["E25S130"], localCreeps["E25S130"], "E25S15")
                    cU.scheduleIfNeeded("harasser", 3, false, Game.spawns["E25S130"], localCreeps["E25S130"], "E25S14", 300)
                } else {
                    if(needClaimer) {
                        cU.scheduleIfNeeded("reserver", 1, false, Game.spawns["E24S130"], localCreeps["E24S130"], "E25S15")
                    }
                    cU.scheduleIfNeeded("runner", haulersNeeded, false, Game.spawns["E24S130"], localCreeps["E24S130"], "E25S15")
                    cU.scheduleIfNeeded("harasser", 3, false, Game.spawns["E24S130"], localCreeps["E24S130"], "E24S14", 300)
                    cU.scheduleIfNeeded("harasser", 3, false, Game.spawns["E24S130"], localCreeps["E24S130"], "E24S15", 300)
                }
            }

        }

        const e28s12observer = Game.rooms["E28S12"] && _.find(Game.rooms["E28S12"].find(FIND_MY_STRUCTURES), struct => struct.structureType == STRUCTURE_OBSERVER) as StructureObserver
        if(e28s12observer) {
            e28s12observer.observeRoom("E35S15")
        }

        if(Game.rooms["E35S15"]) {
            const room = Game.rooms["E35S15"]
            const reactor = _.find(room.find(FIND_REACTORS)) as StructureStorage
            let needClaimer = false
            let needHaulers = false
            if(!reactor.owner
                || !["Yoner"].includes(reactor.owner.username)
                || (reactor.store.getFreeCapacity(RESOURCE_THORIUM) > 500 && reactor.owner.username != "Yoner")){
                needHaulers = true
                needClaimer = true
            } else if(reactor.owner.username == "Yoner") {
                needHaulers = true
            }
            if(needHaulers) {
                const haulersNeeded = Math.ceil((reactor.store.getFreeCapacity(RESOURCE_THORIUM) + 100) / 200)
                // determine if we should send from E33S15
                let canSend = false
                if(Cache.roomData && Cache.roomData["E34S15"] && Cache.roomData["E34S15"].rcl == 0){
                    canSend = true
                }
                if(canSend) {
                    if(needClaimer) {
                        cU.scheduleIfNeeded("reserver", 1, false, Game.spawns["E33S150"], localCreeps["E33S150"], "E35S15")
                    }
                    //cU.scheduleIfNeeded("runner", haulersNeeded, false, Game.spawns["E33S150"], localCreeps["E33S150"], "E35S15")
                    cU.scheduleIfNeeded("harasser", 3, false, Game.spawns["E33S150"], localCreeps["E33S150"], "E34S15", 300)
                    cU.scheduleIfNeeded("harasser", 2, false, Game.spawns["E33S150"], localCreeps["E33S150"], "E35S15", 300)
                } else {
                    Log.error("Can't send from E33S15 to E35S15")
                }
            }

        }

        s.collectStats(myCities)

        if(Game.time % 7 == 4){
            s.benchmark(myCities)
        }
        
        if (Game.time % settings.profileFrequency == 0) {
            Game.profiler.profile(settings.profileLength)
        }

        // burn extra cpu if the bucket is filling too quickly
        b.manage()

        // This will always be last. Throw an exception if any city failed.
        er.finishTick()
    })
}

