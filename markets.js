
module.exports = {
    sortOrder: function sortOrder(orders) {
        sortedOrders = _.sortBy(orders, order => order.price); 
        return sortedOrders;
    },
    
    distributeEnergy: function distributeEnergy(myCities){
        var receiver = null
    	var needEnergy = _.filter(myCities, city => city.storage && city.storage.store.energy < 520000 && city.terminal)
    	if (needEnergy.length){
    		var sortedCities = _.sortBy(needEnergy, city => city.storage.store.energy)
    		receiver = sortedCities[0].name
    		for (var i = 0; i < myCities.length; i++){
    		    if (myCities[i].storage && myCities[i].storage.store.energy > 700000){
    		        myCities[i].terminal.send(RESOURCE_ENERGY, 75000, receiver);
    		    }
    		}
    	}
    }
};