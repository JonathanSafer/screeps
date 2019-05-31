
var markets = {
    sortOrder: function sortOrder(orders) {
        sortedOrders = _.sortBy(orders, order => order.price); 
        return sortedOrders;
    },
    
    distributeEnergy: function distributeEnergy(myCities){
        var receiver = null
    	var needEnergy = _.filter(myCities, city => city.storage && city.storage.store.energy < 350000 && city.terminal)
    	if (needEnergy.length){
    		var sortedCities = _.sortBy(needEnergy, city => city.storage.store.energy)
    		receiver = sortedCities[0].name
    		for (var i = 0; i < myCities.length; i++){
    		    if (myCities[i].storage && myCities[i].storage.store.energy > 500000){
    		        myCities[i].terminal.send(RESOURCE_ENERGY, 75000, receiver);
    		    }
    		}
    	}
    },
    
    distributeMinerals: function distributeEnergy(myCities){
        let senders = myCities
        for (var i = 0; i < myCities.length; i++){
            let city = myCities[i].memory.city
            let mineral = Game.spawns[city].memory.ferryInfo.mineralRequest;
            if(mineral){
                let x = senders.length
                for (j = 0; j < senders.length; j++){
                    if(senders[j].terminal.store[mineral] > 3000){
                        let result = senders[j].terminal.send(mineral, 3000, myCities[i].name)
                        senders = senders.splice(senders.indexOf(senders[j]), 1);
                        Game.spawns[city].memory.ferryInfo.mineralRequest = null;
                        break;
                    }
                    
                }
                if(x === senders.length){
                    //buy mineral
                    let sellOrders = markets.sortOrder(Game.market.getAllOrders(order => order.type == ORDER_SELL && order.resourceType == mineral && order.amount >= 3000 && order.price < 0.5))
                    if (sellOrders.length){
                        Game.market.deal(sellOrders[0].id, 3000, myCities[i].name)
                        Game.spawns[city].memory.ferryInfo.mineralRequest = null;
                    } else {
                        Game.notify('Problem at distributeMinerals with ' + mineral, 20)
                    }
                }
            }
        }
    },

    distributePower: function distributePower(myCities){
        var receiver = null
    	var needPower = _.filter(myCities, city => city.controller.level > 7 && city.terminal && (city.terminal.store.power < 1 || city.terminal.store.power == undefined))
    	if (needPower.length){
    		receiver = needPower[0].name
    		for (var i = 0; i < myCities.length; i++){
    		    if (myCities[i].terminal && myCities[i].terminal.store.power > 2000){
    		        myCities[i].terminal.send(RESOURCE_POWER, 560, receiver);
    		        console.log('Sending power to ' + receiver)
    		    }
    		}
    	}
    },
    
    manageMarket: function manageMarket(myCities){
        for(i = 0; i < Object.keys(Game.market.orders).length; i++){
            if(!Game.market.orders[Object.keys(Game.market.orders)[i]].active){
                Game.market.cancelOrder(Object.keys(Game.market.orders)[i])
            }
        }
        var orders = Game.market.getAllOrders();
        var sellOrders = _.groupBy(_.filter(orders, order => order.type == ORDER_SELL), order => order.resourceType)
        var buyOrders = _.groupBy(_.filter(orders, order => order.type == ORDER_BUY), order => order.resourceType)
        for (var i = 0; i < myCities.length; i++){
            if (myCities[i].terminal){
                var mineral = myCities[i].find(FIND_MINERALS)[0].mineralType;
                if (mineral in myCities[i].terminal.store && myCities[i].terminal.store[mineral] > 20000){
                	var goodOrders = markets.sortOrder(buyOrders[mineral]);
                	if (goodOrders.length && goodOrders[goodOrders.length - 1].price > .07 && myCities[i].storage.store.energy > 200000){
                		Game.market.deal(goodOrders[goodOrders.length - 1].id, Math.min(goodOrders[goodOrders.length - 1].remainingAmount,  Math.max(0, myCities[i].terminal.store[mineral] - 20000)), myCities[i].name)
                		console.log(Math.min(goodOrders[goodOrders.length - 1].remainingAmount,  Math.max(0, myCities[i].terminal.store[mineral] - 20000)) + " " + mineral + " sold for " + goodOrders[goodOrders.length - 1].price)
                	}
                }
                if (myCities[i].terminal.store['XGH2O']){
                    let quantity = myCities[i].terminal.store['XGH2O']
                    let myId = _.find(Object.keys(Game.market.orders), order => Game.market.orders[order].roomName === myCities[i].name && Game.market.orders[order].resourceType === 'XGH2O')
                    let myOrder = Game.market.orders[myId];
                    if (myOrder && myOrder.remainingAmount < quantity){
                        let remaining = myOrder.remainingAmount
                        Game.market.extendOrder(myId, (quantity - remaining))                     
                    } else if(!myOrder){
                        let price = markets.sortOrder(sellOrders['XGH2O'])[0].price - 0.1;
                        Game.market.createOrder(ORDER_SELL, 'XGH2O', price, quantity, myCities[i].name)
                    } else if (myOrder.remainingAmount > 15000 && myOrder.price > 3){
                        Game.market.changeOrderPrice(myId, (myOrder.price - 0.05))
                    }
                }
                if (myCities[i].storage.store.energy > 500000){
                	var energyOrders = markets.sortOrder(buyOrders[RESOURCE_ENERGY])
                	if (!energyOrders.length){
                	    return;
                	}
                	if (energyOrders[energyOrders.length - 1].price > 0.2){
                    	Game.market.deal(energyOrders[energyOrders.length - 1].id, Math.min(energyOrders[energyOrders.length - 1].remainingAmount, myCities[i].terminal.store.energy / 2), myCities[i].name)
                    	console.log(Math.min(energyOrders[energyOrders.length - 1].remainingAmount, myCities[i].terminal.store.energy / 2) + " energy sold for " + energyOrders[energyOrders.length - 1].price)
                	} else if (myCities[i].storage.store.energy > 600000 && energyOrders[energyOrders.length - 1].price > 0.1){
                	    Game.market.deal(energyOrders[energyOrders.length - 1].id, Math.min(energyOrders[energyOrders.length - 1].remainingAmount, myCities[i].terminal.store.energy / 2), myCities[i].name)
                    	console.log(Math.min(energyOrders[energyOrders.length - 1].remainingAmount, myCities[i].terminal.store.energy / 2) + " energy sold for " + energyOrders[energyOrders.length - 1].price)
                	} else if (myCities[i].storage.store.energy > 700000 && energyOrders[energyOrders.length - 1].price > 0.07){
                	    Game.market.deal(energyOrders[energyOrders.length - 1].id, Math.min(energyOrders[energyOrders.length - 1].remainingAmount, myCities[i].terminal.store.energy / 2), myCities[i].name)
                    	console.log(Math.min(energyOrders[energyOrders.length - 1].remainingAmount, myCities[i].terminal.store.energy / 2) + " energy sold for " + energyOrders[energyOrders.length - 1].price)
                	} else if (myCities[i].storage.store.energy > 800000 && energyOrders[energyOrders.length - 1].price > 0.04){
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