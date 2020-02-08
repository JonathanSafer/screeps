

var settings = {
    roomplanTime: 500,
    roomplanOffset: 155,
    creditMin: 4500000, //min credits needed to start buying energy
    miningDisabled: ["W1N210", "W2N240", "W11N190"], //cities that will attempt any highway mining
    ghodiumAmount: 15000, //threshold to stop producing ghodium
    boostAmount: 12000, //threshold to stop producing boosts
    wallHeight: 10000000,
    bucket: {//minimum bucket thresholds
        powerMining: 6000,
        resourceMining: 1000,
        colony: 4000, // building new rooms
        repair: 3000 //repairing walls in a room
    },

    // Profiling
    profileFrequency: 123, // profiler runs every 123 ticks
    profileLength: 7, // profiler is run for 7 ticks
    profileResultsLength: 50 // top 50 results are recorded
}

module.exports = settings