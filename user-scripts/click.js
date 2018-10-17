() =>
    square(200)
        .adsr({
            A: samplesPerSecond / 80,
            D: 0,
            S: samplesPerSecond / 80,
            R: samplesPerSecond / 80,
            attackFunction: x => x,
            releaseFunction: x => x,
        })
        .gain(0.07)
        .lowpass(1800)
