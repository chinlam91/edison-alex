Just Keep Fighting Until The End Of the World :)

## GeckoDriver v0.16.1 Bug Workaround

This workaround only applies on this version (0.16.1). If the author releases a new version, this workaround may not be needed anymore.

1. Download the [binaries](https://github.com/mozilla/geckodriver/releases/) according to your OS.
2. Place the binary file, either `geckodriver` or `geckodriver.exe` in the project root folder, should be under the same directory with this file.
3. Install `npm` modules using `npm install`.
4. Navigate to `node_modules/selenium-webdriver/lib/webdriver.js`.
5. Go to line 2189, replace `setParameter('text', keys)` with `setParameter('text', keys.then(keys => keys.join('')))`.

## Run

Run this application using `node index.js` command.