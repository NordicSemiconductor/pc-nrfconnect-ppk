## Version 3.1.0

### Added

-   For the different needs, created a **data logger** and a **real-time** tab.
    With the data logger view you can examine the power continuously over a
    short or long time. With the real-time view, you can view the power around a
    defined trigger.
-   **Trigger**: Previously only available when using the old
    [older, first version of the Power Profiler Kit hardware](https://www.nordicsemi.com/Software-and-tools/Development-Tools/Power-Profiler-Kit)
    now triggers can also be set when using the new
    [Power Profiler Kit II (PPK 2) hardware](https://www.nordicsemi.com/Software-and-tools/Development-Tools/Power-Profiler-Kit-2).
-   Only with the PPK2: Set a **pre trigger** by moving the slider above the
    graph, to define how much time before and after the trigger you want to see.
-   Average sampling with a lower resolution: When interested in **examining
    power over a longer time span** you can lower the samples per second.
    Sampling is still done at the full resolution, but they are automatically
    averaged to decrease the storage size. The rate can be lowered as far as
    only a sample per second, enabling sampling for days or even months.
-   Besides the existing CSV export: **Save** the current data in a format to
    **Load** it again later within the app, enabling sharing data and examining
    it at a later time.
-   Create easy **screenshots** of the current graph.

### Updates

-   Raise **limit for displaying digital channels** (on the highest resolution
    they were previously only shown for a time range of up to 3 seconds, now
    they are shown for up to 30 seconds).
-   **Enhanced performance** to make the UI more responsive.

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
