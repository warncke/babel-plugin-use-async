"use strict"

const Benchmark = require('benchmark')

const suite = new Benchmark.Suite()

function syncFunction(x) {
    return x + 1
}

async function asyncFunction(x) {
    return x + 1
}

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

// add tests
suite.add('Sync Function Calling Sync Function', function() {
    let x = syncFunction(1)
    return x
})
.add('Async Function Calling Sync Function', async function() {
    let x = syncFunction(1)
    return x
})
.add('Await on Sync Function', async function() {
    let x = await syncFunction(1)
    return x
})
.add('Async Function with Explicit await', async function() {
    let x = await asyncFunction(1)
    return x
})
.add('Async Function with Implicit await', async function() {
    let x = (asyncFunction instanceof AsyncFunction ? await asyncFunction(1) : asyncFunction(1))
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
