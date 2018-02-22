# nRF Connect Power Profiler

Power Profiler app for [nRF Connect](https://github.com/NordicSemiconductor/pc-nrfconnect-core).

## Building from source

### Dependencies

To build the app you will need to install the following tools:

* Node.js (>=6.9)
* npm (>=5.6.0) / yarn (>=1.4.0)

### Clone the repository

Open a terminal, go to the following directory, and clone the repository:

- Linux/macOS: `cd $HOME/.nrfconnect-apps/local`
- Windows: `cd %USERPROFILE%/.nrfconnect-apps/local`

Alternatively, clone the repository in a different directory and symlink it into `.nrfconnect-apps/local`.

### Building

After cloning the repository, install the required dependencies:

    npm install

Then build the app:

    npm run dev

If everything was successful, you should now be able to launch the app in nRF Connect.
