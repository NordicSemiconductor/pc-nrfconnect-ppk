## Unreleased

### Changed

-   Better performance when paning large datasets

## 3.4.5 - 2022-09-07

### Fixed

-   Toggle buttons in off-state are now visible toggles.
-   Did not display all serialport devices.

## 3.4.4 - 2022-09-05

### Added

-   API support for nRF Connect for Desktop v3.12.0

## 3.4.3 - 2022-03-24

### Fixed

-   App no longer freezes for a long time after it has been sampling in the
    background for a longer period of time.
-   Loading csv files is now restricted depending on the application's
    architecture.

## 3.4.2 - 2022-02-17

### Fixed

-   Loading larger files are now supported.

## 3.4.1 - 2022-02-10

### Added

-   Option to select entire set of samples by pressing `ALT + a` or clicking the
    `SELECT ALL` button in bottom right corner.

### Fixed

-   Selection is not removed when returning to Live View.
-   Export all now works for all new samples.
    -   If you are not able to use export `All` with an older set of samples
        (loaded from a .ppk file), you may use `SELECT ALL` and export selection
        instead.

## 3.4.0 - 2022-02-03

### Added

-   Manually setting y-axis range is now available when `LOCK Y-AXIS` is
    toggled.
-   Export dialog now have a section to choose what selection to export to CSV.
    -   The different options are to export 'All' samples, the samples within
        the 'Window', or a 'Selection'.
    -   The option for 'Selection' is only present if an area of the profile is
        selected.

### Changed

-   Added icons to Start/Stop buttons in `Real Time` pane.
-   Save / Export is now available after deselecting device
    -   Be aware that if you select device again the unsaved samples will be
        wiped

## 3.3.0 - 2021-12-15

### Changed

-   Advanced option to adjust buffer size is now available, which enables longer
    sampling time.
    -   To display advanced options in the sidebar press `ctrl+alt+shift+a`.
-   Advanced option to limit supply voltage under _Source Meter_ now available.
-   Updated app icon.
-   Added icons to Start/Stop buttons in `Data Logger` pane.

## 3.2.1 - 2021-11-30

### Fixed

-   Issue where certain `.ppk` files could not be loaded.

## 3.2.0 - 2021-11-01

### Changed

-   Establish compatibility with nRF Connect for Desktop 3.8.

## 3.1.3 - 2021-09-21

### Fixed

-   Two corrupted samples in a row caused all future samples to be corrupt. This
    would be especially likely to happen in long running sessions.

## 3.1.2 - 2021-06-14

### Fixed

-   Chart issues when loading from saved capture file.

## 3.1.1 - 2021-03-10

### Fixed

-   CSV export had an inverted bit sequence.

## 3.1.0 - 2021-02-15

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
-   Only with the PPK2: Set a **pre or post trigger** by moving the slider above
    the graph, to decide how much time before and after the trigger is relevant
    and will be shown for the next trigger.
-   Average sampling with a lower resolution: When interested in **examining
    power over a longer time span** you can lower the samples per second.
    Sampling is still done at the full resolution, but automatically averaged to
    decrease the storage size. The rate can be lowered as far as only a sample
    per second, enabling sampling for days or even months.
-   Besides the existing CSV export: **Save** the current data in a format to
    **Load** it again later within the app, enabling sharing data and examining
    it at a later time.
-   Easily create **screenshots** of the current graph.

### Changed

-   Raise **limit for displaying digital channels** (on the highest resolution
    they were previously only shown for a time range of up to 3 seconds, now
    they are shown for up to 30 seconds).
-   **Enhanced performance** to make the UI more responsive.
-   Several **minor UI changes** to improve the user experience.

## 3.0.3 - 2020-12-11

### Fixed

-   Small visual glitch when used with nRF Connect for Desktop 3.6.1: The top
    margin in the side panel was shrunken.

## 3.0.2 - 2020-12-11

### Fixed

-   CSV export contained the wrong portion of data.

## 3.0.1 - 2020-12-03

### Fixed

-   Connecting a PPK via J-Link Lite failed.
-   Moving the right handle past the left handle in the chart selection would
    break the values displayed in the selection window.

## 3.0.0 - 2020-12-01

### Changed

-   Complete rewrite of the application. This version supports the old power
    profiler kit, in addition to the newly released PPK2 hardware.
