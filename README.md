# babel-plugin-use-async

Implements the `"use async"` ECMAScript proposal.

**Not intended for production use!**

# Why "use async"?

`async` and `await` are great but in practice the vast majority of `async`
function calls get `await`'d and they are subject to the
[What Color is Your Function](https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/)
critique.

`async` and `await` were designed to minimize their effect on existing code
and specifications. While that is an entirely reasonable design goal it creates
the problem of not knowing whether a call to an `async function` without an
`await` is intentional or accidental and the annoyance of having to litter your
code with `await`s. 

`"use async"` is an option, modeled on `"use strict"`, that makes the following
changes to the language:

* in `async function`s:
    * calls to `async function`s are `await`'d by default
    * the `async` keyword can be used before an `async function` call
      to indicate that it should not be `await`'d
    * `await` works as before

* in plain `function`s:
    * calls to `async function`s *without* the `async` keyword before them
      will throw an error
    * calls to regular `function`s *with* the `async` keyword will throw an
      error
    * `await` is invalid as before

The end result is a launguage where (almost) all code follows a traditional
sequential control flow and the ambiguity about whether or not a function call
should be `await`d is eliminated.

Requiring `async` to be used when calling `async` from non-`async` functions
prevents a similar ambiguity from arising with regards to whether or not a
function was intended to be `async`.

`await` is only ever needed when calling to code that does not use
`async function`s. `await` could be eliminated entirely by implementing 
`await <Promise>` as `(async () => <Promise>)()` but this seems unnecessary.

In practice `await` will disappear from the vast majority of code once
`"use async"` is in place.

This proposal aims to resolve the issues raised by
[Proposal to add keyword "nowait"](https://esdiscuss.org/topic/proposal-to-add-keyword-nowait)
and
[async/await -> await/async: a simpler, less error-prone async syntax](https://esdiscuss.org/topic/async-await-await-async-a-simpler-less-error-prone-async-syntax)
with the least amount of breakage and greatest amount of conceptual continuity.

# Examples

## Simple

    async function getValueAsync() {
        // get value from regular function that returns promise
        const res = await http.get("/foo")
        // return value
        return res.val
    }

    function addOneSync(val) {
        return val + 1
    }

    // seamlessly combine sync and async functions in an async function
    async function bam() {
        let y = getValueAsync() // 1
        y = addOneSync(y) // 2
    }

    // use async functions from a regular function
    function baz() {
        let y = async getValueAsync() // <Promise>
        y.then((y) => {
            y = addOneSync(y) // 2
        })
    }

    // calling async function without async is an unambiguous error
    function bif() {
        let y = getValueAsync() // Error!
    }

This example demostrates how `"use async"` eliminates the ambiguity with
`await` by requiring the `async` keyword to be used when calling
`async function`s from regular functions.

## Missing async on function declaration

    // SyntaxError on await
    function getValueAsync() {
        // get value from regular function that returns promise
        const res = await http.get("/foo")
        // return value
        return res.val
    }

    // Error calling async function without async
    function bam () {
        let y = getValueAsync() // 1
        y = addOneSync(y) // 2
    }

With `"use async"` mistakenly failing to declare a function as `async` will
result in an error if that function either attempts to `await` or attempts to
call another `async function`.

## Missing async on function call

    // starts this, that and otherThing at same time, waits for results
    async function collectResults() {
        return Promise.all([
            async this(),
            async that(),
            async otherThing()
        ])
    }

    // runs this, that and otherThing sequentially, then returns results
    async function collectResults() {
        return Promise.all([
            this(),
            that(),
            otherThing()
        ])
    }

Mistakenly omitting the `async` keyword may result in incorrect execution but
will usually return correct results.

This is very different than mistakenly omitting an `await` with standard
JavaScript, which will almost always yield incorrect results, sometimes in
obscure and unpredictable ways.

# Implementation

## Async function call from async function

    async function foo() {
        let x = bar()
    }

### Transpiles to

    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor

    async function foo() {
        let x = (bar instanceof AsyncFunction ? await bar() : bar())
    }

This does not work for code that does not use real `async function`s and it is
not intended to.

The goal here is to remove ambiguity about how code will behave at runtime so
regular functions that return Promises should not be implicitly `await`'d.

### Benchmarks

    $ node benchmark/async-function.js 
    Sync Function Calling Sync Function x 420,293,162 ops/sec ±0.07% (93 runs sampled)
    Async Function Calling Sync Function x 105,306,976 ops/sec ±0.84% (92 runs sampled)
    Await on Sync Function x 2,065,160 ops/sec ±5.59% (46 runs sampled)
    Async Function with Explicit await x 2,114,176 ops/sec ±4.58% (51 runs sampled)
    Async Function with Implicit await x 2,171,542 ops/sec ±3.06% (81 runs sampled)

The `instanceof` call is so insignificant compared to the cost of `await` that it
falls entirely within the range of normal test variation.

## Regular function call from regular function

    function foo() {
        let x = bar()
    }

### Transpiles to

    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
    class AsyncError extends Error {
        constructor(message) {
            super(message || "async function called without async keyword")
        }
    }

    function throwOnAsync(func) {
        if (func instanceof AsyncFunction) throw new AsyncError()
        return true
    }

    function foo() {
        let x = (throwOnAsync(bar) && bar())
    }

### Benchmarks

    $ node benchmark/sync-function.js 
    Sync Function Calling Sync Function x 420,586,378 ops/sec ±0.07% (94 runs sampled)
    Sync Function Calling Sync Function with Async Test x 66,005,927 ops/sec ±0.39% (85 runs sampled)
    Sync Function Calling Sync Function with Async Test Node x 32,895,049 ops/sec ±0.57% (91 runs sampled)
    Sync Function Calling Sync Function with Inline Async Test x 66,616,830 ops/sec ±0.53% (88 runs sampled)
    Sync Function Calling Sync Function with Inline Async Test Node x 33,452,216 ops/sec ±0.21% (94 runs sampled)
    Sync Function Calling Sync Function x 10000 x 107,901 ops/sec ±0.27% (95 runs sampled)
    Sync Function Calling Sync Function with Async Test x 10000 x 23,968 ops/sec ±0.22% (97 runs sampled)
    Sync Function Calling Sync Function x 10000 with 1 Async Test x 107,115 ops/sec ±0.22% (96 runs sampled)

Compared to a plain function call the `instanceof` test does have a cost of 5-10X
which is pretty expensive, especially if it is in a tight loop.

For transpiling this can be addressed by hoisting the test outside of loops where
possible but this does not fix the case where a synchronous function with
`"use async"` enabled is called in tight loop by another function.

Performance sensitive synchronous code that is likely to be run repeatedly should
avoid `"use async"` until this can be resolved.
