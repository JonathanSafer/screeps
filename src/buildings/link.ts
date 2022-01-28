var rL = {

    // range needed to use these
    UPGRADE: 3,
    SOURCE: 1,
    STORAGE: 1,
    LINK: 1,

    fixCacheIfInvalid: function(room: Room) {
        const rN = room.name
        if (!Cache[rN]) Cache[rN] = {}
        const links: LinksCache = Cache[rN].links || {}
        let storageLink: StructureLink = Game.getObjectById(links.store)
        let upgradeLink: StructureLink = Game.getObjectById(links.upgrade)
        let sourceLinks = _.map(links.source, src => Game.getObjectById(src))
        if(storageLink && Game.time % 10 != 0)
            return
        if (storageLink && upgradeLink && _.reduce(sourceLinks, (l, r) => l && r)
            && sourceLinks.length == 2) {
            return
        } else {
            const memory = Game.spawns[room.memory.city].memory
            sourceLinks = []
            for(const source in memory.sources){
                const linkPos = memory.sources[source][STRUCTURE_LINK + "Pos"]
                if(linkPos){
                    const look = room.lookForAt(LOOK_STRUCTURES, Math.floor(linkPos/50), linkPos%50)
                    for(const result of look){
                        if(result instanceof StructureLink)
                            sourceLinks.push(result)
                    }
                }
            }
            if(memory.upgradeLinkPos){
                const look = room.lookForAt(LOOK_STRUCTURES, Math.floor(memory.upgradeLinkPos/50), memory.upgradeLinkPos%50)
                for(const result of look){
                    if(result instanceof StructureLink)
                        upgradeLink = result
                }
            }
            const structures = room.find(FIND_MY_STRUCTURES)
            storageLink = _.find(structures, struct => struct.structureType == STRUCTURE_LINK
                && struct.pos.inRangeTo(room.storage, 2)) as StructureLink
            links.store = storageLink ? storageLink.id : null
            links.upgrade = upgradeLink ? upgradeLink.id : null
            links.source = _.map(sourceLinks, link => link ? link.id : null)
            Cache[rN].links = links
        }
    },

    run: function(room) {
        const rcl = room.controller && room.controller.level
        if (rcl < 5) return

        rL.fixCacheIfInvalid(room)

        const links = Cache[room.name].links
        const storageLink: StructureLink = Game.getObjectById(links.store)
        const upgradeLink: StructureLink = Game.getObjectById(links.upgrade)
        const sourceLinks = _.map(links.source, src => Game.getObjectById(src))

        // Make transfers
        for (const sourceLink of sourceLinks) {
            if (sourceLink.store.getUsedCapacity(RESOURCE_ENERGY) <= 
                sourceLink.store.getCapacity(RESOURCE_ENERGY) * 0.5) {
                continue // sourceLink isn't full yet
            }

            if (rL.readyForLinkTransfer(sourceLink, upgradeLink)) {
                sourceLink.transferEnergy(upgradeLink)
            } else if (rL.readyForLinkTransfer(sourceLink, storageLink)) {
                sourceLink.transferEnergy(storageLink)
            }
        }
        //send from storage link to upgrade link
        if(storageLink && rL.readyForLinkTransfer(storageLink, upgradeLink)){
            storageLink.transferEnergy(upgradeLink)
        }
    },

    getUpgradeLink: function(room: Room) {
        if (!room.controller || room.controller.level < 5) return false
        const spawn = Game.spawns[room.memory.city]
        const linkPos = spawn.memory.upgradeLinkPos
        if(linkPos){
            const look = room.lookForAt(LOOK_STRUCTURES, Math.floor(linkPos/50), linkPos%50)
            for(const result of look){
                if(result.structureType == STRUCTURE_LINK)
                    return result as StructureLink
            }
        }
        return false
    },

    readyForLinkTransfer(sender, receiver) {
        return receiver && !receiver.store.getUsedCapacity(RESOURCE_ENERGY) && !sender.cooldown
    }
}

export = rL