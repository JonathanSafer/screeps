# screeps
Screeps AI

Functional screeps AI.

## Instructions
### Startup
1. Place your spawn in a large open area. Name it roomName0, for example, if the room is called E12N14, the spawn should be E12N140. The spawn should have 6 open squares on each side (13 by 13 square with spawn in the middle).

### Claiming and Attacking (see "New City" section below and "Attacking" section below)
TLDR place flags in other rooms like "claim" (claim room), "plan" (build base at flag location), "break" (break buildings), "shoot" (send ranged troops).

## Features
1. Cities can mine remote rooms.
1. Cities will use market to trade for minerals and sell excess resources for credits.
1. Cities use labs to make max power boosts for military and upgraders from minerals.
1. Cities mine power for power creeps.
1. Cities mine commodities and will attempt to create high level products with available factories
1. Nearly all structures and roads are placed automatically
1. AI optomized for Shard 3 (low CPU)

## Current Roles
### Core Roles
1. Builder            - build buildings from constructions sites, repair roads/walls
1. Remote Miner       - source of energy. mine energy sources in the room or neighboring rooms
1. Runner             - bring energy from miners to base
1. Transporter        - redistribute energy in base. load extensions, spawns, towers, factory, labs, and nuker
1. Upgrader           - upgrade base level
1. Ferry              - miscellaneous task operator. tasks include; lab work, factory, terminal management etc.

### Military
1. (big)Breaker       - destroys enemy buildings. Pair with healer.
1. (big)Medic         - heals other military units
1. (big)Trooper       - ranged unit. Pair with healer.
1. Defender           - Defend against enemy invaders.
1. Harasser           - Small attacking unit for cheap damage to enemy remote miners and protecting highways
1. Robber             - takes resources from enemy rooms

### Other
1. Claimer            - claim rooms for new cities
1. Deposit Miner      - mine deposits in nearby highway rooms
1. Mineral Miner      - mine mineral source in the room
1. Power Creep        - boost other creeps/resources/structures in a room
1. Power Miner        - mine power in nearby highway rooms
1. Scout              - reserves rooms for remote mining
1. Spawn Builder      - build initial buildings in a new city

## Flag usage
Most flags require a city name to be part of their name to specify the city that will be sending creeps to the flag.
For example: a flag named `E11N140shoot` will send a trooper from E11N140. A city's name will always be the room name with a '0' added to the end. For flags that require a city name, we will use a '-' to convey that. So in the example above, the flag would referred to as `-shoot`.

## New City
### How to build a new city (not the first spawn)
1. Find an empty room within 10-15 squares of a current room (must be greater than rcl 4).
1. Open the room. Place a `claim` flag anywhere in the room.
1. Place a `plan` flag in the room as well. The `plan` flag will be placed in the top left corner of your base, so carefully find a 13 by 13 area in the room and place the flag in the top left corner of that area. You're done! Everything after this point is automated.

### How a new city develops after flags are placed
1. Wait ~500 ticks for the `claim` flag to be recognized and processed. The closest room (greater than rcl 4) will create claimers to claim the room and spawnBuilders to build the spawn & get the room started.
1. The `plan` flag will be replaced with construction sites for core buildings in the room after the room has been claimed.

## Offensive Flags
### Breaker attack (destroy structures in a room), with medic support
1. Place a flag `-break` in the target room.
1. (optional) Place a flag `-breakTarget` on any structure in the room to manually override the targeting system to that location.
1. (optional) Place a flag `-breakerRally` to force the breaker to walk through a particular space on its way to the destination
1. (optional) If the attack is being launched from an RCL 8 room, `-bigBreak` can be used instead of `-break` to use a more powerful boosted breaker for the job. All other flag names remain the same for the big breaker.
Notes: Don't forget to remove your flags when you are done with them! Your cities will continually try to reinforce flags until they are removed.

### Trooper attack (for creep destruction, and less fortified opponents), with medic support
1. Place a flag `-shoot` in the target room.
1. (optional) Place a flag `-trooperRally` to force the breaker to walk through a particular space on its way to the destination
1. (optional) If the attack is being launched from an RCL 8 room, `-bigShoot` can be used instead of `-shoot` to use a more powerful boosted trooper for the job. All other flag names remain the same for the big trooper.
Notes: Don't forget to remove your flags when you are done with them! Your cities will continually try to reinforce flags until they are removed.

### Robber
*Coming soon*

## Other flag info
There are some automated roles that currently run off of flags. These include the Power Miner, Deposit Miner, and Harasser. You do not need to interact with their respective flags (`-powerMine`, `-deposit`, `-harass`) for them to operate successfully.

