# Troubleshooting

Here are some basic troubleshooting steps to help you fix issues you may encounter when using the Power Profiler Kit II (PPK2).

For more information, visit [Nordic DevZone](https://devzone.nordicsemi.com/).

For personalized support from our technical support team, sign up for or sign in to Nordic Developer Zone and enter a private ticket.

## Data loss with PPK2

In some rare cases data loss can happen between the PPK2 firmware and the Power
Profiler app. If this happens, first please check your data by zooming in on the
chart and look for gaps. An occasional gap that lasts a few microseconds
probably does not effect the accuracy of the data. However if significant data
loss is visible please check the following points:

-   avoid using USB hubs
-   if you can, try changing your USB connection from USB3 to USB2, or other way
    around
-   update your USB drivers
-   change the USB cable


## PPK2 only measuring noise

Make sure you have connected the PPK2 to the Device Under Test (DUT) as described in [Setting up the Power Profiler Kit II](https://docs.nordicsemi.com/bundle/ug_ppk2/page/UG/ppk/setting_up.html).

## Measurements fluctuate when there should be a steady current draw

Your DUT may have a power consumption that is close to a switching point causing rapid switching between the ranges and creating measurement errors/distorted plots.

## Graph response is very slow

Avoid using Universal Serial Bus (USB) hubs and docking stations. Data plotting may consume a lot of CPU resources after some time, so ensure that sufficient resources are available.

## PPK2 not measuring anything

Confirm that the measurement cables are connected correctly because the PPK2 cannot measure negative currents.

## Grounding

Ensure that the DUT ground is connected to the PPK2 even in ampere meter mode.
