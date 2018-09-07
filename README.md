# Getting started

Requirements:

* NodeJS 10.0.0
* Yarn
* Sox

```
# install npm dependencies
yarn

# build content of ./src to ./dist
yarn build

# generate ./tune.raw using ./user.js as input
yarn render

# generates a png spectrogram of ./tune.raw
yarn view

# plays ./tune.raw
yarn play
```

# Example

```
let tune = 
    sin(value(440).add(saw(1).gain(100)))
    .adsr({ A: beats(4), D: beats(4), S: beats(6), R: beats(6) })
```

# References

* [Monads in functional programming](https://en.wikipedia.org/wiki/Monad_(functional_programming))
* [Fundamentals of Acoustics](https://www.amazon.com/Fundamentals-Acoustics-Lawrence-Kinsler/dp/0471847895)

