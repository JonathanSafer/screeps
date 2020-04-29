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

        //go through each city:
        const levels = Object.keys(citiesByFactoryLevel).sort().reverse()
        for(const level of levels){
            const citiesAtLevel = citiesByFactoryLevel[level] || []
            const products = _.filter(Object.keys(COMMODITIES), key => COMMODITIES[key].level == level)

            for (const city of citiesAtLevel) {
                for (const product of products) {
                    cM.processProduct(city, product, levelCache, terminalCache, citiesByFactoryLevel)
                }
            }
        }
    },

    storeCacheByCity: function(cities) {
        const termCities = _(cities).filter(city => city.terminal).value()
        return _(termCities)
            .map("name")
            .zipObject(termCities)
            .mapValues(city => _.clone(city.terminal.store))
            .value()
    },

    processProduct: function(city, product, levelCache, terminalCache, citiesByFactoryLevel) {
        //if city's store of produce is above 2k, don't produce any more
        if (terminalCache[city.name][product] > 2000) return

        const compInfo = COMMODITIES[product].components
        const components = _.without(Object.keys(compInfo), RESOURCE_ENERGY)
        const rate = fact.findRateLimit(components, product) //find rate limit, and use that to find quantity of each resource needed 
        const quantities = _(compInfo).mapValues(amount => amount * rate).value()

        const compStatuses = _(components).map(component => {
            return cM.getComponentStatus(component, levelCache, product, city, quantities[component])
        }).value()
        if (_.every(compStatuses, "clearedToShip")) {
            cM.reserveComponents(components, levelCache, quantities)
            //create delivery orders in comSend
            cM.scheduleDeliveries(citiesByFactoryLevel, city.name, components, terminalCache, quantities)
        } else if (_.find(compStatuses, "highTier")) {
            //we have enough of the highest tier commodity to do the reaction, but not enough of something else
            //remove needed resources from empire store like we are using it, so that no other city will use it
            cM.reserveComponents(components, levelCache, quantities)
        }
    },

    getComponentStatus: function(component, levelCache, product, city, quantity) {
        const status = {}
        const compLvl = COMMODITIES[component].level || 0

        const cache = levelCache[compLvl]
        const empireHasEnough = cache && cache[component] >= quantity
        const cityHasTooMuch = city.terminal.store[component] > 2000

        //if we don't have enough of the comp, we are no go for this product (move on to next product)
        status.clearedToShip = (empireHasEnough && !cityHasTooMuch)
        status.highTier = status.clearedToShip && compLvl == COMMODITIES[product].level - 1
        return status
    },

    reserveComponents: function(components, levelCache, quantities) {
        for(const component of components){
            const compLvl = COMMODITIES[component].level || 0
            //remove quantity from total store
            levelCache[compLvl][component] -= quantities[component]
        }
    },

    scheduleDeliveries: function(factCities, destination, components, terminalCache, quantities){
        for(const component of components){
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