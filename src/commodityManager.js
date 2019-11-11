var fact = require('factory');
var cM = {
	runManager: function(cities){
		//group cities by factory level
		const factCities = cM.groupByLevel(cities);
		//find total terminal store for each level
		let storeByLvl = [];
		for(var i = 0; i < 6; i++){
			storeByLvl[i] = cM.empireStore(factCities[i])
		}
		//go through each city:
		for(var i = factCities.length - 1; i > 0; i--){
			const products = _.filter(Object.keys(COMMODITIES), key => COMMODITIES[key].level === i)
			for(var j = 0; j < factCities[i].length; j++){
				//for each produce of city's level:
				for (var k = 0; k < products.length; k++) {
					if(factCities[i][j].terminal.store[products[k]] > 2000){
						continue;//if city's store of produce is above 2k, don't produce any more
					}
					let components = Object.keys(COMMODITIES[products[k]].components);
		            let rate = fact.findRateLimit(components, products[k]) //find rate limit, and use that to find quantity of each resource needed 
		            let go = true; //(possibly batched in addition based on reaction time)
		            for (var l = 0; l < components.length; l++) {//go through each component and check if we have in empire store
		            	const compLvl = COMMODITIES[components[l]].level
		            	if(!compLvl){//if comp doesn't need a leveled factory, set to 0
		            		compLvl = 0;
		            	}
		                if((COMMODITIES[products[k]].components[components[l]] * rate) > storeByLvl[compLvl][components[l]]){
		                    go = false;//if we don't have enough of the comp, we are no go for this product (move on to next product)
		                }
		            }
		            if(go){
		                //create delivery orders in comSend
		                storeByLvl = cM.scheduleDeliveries(products[k], rate, storeByLvl, factCities, factCities[i][j].name)
		                break; // go to next city
		            }
		        }		
			}
		}
	},

	scheduleDeliveries: function(product, rate, storeByLvl, factCities, destination){
		const components = Object.keys(COMMODITIES[product].components);
		for(var i = 0; i < components.length; i++){
			const compLvl = COMMODITIES[components[i]].level
        	if(!compLvl){//if comp doesn't need a leveled factory, set to 0
        		compLvl = 0;
        	}
        	let quantity = COMMODITIES[product].components[components[i]] * rate;
        	//remove quantity from total store
        	storeByLvl[compLvl][components[i]] = storeByLvl[compLvl][components[i]] - quantity;
        	for(var j = 0; j < factCities[compLvl].length; j++){//for each city at the relevant level, send resources until the quantity is satisfied
        		const memory = Game.spawns[factCities[compLvl][j].memory.city].memory;
        		if(factCities[compLvl][j].terminal.store[components[i]] > quantity){
        			//make order for quantity
        			memory.ferryInfo.comSend.push([components[i], quantity, destination]);
        			//remove quantity from city's store
        			factCities[compLvl][j].terminal.store[components[i]] = factCities[compLvl][j].terminal.store[components[i]] - quantity;
        			quantity = 0;
        		} else if(factCities[compLvl][j].terminal.store[components[i]] > 0){
        			//make order for full store of comp
        			memory.ferryInfo.comSend.push([components[i], factCities[compLvl][j].terminal.store[components[i]], destination]);
        			//remove used amount from city's store
        			factCities[compLvl][j].terminal.store[components[i]] = 0
        			quantity = quantity - factCities[compLvl][j].terminal.store[components[i]];
        		}
        		if(quantity === 0){
        			break;
        			//break early if order satisfied
        		}
        	}
     		if(quantity){
     			Game.notify("Problem sending " + components[i] + " to " + destination);
     		}
		}
	},

	groupByLevel: function(cities){
		let factCities = []
		for(var i = 0; i < 6; i++){
			factCities[i] = []
		}
		for(var i = 0; i < cities.length; i++){
			const factory = _.find(cities[i].find(FIND_MY_STRUCTURES), struct => struct.structureType === STRUCTURE_FACTORY)
			if(!factory || !factCities[i].terminal){
				continue;
			}
			if(!factory.level){
				factCities[0].push(cities[i])
			} else {
				factCities[factory.level].push(cities[i])
			}
		}
		return factCities;
	},

	empireStore: function(cities){//combine store of all cities given
		let empireStore = {}
		for(var i = 0; i < RESOURCES_ALL.length; i++){
			if(!cities.length){
				empireStore[RESOURCES_ALL[i]] = 0;
			} else {
				empireStore[RESOURCES_ALL[i]] = _.sum(cities, city => city.terminal.store[RESOURCES_ALL[i]])
			}
		}
		return empireStore;
	}
};
module.exports = cM