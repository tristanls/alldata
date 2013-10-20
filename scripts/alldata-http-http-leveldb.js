/*

alldata-http-http-leveldb.js

The MIT License (MIT)

Copyright (c) 2013 Tristan Slominski

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/
"use strict";

var AllDataClient = require('alldata-client-http'),
    AllDataCoordinator = require('alldata-coordinator'),
    AllDataKeygen = require('alldata-keygen'),
    AllDataPeerClient = require('alldata-peer-client-http'),
    AllDataPeerServer = require('alldata-peer-server-http'),
    AllDataServer = require('alldata-server-http'),
    AllDataStorage = require('alldata-storage-leveldb'),
    Gossipmonger = require('gossipmonger'),
    path = require('path'),
    shelljs = require('shelljs'),
    util = require('util');

var TEMP_DIR = shelljs.tempdir();  

var config = [
    {
        id: 'alldata-http-http-leveldb-1',
        short: '1',
        serverPort: 8081,
        peerServerPort: 8881,
        gossipPort: 9001,
        location: {
            zone: 'A',
            region: 'North'
        }
    },
    {
        id: 'alldata-http-http-leveldb-2',
        short: '2',
        serverPort: 8082,
        peerServerPort: 8882,
        gossipPort: 9002,
        location: {
            zone: 'B',
            region: 'North'
        }
    },
    {
        id: 'alldata-http-http-leveldb-3',
        short: '3',
        serverPort: 8083,
        peerServerPort: 8883,
        gossipPort: 9003,
        location: {
            zone: 'C',
            region: 'West'
        }        
    },
    {
        id: 'alldata-http-http-leveldb-4',
        short: '4',
        serverPort: 8084,
        peerServerPort: 8884,
        gossipPort: 9004,
        location: {
            zone: 'D',
            region: 'West'
        }           
    },
    {
        id: 'alldata-http-http-leveldb-5',
        short: '5',
        serverPort: 8085,
        peerServerPort: 8885,
        gossipPort: 9005,
        location: {
            zone: 'E',
            region: 'East'
        }           
    },
    {
        id: 'alldata-http-http-leveldb-6',
        short: '6',
        serverPort: 8086,
        peerServerPort: 8886,
        gossipPort: 9006,
        location: {
            zone: 'F',
            region: 'East'
        }           
    }    
];

config.forEach(function (peerConfig) {

    var peersCache = {};

    var storageLocation = path.join(TEMP_DIR, peerConfig.id);

    shelljs.mkdir(storageLocation);

    var allDataStorage = 
        new AllDataStorage(storageLocation);

    var allDataCoordinator = new AllDataCoordinator(allDataStorage, {
        replicationFactor: 3,
        replicationStrategy: {
            otherZoneReplicas: 1,
            otherRegionReplicas: 1
        }
    });

    var allDataServer = new AllDataServer({
        hostname: 'localhost',
        port: peerConfig.serverPort
    });

    var allDataPeerServer = new AllDataPeerServer({
        hostname: 'localhost',
        port: peerConfig.peerServerPort
    });

    var allDataPeerClient = new AllDataPeerClient({
        method: "POST"
    });

    allDataServer.on('put', function (event, callback) {
        // request from a client external to the cluster
        var key = AllDataKeygen.createKey();
        console.log(peerConfig.short, '[put: from client]', key, JSON.stringify(event));  
        allDataCoordinator.put(key, event, callback);
    });

    allDataPeerServer.on('_put', function (key, event, callback) {
        console.log(peerConfig.short, '[_put: from peer]', key, JSON.stringify(event));
        allDataStorage.put(key, event, callback);
    });

    allDataCoordinator.on('_put', function (peer, key, event, callback) {
        console.log(peerConfig.short, '[_put: to peer]', peer.id, key, JSON.stringify(event));
        // lookup peer from local peer storage
        var transport = peersCache[peer.id]['transport'];
        if (transport) {
            allDataPeerClient._put(transport, key, event, callback);
        } else {
            callback(true); // error, no transport data yet
        }
    });

    var gossipmonger = new Gossipmonger(
        {
            id: peerConfig.id,
            transport: {
                host: 'localhost',
                port: peerConfig.gossipPort
            }
        },
        {
            seeds: [
                {
                    id: "alldata-http-http-leveldb-1",
                    transport: {
                        host: 'localhost',
                        port: 9001
                    }
                },            
                {
                    id: "alldata-http-http-leveldb-2",
                    transport: {
                        host: 'localhost',
                        port: 9002
                    }
                },
                {
                    id: "alldata-http-http-leveldb-3",
                    transport: {
                        host: 'localhost',
                        port: 9003
                    }
                }
            ]
        });

    // gossipmonger.on('digest send', function (remotePeer, digest) {
    //     console.log(peerConfig.short, '[gossip: digest send]', util.inspect(remotePeer, false, null), util.inspect(digest, false, null));
    // });

    gossipmonger.on('error', function (error) {
        console.log(peerConfig.short, util.inspect(error, false, null));
    });

    gossipmonger.on('new peer', function (peer) {
        console.log(peerConfig.short, '[gossip: new peer]', JSON.stringify(peer));
        peersCache[peer.id] = {};
    });

    gossipmonger.on('peer dead', function (peer) {
        console.log(peerConfig.short, '[gossip: peer dead]', JSON.stringify(peer));
        allDataCoordinator.dropPeer(peer);
    });

    gossipmonger.on('peer live', function (peer) {
        console.log(peerConfig.short, '[gossip: peer live]', JSON.stringify(peer));
        if (peersCache[peer.id]['transport'] && peersCache[peer.id]['location']) {
            // we have both transport and location information
            var addPeerOptions = {};

            if (peerConfig.location.region == peersCache[peer.id]['location']['region']) {
                // same region, register a zone difference
                addPeerOptions.zone = peersCache[peer.id]['location']['zone'];
            } else {
                // peer from different region
                addPeerOptions.region = peersCache[peer.id]['location']['region'];
            }

            allDataCoordinator.addPeer(peer, addPeerOptions);
        }
    });

    gossipmonger.on('update', function (peerId, key, value) {
        console.log(peerConfig.short, '[gossip: update]', peerId, key, JSON.stringify(value));
        peersCache[peerId][key] = value;
        if (peersCache[peerId]['transport'] && peersCache[peerId]['location']) {
            // we have both transport and location information
            var addPeerOptions = {};

            if (peerConfig.location.region == peersCache[peerId]['location']['region']) {
                // same region, register a zone difference
                addPeerOptions.zone = peersCache[peerId]['location']['zone'];
            } else {
                // peer from different region
                addPeerOptions.region = peersCache[peerId]['location']['region'];
            }

            allDataCoordinator.addPeer({
                id: peerId, 
                transport: peersCache[peerId]['transport']
            }, addPeerOptions);
        }
    });

    // start default transport
    gossipmonger.transport.listen(function () {

        gossipmonger.gossip(); // start gossip

        // set peer server data so that others can connect
        gossipmonger.update('transport', {
            hostname: 'localhost',
            port: peerConfig.peerServerPort
        });

        gossipmonger.update('location', peerConfig.location);

    });

    allDataServer.listen(); // start external server

    allDataPeerServer.listen(); // start peer server

});

// give 10 seconds to settle
setTimeout(function () {

    // make a put request every second
    setInterval(function () {

        // select a random endpoint
        var peerConfig = config[Math.floor(Math.random() * config.length)];

        var client = new AllDataClient({
            port: peerConfig.serverPort
        });

        client.put({timestamp: new Date().getTime(), stuff: "foo"}, function (error) {
            if (error) {
                console.log('client', '[error]', util.inspect(error, false, null));
            } else {
                console.log('client', '[put: success]');
            }
        });

    }, 100);

}, 10000);