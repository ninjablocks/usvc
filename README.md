# usvc

A node library for microservices.

In usvc a microservice is composed of Facets - small objects that manage part of a
microservice, such as database access, rest services, etc.

Facets initialise by returning a promise, and can depend on other facets
starting (providing there are no dependency loops) by waiting on dependant
initialisation promises before returning their own.

Facets are responsible for setting themselves up from configuration properties
and for alerting the base service of critical errors like database
disconnections. These errors will result in the process exiting, a process
manager should be used to ensure it reconnects with back-off.

Built in facets:

* facets.db.redis: Single server promise-based redis connect. Correctly throws
    errors on connection close.

* facets.db.mysqlPool: Connection-pool based MySQL. Initial connection failure
    throws errors, future connection errors retry within the pool.

* facets.rpc.jsonServer: Creates a local RPC server that can be called by a
    facets.rpc.jsonClient on another microservice.

* facets.rpc.jsonClient: Provides access to a remote facets.rpc.jsonServer.

* facets.web.express: Runs an Express web service as a facet.

# Example

```js
process.title = 'myservice';

var usvc = require('usvc');

var service = usvc.microService({
	// database connections
	redis: usvc.facets.db.redis(),

	// rpc interface
	myothersvcService: usvc.facets.rpc.jsonClient(),

	// external rest api
	frontendRest: usvc.facets.web.express(require('./lib/web'), {depends: ['redis']}),
}).run();
```