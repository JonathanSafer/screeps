//room data storage and refresh on global reset

/*
Shorthand and uses
sMC => safeModeCooldown: obs, roomplan
sME => safeMode end tick: obs, military
own => owner: military, obs, roomplan, motion
rcl => rcl: military, obs, roomplan, visuals, motion
ctrlP => controller position: obs, roomplan, visuals
src => source IDs: obs, roomplan
min => mineralType: obs, roomplan
skL => source keeper lair positions: obs, motion
sct => scout time: obs, roomplan, scout
s => score: roomplan, visuals
c => template center: roomplan
sT => room is unsafe until this tick: roomplan
cB = claim block: roomplan, spawnBuilder

NOTE: all positions stored as packed postions. Use utils.unPackPos to get a roomPos



*/

const u = require("../lib/utils")
const settings = require("../config/settings")

var data = {
    updateData: function(){
        if(!Memory.data){
            Memory.data = {
                lastReset: 0,
                uploading: false, //are we uploading and in the middle of a section
                section: 0, //section being uploaded to. Always recover from other section
            }
        }
        data.checkReset()
        data.recoverData()





        //const dataString = JSON.stringify(Cache.roomData)
        //const segmentSize = 50000
        //150k chars ~= 165kb
        //373k => 427kb ~4000 rooms
        //~3 cpu for 87k chars ~100kb, so probably ~30 cpu per tick for backing up data
        //backup every 1k ticks for 4 ticks => <0.2cpu/tick avg
        //load data into  both 1-20 and 21 - 40
        //if one side gets corrupted we can recover from the other side
        //otherwise we will update both sides in one 8 tick session
    },

    checkReset: function () {
        if(!Cache.time || Cache.time != Game.time - 1){
            Memory.data.lastReset = Game.time
        }
        Cache.time = Game.time
    },

    recoverData: function() {
        switch(Game.time - Memory.data.lastReset){
            case 0:
                //load first half of data
                break
            case 1:
                //read in first half of data
                //load second half of data
                break
            case 2:
                //read in second half of data
                break
            default:
                return
        }
    },

    backupData: function(){
        //don't backup during stats update or recovery
        //backup to section, then toggle section upon completion
    },

    getBreakPoint: function(str) {
        let bytes = 0, codePoint, next, i = 0

        while(i < str.length && bytes < 99900){
            codePoint = str.charCodeAt(i)

            // Lone surrogates cannot be passed to encodeURI
            if (codePoint >= 0xD800 && codePoint < 0xDC00 && i + 1 < str.length) {
                next = str.charCodeAt(i + 1)
                if (next >= 0xDC00 && next < 0xE000) {
                    bytes += 4
                    i+= 2
                    continue
                }
            }

            bytes += (codePoint < 0x80 ? 1 : (codePoint < 0x800 ? 2 : 3))
            i++
        }
        return i;
    },

    makeVisuals: function(){
        if(Game.cpu.bucket == 10000){
            //TODO: visuals should be its own file
            if(Cache.roomData){
                for(const roomName of Object.keys(Cache.roomData)){
                    const roomInfo = Cache.roomData[roomName]
                    if(roomInfo.ctrlP){
                        const pos = u.unpackPos(roomInfo.ctrlP, roomName)
                        Game.map.visual.circle(pos, {fill: "#FF0000", radius: 2})
                    }
                    if(roomInfo.src && Object.keys(roomInfo.src).length){
                        for(const source in roomInfo.src){
                            Game.map.visual.circle(u.unpackPos(roomInfo.src[source], roomName), {fill: "#00FF00", radius: 2})
                        }
                    }
                    if(roomInfo.rcl){
                        Game.map.visual.text(roomInfo.rcl, new RoomPosition(25,15,roomName), {color: "#00FF00", fontSize: 10})
                    }
                    if(roomInfo.s){
                        Game.map.visual.text(roomInfo.s, new RoomPosition(25,35,roomName), {color: "#00FF00", fontSize: 10})
                    }
                }
            }
        }
    }
}

module.exports = data