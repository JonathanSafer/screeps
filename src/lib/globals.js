const military = require("../managers/military")
const sq = require("./spawnQueue")
const rp = require("../managers/roomplan")
const trading = require("../managers/swcTrading")

global.Tmp = {}
global.T = function() { return `Time: ${Game.time}` }
global.Cache = { roomData: {} }
global.Log = {}
Log.info = function(text) { console.log(`<p style="color:yellow">[INFO] ${Game.time}: ${text}</p>`) }
Log.error = function(text) { console.log(`<p style="color:red">[ERROR] ${Game.time}: ${text}</p>`) }

// Function to buy sub token. Price in millions. BuyToken(3) will pay 3 million
global.BuyToken = function(price) {
    Game.market.createOrder({
        type: ORDER_BUY,
        resourceType: SUBSCRIPTION_TOKEN,
        price: price * 1e6,
        totalAmount: 1,
        roomName: "E11S22"
    })
}
global.SpawnQuad = function(city, boosted){
    military.spawnQuad(city, boosted)
}
global.SpawnBreaker = function(city, boosted){
    sq.initialize(Game.spawns[city])
    sq.schedule(Game.spawns[city], "medic", boosted)
    sq.schedule(Game.spawns[city], "breaker", boosted)
}
global.SpawnRole = function(role, city, boosted){
    sq.initialize(Game.spawns[city])
    sq.schedule(Game.spawns[city], role, boosted)
}
global.PlaceFlag = function(flagName, x, y, roomName, duration){
    Memory.flags[flagName] = new RoomPosition(x, y, roomName)
    Memory.flags[flagName].removeTime = Game.time + (duration || 20000)
}

global.DeployQuad = function(roomName, boosted) {
    military.deployQuad(roomName, boosted)
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
    }
    creep.memory.city = city
    creep.memory.shard = shard || Game.shard.name
    Log.info(`${name} has been assigned to ${city} on ${creep.memory.shard}`)
}
global.RemoveJunk = function(city){//only to be used on cities with levelled factories
    Log.info("Attempting to remove junk...")
    const terminal = city.room.terminal
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
