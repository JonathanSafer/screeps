

var settings = {
	roomplanTime: 500,
	roomplanOffset: 155,
	creditMin: 4500000, //min credits needed to start buying energy
	miningDisabled: ['W1N210', 'W2N240'], //cities that will attempt any highway mining
	bucket: {//minimum bucket thresholds
		mining: 6000 //highway mining
	}
};

module.exports = settings;