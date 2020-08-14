const fact = require("../buildings/factory")
const u = require("../lib/utils")

var cM = {
    runManager: function(cities){
        // cache boosts
        u.cacheBoostsAvailable(cities)

        //group cities by factory level
        const citiesByFactoryLevel = cM.groupByFactoryLevel(cities)
        const levelCache = _.mapValues(citiesByFactoryLevel, u.empireStore)
        const terminalCache = cM.storeCacheByCity(cities)

        let requestQueue = cM.getTopTier(citiesByFactoryLevel)
        //push all top tier resources into queue

        while(requestQueue.length){
            console.log(requestQueue)
            const requestedProduct = requestQueue.shift()
            const quantities = cM.getOrderQuantities(requestedProduct)
            const clearedToShip = cM.getOrderStatus(quantities, levelCache)

            if(clearedToShip){
                //attempt to find a receiver
                const destination = cM.getDestination(requestedProduct, citiesByFactoryLevel)
                if(destination){
                    //schedule deliveries
                    cM.scheduleDeliveries(citiesByFactoryLevel, destination, terminalCache, quantities, levelCache)
                }
            } else {
                //request whatever we're missing
                requestQueue = requestQueue.concat(cM.getMissingComponents(quantities, levelCache))
            }
        }
    },

    getTopTier: function(citiesByFactoryLevel){
        const levels = Object.keys(citiesByFactoryLevel)
        const topTier = _.max(levels)
        console.log(topTier)
        return _.filter(Object.keys(COMMODITIES), c => COMMODITIES[c].level == topTier && cM.isCommodity(c))
    },

    isCommodity: function(commodity){
        return _.find(Object.keys(COMMODITIES[commodity].components), comp => comp != RESOURCE_ENERGY
            && COMMODITIES[comp]
            && !REACTIONS[comp]
            && _.find(Object.keys(COMMODITIES[comp].components), compComp => compComp != RESOURCE_ENERGY
                && !REACTIONS[compComp]))
    },

    getOrderQuantities: function(product) {
        const compInfo = _.omit(COMMODITIES[product].components, RESOURCE_ENERGY)
        const components = Object.keys(compInfo)
        const rate = fact.findRateLimit(components, product) //find rate limit, and use that to find quantity of each resource needed 
        return _(compInfo).mapValues(amount => amount * rate).value()
    },

    getOrderStatus: function(quantities, levelCache){
        //bool, check if we have enough of all components to ship
        for(const component of Object.keys(quantities)){
            const compLvl = COMMODITIES[component].level || 0
            const cache = levelCache[compLvl]
            const empireHasEnough = cache && cache[component] >= quantities[component]
            if(!empireHasEnough){
                return false
            }

        }
        return true
    },

    getDestination: function(product, citiesByFactoryLevel){
        //return roomName. destination must have less than 2k of all commodities and correct factoryLevel.
        console.log(product)
        const prodLvl = COMMODITIES[product].level
        const components = _.without(Object.keys(COMMODITIES[product].components), RESOURCE_ENERGY)
        const destinations = _.filter(citiesByFactoryLevel[prodLvl], city => 
            _.every(components, comp => !city.terminal.store[comp] || city.terminal.store[comp] < 2000))
        const destination = _.sample(destinations).name
        return destination
    },

    getMissingComponents: function(quantities, levelCache){
        //return array of components that we don't have enough of and are isCommodity
        const missingComponents = []
        for(const component of Object.keys(quantities)){
            const compLvl = COMMODITIES[component].level || 0
            const cache = levelCache[compLvl]
            const empireHasEnough = cache && cache[component] >= quantities[component]
            if(!empireHasEnough && cM.isCommodity(component)){
                missingComponents.push(component)
            }
        }
        return missingComponents
    },

    storeCacheByCity: function(cities) {
        const termCities = _(cities).filter(city => city.terminal).value()
        return _(termCities)
            .map("name")
            .zipObject(termCities)
            .mapValues(city => _.clone(city.terminal.store))
            .value()
    },

    scheduleDeliveries: function(factCities, destination, terminalCache, quantities, levelCache){
        for(const component of Object.keys(quantities)){
            const compLvl = COMMODITIES[component].level || 0
            const sourceCities = factCities[compLvl]
            let quantity = quantities[component]

            for (const source of sourceCities) { //for each city at the relevant level, send resources until the quantity is satisfied
                const memory = Game.spawns[source.memory.city].memory
                const sourceAmount = terminalCache[source.name][component] || 0
                if (quantity == 0) {
                    break
                } else if (sourceAmount > 0) {
                    const amount = Math.min(quantity, sourceAmount)
                    // schedule terminal transfer
                    const ferryInfo = u.getsetd(memory, "ferryInfo", {})
                    const comSend = u.getsetd(ferryInfo, "comSend", [])
                    comSend.push([component, amount, destination])
                    // update values to reflect move
                    terminalCache[source.name][component] -= amount
                    levelCache[compLvl][component] -= amount
                    terminalCache[destination][component] += amount
                    quantity -= amount
                }
            }
            if(quantity){
                Game.notify("Problem sending " + component + " to " + destination)
            }
        }
    },

    groupByFactoryLevel: function(cities){
        const citiesWithFactory = _.filter(cities, city => city.terminal && u.getFactory(city))
        const citiesByFactoryLevel =
            _.groupBy(citiesWithFactory, city => u.getFactory(city).level || 0)
        return citiesByFactoryLevel
    }
}
module.exports = cM