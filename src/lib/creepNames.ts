
export const enum cN {
    FERRY_NAME = "ferry",
    DEFENDER_NAME = "defender",
    TRANSPORTER_NAME = "transporter",
    REMOTE_MINER_NAME = "remoteMiner",
    RUNNER_NAME = "runner",
    UPGRADER_NAME = "upgrader",
    BUILDER_NAME = "builder",
    QUAD_NAME = "quad",
    MINERAL_MINER_NAME = "mineralMiner",
    CLAIMER_NAME = "claimer",
    UNCLAIMER_NAME = "unclaimer",
    SPAWN_BUILDER_NAME = "spawnBuilder",
    HARASSER_NAME = "harasser",
    MEDIC_NAME = "medic",
    BREAKER_NAME = "breaker",
    POWER_MINER_NAME = "powerMiner",
    ROBBER_NAME = "robber",
    DEPOSIT_MINER_NAME = "depositMiner",
    SCOUT_NAME = "scout",
    QR_CODE_NAME = "qrCode",
    REPAIRER_NAME = "repairer",
    RESERVER_NAME = "reserver",
    BRICK_NAME = "brick",
    SK_GUARD_NAME = "skGuard"
}

export const rolePriorities = function(){
    const priorities = {}
    priorities[cN.FERRY_NAME] = 0
    priorities[cN.DEFENDER_NAME] = 2
    priorities[cN.TRANSPORTER_NAME] = 1
    priorities[cN.REMOTE_MINER_NAME] = 3
    priorities[cN.SK_GUARD_NAME] = 3
    priorities[cN.RUNNER_NAME] = 2
    priorities[cN.UPGRADER_NAME] = 5
    priorities[cN.BUILDER_NAME] = 6
    priorities[cN.QUAD_NAME] = 3
    priorities[cN.MINERAL_MINER_NAME] = 8
    priorities[cN.CLAIMER_NAME] = 9
    priorities[cN.UNCLAIMER_NAME] = 10
    priorities[cN.SPAWN_BUILDER_NAME] = 11
    priorities[cN.HARASSER_NAME] = 3
    priorities[cN.MEDIC_NAME] = 13
    priorities[cN.BREAKER_NAME] = 13
    priorities[cN.POWER_MINER_NAME] = 13
    priorities[cN.ROBBER_NAME] = 14
    priorities[cN.DEPOSIT_MINER_NAME] = 15
    priorities[cN.SCOUT_NAME] = 16
    priorities[cN.QR_CODE_NAME] = 17
    priorities[cN.REPAIRER_NAME] = 14
    priorities[cN.RESERVER_NAME] = 15
    priorities[cN.BRICK_NAME] = 15
    return priorities
}

export const enum BodyType {
    brick,
    reserver,
    scout,
    quad,
    runner,
    miner,
    normal,
    transporter,
    builder,
    defender,
    unclaimer,
    harasser,
    repairer,
    spawnBuilder,
    ferry,
    breaker,
    medic,
    powerMiner,
    basic,
    lightMiner,
    erunner,
    claimer,
    robber,
    mineralMiner,
    depositMiner,
    sKguard,
}
