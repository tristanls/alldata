# alldata

_Stability: 1 - [Experimental](https://github.com/tristanls/stability-index#stability-1---experimental)_

[![NPM version](https://badge.fury.io/js/alldata.png)](http://npmjs.org/package/alldata)

AllData is a distributed master-less append-only immutable event store database implementing "All Data" part of [Lambda Architecture](http://www.slideshare.net/nathanmarz/runaway-complexity-in-big-data-and-a-plan-to-stop-it).

![All Data in Lambda Architecture](images/alldata.png)

## Overview

> ... to make the irreducible basic elements as simple and as few as possible without having to surrender the adequate representation of a single datum of experience.

-- _Albert Einstein, "On the Method of Theoretical Physics" The Herbert Spencer Lecture, delivered at Oxford (10 June 1933)_

AllData is a distributed master-less append-only immutable event store database implementing "All Data" part of [Lambda Architecture](http://www.slideshare.net/nathanmarz/runaway-complexity-in-big-data-and-a-plan-to-stop-it). It attempts to do nothing more than fulfill the "All Data" design considerations that are as follows:

  * **Lambda Architecture.** AllData is meant to be part of a system designed according to Lambda Architecture.
  * **Event storage.** AllData is an event store. It stores events and is an "append-only" store.
  * **Event idempotency.** AllData is designed to store idempotent events. You may see the same event more than once during batch processing.
  * **Always available writes.** AllData is structured to always write the data _somewhere_.
  * **No immediate read requirement.** As part of Lambda Architecture, the availability of reads written to AllData is not required to be immediate. Instead, it is available for batch processing later. This allows one to use something simpler and non-persistent for real-time processing because AllData serves as the eventual backup.
  * **No data loss.** Because AllData needs to store everything, it needs to handle replication in case of node failures. 
  * **No single point of failure.** To support always available writes as well as no data loss, a master-less (peer-to-peer) design is required.
  * **Efficient batch processing.** AllData is designed to support efficient sequential reads that are characteristic of Lambda Architecture batch processing (although this is delegated to particular storage module implementations).

## Available Modules

### Clients

  * [alldata-client-http](https://github.com/tristanls/alldata-client-http): AllData HTTP client module

### Servers (for Clients)

  * [alldata-server-http](https://github.com/tristanls/alldata-server-http): AllData HTTP server module

### Peer Clients

  * [alldata-peer-client-http](https://github.com/tristanls/alldata-peer-client-http): AllData Peer HTTP client module

### Peer Servers (for Peer Clients)

  * [alldata-peer-server-http](https://github.com/tristanls/alldata-peer-server-http): AllData Peer HTTP server module

### Storage

  * [alldata-storage-leveldb](https://github.com/tristanls/alldata-storage-leveldb): AllData LevelDB-backed storage module

### Internal

  * [alldata-coordinator](https://github.com/tristanls/alldata-coordinator): AllData request coordinator module
  * [alldata-keygen](https://github.com/tristanls/alldata-keygen): AllData key generation module
  * [gossipmonger](https://github.com/tristanls/gossipmonger): Scuttlebutt gossip protocol implementation for real-time peer-to-peer state distribution