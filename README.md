Swagger Server
============================
#### Get your REST API up-and-running *FAST* with Swagger and Express

[![Build Status](https://img.shields.io/travis/BigstickCarpet/swagger-server.svg)](https://travis-ci.org/BigstickCarpet/swagger-server)
[![Dependencies](https://img.shields.io/david/bigstickcarpet/swagger-server.svg)](https://david-dm.org/bigstickcarpet/swagger-server)
[![Code Climate Score](https://img.shields.io/codeclimate/github/BigstickCarpet/swagger-server.svg)](https://codeclimate.com/github/BigstickCarpet/swagger-server)
[![Codacy Score](http://img.shields.io/codacy/431cc27ab6ec40cca6ea51c91ad8bfd6.svg)](https://www.codacy.com/public/jamesmessinger/swagger-server)
[![Coverage Status](https://img.shields.io/coveralls/BigstickCarpet/swagger-server.svg)](https://coveralls.io/r/BigstickCarpet/swagger-server)
[![Inline docs](http://inch-ci.org/github/BigstickCarpet/swagger-server.svg?branch=master&style=shields)](http://inch-ci.org/github/BigstickCarpet/swagger-server)

[![npm](http://img.shields.io/npm/v/swagger-server.svg)](https://www.npmjs.com/package/swagger-server)
[![License](https://img.shields.io/npm/l/swagger-parser.svg)](LICENSE)


|__v1.0.0 Alpha Notice !__
|---------------------------------
|We are currently working on the `v1.0.0` release, which is a complete rewrite and is not backward-compatible with `v0.0.x`. To continue using the __current stable version__ of Swagger Server, use `npm install swagger-server@0.0.x`<br><br>To start using the __alpha version__ of Swagger Server 1.0, use `npm install swagger-server`.  Please be aware that the beta version may still undergo some API changes before being released. It's not finished yet, and some of the samples don't work yet.  But feel free to try it out and [provide feedback](https://github.com/BigstickCarpet/swagger-server/issues).


Features
--------------------------
* __Supports Swagger 2.0 specs in JSON or YAML__ <br>
Swagger Express Middleware uses [Swagger-Parser](https://github.com/BigstickCarpet/swagger-parser) to parse, validate, and dereference Swagger files.  You can even split your spec into multiple different files using `$ref` pointers.

* __Build your API in real-time__ <br>
Swagger Server automatically watches reloads your files as you work on them.  No need to restart the server.  Test your code changes _in real time_!

* __Intelligent Mocks__<br>
Swagger Server automatically provides mock implementations for every operation in your API definition, complete with data persistence.  So you can have a __fully-functional mock__ API with *zero code*.  You can even extend Swagger Server's mocks with your own logic.

* __Powered by Express__<br>
Implement your API with all the power and simplicity of [Express.js](http://expressjs.com).  Use any [third-party Express middleware](https://www.npmjs.com/search?q=express), or write your own.  It's as easy as `function(req, res, next)`

* __Write your API however you want__<br>
Write your Swagger API in JSON or YAML.  Put it all in one big file, or separate it out into as many different files and folders as you want.  You can even use a combination of JSON and YAML files.

* __Write your code however you want__<br>
Swagger Server can automatically detect your handlers based on folder structure and naming convention, or you can explicitly specify your handlers in code.  Or, if you're already comfortable with Express.js methods like [use](http://expressjs.com/4x/api.html#app.use), [all](http://expressjs.com/4x/api.html#app.all), [route](http://expressjs.com/4x/api.html#app.route), [get/post/delete/etc.](http://expressjs.com/4x/api.html#app.METHOD), then you can use those directly.


Installation
--------------------------
Swagger Server requires [Node.js](http://nodejs.org/), so install that first.  Then install Swagger Server using the following [npm](https://docs.npmjs.com/getting-started/what-is-npm) command:

```bash
npm install swagger-server
```


Usage
--------------------------
#### Express API
Swagger Server is built on top of [Express.js](http://expressjs.com) and can be used as a 100% compatible drop-in replacement for Expess in any project.  Just use `require("swagger-server")` instead of `require("express")` and pass the path to your Swagger file when creating your [`Application`](http://expressjs.com/4x/api.html#app) object.

```javascript
var swaggerServer = require('swagger-server');
var app = swaggerServer('MyRestApi.yaml');

// GET /users
app.get('/users', function(req, res, next) {
    res.send(myListOfUsers);
});

// Start listening on port 8000
app.listen(8000, function() {
  console.log('Your REST API is now running at http://localhost:8000');
});
```

#### Swagger Server API
Swagger Server also exposes some additional classes, events, and methods in addition to Express's API.  You can access these additional APIs by instantiating a [`Swagger.Server`](https://github.com/BigstickCarpet/swagger-server/blob/master/lib/server.js) object, which has an API very similar to Express's [`Application`](http://expressjs.com/4x/api.html#app) object:

```javascript
var swagger = require('swagger-server');
var server = new swagger.Server();

// Parse the Swagger file
server.parse('PetStore.yaml');

// GET /users
server.get('/users', function(req, res, next) {
  res.send(myListOfUsers);
});

// Start listening on port 8000
server.listen(8000, function() {
  console.log('Your REST API is now running at http://localhost:8000');
});
```


Samples &amp; Walkthroughs
--------------------------
There are several complete, well-documented samples available for Swagger Server.  Install them using npm, then see the [Walkthrough](https://github.com/BigstickCarpet/swagger-server/tree/master/samples) for instructions.

```bash
npm install swagger-server-samples
```


Contributing
--------------------------
I welcome any contributions, enhancements, and bug-fixes.  [File an issue](https://github.com/BigstickCarpet/swagger-server/issues) on GitHub and [submit a pull request](https://github.com/BigstickCarpet/swagger-server/pulls).

#### Building/Testing
To build/test the project locally on your computer:

1. __Clone this repo__<br>
`git clone https://github.com/BigstickCarpet/swagger-server.git`

2. __Install all dependencies__ (including dev dependencies)<br>
`npm install`

3. __Run the build script__<br>
`npm run build`

4. __Run the unit tests__<br>
`npm test` (tests + code coverage)<br>
`npm run mocha` (just the tests)


License
--------------------------
Swagger Server is 100% free and open-source, under the [MIT license](LICENSE). Use it however you want.

