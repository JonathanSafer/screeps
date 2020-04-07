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
global.spawnQuad = function(city){
    const sq = require("./spawnQueue")
    sq.initialize(Game.spawns[city])
    for(let i = 0; i < 4; i++){
        sq.schedule(Game.spawns[city], "quad")
    }
}
global.PlaceFlag = function(flagName, x, y, roomName){
    Memory.flags[flagName] = new RoomPosition(x, y, roomName)
}

Object.prototype.getsetd = function (prop, defaultValue) {
    if (this[prop] === undefined) {
        this[prop] = defaultValue
    }
    return this[prop]
}

global.MemoryCache = Memory