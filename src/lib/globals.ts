import military = require("../managers/military")
import sq = require("./spawnQueue")
import rp = require("../managers/roomplan")
import trading = require("../managers/swcTrading")

global.Tmp = {}
global.T = function() { return `Time: ${Game.time}` }
global.Cache = { roomData: {} }
global.Log = {}
Log.info = function(text) { console.log(`<p style="color:yellow">[INFO] ${Game.time}: ${text}</p>`) }
Log.error = function(text) { console.log(`<p style="color:red">[ERROR] ${Game.time}: ${text}</p>`) }
Log.warning = function(text) { console.log(`<p style="color:orange">[WARNING] ${Game.time}: ${text}</p>`) }
Log.console = function(text) { return `<p style="color:green">[CONSOLE] ${Game.time}: ${text}</p>` }

// Function to buy sub token. Price in millions. BuyToken(3) will pay 3 million
global.BuyUnlock = function(price, amount) {
    if(Game.market.createOrder({
        type: ORDER_BUY,
        resourceType: CPU_UNLOCK,
        price: price,
        totalAmount: amount,
    }) == OK)
        return Log.console(`Order created for ${amount} unlock(s) at ${price} apiece`)
    Log.error("Order failed. Please use BuyUnlock (float price, int amount)")
    return -1
}
global.SpawnQuad = function(city, boosted){
    if(!Game.spawns[city]){
        Log.error("Invalid city name. Use SpawnQuad(string city, bool boosted)")
        return -1
    }
    military.spawnQuad(city, boosted)
    return Log.console(`Spawning Quad from ${city}`)
}
global.SpawnBreaker = function(city, boosted){
    if(!Game.spawns[city]){
        Log.error("Invalid city name. Use SpawnBreaker(string city, bool boosted)")
        return -1
    }
    sq.initialize(Game.spawns[city])
    sq.schedule(Game.spawns[city], "medic", boosted)
    sq.schedule(Game.spawns[city], "breaker", boosted)
    return Log.console(`Spawning Breaker and Medic from ${city}`)
}
global.SpawnRole = function(role, city, boosted){
    if(!Game.spawns[city]){
        Log.error("Invalid city name. Use SpawnRole(string role, string city, bool boosted)")
        return -1
    }
    sq.initialize(Game.spawns[city])
    sq.schedule(Game.spawns[city], role, boosted)
    return Log.console(`Spawning ${role} from ${city}`)
}
global.PlaceFlag = function(flagName, x, y, roomName, duration){
    Memory.flags[flagName] = new RoomPosition(x, y, roomName)
    duration = duration || 20000
    Memory.flags[flagName].removeTime = Game.time + duration
    return Log.console(`${flagName} flag placed in ${roomName}, will decay in ${duration} ticks`)
}

global.DeployQuad = function(roomName, boosted) {
    military.deployQuad(roomName, boosted)
    return Log.console(`Deploying Quad to ${roomName}`)
}

global.RoomWeights = function(roomName) {
    rp.planRoom(roomName)
}

global.PServ = (!Game.shard.name.includes("shard") || Game.shard.name == "shardSeason")

global.RequestResource = function(roomName, resourceType, maxAmount, priority) {
    trading.startOfTick()
    trading.requestResource(roomName, resourceType, maxAmount, priority)
    trading.endOfTick()
}
global.PCAssign = function(name, city, shard){
    const creep = Game.powerCreeps[name]
    if(!creep){
        Log.error("invalid PC name")
        return -1
    }
    if(!Game.spawns[city]){
        Log.error("Invalid city name. Use PCAssign(string name, string city, string shard)")
        return -2
    }
    creep.memory.city = Game.spawns[city].room.name
    creep.memory.shard = shard || Game.shard.name
    return Log.console(`${name} has been assigned to ${city} on ${creep.memory.shard}`)
}
global.RemoveJunk = function(city){//only to be used on cities with levelled factories
    Log.info("Attempting to remove junk...")
    const terminal = Game.spawns[city].room.terminal
    const coms = _.without(_.difference(Object.keys(COMMODITIES), Object.keys(REACTIONS)), RESOURCE_ENERGY)
    const unleveledFactory = _.find(Game.structures, struct => struct.structureType == STRUCTURE_FACTORY
             && struct.my && !struct.level && struct.room.terminal && struct.room.controller.level >= 7)
    if (!unleveledFactory) {
        Log.info("No destination found")
        return
    }
    const destination = unleveledFactory.room.name
    for(var i = 0; i < Object.keys(terminal.store).length; i++){
        if(_.includes(coms, Object.keys(terminal.store)[i])){
            //send com to a level 0 room
            Log.info(`Removing: ${Object.keys(terminal.store)[i]}`)
            Game.spawns[city].memory.ferryInfo.comSend.push([Object.keys(terminal.store)[i], terminal.store[Object.keys(terminal.store)[i]], destination])
        }
    }
}
global.CleanCities = function(){
    const u = require("./utils")
    const rU = require("./roomUtils")
    const cM = require("../managers/commodityManager")
    const cities = _.filter(Game.rooms, room => room.controller && room.controller.my 
        && _.find(room.find(FIND_MY_STRUCTURES), s => s.structureType == STRUCTURE_FACTORY))
    Log.info(`Cities with a factory: ${cities}`)
    const citiesByFactoryLevel = cM.groupByFactoryLevel(cities)
    Log.info(JSON.stringify(citiesByFactoryLevel))
    for(const level of Object.values<Array<Room>>(citiesByFactoryLevel)){
        for(const city of level){
            const factory = rU.getFactory(city)
            const memory = Game.spawns[city.memory.city].memory
            if(memory.ferryInfo.factoryInfo.produce == "dormant"){
                //empty factory (except for energy)
                Log.info(`Emptying factory in ${city.name}...`)
                for(const resource of Object.keys(factory.store)){
                    if(resource != RESOURCE_ENERGY){
                        Log.info(`Removing ${resource}`)
                        memory.ferryInfo.factoryInfo.transfer.push([resource, 0, factory.store[resource]])
                    }
                }
                if(factory.level){//only leveled factories need to send back components
                    Log.info(`Cleaning Terminal in ${city.name}...`)
                    for(const resource of Object.keys(city.terminal.store)){
                        //send back components
                        if(COMMODITIES[resource] 
                            && !REACTIONS[resource] 
                            && resource != RESOURCE_ENERGY 
                            && COMMODITIES[resource].level != factory.level){
                            const comLevel = COMMODITIES[resource].level || 0
                            const receiver = citiesByFactoryLevel[comLevel][0].name
                            Log.info(`Sending ${resource} to ${receiver}`)
                            const amount = city.terminal.store[resource]
                            const ferryInfo = u.getsetd(memory, "ferryInfo", {})
                            const comSend = u.getsetd(ferryInfo, "comSend", [])
                            comSend.push([resource, amount, receiver])
                        }
                    }
                }
            }
        }
    }
}
