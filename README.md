Swagger-Server
============================
#### Get your RESTful API up-and-running __FAST!__ 

_Fully-functional mocks without writing any code. And your real implementation isn't much harder._


Features
--------------------------
* __Don't waste time writing boilerplate code__ - 
Swagger-Server automatically and intelligently mocks your API _in real time_ as you write the spec.  So you can instantly interact with your API and get valid responses back _without writing any code_.

* __Simple extensibility via [Express.js](http://expressjs.com)__ - 
Suppliment Swagger-Server's mocks with your own custom logic, or replace the mocks entirely with your real API implementation.  It's as easy as `function(req, res, next)`

* __Code however you want__ - 
Swagger-Server doesn't dictate your folder structure, file names, class/function naming conventions, or anything else.

* __Use your favorite code editor__ -
Edit your Swagger spec in your favorite code editor. Swagger-Server will detect your changes and reload the file without missing a beat.

* __Get the whole suite!__ - 
Swagger-Server is just one part of [Swagger-Suite](https://github.com/BigstickCarpet/swagger-suite), which is an end-to-end solution for defining, testing, running, and documenting your API.


Supported Swagger Versions
--------------------------
* [2.0](http://github.com/reverb/swagger-spec/blob/master/versions/2.0.md)


Installation
--------------------------

    npm install swagger-server

That's all there is to it!

#### Running the samples
Swagger-Server comes with two sample apps: the ubiquitous "Swagger Petstore" is a simple example, and the "User Manager" demonstrates more advanced concepts.  To run the petstore sample, just `cd` into the `node_modules/swagger-server` folder and run the following command:

    cd node_modules/swagger-server
    npm run petstore

Or, on Windows:

    cd node_modules\swagger-server
    npm run petstore-windows
    
Similarly, to run the "User Manager" sample insead, run:

    cd node_modules/swagger-server
    npm run users
    
Or, on Windows: 

    cd node_modules\swagger-server
    npm run users-windows

__Note:__ All of the above commands run the sample apps in DEBUG mode, which produces _a lot_ of output in the console window.  


Walkthrough
--------------------------
TODO


Contributing
--------------------------
I welcome any contributions, enhancements, and bug-fixes.  [File an issue](https://github.com/BigstickCarpet/swagger-server/issues) on GitHub and [submit a pull request](https://github.com/BigstickCarpet/swagger-server/pulls).  Use JSHint to make sure your code passes muster.  (see [.jshintrc](.jshintrc)).

Here are some things currently on the to-do list:

* __Unit tests__ - _In progress_

* __Response validation__ - Currently, the mocks always adhere to the response schema defined in the Swagger spec, but if mocks are disabled (or bypassed via custom middleware), then all bets are off.  It would be cool to add logic that intercepts `res.send()` and validates the response against the schema.

* __Better XML Support__ - My main focus has been on consuming/producing JSON, but Swagger-Server also supports consuming/producing XML.  The XML functionality isn't as nicely polished as the JSON functionality yet though.


License
--------------------------
Swagger-Server is 100% free and open-source, under the [MIT license](LICENSE). Use it however you want. 
