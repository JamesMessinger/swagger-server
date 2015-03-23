Swagger-Server
============================
#### Get your REST API up-and-running *FAST* with Swagger and Express

[![Build Status](https://img.shields.io/travis/BigstickCarpet/swagger-server.svg)](https://travis-ci.org/BigstickCarpet/swagger-server)
[![Dependencies](https://img.shields.io/david/bigstickcarpet/swagger-server.svg)](https://david-dm.org/bigstickcarpet/swagger-server)
[![Code Climate Score](https://img.shields.io/codeclimate/github/BigstickCarpet/swagger-server.svg)](https://codeclimate.com/github/BigstickCarpet/swagger-server)
[![Codacy Score](http://img.shields.io/codacy/431cc27ab6ec40cca6ea51c91ad8bfd6.svg)](https://www.codacy.com/public/jamesmessinger/swagger-server)
[![Coverage Status](https://img.shields.io/coveralls/BigstickCarpet/swagger-server.svg)](https://coveralls.io/r/BigstickCarpet/swagger-server)

[![npm](http://img.shields.io/npm/v/swagger-server.svg)](https://www.npmjs.com/package/swagger-server)
[![License](https://img.shields.io/npm/l/swagger-parser.svg)](LICENSE)


|__ATTENTION !__                  |
|---------------------------------|
|The current released (stable) version of Swagger-Server can be found on [the 0.0.X branch](https://github.com/BigstickCarpet/swagger-server/tree/0.0.X).<br> Version 1.0 is coming soon, with tons of improvements, new features, and bug fixes.


Features
--------------------------
* __Build your API in real-time__ <br>
Swagger-Server automatically watches reloads your files as you work on them.  No need to restart the server.  Test your code changes _in real time_!

* __Intelligent Mocks__<br>
Swagger-Server automatically provides mock implementations for every operation in your API definition, complete with data persistence.  So you can have a __fully-functional mock__ API with *zero code*.  You can even extend Swagger-Server's mocks with your own logic.

* __Powered by Express__<br>
Implement your API with all the power and simplicity of [Express.js](http://expressjs.com).  Use any [third-party Express middleware](https://www.npmjs.com/search?q=express), or write your own.  It's as easy as `function(req, res, next)`

* __Write your API however you want__<br>
Write your Swagger API in JSON or YAML.  Put it all in one big file, or separate it out into as many different files and folders as you want.  You can even use a combination of JSON and YAML files.

* __Write your code however you want__<br>
Swagger-Server can automatically detect your handlers based on folder structure and naming convention, or you can explicitly specify your handlers in code.  Or, if you're already comfortable with Express.js methods like [use](http://expressjs.com/4x/api.html#app.use), [all](http://expressjs.com/4x/api.html#app.all), [route](http://expressjs.com/4x/api.html#app.route), [get/post/delete/etc.](http://expressjs.com/4x/api.html#app.METHOD), then you can use those directly.

* __Get the whole suite!__<br>
Swagger-Server is just one part of [Swagger-Suite](https://github.com/BigstickCarpet/swagger-suite), which is an end-to-end solution for defining, testing, running, and documenting your API.


Supported Swagger Versions
--------------------------
* [2.0](http://github.com/reverb/swagger-spec/blob/master/versions/2.0.md)


Installation and Use
--------------------------
Install Swagger-Server using [NPM](https://docs.npmjs.com/getting-started/what-is-npm).

````bash
npm install swagger-server
````
Then use it in your [Node.js](http://nodejs.org/) script like this: 

````javascript
var swaggerServer = require('swagger-server');
var server = swaggerServer('path/to/my/swagger.yaml');

server.get('/users/{username}', function(req, res, next) {
    var user = myDataStore.getUser(req.params.username);
    res.send(user);
});

server.post('/users', function(req, res, next) {
    myDataStore.saveUser(req.body);
    res.status(204).send('User saved successfully');
});

server.listen();
````


Running the samples
--------------------------
Swagger-Server comes with two sample apps.
#### Pet Store
The [Petstore sample app](https://github.com/BigstickCarpet/swagger-server/tree/master/samples/petstore) is a simple example, but it shows how powerful Swagger-Server's mocks are.  It consists of almost zero code, yet you can create, edit, delete, and search for pets.

###### Walkthrough
````javascript
// TODO
````

#### User Manager
The [User Manager sample app](https://github.com/BigstickCarpet/swagger-server/tree/master/samples/user-manager) is a more complex example that includes some more complex middleware to manage user sessions and security.

###### Walkthrough
````javascript
// TODO
````


Contributing
--------------------------
I welcome any contributions, enhancements, and bug-fixes.  [File an issue](https://github.com/BigstickCarpet/swagger-server/issues) on GitHub and [submit a pull request](https://github.com/BigstickCarpet/swagger-server/pulls).  Use JSHint to make sure your code passes muster.  (see [.jshintrc](.jshintrc)).

Here are some things currently on the to-do list:

* __Response validation__ - Currently, the mocks always adhere to the response schema defined in the Swagger spec, but if mocks are disabled (or bypassed via custom middleware), then all bets are off.  It would be cool to add logic that intercepts `res.send()` and validates the response against the schema.

* __Better XML Support__ - My main focus has been on consuming/producing JSON, but Swagger-Server also supports consuming/producing XML.  The XML functionality isn't as nicely polished as the JSON functionality yet though.


License
--------------------------
Swagger-Server is 100% free and open-source, under the [MIT license](LICENSE). Use it however you want.

