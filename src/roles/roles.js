var rMe = require("./medic")
var rDM = require("./depositMiner")
var rH = require("./harasser")
var rSB = require("./spawnBuilder")
var rC = require("./claimer")
var rUC = require("./unclaimer")
var rRo = require("./robber")
var rF = require("./ferry")
var rMM = require("./mineralMiner")
var rU = require("./upgrader")
var rB = require("./builder")
var rR = require("./runner")
var rBr = require("./breaker")
var rT = require("./transporter")
var rM = require("./remoteMiner")
var rD = require("./defender")
var rPM = require("./powerMiner")
var rQ = require("./quad")
var rS = require("./scout")
var rRe = require("./repairer")
const rQr = require("./qrCode")
const rRr = require("./reserver")
const rBk = require("./brick")


var rr = {
    // order roles for priority. TODO powercreep?
    getRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB, rQ, rMM, rC, rUC,
            rSB, rH,rMe, rBr, rPM,
            rRo, rDM, rS, rQr, rRe, rRr, rBk]
    },

    getRolePriorities: function(){
        const priorities = {}
        priorities[rF.name] = 0
        priorities[rD.name] = 2
        priorities[rT.name] = 1
        priorities[rM.name] = 3
        priorities[rR.name] = 4
        priorities[rU.name] = 5
        priorities[rB.name] = 6
        priorities[rQ.name] = 7
        priorities[rMM.name] = 8
        priorities[rC.name] = 9
        priorities[rUC.name] = 10
        priorities[rSB.name] = 11
        priorities[rH.name] = 12
        priorities[rMe.name] = 13
        priorities[rBr.name] = 13
        priorities[rPM.name] = 13
        priorities[rRo.name] = 14
        priorities[rDM.name] = 15
        priorities[rS.name] = 16
        priorities[rQr.name] = 17
        priorities[rRe.name] = 14
        priorities[rRr.name] = 15
        priorities[rBk.name] = 15
        return priorities
    },

    getCoreRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB]
    },

    getEmergencyRoles: function() {
        return [rF, rD, rT, rM, rR]
    }
}

module.exports = rr