'use strict';

var env = require('../test-environment');

describe('App settings', function() {
  it('should expose the enable and disable methods',
    function() {
      var app = env.swaggerApp(env.files.petStore);

      // This setting doesn't exist yet, so it's disabled
      expect(app.enabled('my setting')).to.be.false;
      expect(app.disabled('my setting')).to.be.true;

      // This setting is enabled by default in Express
      expect(app.enabled('x-powered-by')).to.be.true;
      expect(app.disabled('x-powered-by')).to.be.false;

      // This setting is set to "?callback=" by default in Express
      expect(app.enabled('jsonp callback name')).to.be.true;
      expect(app.disabled('jsonp callback name')).to.be.false;

      // Enabling this setting creates it
      app.enable('my setting');
      expect(app.enabled('my setting')).to.be.true;
      expect(app.disabled('my setting')).to.be.false;
    }
  );

  it('should expose the get and set methods',
    function() {
      var app = env.swaggerApp(env.files.petStore);

      // This setting doesn't exist yet
      expect(app.get('my setting')).to.be.undefined;

      // This setting is enabled by default in Express
      expect(app.get('x-powered-by')).to.be.true;

      // This setting is set to "?callback=" by default in Express
      expect(app.get('jsonp callback name')).to.equal('callback');

      // Setting this setting creates it
      app.set('my setting', 'hello world');
      expect(app.get('my setting')).to.be.equal('hello world');
    }
  );

  it('should set custom Swagger-Server properties',
    function() {
      var app = env.swaggerApp(env.files.petStore);

      expect(app.enabled('watch files')).to.be.true;
      expect(app.enabled('mock')).to.be.true;
    }
  );

});
