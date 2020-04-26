

var settings = {
    allies: ["Atanner"],
    nukeStructures: [STRUCTURE_SPAWN, STRUCTURE_LAB, STRUCTURE_STORAGE, STRUCTURE_FACTORY,
        STRUCTURE_TERMINAL, STRUCTURE_POWER_SPAWN, STRUCTURE_NUKER],
    boosts: ["XKHO2", "XGHO2", "XZHO2", "XLHO2", "XZH2O", "XLH2O", "XGH2O", "XUHO2", "XKH2O", "XUH2O"],
    roomplanTime: 500,
    roomplanOffset: 155,

    // market
    creditMin: 1000000, //min credits needed to start buying energy
    powerPrice: 8, // price we will pay for power
    powerBuyVolume: 5000, // amount of power we will buy at once

    miningDisabled: ["W2N240"], //cities that will attempt any highway mining
    ghodiumAmount: 7000, //threshold to stop producing ghodium
    boostsNeeded: 5000, // boosts needed per city of a kind for us to boost creeps
    boostAmount: 5000, //threshold to stop producing boosts (add ~8000 to this and ghodium amount since this does not include ready to go boosts in terminal)
    wallHeight: 10000000,
    bucket: {//minimum bucket thresholds
        resourceMining: 1000,
        repair: 2000, //repairing walls in a room
        processPower: 2200,
        colony: 4000, // building new rooms
        upgrade: 8000,
        energyMining: 4000,
        powerMining: 6000,
        // other constants we use with these
        range: 1000,
        powerRange: 3000, //this keeps all power mining from shutting off at once. 
        //If powerMining + powerRange/2 > 10000, there may be times where a mining flag is not placed even though the bucket is full
        rclMultiplier: 200, // scale: rcl0 = 5k, 1 => 4.8k etc
        growthLimit: 5, // average bucket growth limit over 100+ ticks
    },
    energy: {//energy thresholds
        rcl8upgrade: 550000,
        processPower: 500000,
        powerMine: 550000
    },
    max: {
        upgraders: 6, // low rcl
        runners: 6, // low rcl
        builders: 3,
        transporters: 2,
        miners: 1, // rcl8
    },
    motion: {
        backRoadPenalty: 1.5
    },
    powerMiningRange: 2,
    miningRange: 7,
    observerFrequency: 20, // how often each city scans a room

    // Profiling
    profileFrequency: 19, // profiler runs every 123 ticks
    profileLength: 1, // profiler is run for 7 ticks
    profileResultsLength: 50, // top 50 results are recorded

    // Stats
    statTime: 19,
    resourceStatTime: 19 * 50,
}

module.exports = settings