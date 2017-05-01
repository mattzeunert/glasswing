trap 'jobs -p | xargs kill' SIGINT SIGTERM EXIT
# delete existing recordings if any
[ -e /tmp/glasswing-e2e-test ] && rm -r /tmp/glasswing-e2e-test
# We don't use protractor, but webdriver-manager make it easy
# to install webdriver/chromedriver
./node_modules/.bin/webdriver-manager start &
./node_modules/.bin/http-server -p 7888 &
node ./bin/glasswing.js --save /tmp/glasswing-e2e-test &
sleep 5 # wait for selenium server to be started by webdriver-manager
echo $(jobs -p)
./node_modules/.bin/wdio wdio.conf.js
