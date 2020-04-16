global.T = function() { return `Time: ${Game.time}` }
global.Cache = {}
global.Log = {}
Log.info = function(text) { console.log(`[INFO] ${Game.time}: ${text}`) }
Log.error = function(text) { console.log(`[ERROR] ${Game.time}: ${text}`) }

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
    const military = require("./military")
    military.spawnQuad(city, boosted)
}
global.SpawnBreaker = function(city, boosted){
    const sq = require("./spawnQueue")
    sq.initialize(Game.spawns[city])
    sq.schedule(Game.spawns[city], "medic", boosted)
    sq.schedule(Game.spawns[city], "breaker", boosted)
}
global.PlaceFlag = function(flagName, x, y, roomName){
    Memory.flags[flagName] = new RoomPosition(x, y, roomName)
}

global.DeployQuad = function(roomName, boosted) {
    const military = require("./military")
    military.deployQuad(roomName, boosted)
}

global.RoomWeights = function(roomName) {
    const rp = require("./roomplan")
    rp.planRoom(roomName)
}
