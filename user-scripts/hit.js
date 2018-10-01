() =>
    whitenoise()
        .adsr({
            A: samplesPerSecond / 160,
            D: 0,
            S: samplesPerSecond / 80,
            R: samplesPerSecond / 80,
            attackFunction: x => x,
            // releaseFunction: x => x,
        })
        .gain(0.05)
        .highpass(5000)
