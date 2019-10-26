# screeps
Screeps AI

Functional screeps AI.

## Instructions
1. Place flags to attack and claim rooms.


## Features
1. Cities can mine remote rooms.
1. Cities will use market to trade for minerals in the market and sell excess resources for credits.
1. Cities use labs to make max power boosts for military and upgraders from minerals.
1. Cities mine power for power creeps.
1. Nearly all structures and roads are placed automatically
1. AI optomized for Shard 3 (low CPU)

## New City
### How to build a new city (not the first spawn)
1. Find an empty room within 10-15 squares of a current room (must be greater than rcl 4).
1. Open the room. Place a flag in the room with the text "claim".
1. Place another flag in the room with the text "plan". The plan flag will be placed in the top left corner of your base, so carefully find a 13 by 13 area in the room and place the flag in the top corner of that area. You're done! Everything after this point is automated.

### How a new city develops after flags are placed
1. Wait ~500 ticks for the claim flag to be recognized and processed. The closest room (greater than rcl 4) will create claimers to claim the room and spawnBuilders to build the spawn & get the room started.
1. The plan flag will be replaced with construction sites for core buildings in the room after the room has been claimed.

## Current Roles
### Core Roles
1. Builder            - build buildings from constructions sites, repair roads/walls
1. Remote Miner       - source of energy. mine energy sources in the room or neighboring rooms
1. Runner             - bring energy from miners to base
1. Transporter        - redistribute energy in base. load extensions, load terminal for market transactions
1. Upgrader           - upgrade base level

### Military
1. Attacker           - todo
1. (big)Breaker       - destroys enemy buildings
1. (big)Medic         - heals other military units
1. (big)Trooper       - ranged unit
1. Defender           - todo
1. Harasser           - todo
1. Robber             - takes resources from storage in enemy rooms

### Other
1. Claimer            - claims rooms for new cities or remote mining
1. Deposit Miner      - todo
1. Ferry              - todo
1. Mineral Miner      - mine mineral source in the room (minerals are used for powerups for creeps)
1. Power Creep        - boost other creeps/resources in a room
1. Power Miner        - mine power for upgrading the power creep
1. Scout              - todo
1. Spawn Builder      - build initial buildings in a new city


