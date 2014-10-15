/**
 * This file contains middleware that determines whether users
 * are authorized to perform certain operations.
 */
module.exports = function(server) {

  /**
   * Refuses access to everyone except the "admin" user
   */
  function adminOnly(req, res, next) {
    if (req.user.username === 'admin') {
      // you're an admin, so you may proceed
      next();
    }
    else {
      // you're NOT an admin, so denied
      res.status(401).send('Only admins can access this');
    }
  }


  /**
   * Allows users to perform operations on their own account, but not other people's accounts.
   * Except for the Admin user, who is allowed to do anything to any account.
   */
  function yourselfOnly(req, res, next) {
    var userBeingEdited = req.swagger.params.username;

    if (req.user.username === userBeingEdited || req.user.username === 'admin') {
      // You're editing yourself.  Or you're an admin.  Either way, you may proceed.
      next();
    }
    else {
      // Nope.  You can't edit other people.
      res.status(401).send('You can only do this for your own account.');
    }
  }


  // Only admins are allowed to get the full list of users
  server.get('/users', adminOnly);

  // Only admins can create new users
  server.post('/users', adminOnly);

  // Users can only retrieve their own account
  server.get('/users/{username}', yourselfOnly);

  // Users can only edit their own account
  server.post('/users/{username}', yourselfOnly);

  // Users can only delete their own account
  server.delete('/users/{username}', yourselfOnly);

  // Users can only log themselves out
  server.post('/users/{username}/logout', yourselfOnly);

};
