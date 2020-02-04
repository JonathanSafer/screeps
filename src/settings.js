

var settings = {
	roomplanTime: 500,
	roomplanOffset: 155,
	creditMin: 4500000, //min credits needed to start buying energy
	miningDisabled: ['W1N210', 'W2N240'], //cities that will attempt any highway mining
	bucket: {//minimum bucket thresholds
		mining: 6000 //highway mining
	},

    // Profiling
    profileFrequency: 123, // profiler runs every 123 ticks
    profileLength: 7, // profiler is run for 7 ticks
    profileResultsLength: 50 // top 50 results are recorded
};

module.exports = settings;