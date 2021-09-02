//room data storage and refresh on global reset

/*
Shorthand and uses
sMC => safeModeCooldown: roomplan
sME => safeMode end tick: military
own => owner: military, roomplan, motion
rcl => rcl: military, roomplan, visuals, motion
ctrlP => controller position: roomplan, visuals
srcP => source positions: roomplan, visuals
src => source IDs: roomplan
min => mineralType: roomplan
skL => source keeper lair positions: motion
sct => scout time: roomplan, scout
s => score: roomplan, visuals
c => template center: roomplan
sT => room is unsafe until this tick: roomplan
cB = claim block: roomplan, spawnBuilder

NOTE: all positions stored as packed postions. Use utils.unPackPos to get a roomPos



*/

const u = require("../lib/utils")

var data = {
    updateData: function(){
        //load data into  both 1-40 and 41 - 80
        //if one side gets corrupted we can recover from the other side
        //otherwise we will update both sides in one 8 tick session
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
                    if(roomInfo.src && roomInfo.src.length){
                        for(const pos of roomInfo.src){
                            Game.map.visual.circle(u.unpackPos(pos, roomName), {fill: "#00FF00", radius: 2})
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