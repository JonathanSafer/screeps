// https://github.com/screepers/simpleAllies/blob/main/src/ts/simpleAllies.ts


import settings = require("../config/settings");

// This isn't in the docs for some reason, so we need to add it
export const maxSegmentsOpen = 10

export interface ResourceRequest {
    /**
     * 0-1 where 1 is highest consideration
     */
    priority: number
    roomName: string
    resourceType: ResourceConstant
    /**
     * How much they want of the resource. If the responder sends only a portion of what you ask for, that's fine
     */
    amount: number
    /**
     * If the bot has no terminal, allies should instead haul the resources to us
     */
    terminal?: boolean
}

export interface DefenseRequest {
    roomName: string
    /**
     * 0-1 where 1 is highest consideration
     */
    priority: number
}

export interface AttackRequest {
    roomName: string
    /**
     * 0-1 where 1 is highest consideration
     */
    priority: number
}

export interface PlayerRequest {
    playerName: string
    /**
     * 0-1 where 1 is highest consideration. How much you think your team should hate the player. Should probably affect combat aggression and targetting
     */
    hate?: number
    /**
     * The last time this player has attacked you
     */
    lastAttackedBy?: number
}

export type WorkRequestType = "build" | "repair"

export interface WorkRequest {
    roomName: string
    /**
     * 0-1 where 1 is highest consideration
     */
    priority: number
    workType: WorkRequestType
}

export const enum FunnelGoal {
    GCL = 0,
    RCL7 = 1,
    RCL8 = 2
}

export interface FunnelRequest {
    /**
     * Amount of energy needed. Should be equal to energy that needs to be put into controller for achieving goal.
     */
    maxAmount: number
    /**
     * What energy will be spent on. Room receiving energy should focus solely on achieving the goal.
     */
    goalType: FunnelGoal;
    /**
     * Room to which energy should be sent. If undefined resources can be sent to any of requesting player's rooms.
     */
    roomName?: string
}

export interface EconRequest {
    /**
     * total credits the bot has. Should be 0 if there is no market on the server
     */
    credits: number
    /**
     * the maximum amount of energy the bot is willing to share with allies. Should never be more than the amount of energy the bot has in storing structures
     */
    sharableEnergy: number
    /**
     * The average energy income the bot has calculated over the last 100 ticks
     * Optional, as some bots might not be able to calculate this easily.
     */
    energyIncome?: number
    /**
     * The number of mineral nodes the bot has access to, probably used to inform expansion
     */
    mineralNodes?: { [key in MineralConstant]: number }
}

export interface RoomRequest {
    roomName: string
    /**
     * The player who owns this room. If there is no owner, the room probably isn't worth making a request about
     */
    playerName: string
    /**
     * The last tick your scouted this room to acquire the data you are now sharing
     */
    lastScout: number
    rcl: number
    /**
     * The amount of stored energy the room has. storage + terminal + factory should be sufficient
     */
    energy: number
    towers: number
    avgRamprtHits: number
    terminal: boolean
}

export interface AllyRequests {
    resource: ResourceRequest[]
    defense: DefenseRequest[]
    attack: AttackRequest[]
    player: PlayerRequest[]
    work: WorkRequest[]
    funnel: FunnelRequest[];
    econ?: EconRequest
    room: RoomRequest[]
}

/**
 * Having data we pass into the segment being an object allows us to send additional information outside of requests
 */
export interface SimpleAlliesSegment {
    /**
     * Requests of the new system
     */
    requests: AllyRequests
}

const requestsSekelton: AllyRequests = {
    resource: [],
    defense: [],
    attack: [],
    player: [],
    work: [],
    funnel: [],
    room: [],
}


class SimpleAllies {
    myRequests: AllyRequests = {...requestsSekelton}
    // Partial since we can't trust others to not omit fields
    // we want to make sure we check their existence
    allySegmentData: Partial<SimpleAlliesSegment> = {}
    allyRequestMap: { [key: string]: AllyRequests } = {}
    currentAllyIndex = 0
    currentAlly?: string

    /**
     * To call before any requests are made or responded to. Configures some required values and gets ally requests
     */
    initRun() {
        // Reset the data of myRequests
        this.myRequests = {
            resource: [],
            defense: [],
            attack: [],
            player: [],
            work: [],
            funnel: [],
            room: [],
        }
    }

    /**
     * Try to get segment data from our current ally. If successful, assign to the instane
     */
    readAllySegment() {
        const allies = _.remove(Memory.settings.allies, name => name == settings.username)
        if (!allies.length) {
            Log.Error("Failed to find an ally for simpleAllies, you probably have none :(")
            return
        }

        if (!Memory.settings.allySegmentID) {
            Log.Warning("Failed to find an ally segment ID for simpleAllies, set one using 'SetAllySegment(int segmentID)'")
            return
        }

        this.currentAlly = allies[this.currentAllyIndex]

        this.currentAllyIndex = (this.currentAllyIndex + 1) % allies.length

        // Make a request to read the data of the next ally in the list, for next tick
        const nextAllyName = allies[this.currentAllyIndex]
        RawMemory.setActiveForeignSegment(nextAllyName, Memory.settings.allySegmentID)

        // Maybe the code didn't run last tick, so we didn't set a new read segment
        if (!RawMemory.foreignSegment) return
        if (RawMemory.foreignSegment.username !== this.currentAlly) return

        // Protect from errors as we try to get ally segment data
        try {
            this.allySegmentData = JSON.parse(RawMemory.foreignSegment.data)
            this.allyRequestMap[this.currentAlly] = this.allySegmentData.requests
        } catch (err) {
            Log.error(`Error in getting requests for simpleAllies ${this.currentAlly}`)
        }
    }

    /**
     * To call after requests have been made, to assign requests to the next ally
     */
    endRun() {
        if (!Memory.settings.allySegmentID) {
            return
        }

        // Make sure we don't have too many segments open
        if (Object.keys(RawMemory.segments).length >= maxSegmentsOpen) {
            Log.Error("Too many segments open: simpleAllies")
            return
        }

        const newSegmentData: SimpleAlliesSegment = {
            requests: this.myRequests as AllyRequests
        }

        RawMemory.segments[Memory.settings.allySegmentID] = JSON.stringify(newSegmentData)
        RawMemory.setPublicSegments([Memory.settings.allySegmentID])
    }

    // Request methods

    requestResource(args: ResourceRequest) {
        this.myRequests.resource.push(args)
    }

    requestDefense(args: DefenseRequest) {
        this.myRequests.defense.push(args)
    }

    requestAttack(args: AttackRequest) {
        this.myRequests.attack.push(args)
    }

    requestPlayer(args: PlayerRequest) {
        this.myRequests.player.push(args)
    }

    requestWork(args: WorkRequest) {
        this.myRequests.work.push(args)
    }

    requestFunnel(args: FunnelRequest) {
        this.myRequests.funnel.push(args)
    }

    requestEcon(args: EconRequest) {
        this.myRequests.econ = args
    }

    requestRoom(args: RoomRequest) {
        this.myRequests.room.push(args)
    }
}

export const simpleAllies = new SimpleAllies()