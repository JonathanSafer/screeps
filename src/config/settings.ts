
const username = getUsername()

function getUsername() {
    const roomObject = Object.values<RoomObject>(Game.structures).concat(Object.values(Game.creeps), Object.values(Game.powerCreeps), Object.values(Game.constructionSites))[0]
    const ownableObject = roomObject as Creep
    return ownableObject.my ? ownableObject.owner.username : ""
}

const settings = {
    username: username,
    allies: ["Atanner", "slowmotionghost", "Timendainum", "FeTiD", "SBense","6g3y",username],
    nukeStructures: [STRUCTURE_SPAWN, STRUCTURE_LAB, STRUCTURE_STORAGE, STRUCTURE_FACTORY,
        STRUCTURE_TERMINAL, STRUCTURE_POWER_SPAWN, STRUCTURE_NUKER],
    militaryBoosts:["XKHO2", "XGHO2", "XZHO2", "XLHO2", "XZH2O", "G"], // military boosts will be prioritized over civilian boosts
    civBoosts: ["XLH2O", "XUHO2", "XKH2O", "XUH2O", "XGH2O"],
    roomplanTime: 500,
    roomplanOffset: 155,
    cMTime: 400,
    cMOffset: 39,

    // market
    creditMin: 1000000, // min credits needed to start buying energy
    powerPrice: 8, // max price we will pay for power
    upgradeBoostPrice: 500, // max price we will pay for upgrade boost
    powerBuyVolume: 5000, // amount of power we will buy at once
    processPower: false, // process power instead of selling it
    rcl8upgrade: true, // use excess energy to GCL pump at RCL8

    miningDisabled: [], //cities that will not attempt any highway mining
    mineralAmount: 50000, // threshold to stop mining minerals
    ghodiumAmount: 7000, // threshold to stop producing ghodium
    boostsNeeded: 6000, // boost needed per city for us to boost creeps
    boostAmount: 5000, // threshold to stop producing boosts (add ~8000 to this and ghodium amount since this does not include ready to go boosts in terminal)
    wallHeight: [0, 0, 0, 30000, 100000, 500000, 2000000, 5000000],
    wallHeightGCL: 3, // GCL threshold to start building walls to `wallHeight` level
    flagCleanup: 2000, //interval to update old flags
    depositFlagRemoveTime: 100000, //ticks after deposit flag is placed after which it should be removed regardless of deposit status
    addRemote: 0.7,
    removeRemote: 0.9, // TODO: move this to bucket
    spawnFreeTime: 0.15, //amount of spawn time to be left open for miscellaneous activity
    spawnFreeTimeBuffer: 0.1,
    bucket: {//minimum bucket thresholds
        resourceMining: 1000,
        repair: 1500, //repairing walls in a room
        processPower: 2200,
        colony: 2000, // building new rooms
        upgrade: 7000,
        energyMining: 4000,
        powerMining: 5000,
        mineralMining: 8000,
        // other constants we use with these
        range: 3000, //this keeps all power mining from shutting off at once.
        //If range + range/2 > 10000, there may be times where a mining flag is not placed even though the bucket is full
        rclMultiplier: 200, // scale: rcl0 = 5k, 1 => 4.8k etc
        growthLimit: 5, // average bucket growth limit over 100+ ticks
    },
    energy: {//energy thresholds
        repair: 60000,
        rcl8upgrade: 450000,
        processPower: 400000,
        powerMine: 350000
    },
    max: {
        runners: 15, // low rcl
        builders: 3, //TODO is this in use?
        transporters: 2,
        miners: 1, // TODO: this shouldn't be in use anymore
    },
    motion: {
        backRoadPenalty: 1.5, // higher number prioritizes highways for long distance path planning
        pathFailThreshold: 3, // number of pathfinding failures before we stop trying to find a path
        pathFailRetry: 53 // number of ticks to wait before trying to find a path again after hitting the threshold
    },
    scouting: {
        assessTime: 500,
        controllerRoom: [20000, 5000, 5000, 10000, 15000, 20000, 40000, 60000, 100000],//scout time based on rcl
        sk: 100000,
        highway: 10000000
    },
    minerUpdateTime: 50,
    powerMiningRange: 2, //manhattan distance that we can powermine (in rooms)
    miningRange: 7, //manhattan distance that we can deposit mine (in rooms)
    observerFrequency: 20, // how often each city scans a highway room (other rooms will be scanned as often as possible with spare cpu)

    // Profiling
    profileFrequency: 19,
    profileLength: 1,
    profileResultsLength: 50, // top 50 results are recorded

    // Stats
    statTime: 19,
    resourceStatTime: 19 * 50,

    //Data
    backupTime: 52 //backupTime * statTime = backup interval
}

if(!Game.shard.name.includes("shard") || Game.shard.name == "shardSeason"){
    //botarena, swc and seasonal custom settings
    settings.allies = [username]
    settings.processPower = false
    settings.rcl8upgrade = false
    settings.powerMiningRange = 0 //manhattan distance that we can powermine (in rooms)
    settings.militaryBoosts = ["XZHO2", "XZH2O", "XLHO2", "XKHO2", "XGHO2"]
    settings.civBoosts = ["XLH2O", "XGH2O"]
    settings.wallHeightGCL = 5
    settings.wallHeight[7] = 2000000
}

if (!Memory.settings) {
    Memory.settings = {
        allies: settings.allies
    }
}

export = settings
