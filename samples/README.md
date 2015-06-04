Swagger Server Samples
============================
#### Sample REST APIs for [Swagger Server](https://github.com/BigstickCarpet/swagger-server)

|__v1.0.0 Alpha Notice !__
|---------------------------------
| Swagger Server v1.0.0 is still in alpha, and we're still working on the samples, documentation, and walkthroughs.  The v1.0 API isn't totally solidified yet, so the samples may still change.


Installation
--------------------------
Install the samples using [npm](https://docs.npmjs.com/getting-started/what-is-npm):

```bash
npm install swagger-server-samples
```


Running the Samples
--------------------------
To run any of the samples, open the `swagger-server-samples` directory in a command prompt, and then run the sample using the `npm run` command, like this:

```bash
cd path/to/swagger-server-samples
npm run sample1
```

All of the samples run on port 8000, so open your web browser and go to [http://localhost:8000](http://localhost:8000)


Sample 1
--------------------------
Sample 1 runs the [Swagger Pet Store](sample1/PetStore.yaml) REST API, which lets you manage a simple list of pets.  You can add, edit, and delete pets, search for pets using query strings, and even upload photos of pets.

This sample demonstrates the most simplistic usage of Swagger Server.  All functionality is provided automatically by the Swagger Server mocks.  There's no custom code at all.

* [Source Code](sample1/server.js)
* [Walkthrough](docs/running.md)


Sample 2
--------------------------
Sample 2 builds on top of Sample 1.  It uses the same [Swagger Pet Store](sample1/PetStore.yaml) REST API, but demonstrates a few advanced features of Swagger Server, such as setting options, loading mock data, and adding custom middleware logic.

* [Source Code](sample2/server.js)
* [Walkthrough](docs/walkthrough2.md)


Sample 3
--------------------------
Sample 3 is a completely different beast than the first two samples.  It uses a completely different REST API that is much larger and spread out over several different YAML files.  It's a company directory with employees and project assignments.  You can add, edit, and delete employees and projects.  You can also assign or remove employees to/from projects.

It also contains much more custom JavaScript logic, including custom authentication, permissions, and business logic.  There are some operations that can only be performed by admin users, and other operations that can be performed by any user, but only on their own data.

* [Source Code](sample3/server.js)
* Walkthrough (TODO)

