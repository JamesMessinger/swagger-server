'use strict';

module.exports = {
    poweredBy: function poweredBy(req, res, next) {
        // TODO: Add the x-powered-by header
        next();
    },

    error: function(err) {
        return function error(req, res, next) {
            next(err);
        };
    }
};
