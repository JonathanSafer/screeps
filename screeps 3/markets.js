
module.exports = {
    sortOrder: function sortOrder(orders) {
        sortedOrders = _.sortBy(orders, order => order.price); 
        return sortedOrders;
    }
};