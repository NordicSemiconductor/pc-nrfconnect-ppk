## Version 3.1.0

### Added

-   Split the primary view in two, a **data logger** and a **real-time** view.
    With the data logger view the user can examine the power continuously over a
    period of time. In the real-time view, which has similar functionality to an
    oscilloscope, the user can specify a trigger level, and when the consumed
    power reaches this threshold, the power consumption signature in the
    surrounding period of time can be inspected in detail.
-   **Trigger**: Previously only available when using the
    [older, first version of the Power Profiler Kit hardware](https://www.nordicsemi.com/Software-and-tools/Development-Tools/Power-Profiler-Kit)
    now triggers can also be set when using the new
    [Power Profiler Kit II (PPK2) hardware](https://www.nordicsemi.com/Software-and-tools/Development-Tools/Power-Profiler-Kit-2).
-   Only with the PPK2: Set a **pre- or post trigger** by moving the slider
    above the graph, to shift the charted area, thus deciding how much time
    before and after the trigger that is relevant.
-   Average sampling with a lower resolution: When interested in **examining
    power over a longer time span** you can lower the samples per second.
    Sampling is still done at the full resolution, but they are automatically
    averaged to decrease the storage size. The rate can be lowered as far as
    only a sample per second, enabling sampling for days or even months.
-   Besides the existing CSV export: **Save** the current data in a format to
    **Load** it again later within the app, enabling sharing data and examining
    it at a later time.
-   Easily create **screenshots** of the current graph.

### Updates

-   Raise **limit for displaying digital channels** (on the highest resolution
    they were previously only shown for a time range of up to 3 seconds, now
    they are shown for up to 30 seconds).
-   **Enhanced performance** to make the UI more responsive.
-   Several minor UI changes to improve the user experience

## Version 3.0.2

## Fixed

-   The CSV export was exporting the wrong portion of data #123

## Version 3.0.1

## Fixed

-   Fix connecting PPK via J-Link Lite #122
-   Fix issue where moving the right handle past the left handle in the chart
    selection would break the values displayed in the selection window #119

## Version 3.0.0

### Changed

-   Complete rewrite of the application. This version supports the old power
    profiler kit, in addition to the newly released PPK2 hardware.
