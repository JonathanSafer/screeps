

var settings = {
    allies: ["Atanner"],
    roomplanTime: 500,
    roomplanOffset: 155,
    creditMin: 4500000, //min credits needed to start buying energy
    miningDisabled: ["W2N240"], //cities that will attempt any highway mining
    ghodiumAmount: 15000, //threshold to stop producing ghodium
    boostAmount: 12000, //threshold to stop producing boosts
    wallHeight: 10000000,
    bucket: {//minimum bucket thresholds
        powerMining: 8500,
        powerRange: 3000, //this keeps all power mining from shutting off at once. 
        //If powerMining + powerRange/2 > 10000, there may be times where a mining flag is not placed even though the bucket is full
        upgrade: 6000,
        upgradeRange: 2000,
        resourceMining: 1000,
        colony: 5000, // building new rooms
        repair: 3000, //repairing walls in a room
        rclMultiplier: 200, // scale: rcl0 = 5k, 1 => 4.8k etc
        processPower: 3200,
        growthLimit: 3, // bucket cannot grow more than 3 cpu/tick
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
    miningRange: 7,
    observerFrequency: 20, // how often each city scans a room

    // Profiling
    profileFrequency: 123, // profiler runs every 123 ticks
    profileLength: 7, // profiler is run for 7 ticks
    profileResultsLength: 50 // top 50 results are recorded
}

module.exports = settings