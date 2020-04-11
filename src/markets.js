var cM = require("./commodityManager")
var settings = require("./settings")

var markets = {
    manageMarket: function(myCities){//this function is now in charge of all terminal acitivity
        if(Game.time % 10 != 0){
            return
        }
        const termCities = _.filter(myCities, c => c.terminal && Game.spawns[c.memory.city])
        for (const city of termCities) {
            Memory[city.name].termUsed = false
        }

        markets.sendCommodities(termCities)

        switch (Game.time % 1000) {
        case 0: markets.relocateBaseMins(termCities); break
        case 40: markets.distributeOps(termCities); break
        case 50: markets.distributeRepair(termCities); break
        }

        if(Game.time % 50 === 0){
            markets.distributeMinerals(termCities)
        }

        switch (Game.time % 200) {
        case 0: markets.distributeEnergy(termCities); break
        case 10: markets.distributePower(termCities); break
        case 20: markets.distributeUpgrade(termCities); break
        case 30: markets.buyAndSell(termCities); break
        }
    },

    ///////// TOP LEVEL MARKET FUNCTIONS (There are 9) ////////
    sendCommodities: function(cities){
        for(const city of cities) {
            const memory = Game.spawns[city.memory.city].memory
            if(memory.ferryInfo.factoryInfo && memory.ferryInfo.comSend.length){
                const comSend = memory.ferryInfo.comSend[0]
                if(city.terminal.store[comSend[0]] >= comSend[1] && !Memory[city.name].termUsed){
                    city.terminal.send(comSend[0], comSend[1], comSend[2])
                    Memory[city.name].termUsed = true
                    memory.ferryInfo.comSend = _.drop(memory.ferryInfo.comSend)
                } else {
                    Log.info("Error sending " + comSend[0] + " from: " + city.name)
                }
            }
        }
    },
    
    distributeEnergy: function(myCities){
        var receiver = null
        var needEnergy = _.filter(myCities, city => city.storage && city.storage.store.energy < settings.energy.processPower - 50000 && city.terminal)
        if (needEnergy.length){
            var sortedCities = _.sortBy(needEnergy, city => city.storage.store.energy)
            receiver = sortedCities[0].name
            for (const city of myCities){
                if (city.storage && city.storage.store.energy > settings.energy.processPower + 100000 && !Memory[city.name].termUsed){
                    city.terminal.send(RESOURCE_ENERGY, 25000, receiver)
                    Memory[city.name].termUsed = true
                }
            }
        }
    },

    relocateBaseMins: function(myCities){
        //receivers are rooms with a lvl 0 factory
        const receivers = _.filter(myCities, city => city.terminal && !Game.spawns[city.memory.city].memory.ferryInfo.factoryInfo.factoryLevel && city.controller.level >= 7)
        //senders are rooms with a levelled factory, or no factory at all
        const senders = _.filter(myCities, city => city.terminal && (Game.spawns[city.memory.city].memory.ferryInfo.factoryInfo.factoryLevel > 0 || city.controller.level == 6))
        const baseMins = [RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM, RESOURCE_CATALYST]
        const baseComs = [RESOURCE_SILICON, RESOURCE_METAL, RESOURCE_BIOMASS, RESOURCE_MIST]
        for(const sender of senders){
            //if a sender has more than 8k of a base mineral, or ANY of a base commodity, send it to a random receiver
            let go = true
            for(const baseMin of baseMins){
                if(!go){
                    continue
                }
                if(sender.terminal.store[baseMin] > 8000 && !Memory[sender.name].termUsed){
                    const amount = sender.terminal.store[baseMin] - 8000
                    const receiver = receivers[Math.floor(Math.random() * Math.floor(receivers.length))].name
                    sender.terminal.send(baseMin, amount, receiver)
                    Memory[sender.name].termUsed = true
                    go = false
                }
            }
            for(const baseCom of baseComs){
                if(!go){
                    continue
                }
                if(sender.terminal.store[baseCom] > 0 && !Memory[sender.name].termUsed){
                    const amount = sender.terminal.store[baseCom]
                    const receiver = receivers[Math.floor(Math.random() * Math.floor(receivers.length))].name
                    sender.terminal.send(baseCom, amount, receiver)
                    Memory[sender.name].termUsed = true
                    go = false
                }
            }
        }
    },
    
    distributeMinerals: function(myCities){
        let senders = myCities
        for (const myCity of myCities){
            const city = myCity.memory.city
            if(!Game.spawns[city]){
                continue
            }
            const mineral = Game.spawns[city].memory.ferryInfo.mineralRequest
            if(mineral){
                const x = senders.length
                for (const sender of senders){
                    if(!sender.terminal){
                        continue
                    }
                    if(sender.terminal.store[mineral] >= 6000 && !Memory[sender.name].termUsed){
                        sender.terminal.send(mineral, 3000, myCity.name)
                        Memory[sender.name].termUsed = true
                        senders = senders.splice(senders.indexOf(sender), 1)
                        Game.spawns[city].memory.ferryInfo.mineralRequest = null
                        break
                    }
                    
                }
                if(x === senders.length && !Memory[myCity.name].termUsed){
                    //buy mineral
                    const sellOrders = markets.sortOrder(Game.market.getAllOrders(order => order.type == ORDER_SELL && order.resourceType == mineral && order.amount >= 3000 && order.price < 0.5))
                    if (sellOrders.length){
                        Game.market.deal(sellOrders[0].id, 3000, myCity.name)
                        Game.spawns[city].memory.ferryInfo.mineralRequest = null
                        Memory[myCity.name].termUsed = true
                    } else {
                        Game.notify("Problem at distributeMinerals with " + mineral, 20)
                    }
                }
            }
        }
    },

    distributePower: function(myCities){
        var receiver = null
        var needPower = _.filter(myCities, city => city.controller.level > 7 && city.terminal && city.terminal.store.power < 1)
        if (needPower.length){
            receiver = needPower[0].name
            for (const city of myCities){
                if (city.terminal && city.terminal.store.power > 2000 && !Memory[city.name].termUsed){
                    city.terminal.send(RESOURCE_POWER, 560, receiver)
                    Memory[city.name].termUsed = true
                    Log.info("Sending power to " + receiver)
                }
            }
        }
    },

    distributeUpgrade: function(myCities){
        var receiver = null
        var needUpgrade = _.filter(myCities, city => city.controller.level > 5 && city.terminal && city.terminal.store["XGH2O"] < 1000)
        if (needUpgrade.length){
            receiver = needUpgrade[0].name
            for (const city of myCities){
                if (city.terminal && city.terminal.store["XGH2O"] > 7000 && !Memory[city.name].termUsed){
                    city.terminal.send("XGH2O", 3000, receiver)
                    Memory[city.name].termUsed = true
                    Log.info("Sending upgrade boost to " + receiver)
                    return
                }
            }
        }
    },

    distributeRepair: function(myCities){
        var receiver = null
        var needRepair = _.filter(myCities, city => city.controller.level > 5 && city.terminal && city.terminal.store["XLH2O"] < 1000)
        if (needRepair.length){
            receiver = needRepair[0].name
            for (const city of myCities){
                if (city.terminal && city.terminal.store["XLH2O"] > 7000 && !Memory[city.name].termUsed){
                    city.terminal.send("XLH2O", 3000, receiver)
                    Memory[city.name].termUsed = true
                    Log.info("Sending repair boost to " + receiver)
                    return
                }
            }
        }
    },

    distributeOps: function(myCities){
        var receiver = null
        var needOps = _.filter(myCities, city => city.controller.level == 8 && city.terminal && city.terminal.store[RESOURCE_OPS] < 300)
        if (needOps.length){
            receiver = needOps[0].name
            for (const city of myCities){
                if (city.terminal && city.terminal.store[RESOURCE_OPS] > 7000 && !Memory[city.name].termUsed){
                    city.terminal.send(RESOURCE_OPS, 5000, receiver)
                    Memory[city.name].termUsed = true
                    Log.info("Sending power to " + receiver)
                    return
                }
            }
        }
    },

    buyAndSell: function(termCities) {
        // cancel active orders
        for(let i = 0; i < Object.keys(Game.market.orders).length; i++){
            if(!Game.market.orders[Object.keys(Game.market.orders)[i]].active){
                Game.market.cancelOrder(Object.keys(Game.market.orders)[i])
            }
        }

        // load order info
        const orders = Game.market.getAllOrders()
        global.MarketHistory = _.groupBy(Game.market.getHistory(), history => history.resourceType)
        const buyOrders = _.groupBy(_.filter(orders, order => order.type == ORDER_BUY), order => order.resourceType)
        const sellOrders = _.groupBy(_.filter(orders, order => order.type == ORDER_SELL), order => order.resourceType)
        const energyOrders = markets.sortOrder(buyOrders[RESOURCE_ENERGY]).reverse()
        const highEnergyOrder = energyOrders[0]
        
        // resources we care about
        const baseMins = [RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM, RESOURCE_CATALYST]
        const bars = [RESOURCE_UTRIUM_BAR, RESOURCE_LEMERGIUM_BAR, RESOURCE_ZYNTHIUM_BAR, RESOURCE_KEANIUM_BAR, RESOURCE_GHODIUM_MELT, 
            RESOURCE_OXIDANT, RESOURCE_REDUCTANT, RESOURCE_PURIFIER, RESOURCE_CELL, RESOURCE_WIRE, RESOURCE_ALLOY, RESOURCE_CONDENSATE]
        const highTier = [RESOURCE_ORGANISM, RESOURCE_MACHINE, RESOURCE_DEVICE, RESOURCE_ESSENCE]
        
        markets.updateSellPoint(highTier, termCities, buyOrders)
        
        for (const city of termCities) {
            //if no terminal continue or no spawn
            if(!city.terminal || !Game.spawns[city.memory.city].memory.ferryInfo){
                continue
            }
            let termUsed = false //only one transaction can be run using each cities terminal
            if(city.terminal.cooldown){
                termUsed = true
            }
            if(!termUsed){
                termUsed = markets.sellPower(city, buyOrders)
            }
            if(!termUsed){
                termUsed = markets.sellOps(city, buyOrders)
            }
            const memory = Game.spawns[city.memory.city].memory
            const level = memory.ferryInfo.factoryInfo.factoryLevel
            //cities w/o level send all base resources to non levelled cities
            //base mins are NOT sold, they are made into bars instead.
            //bars can be sold if in excess
            //if any base mineral (besides ghodium) is low, an order for it will be placed on the market. If an order already exists, update quantity
            //if an order already exists and is above threshold (arbitrary?), increase price
            //buy minerals as needed
            markets.buyMins(city, baseMins)
            if(!level && !termUsed){
                termUsed = markets.sellBars(city, bars, buyOrders)
            }
            //buy/sell energy
            termUsed = markets.processEnergy(city, termUsed, highEnergyOrder, energyOrders)
            //sell products
            termUsed = markets.sellProducts(city, termUsed, buyOrders, highTier)

            termUsed = markets.buyPower(city, termUsed, sellOrders)
        }
    },

    //////////// BUY/SELL MARKET FUNCTIONS (There are 8) //////////////
    updateSellPoint: function(resources, cities, buyOrders){
        if(!Memory.sellPoint){
            Memory.sellPoint = {}
        }
        const empireStore = cM.empireStore(cities)
        for(var i = 0; i < resources.length; i++){
            if(!Memory.sellPoint[resources[i]]){
                Memory.sellPoint[resources[i]] === 0
            }
            const orders = markets.sortOrder(buyOrders[resources[i]]).reverse()
            if(orders.length && orders[0].price > Memory.sellPoint[resources[i]]){
                //if there is a higher order than what we are willing to sell for, get pickier
                Memory.sellPoint[resources[i]] = orders[0].price
                continue
            }
            //otherwise, walk down sell price proportionally to how badly we need to sell
            Memory.sellPoint[resources[i]] = Memory.sellPoint[resources[i]] * (1 - (Math.pow(empireStore[resources[i]], 2)/ 100000000))//100 million (subject to change)
        }
    },
    
    sellPower: function(city, buyOrders){
        const terminal = city.terminal
        if ("power" in terminal.store && terminal.store["power"] > 10000){
            var goodOrders = markets.sortOrder(buyOrders["power"])
            if (goodOrders.length && goodOrders[goodOrders.length - 1].price > .20){
                Game.market.deal(goodOrders[goodOrders.length - 1].id, Math.min(goodOrders[goodOrders.length - 1].remainingAmount,  Math.max(0, terminal.store["power"] - 10000)), city.name)
                Log.info(Math.min(goodOrders[goodOrders.length - 1].remainingAmount,  Math.max(0, terminal.store["power"] - 10000)) + " " + "power" + " sold for " + goodOrders[goodOrders.length - 1].price)
                return true
            } else {
                //make a sell order
                const orderId = _.find(Object.keys(Game.market.orders),
                    order => Game.market.orders[order].roomName === city.name && Game.market.orders[order].resourceType === "power")
                const order = Game.market.orders[orderId]
                if(!order){
                    const sellPrice = markets.getPrice("power") * .90
                    Game.market.createOrder({
                        type: ORDER_SELL,
                        resourceType: "power",
                        price: sellPrice,
                        totalAmount: 2000,
                        roomName: city.name   
                    })
                }
            }
        }
        return false
    },

    sellOps: function(city, buyOrders){
        const terminal = city.terminal
        if (terminal.store[RESOURCE_OPS] > 20000){
            var goodOrders = markets.sortOrder(buyOrders[RESOURCE_OPS])
            if (goodOrders.length){
                Game.market.deal(goodOrders[goodOrders.length - 1].id, Math.min(goodOrders[goodOrders.length - 1].remainingAmount,  Math.max(0, terminal.store[RESOURCE_OPS] - 20000)), city.name)
                Log.info(Math.min(goodOrders[goodOrders.length - 1].remainingAmount,  Math.max(0, terminal.store[RESOURCE_OPS] - 20000)) + " " + "ops" + " sold for " + goodOrders[goodOrders.length - 1].price)
                return true
            } else {
                //make a sell order
                const orderId = _.find(Object.keys(Game.market.orders),
                    order => Game.market.orders[order].roomName === city.name && Game.market.orders[order].resourceType === RESOURCE_OPS)
                const order = Game.market.orders[orderId]
                if(!order){
                    const sellPrice = markets.getPrice(RESOURCE_OPS) * .90
                    Game.market.createOrder({
                        type: ORDER_SELL,
                        resourceType: RESOURCE_OPS,
                        price: sellPrice,
                        totalAmount: 5000,
                        roomName: city.name   
                    })
                }
            }
        }
        return false
    },

    buyMins: function(city, minerals){
        const terminal = city.terminal
        for(var i = 0; i < minerals.length; i++){
            const mineralAmount = terminal.store[minerals[i]]
            if(mineralAmount < 8000){
                const amountNeeded = 8000 - mineralAmount
                const orderId = _.find(Object.keys(Game.market.orders),
                    order => Game.market.orders[order].roomName === city.name && Game.market.orders[order].resourceType === minerals[i])
                const order = Game.market.orders[orderId]
                if(order && order.remainingAmount < amountNeeded){
                    //update order quantity
                    Game.market.extendOrder(orderId, (amountNeeded - order.remainingAmount))
                } else if(!order){
                    let buyPrice = markets.getPrice(minerals[i])
                    buyPrice = buyPrice * 0.8//start 20% below market value
                    Game.market.createOrder({
                        type: ORDER_BUY,
                        resourceType: minerals[i],
                        price: buyPrice,
                        totalAmount: amountNeeded,
                        roomName: city.name   
                    })
                } else if(amountNeeded === 8000 || Game.time % 400 === 30){//order already exists for max amount and has not been satisfied
                    //increment price if price is not above market value 
                    const buyPrice = markets.getPrice(minerals[i])
                    if(order.price < buyPrice){
                        Game.market.changeOrderPrice(orderId, (order.price + 0.001))
                    }
                }
            }
        }
    },

    sellBars: function(city, bars, buyOrders){//if # of bars is above threshold, sell extras
        const terminal = city.terminal
        for(var i = 0; i < bars.length; i++){
            if(terminal.store[bars[i]] > 3000){
                const sellAmount = terminal.store[bars[i]] - 3000
                const goodOrders = markets.sortOrder(buyOrders[bars[i]]).reverse()
                if(goodOrders.length && goodOrders[0].price > (0.7 * markets.getPrice(bars[i]))){
                    Game.market.deal(goodOrders[0].id, Math.min(goodOrders[0].remainingAmount,  sellAmount), city.name)
                    return true
                }
            }
        }
        return false
    },

    processEnergy: function(city, termUsed, highEnergyOrder, energyOrders){
        //can't sell if terminal has been used
        const terminal = city.terminal
        const storage = city.storage
        let buyThreshold = 650000
        if(terminal.store[RESOURCE_POWER] > 2000){
            buyThreshold = 650000//if excess power, buy energy
        }
        if(!storage){
            return termUsed
        }
        if(storage.store[RESOURCE_ENERGY] < 400000 && (!highEnergyOrder || highEnergyOrder.price <= 0.002)){//buy energy if it's cheap
            //buy energy
            const orderId = _.find(Object.keys(Game.market.orders),
                order => Game.market.orders[order].roomName === city.name && Game.market.orders[order].resourceType === RESOURCE_ENERGY)
            const order = Game.market.orders[orderId]
            if(order && order.remainingAmount === 0){
                //update order quantity
                Game.market.extendOrder(orderId, 50000)
            } else if(!order){
                const buyPrice = 0.002
                Game.market.createOrder({
                    type: ORDER_BUY,
                    resourceType: RESOURCE_ENERGY,
                    price: buyPrice,
                    totalAmount: 50000,
                    roomName: city.name   
                })
            }
        } else if(storage.store[RESOURCE_ENERGY] < buyThreshold){//buy energy with excess credits
            if(Game.market.credits > settings.creditMin){//arbitrary
                const orderId = _.find(Object.keys(Game.market.orders),
                    order => Game.market.orders[order].roomName === city.name && Game.market.orders[order].resourceType === RESOURCE_ENERGY)
                const order = Game.market.orders[orderId]
                let highPrice = 0
                if(highEnergyOrder){
                    highPrice = highEnergyOrder.price
                }
                if(!order){
                    const buyPrice = Math.max(Math.min(markets.getPrice(RESOURCE_ENERGY), highPrice), 0.001)
                    Game.market.createOrder({
                        type: ORDER_BUY,
                        resourceType: RESOURCE_ENERGY,
                        price: buyPrice,
                        totalAmount: 50000,
                        roomName: city.name   
                    })
                } else {//update order occasionally
                    if(order.price <= highPrice){
                        Game.market.changeOrderPrice(orderId, (order.price + 0.001))
                    }
                }

            }

        }
        if(!termUsed){//don't deal to rooms we have vision of
            if(storage.store[RESOURCE_ENERGY] > 900000){
                for(var i = 0; i < energyOrders.length; i++){
                    if(!Game.rooms[energyOrders[i].roomName]){
                        Game.market.deal(energyOrders[i].id, Math.min(energyOrders[i].remainingAmount, terminal.store.energy / 2), city.name)
                        return true
                    }
                }
            }
        }
        return termUsed
    },

    sellProducts: function(city, termUsed, buyOrders, products){
        if(termUsed){
            return termUsed
        }
        const store = city.terminal.store
        for(var i = 0; i < products.length; i++){
            if(store[products[i]]){
                const orders = markets.sortOrder(buyOrders[products[i]]).reverse()
                if(orders.length && orders[0].price > Memory.sellPoint[products[i]] * 0.9){
                    Game.market.deal(orders[0].id, Math.min(orders[0].remainingAmount, store[products[i]]), city.name)
                    Log.info("Sold "+ products[i]+ " for: "+ orders[0].price)
                    return true
                }
            }
        }
        return false
    },

    buyPower: function(city, termUsed, sellOrders) {
        if (termUsed) {
            return termUsed
        }
        const store = city.terminal.store

        // if terminal doesn't have power then buy 5000
        if (store[RESOURCE_POWER]) {
            return false
        }

        const orders = markets.sortOrder(sellOrders[RESOURCE_POWER])
        if (!orders.length) {
            return false
        }
        const currentPrice = markets.getPrice(RESOURCE_POWER)
        const cheapest = orders[0]
        if (cheapest.price > currentPrice * 1.1 || cheapest.price > settings.powerPrice) {
            return false
        }

        const buyAmount = Math.min(cheapest.remainingAmount, settings.powerBuyVolume)
        Game.market.deal(cheapest.id, buyAmount, city.name)
        return true
    },

    //////////////// MARKET UTILS ////////////////////
    // Sort orders from low to high
    sortOrder: function(orders) {
        const sortedOrders = _.sortBy(orders, order => order.price) 
        return sortedOrders
    },

    getPrice: function(resource){
        //determine price using history
        const history = MarketHistory[resource] // TODO this may not be declared yet
        let totalVol = 0
        let totalPrice = 0
        for(var i = 0; i < history.length; i++){
            totalVol = totalVol + history[i].volume
            totalPrice = totalPrice + (history[i].volume * history[i].avgPrice)
        }
        const price = totalPrice/totalVol
        return price
    }
}
module.exports = markets