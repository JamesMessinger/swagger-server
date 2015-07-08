'use strict';

var mockery = require('mockery');
var path    = require('path');
var Handlers = null;
var handlerInstance = null;
var dirSearchResultsMock = null;

var server = null,
    serverStub = null,
    fs = null,
    fsSpy = null,
    dirSearch = null;

describe('handler module', function() {

  beforeEach(function() {
    server = {
      get: function() {},
      on: function() {},
      post: function() {},
      put: function() {},
      delete: function() {},
      patch: function() {},
      emit: function() {}
    };

    fs = {
      stat: function (path, cb) {
        cb(null, {isDirectory: function() { return true; }})
      }
    };

    dirSearchResultsMock = [
      path.join(process.cwd(), 'tests', 'handler/handlers/employees.js'),
      path.join(process.cwd(), 'tests', 'handler/handlers/projects.js'),
      path.join(process.cwd(), 'tests', 'handler/handlers/sessions.js'),
      path.join(process.cwd(), 'tests', 'handler/handlers/sessions/{sessionId}.js'),
      path.join(process.cwd(), 'tests', 'handler/handlers/employees/{username}.js'),
      path.join(process.cwd(), 'tests', 'handler/handlers/employees/{username}/photos/{photoType}.js'),
      path.join(process.cwd(), 'tests', 'handler/handlers/projects/{projectId}.js'),
      path.join(process.cwd(), 'tests', 'handler/handlers/projects/{projectId}/members/{username}.js')
    ];

    dirSearch = function(path, extension, cb) {
      cb(null, dirSearchResultsMock);
    };

    fsSpy = sinon.spy(fs, 'stat');

    serverStub = sinon.stub(server);

    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    mockery.registerMock('fs', fs);
    mockery.registerMock('directory-search', dirSearch);
    Handlers = require('../../lib/handlers');
    handlerInstance = new Handlers(serverStub);
  });

  afterEach(function() {
    mockery.deregisterMock('fs');
    mockery.deregisterMock('dirSearch');
  });

  it('should properly instantiate a new instance on the Handler Class', function() {

    expect(handlerInstance).to.be.defined;
    expect(handlerInstance.server).to.be.defined;
    expect(handlerInstance.currentMetaData).to.be.defined;
    expect(handlerInstance.currentApi).to.be.defined;
    expect(handlerInstance.setupHandlers).to.be.defined;
    sinon.assert.calledOnce(server.on);
  });

  it('should correctly add the custom Handler paths to the server instance', function() {

    handlerInstance.currentApi = {baseDir: './'};
    handlerInstance.currentMetaData = {
      paths: {
        '/employees': {},
        '/employees/{username}': {},
        '/employees/{username}/photos/{photoType}': {},
        '/projects': {},
        '/projects/{projectId}': {},
        '/projects/{projectId}/members/{username}': {},
        '/sessions': {},
        '/sessions/{sessionId}': {}
      }
    };

    handlerInstance.setupHandlers();

    //sinon.assert.calledTwice(server.get);
    sinon.assert.callCount(server.get, 7);
    sinon.assert.calledThrice(server.post, 3);
    sinon.assert.callCount(server.delete, 5);
    sinon.assert.calledTwice(server.put, 2);
    sinon.assert.calledTwice(server.patch, 2);
    sinon.assert.calledOnce(server.emit, 1);
    sinon.assert.calledWith(server.emit, 'handled');
  });

  it('should not add a file to the server that is not defined in the swagger metadata', function() {
    handlerInstance.currentApi = {baseDir: './'};
    handlerInstance.currentMetaData = {
      paths: {
        '/employees': {},
        '/employees/{username}': {},
        '/employees/{username}/photos/{photoType}': {},
        '/projects': {},
        '/projects/{projectId}': {},
        '/projects/{projectId}/members/{username}': {},
        '/sessions': {},
        '/sessions/{sessionId}': {}
      }
    };

    dirSearchResultsMock.push(path.join(process.cwd(), 'tests',
      'handler/handlers/bad/handler/path'));

    handlerInstance.setupHandlers();

    sinon.assert.neverCalledWith(server.get, 'bad/handler/path');
    sinon.assert.neverCalledWith(server.post, 'bad/handler/path');
    sinon.assert.neverCalledWith(server.put, 'bad/handler/path');
    sinon.assert.neverCalledWith(server.delete, 'bad/handler/path');
    sinon.assert.neverCalledWith(server.delete, 'bad/handler/path');
    sinon.assert.calledWith(server.emit, 'error');
    sinon.assert.calledWith(server.get, '/employees');
  });

  //it('should call the setupHandlers function when a parsed event is detected', function() {
  //  expect(true).to.equal(false);
  //});
  //
  //it('should not add a handler to the server that attempts to use an http verb that isn\'t supported',function(){
  //  expect(true).to.equal(false);
  //});
  //
  //it('should emit an error when the handler verb function specified is not a function', function() {
  //  expect(true).to.equal(false);
  //});

});
