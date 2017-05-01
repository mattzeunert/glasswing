trap "killall background" SIGINT SIGTERM EXIT
trap "./node_modules/.bin/webdriver-manager shutdown" SIGINT SIGTERM EXIT
# We don't use protractor, but webdriver-manager make it easy
# to install webdriver/chromedriver
./node_modules/.bin/webdriver-manager start &
./node_modules/.bin/wdio wdio.conf.js