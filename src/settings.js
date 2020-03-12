

var settings = {
    allies: ["Atanner"],
    roomplanTime: 500,
    roomplanOffset: 155,
    creditMin: 1000000, //min credits needed to start buying energy
    miningDisabled: ["W2N240", "E2S310"], //cities that will attempt any highway mining
    ghodiumAmount: 15000, //threshold to stop producing ghodium
    boostAmount: 12000, //threshold to stop producing boosts
    wallHeight: 10000000,
    bucket: {//minimum bucket thresholds
        resourceMining: 1000,
        repair: 2000, //repairing walls in a room
        processPower: 2200,
        colony: 4000, // building new rooms
        upgrade: 5000,
        energyMining: 4000,
        powerMining: 8500, // TODO split pc-powered & unpowered
        // other constants we use with these
        range: 1000,
        powerRange: 3000, //this keeps all power mining from shutting off at once. 
        //If powerMining + powerRange/2 > 10000, there may be times where a mining flag is not placed even though the bucket is full
        rclMultiplier: 200, // scale: rcl0 = 5k, 1 => 4.8k etc
        growthLimit: 5, // average bucket growth limit over 100+ ticks
    },
    energy: {//energy thresholds
        rcl8upgrade: 620000,
        processPower: 600000,
        powerMine: 650000
    },
    max: {
        upgraders: 3, // low rcl
        runners: 4, // low rcl
        builders: 3,
        transporters: 2,
        miners: 1, // rcl8
    },
    powerMiningRange: 3,
    miningRange: 7,
    observerFrequency: 20, // how often each city scans a room

    // Profiling
    profileFrequency: 15, // profiler runs every 123 ticks
    profileLength: 1, // profiler is run for 7 ticks
    profileResultsLength: 50 // top 50 results are recorded
}

module.exports = settings