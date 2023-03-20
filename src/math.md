# Motivation

This MarkDown page is an attempt to describe calculations needed to understand the Power Profiler App.

## Data Buffer

The Data Buffer is a Float32Array that contains the all samples. When it is initialized, it is prefilled with `NaN` values.
The size of the buffer is initialized with regards to the sampling resolution, samples per second $(\frac{S}{s})$, and how long you can sample for, sampleDuration $(S_D)$. Which means that the Buffer size $(B_s)$ can be described:

$$
B_s = \frac{S}{s} * S_D
$$

## Timestamp vs Index

This section will try to elaborate the relationship between the Index of the data buffer $i_B$ and the timestamp $t_i$ that relates to the samples.

Any given $t_i$ maps to one, and only one $i_B$, but several $t_i$ can map to the same $i_B$. The $t_i$ values that maps to the same $t_B$ are contained in a continuous interval. Timestamps $t_i$ are floating point numbers, whereas $i_B$ are integers.

- $t_i$ are timestamps in microseconds ($\mu s$).
- $i_B$ are derived from $\frac{S}{s}$, which is based on seconds ($s$), which may be a concern.

The mapping from $i_B$ should always produce the same $t_i$, even though multiple $t_i$ can map to the same $i_B$. The function to map $i_B$ should be:

### Index to Timestamp

$$
    t_i = f(i) = i \times \frac{1e6}{S/s}
$$

where $\frac{1e6}{S/s}$ is the number of microseconds between each sample.

In the code we've defined

```js
const microSecondsPerSample = 1e6 / samplesPerSecond
const timestamp = index * microSecondsPerSample

// Notice also that:
microSecondsPerSample = 1e6 / samplesPerSecond
samplesPerSecond = 1e6 / microSecondsPerSample

// e.g.
const samplesPerSecond = 1e3;
const microSecondsPerSample = 1e6 / samplesPerSecond = 1e6 / 1e3 = 1e3

const samplesPerSecond = 1e4;
const microSecondsPerSample = 1e6 / samplesPerSecond = 1e6 / 1e4 = 1e2
```

For timestamp in seconds, $t_s$

$$
    t_s = f(i) = i \div \frac{S}{s}
$$

Then to convert $t_s$ into timestamp in $\mu s$, $t_{\mu s}$, we simply do:

$$
    t_{\mu s} = f(t_s) = t_s \times 1e6
$$

### Timestamp to Index

$$
    i_B = f(t_{\mu s}) = (\frac{t_{\mu s}}{1e6}) \div \frac{S}{s} = t_s \div \frac{S}{s}
$$

In JavaScript we can do:

```js
const index = (timestamp / 1e6) / samplesPerSecond
```

## DataProcessor

### DataAccumulator

### DataSelector
 
