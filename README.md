![Test & Deploy](https://github.com/jordansafer/screeps/workflows/Test%20&%20Deploy/badge.svg)
# screeps
Screeps AI

Functional screeps AI.

## Instructions
### Building and running
Use the following sequence of steps to build and run the code:
1. Install nodejs (Node 12.x recommended)
2. `npm ci` # install dependencies
3. `npm test` # run lint and tests
4. `npm run coverage` # get code coverage report
5. `npm run roll` # combine project into a single file to upload to screeps
6. Upload the file to a screeps server. This can be done using `npm run push` if you have a screeps.yml file (https://github.com/screepers/node-screeps-api)

### Startup
1. Place your spawn in a large open area. Name it <roomName>0, for example, if the room is called E12N14, the spawn should be E12N140. The spawn should have 6 open squares on each side (13 by 13 square with spawn in the middle).

### Claiming and Attacking (see "New City" section below and "Attacking" section below)
TLDR flag other rooms to "claim" (claim room), "plan" (build base at flag location), "break" (break buildings). Use the PlaceFlag() function from the console.

## Features
1. Cities will use market to trade for minerals and sell excess resources for credits.
1. Cities use labs to make max power boosts for military and upgraders from minerals.
1. Cities mine power for power creeps.
1. Cities mine commodities and will attempt to create high level products with available factories and sell them.
1. All structures and roads are placed automatically
1. New rooms will be claimed automatically (private server only)
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
1. Breaker       - destroys enemy buildings. Pair with healer.
1. Medic         - heals other military units
1. Quad               - ranged group of 4 units. units heal each other and focus attacks.
1. Defender           - Defend against enemy invaders.
1. Harasser           - Ranged attacking unit for cheap damage to enemy remote miners and protecting highways
1. Robber             - takes resources from enemy rooms

### Other
1. Claimer            - claim rooms for new cities
1. Deposit Miner      - mine deposits in nearby highway rooms
1. Mineral Miner      - mine mineral source in the room
1. Power Creep        - boost other creeps/resources/structures in a room
1. Power Miner        - mine power in nearby highway rooms
1. Spawn Builder      - build initial buildings in a new city
1. Scout              - scout nearby rooms
1. Unclaimer          - attack enemy controllers

## Flagging targets
The PlaceFlag function can be used from the console to flag a target with a flag.
For example: `PlaceFlag("claim", 25, 25, "E9N32")`

Flag Types:
1. claim                   - claim a room
1. plan                    - create a layout for a structures in a new room
1. <roomName>break         - send a breaker to a room to destroy structures
1. <roomName>quadRally      - send a quad to a room to destroy and creeps

If a flag requires a city name to be part of its name, this specifies the city that will send the creeps.
For example: a flag named `E11N140break` will send a breaker from E11N140. A city's name will always be the room name with a '0' added to the end. For flags that require a city name, we will use a '-' to convey that. So in the example above, the flag would referred to as `-break`.

## New City
### How to build a new city (not the first spawn)
1. Find an empty room within 10-15 squares of a current room (must be greater than rcl 4).
1. Open the room. Place a `claim` flag anywhere in the room.
1. Place a `plan` flag in the room as well. The `plan` flag will be placed in the top left corner of your base, so carefully find a 13 by 13 area in the room and place the flag in the top left corner of that area. You're done! Everything after this point is automated.

### How a new city develops after flags are placed
1. Wait ~500 ticks for the `claim` flag to be recognized and processed. The closest room (greater than rcl 4) will create claimers to claim the room and spawnBuilders to build the spawn & get the room started.
1. The `plan` flag will be replaced with construction sites for core buildings in the room after the room has been claimed.

## Other flag info
There are some automated roles that currently run off of flagging mechanisms. These include the Power Miner, Deposit Miner, and Harasser. You do not need to interact with their respective flags (`-powerMine`, `-deposit`, `-harass`) for them to operate successfully.

## More useful functions
* `DeployQuad(targetRoom)` deploy a quad to target room (must be a roomName)
* `SpawnQuad(city, boosted)` spawn a quad from specified city. If boosted is true, the city will attempt to make the quad boosted
* `SpawnBreaker(city, boosted)` spawn a breaker from specified city. If boosted is true, the city will attempt to make the breaker boosted
* `SpawnRole(role, city, boosted)` spawn any role from specified city. If boosted is true, the city will attempt to make the creep boosted

# Best Practices for making changes
- Make new paths in memory for new usecases. For example Memory.attacks.xxxx instead of Memory.xxxx. Easier to change and clean up this way.
- Cache things in Cache.xxx if we can afford to lose them. This saves cpu from memory lookups on each tick.
- Always store room names/ids instead of the objects. Saving an object causes bugs because the internal fields within the object will be incorrect over time. For example creep.store values will change in game, but not in the copy you have stored. Names/Ids also take less memory.
- Store new routines in seperate files.
- Add new files to `profiler-prep.js` so we profile them.
- Make sure changes pass `npm test` checks, eslint and mocha tests, to minimize sloppy bugs

