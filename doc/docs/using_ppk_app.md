# Using the Power Profiler app

The Power Profiler Kit II (PPK2) must be connected to your computer and powered on before the Power Profiler app is started.

1. [Set up the Power Profiler Kit II for measurements](https://docs.nordicsemi.com/bundle/ug_ppk2/page/UG/ppk/setting_up.html).
1. Open the Power Profiler app using [nRF Connect](https://docs.nordicsemi.com/bundle/nrf-connect-desktop/page/installing_apps.html).

    ![Default window of the Power Profiler app](./screenshots/ppk2_standard_view.png "Default window of the Power Profiler app")

1. Click **Select Device** (in the top left corner) and select the PPK2 from the list.

1. Do one of the following:

    - If the PPK2 is set up to measure in Ampere Meter mode (see [Measuring current in Ampere Meter mode](https://docs.nordicsemi.com/bundle/ug_ppk2/page/UG/ppk/measure_current_ampere_meter.html)), select **Ampere meter**.

        !!! note "Note"
            The power output is enabled by default in the Ampere Meter mode.

    - If the PPK2 is set up to measure in Source Meter mode (see [Measuring current in Source Meter mode](https://docs.nordicsemi.com/bundle/ug_ppk2/page/UG/ppk/measure_current_source_meter.html)), select **Source meter**.

        !!! note "Note"
            You can change the voltage output to the Device Under Test (DUT, a manufactured product undergoing testing) by using the slider or typing the required voltage.

1. Click **Start**.
1. Toggle **Enable power output** to enable power to the DUT.

You can start measuring current when the connection is established.

The Power Profiler app checks if the PPK2 has the required firmware and shows a firmware upgrade dialog if needed.
