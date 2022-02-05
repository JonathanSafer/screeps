import fact = require("../buildings/factory")
import u = require("../lib/utils")
import rU = require("../lib/roomUtils")

const cM = {
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
        return _.filter(Object.keys(COMMODITIES), c => COMMODITIES[c].level == topTier && cM.isCommodity(c))
    },

    isCommodity: function(commodity){
        return _.find(Object.keys(COMMODITIES[commodity].components), comp => comp != RESOURCE_ENERGY
            && COMMODITIES[comp]
            && !REACTIONS[comp]
            && _.find(Object.keys(COMMODITIES[comp].components), compComp => compComp != RESOURCE_ENERGY
                && !REACTIONS[compComp]))
    },

    getOrderQuantities: function(product: string) {
        const compInfo: Map<string, number> = _.omit(COMMODITIES[product].components, RESOURCE_ENERGY)
        const components = Object.keys(compInfo)
        const rate = fact.findRateLimit(components, product) //find rate limit, and use that to find quantity of each resource needed 
        return _(compInfo).mapValues<number, number>(amount => amount * rate).value()
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
        //console.log(product)
        const prodLvl = COMMODITIES[product].level
        const components = _.without(Object.keys(COMMODITIES[product].components), RESOURCE_ENERGY)
        const destinations = _.filter<Room>(citiesByFactoryLevel[prodLvl], city => 
            _.every(components, comp => !city.terminal.store[comp] || city.terminal.store[comp] < 2000))
        const destination = destinations.length ? _.sample(destinations).name : null
        return destination
    },

    getMissingComponents: function(quantities, levelCache){
        //return array of components that we don't have enough of and are isCommodity
        const missingComponents = []
        for(const component of Object.keys(quantities)){
            const compLvl = COMMODITIES[component].level || 0
            const cache = levelCache[compLvl]
            const empireHasEnough = cache && cache[component] >= quantities[component]
            if(!empireHasEnough && compLvl > 0){
                missingComponents.push(component)
            }
        }
        return missingComponents
    },

    storeCacheByCity: function(cities: Room[]) {
        const termCities = _(cities).filter(city => city.terminal).value()
        return _(termCities)
            .map("name")
            .zipObject(termCities)
            .mapValues<Room, StoreDefinition>(city => _.clone(city.terminal.store))
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

    groupByFactoryLevel: function(cities: Array<Room>){
        const citiesWithFactory = _.filter(cities, city => city.terminal && rU.getFactory(city))
        const citiesByFactoryLevel =
            _.groupBy(citiesWithFactory, (city: Room) => {
                const factory = rU.getFactory(city)
                return factory ? factory.level || 0 : 0
            })
        return citiesByFactoryLevel
    },

    cleanCities: function(cities: Array<Room>){
        const citiesByFactoryLevel = cM.groupByFactoryLevel(cities)
        for(const level of Object.values(citiesByFactoryLevel)){
            for(const c of level){
                const factoryCity = c as Room
                const factory = rU.getFactory(factoryCity)
                if(!factory) continue
                const memory = Game.spawns[factoryCity.memory.city].memory
                if(memory.ferryInfo.factoryInfo.produce == "dormant"){
                    //empty factory (except for energy)
                    for(const resource of Object.keys(factory.store)){
                        if(resource != RESOURCE_ENERGY){
                            memory.ferryInfo.factoryInfo.transfer.push([resource, 0, factory.store[resource]])
                        }
                    }
                    if(factory.level){//only leveled factories need to send back components
                        for(const resource of Object.keys(factoryCity.terminal.store)){
                            //send back components
                            if(COMMODITIES[resource] 
                                && !REACTIONS[resource] 
                                && resource != RESOURCE_ENERGY 
                                && COMMODITIES[resource].level != factory.level){
                                const comLevel: number = COMMODITIES[resource].level || 0
                                const receiverCity = citiesByFactoryLevel[comLevel][0] as Room
                                const receiver = receiverCity.name

                                const amount = receiverCity.terminal.store[resource]
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
}
export = cM