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


var rr = {
    // order roles for priority. TODO powercreep?
    getRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB, rQ, rMM, rC, rUC,
            rSB, rH,rMe, rBr, rPM,
            rRo, rDM, rS]
    },

    getCoreRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB]
    },

    getEmergencyRoles: function() {
        return [rF, rD, rT, rM, rR]
    }
}

module.exports = rr