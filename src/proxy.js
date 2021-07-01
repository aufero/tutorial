const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const proxy = require('http-proxy-middleware');

const { sidecarRoute, confirmAudienceIdentifiers, isSidecarReady } = require('./sidecar-client');

const ip = require("./identifiers/ip-address");
const userId = require("./identifiers/user-id-cookie");

const identifiersEnum = require("./identifiers/identifiers-enum");

/** 
 * NOTE:
 * In this example, in the unlikely event that the sidecar is unable find the appropriate deployment,
 * we provide a static url that it should be used. It's up to you what you want to do in the event this
 * occurs.
 */
if (!(process.env.AUFERO_DEFAULT_DEPLOYMENT_URL)) {
    console.error("** Required environment variable 'AUFERO_DEFAULT_DEPLOYMENT_URL' not found!! **");
    process.exit();
}

const proxyOptions = {
    target: process.env.AUFERO_DEFAULT_DEPLOYMENT_URL,
    changeOrigin: true,
    logLevel: 'debug',
    router: async (req) => {
        /* TODO: Extract your audience identifiers.
         *
         * Below are three examples of how we could extract information from incoming request to identify it
         * as belonging to a specific audience (as defined in the Aufero Dashboard). These are then passed
         * to the sidecar.
         *
         * For more information about Audience Identifiers, please visit: 
         * https://docs.aufero.co/defining-audiences
         */
        var identifiers = [
            ip.extract(req),        // Extracts the user's IP address.
            userId.extract(req)     // Extracts the user's ID from their session cookie (set by your application).
        ];

        // Remove any undefined
        identifiers = identifiers.filter(x => x !== undefined);

        // Using the extracted Identifiers, determine which deployment the user should be routed to.
        const baseUrl = req.protocol + "://" + req.hostname;
        const sidecarResult = await sidecarRoute(baseUrl, identifiers);
        let url = sidecarResult.uri_resolved ? sidecarResult.uri : process.env.DEFAULT_DEPLOYMENT_URL; 
        return url;
    },
    onProxyReq: (proxyReq, _req) => {
        // This is used to log the original request. It can be removed if you do not want this information.
        const {host, path, protocol, port} = proxyReq;
        console.log(`Proxy request: ${JSON.stringify({host, path, protocol, port})}`);
    }
}

const port = 3000;
const app = express();
app.use(cookieParser());
app.use(morgan('tiny'));

// This is needed to make sure the proxy and sidecar are up and running before traffic is routed through it
app.get("/health", async (_req, res) => {
    console.log("health check");
    const sidecarReady = await isSidecarReady();
    res.json({ "HEALTHY": sidecarReady });
});

app.get("/default", (_req, res) => {
    res.send("No deployments available.");
});

app.use(proxy.createProxyMiddleware(proxyOptions));

// Startup and send the audience identifers to the Aufero sidecar
app.listen(port, async () => {
    console.log(`listening on port: ${port}`);

    // Add, update, or confirm the identifiers to be used. Ex: ["User Id", "IP Address"]
    const identifierArray = Object.values(identifiersEnum);
    const result = await confirmAudienceIdentifiers(identifierArray);
    console.log("Audience identifier post result:", + JSON.stringify(result.status));
})
