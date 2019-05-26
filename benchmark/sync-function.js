"use strict"

const Benchmark = require('benchmark')
const util = require('util')

const isAsyncFunction = util.types.isAsyncFunction

const suite = new Benchmark.Suite()

function syncFunction (x) {
    return x + 1
}

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
class AsyncError extends Error {
    constructor(message) {
        super(message || "async function called without async keyword")
    }
}

function throwOnAsync(func) {
    if (func instanceof AsyncFunction) throw new AsyncError()
    return true
}

function throwOnAsyncNode(func) {
    if (isAsyncFunction(func)) throw new AsyncError()
    return true
}

// add tests
suite.add('Sync Function Calling Sync Function', function() {
    let x = syncFunction(1)
    return x
})
.add('Sync Function Calling Sync Function with Async Test', async function() {
    if (syncFunction instanceof AsyncFunction) throw new AsyncError()
    let x = syncFunction(1)
    return x
})
.add('Sync Function Calling Sync Function with Async Test Node', async function() {
    if (isAsyncFunction(syncFunction)) throw new AsyncError()
    let x = syncFunction(1)
    return x
})
.add('Sync Function Calling Sync Function with Inline Async Test', async function() {
    let x = (throwOnAsync(syncFunction) && syncFunction(1))
    return x
})
.add('Sync Function Calling Sync Function with Inline Async Test Node', async function() {
    let x = (throwOnAsyncNode(syncFunction) && syncFunction(1))
    return x
})
.add('Sync Function Calling Sync Function x 10000', function() {
    let x = 0
    for (let i=0; i<10000; i++) {
        x = syncFunction(x)
    }
    return x
})
.add('Sync Function Calling Sync Function with Async Test x 10000', function() {
    let x = 0
    for (let i=0; i<10000; i++) {
        x = (throwOnAsync(syncFunction) && syncFunction(x))
    }
    return x
})
.add('Sync Function Calling Sync Function x 10000 with 1 Async Test', function() {
    let x = 0
    throwOnAsync(syncFunction)
    for (let i=0; i<10000; i++) {
        x = syncFunction(x)
    }
    return x
})
// add listeners
.on('cycle', function(event) {
    console.log(String(event.target));
})
.on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
})
// run async
.run({ 'async': true })
