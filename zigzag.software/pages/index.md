Zigzag is a programming environment for generating and sequencing waveform audio data. The following is a demonstration of its capabilities. The source is at [github.com/landon9720/zigzag](https://github.com/landon9720/zigzag).

This is the most simple useful script:

```
sin(440).duration(1)
```
<audio controls><source src="/1.wav" type="audio/wav"></audio>

This is a sine wave at 440 hertz, which is the pitch of a violin 'A' string. The call to `duration` tells it to generate 1 frame of data, and is required (otherwise the audio would go on forever). A frame is 2^16 samples. At 44,100 samples per second, that's almost 1.5 seconds.

`note` is a function that provides a frequency (in hertz) from a value.
Value 0 is 'Middle C'. Value 1 is 'C#', value 2 is 'D'. And so on.

```
sin(note(0)).duration(1)
```
<audio controls><source src="/2.wav" type="audio/wav"></audio>


Multiple sounds can be combined together to form a chord. `sum` adds samples. *Volume warning!*

```
sum(
    sin(note(0)),
    sin(note(4)),
    sin(note(7))
)
.duration(1)
```
<audio controls><source src="/3.wav" type="audio/wav"></audio>


That sounds horrible. The reason is [clipping](https://en.wikipedia.org/wiki/Clipping_%28audio%29). To fix this, use `gain`:

```
sum(
    sin(note(0)),
    sin(note(4)),
    sin(note(7))
)
.duration(1)
.gain(0.2)
```
<audio controls><source src="/4.wav" type="audio/wav"></audio>


The values 0, 4, and 8 mean we are listening to a [major chord](https://en.wikipedia.org/wiki/Major_chord). To hear a [minor chord](https://en.wikipedia.org/wiki/Minor) instead:

```
sum(
    sin(note(0)),
    sin(note(3)),
    sin(note(7))
)
.duration(1)
.gain(0.2)
```
<audio controls><source src="/5.wav" type="audio/wav"></audio>


Using `sequence` instead of `sum`, we get an arpeggio.
Using `loop` we get a repetition.

```
sequence(
    sin(note(0)).duration(1),
    sin(note(4)).duration(1),
    sin(note(7)).duration(1)
)
.loop(8)
```
<audio controls><source src="/6.wav" type="audio/wav"></audio>


`concat` is an alternative to `sequence`.

```
sin(200).duration(1)
.concat(
    sin(180).duration(1)
)
.loop(8)
```
<audio controls><source src="/7.wav" type="audio/wav"></audio>


Zigzag runs JavaScript in a sandboxed environment. Almost anything you can do in JavaScript, you can do here. For example, functions:

```
major = x => sum(
    sin(note(x+0)),
    sin(note(x+4)),
    sin(note(x+7))
)
sequence(
    major(0).duration(1),
    major(2).duration(1),
    major(4).duration(1),
    major(5).duration(2)
)
.gain(0.2)
```
<audio controls><source src="/8.wav" type="audio/wav"></audio>


The frequency of a sine wave can be modulated. Instead of providing a hard-coded value like `note(0)`, define a function that maps sample number to frequency. This example starts at 200 hertz and increases at a rate of 1 hertz per 100 samples.

```
sin(sampleNumber => 200 + sampleNumber / 100)
.duration(1)
```
<audio controls><source src="/9.wav" type="audio/wav"></audio>


Or we could modulate with another sine wave:

```
sin(sampleNumber => 200 + Math.sin(sampleNumber / 1000 / (2 * Math.PI)) * 10)
.duration(1)
```
<audio controls><source src="/10.wav" type="audio/wav"></audio>


Or we could modulate amplitude instead of frequency:

```
sin(200)
.duration(1)
.gain(sampleNumber => .2 + Math.sin(sampleNumber / 1000 / (2 * Math.PI)) * .2)
```
<audio controls><source src="/11.wav" type="audio/wav"></audio>


Or both:

```
sin(sampleNumber => 200 + sampleNumber / 100)
.duration(1)
.gain(sampleNumber => .2 + Math.sin(sampleNumber / 1000 / (2 * Math.PI)) * .2)
```
<audio controls><source src="/12.wav" type="audio/wav"></audio>


`adsr` is similar to [ADSR](https://en.wikipedia.org/wiki/ADSR), but different.

```
sin(note(1)).adsr()
```
<audio controls><source src="/13.wav" type="audio/wav"></audio>


This applies an ADSR envelope to the wave, with all the default settings.
The default setting is to apply a 1/100 second curve to the start and end, so that the overall duration is 1 second.
Duration is implied by ADSR, therefore the `duration` call is no longer necessary.

A number is interpreted as duration. ADSR duration is in samples. This is 2 seconds:

```
sin(note(2)).adsr(2 * samplesPerSecond)
```
<audio controls><source src="/14.wav" type="audio/wav"></audio>


ADSR eliminates the clip at ends of the audio.
Here is the chord example again, this time a minor chord, and with ADSR.

```
minor = x => sum(
    sin(note(x+0)),
    sin(note(x+3)),
    sin(note(x+7))
)
sequence(
    minor(0).adsr(samplesPerSecond),
    minor(2).adsr(samplesPerSecond),
    minor(4).adsr(samplesPerSecond),
    minor(5).adsr(samplesPerSecond)
)
.gain(0.2)
```
<audio controls><source src="/15.wav" type="audio/wav"></audio>


For better positioning of sound in time, use `delay`.

```
beat = Math.round(.1 * samplesPerSecond)
notes = []
for (x = 0; x < 144; ++x) {
    notes.push(sin(note((x*7)%(12*4)-(12*2))).adsr(beat).delay(x * beat))
}
sum(...notes)
```
<audio controls><source src="/16.wav" type="audio/wav"></audio>


