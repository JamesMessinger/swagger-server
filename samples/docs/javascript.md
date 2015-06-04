Swagger Server
============================


Sample 1 Walkthrough
--------------------------
* [Running the sample](running.md)
* __JavaScript Walkthrough__
* [YAML Walkthrough](yaml.md)


JavaScript Walkthrough
--------------------------
Now that you have the sample [running](running.md), it's time to look at the source code.  Open up [`sample1/server.js`](../sample1/server.js) and let's see what it's doing.

### Debug Logging
After a few comments, the first line of real code is...

````javascript
process.env.DEBUG = 'swagger:middleware';
````

This simply sets the DEBUG environment variable to `swagger:middleware`, which turns on detailed logging for Swagger Server's [middleware layer](https://github.com/BigstickCarpet/swagger-express-middleware). The DEBUG variable is a comma-separated list of packages that you want to enable detailed logging for.  You could set this variable to `swagger:middleware,swagger:parser` if you also want to see detailed logging info for [Swagger Parser](https://github.com/BigstickCarpet/swagger-parser).  Or you could set it to `swagger:*` to enable detailed logging for _all_ Swagger-related packages (such as [Swagger Server](https://github.com/BigstickCarpet/swagger-server), [Swagger CLI](https://github.com/BigstickCarpet/swagger-cli), etc.)  If you _really_ want a lot a log details, try setting it to `swagger:*,express:*`

If you look at your terminal window, you should already see several lines of logging information, since you requested the root page of [http://localhost:8000](http://localhost:8000).  As you click links and buttons on that page, you should see more logging information.  If you encounter any errors during this walkthrough, check the terminal window to see what happened.


### Creating a Swagger Server Application
If you're already familiar with [Express.js](http://expressjs.com/), then the next few lines should be pretty familiar.  This is because Swagger Server is built on top of Express and has a 100% Express-compatible API.  This means you can use Swagger Server as a drop-in replacement for Express in any project, and everything will still work.  Even any [third-party Express middleware](http://expressjs.com/resources/middleware.html) will work with Swagger Server.

We `require('swagger-server')` and then create a new [Application](http://expressjs.com/4x/api.html#app) object.   If this is new to you, then you might want to take some time to read the [Getting Started guide](http://expressjs.com/starter/hello-world.html) on the Express website.


### Starting the server
The next block of code is also pretty standard for any Express app.  The [listen method](http://expressjs.com/4x/api.html#app.listen) tells the server start listeing for requests on port 8000.  The callback function is called once the port has been opened and is ready to begin accepting requests.

````javascript
app.listen(8000, function() { ... }
````


-------------------------------------------------------------------------------------------------
| Back: [Running the Sample](running.md)        | Next: [YAML Walkthrough](yaml.md)             |
|:----------------------------------------------|----------------------------------------------:|
