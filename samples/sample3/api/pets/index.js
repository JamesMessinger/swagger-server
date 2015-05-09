'use strict';

module.exports = {
  /**
   * Sets the pet's age automatically, based on the date of birth.
   */
  post: function(req, res, next) {
    if (req.body.dob) {
      var milliseconds = Math.abs(new Date().valueOf() - req.body.dob.valueOf());
      var years = Math.floor(milliseconds / 3.15569e10);
      req.body.age = years;
    }

    next();
  },

  /**
   * Pre-populate the "/pets" collection with sample data
   */
  data: {
    Lassie: {name: 'Lassie', type: 'dog', tags: ['brown', 'white']},
    Clifford: {name: 'Clifford', type: 'dog', tags: ['red', 'big']},
    Garfield: {name: 'Garfield', type: 'cat', tags: ['orange']},
    Snoopy: {name: 'Snoopy', type: 'dog', tags: ['black', 'white']},
    'Hello%20Kitty': {name: 'Hello Kitty', type: 'cat', tags: ['white']}
  }
};
