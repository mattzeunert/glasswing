trap 'jobs -p | xargs kill' SIGINT SIGTERM EXIT
# We don't use protractor, but webdriver-manager make it easy
# to install webdriver/chromedriver
./node_modules/.bin/http-server -p 7888 &
node ./bin/glasswing.js --save /tmp/glasswing &
./node_modules/.bin/webdriver-manager start &
echo $(jobs -p)
./node_modules/.bin/wdio wdio.conf.js
