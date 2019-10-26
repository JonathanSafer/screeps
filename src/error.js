var error = {
    errorThisTick: false,
    exception: null,

    reset: function() {
        error.errorThisTick = false
        error.exception = null
    },

    reportError: function(exception) {
        error.errorThisTick = true
        error.exception = exception
    },

    finishTick: function() {
        if (error.errorThisTick) {
            throw error.exception
        }
    }
};

module.exports = error;