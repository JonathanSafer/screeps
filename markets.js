
var markets = {
    sortOrder: function sortOrder(orders) {
        sortedOrders = _.sortBy(orders, order => order.price); 
        return sortedOrders;
    },
    
    distributeEnergy: function distributeEnergy(myCities){
        var receiver = null
    	var needEnergy = _.filter(myCities, city => city.storage && city.storage.store.energy < 550000 && city.terminal)
    	if (needEnergy.length){
    		var sortedCities = _.sortBy(needEnergy, city => city.storage.store.energy)
    		receiver = sortedCities[0].name
    		for (var i = 0; i < myCities.length; i++){
    		    if (myCities[i].storage && myCities[i].storage.store.energy > 700000){
    		        myCities[i].terminal.send(RESOURCE_ENERGY, 75000, receiver);
    		    }
    		}
    	}
    },
    
    manageMarket: function manageMarket(myCities){
        var buyOrders = _.groupBy(Game.market.getAllOrders(order => order.type == ORDER_BUY), order => order.resourceType)
        for (var i = 0; i < myCities.length; i++){
            if (myCities[i].terminal){
                var mineral = myCities[i].find(FIND_MINERALS)[0].mineralType;
                if (mineral in myCities[i].terminal.store){
                	var goodOrders = markets.sortOrder(buyOrders[mineral]);
                	if (goodOrders[goodOrders.length - 1].price > .08 && myCities[i].storage.store.energy > 200000){
                		Game.market.deal(goodOrders[goodOrders.length - 1].id, Math.min(goodOrders[goodOrders.length - 1].remainingAmount, myCities[i].terminal.store[mineral]), myCities[i].name)
                		console.log(Math.min(goodOrders[goodOrders.length - 1].remainingAmount, myCities[i].terminal.store[mineral]) + " " + mineral + " sold for " + goodOrders[goodOrders.length - 1].price)
                	}
                }
                if (myCities[i].storage.store.energy > 800000){
                	var energyOrders = markets.sortOrder(buyOrders[RESOURCE_ENERGY])
                	if (energyOrders[energyOrders.length - 1].price > 0.03){
                    	Game.market.deal(energyOrders[energyOrders.length - 1].id, Math.min(energyOrders[energyOrders.length - 1].remainingAmount, myCities[i].terminal.store.energy / 2), myCities[i].name)
                    	console.log(Math.min(energyOrders[energyOrders.length - 1].remainingAmount, myCities[i].terminal.store.energy / 2) + " energy sold for " + energyOrders[energyOrders.length - 1].price)
                	} else if (myCities[i].storage.store.energy > 900000){
                	    Game.market.deal(energyOrders[energyOrders.length - 1].id, Math.min(energyOrders[energyOrders.length - 1].remainingAmount, myCities[i].terminal.store.energy / 2), myCities[i].name)
                    	console.log(Math.min(energyOrders[energyOrders.length - 1].remainingAmount, myCities[i].terminal.store.energy / 2) + " energy sold for " + energyOrders[energyOrders.length - 1].price)
                	}
                }
            }
        }
    }
};
module.exports = markets;