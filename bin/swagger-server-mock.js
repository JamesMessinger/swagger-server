var argv = require('yargs')
    .usage('Usage: $0 <swagger_spec> [options]')
    .command('swagger_spec', 'Path to swagger specification file (YAML or JSON)')
    .demand(1)
    .example('$0 swagger_spec -p 3000', 'Start mock server for swagger.yaml on port 3000')
    .demand('p')
    .alias('p', 'port')
    .default('p', 3000)
    .nargs('p', 1)
    .describe('p', 'Port of mock server')
    .help('h')
    .alias('h', 'help')
    .argv;

// Set the DEBUG environment variable to enable debug output
process.env.DEBUG = 'swagger:*';
process.chdir(__dirname);

// Create a Swagger Server app from the PetStore.yaml file
var swaggerServer = require('../lib/index.js');
var app = swaggerServer(argv._[0]);

var port = ((argv.p && Number.isInteger(argv.p)) ? argv.p : 3000);
app.listen(port, function() {
  console.log('The Swagger mock is now running at http://localhost:' + port);
});
