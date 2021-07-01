echo "Starting the sidecar..."
nohup ./sidecar \
--api-key $AUFERO_API_KEY \
--log-level info \
& while ! test -f nohup.out; do :; done && tail -f nohup.out &

echo "Starting Proxy..."
node proxy.js