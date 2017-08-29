# nRF Connect boilerplate app

This project provides a starting point for developing apps that can be launched by [nRF Connect](https://github.com/NordicSemiconductor/pc-nrfconnect-core). See the [app creation documentation](https://github.com/NordicSemiconductor/pc-nrfconnect-core#creating-apps) for more information about apps and the available API.

This boilerplate provides:

- an empty implementation of all functions in the API (index.jsx)
- build tools (babel/webpack/eslint)
- basic styling (less)
- unit testing (jest)

## Quick start

1. Create the `.nrfconnect-apps/local` directory if it does not already exist:

    * Linux/macOS: `mkdir -p $HOME/.nrfconnect-apps/local`
    * Windows: `md "%USERPROFILE%\.nrfconnect-apps\local"`

2. Clone this project under the `local` directory. In a terminal on Linux/macOS or Git bash on Windows:

        cd $HOME/.nrfconnect-apps/local
        git clone https://github.com/NordicSemiconductor/pc-nrfconnect-boilerplate.git pc-nrfconnect-myapp
        cd pc-nrfconnect-myapp
        rm -rf .git

    Alternatively, if you do not want to use Git, you could download the the current master branch as a [zip file](https://github.com/NordicSemiconductor/pc-nrfconnect-boilerplate/archive/master.zip) and extract it under `.nrfconnect-apps/local/pc-nrfconnect-myapp`.

3. Modify relevant properties in `package.json`. At least consider changing:

    * name
    * displayName
    * version
    * author
    * license
    * repository.url

4. Install dependencies:

        npm install

5. Build the project in development mode:

        npm run dev

    This will keep running and watch for changes (Ctrl+C to stop). Alternatively, to build just once in production mode, run `npm run build`.

6. Run unit tests:

        npm run test-watch

    This will keep running and watch for changes (Ctrl+C to stop). Alternatively, to run tests just once, run `npm test`.

7. Start nRF Connect and verify that your app appears in the *Launch app* screen. If the build was successful, you should be able to launch it. Chrome Developer Tools can be opened by pressing Ctrl+Alt+I (Windows/Linux) or Cmd+Option+I (macOS). 

8. Add your own implementation in `index.jsx` to adjust the behavior of the app.
