# Introduction
This repository contains an example proxy layer that's intended to:
1. Allow you to experiment with Aufero's functionality using a sample application (`/weather-svc`). You can follow the walk-through [](#tutorial-using-sample-app)

2. Serve as a starting point for the proxy you'll need in your environment. Step-by-step

An example RESTful API (/weather-svc) is included for you to test the proxy - this can and should be removed when you implement your production proxy. 

The instructions below will walk you through the initial setup of the proxy, using the Weather Service as an example. You will use the proxy and the Aufero dashboard to release a new version (v2) of the weather app to users to demonstrate the functionality.

## Before you begin 
* You'll need to have created an Aufero account. If you haven't done so already, please [sign-up for an account](https://aufero.info/pricing.html#sign-up).
* We strongly recommend reading our [Core Concepts](https://docs.aufero.co/overview/core-concepts) + [How it Works](https://docs.aufero.co/overview/how-it-works) documentation to get a basic understanding of Aufero.
* To run through the example below locally, you'll need [Docker](https://www.docker.com/get-started) installed.

# Explanation of Proxy Function:
The proxy is responsible for two things:
 * Posting available [audience identifers](https://docs.aufero.co/defining-audiences#audience-identifiers) to the sidecar
 * Posting to the sidecar to determine how to route an external request (and then routing it)

You can see the core functionality of the proxy in the src/proxy.js file. See the sections below for more information, and the code for implementation help.

## Audience Identifiers Creation
* The proxy will inform Aufero which [audience identifers](https://docs.aufero.co/defining-audiences#audience-identifiers) are available from information in the incoming requests. For example: an IP address in the `x-forwarded-for` header, or a user ID encoded in your JWT. These will be used to define and identify audiences. This is done via a POST request to the sidecar '/audience-identifiers' route.

You can see this code in `proxy.js`. On every startup, the proxy will add/update the identifiers that will be used by the proxy. 
```
app.listen(port, async () => {
    console.log(`listening on port: ${port}`);
    const result = await confirmAudienceIdentifiers([identifiersEnum.IP_ADDRESS, identifiersEnum.DEPLOYMENT_ID, identifiersEnum.USER_ID]);
    console.log("Audience identifier post result:", + JSON.stringify(result.status));
})

```

## Routing based on uri and audience identifier values
*  The proxy will ask the aufero sidecar how different requests and their audience identifiers should be routed. This will use a GET call to resolve audience with the route '/resolve-audience'.
```
        var identifiers = [
            ip.extract(req),        // Extracts the user's IP address.
            userId.extract(req)     // Extracts the user's ID from their session cookie (set by your application).
        ];

        // Remove any undefined
        identifiers = identifiers.filter(x => x !== undefined);

        // Using the extracted Identifiers, determine which deployment the user should be routed to.
        const baseUrl = req.protocol + "://" + req.hostname;
        const sidecarResult = await sidecarRoute(baseUrl, identifiers);
```

# Tutorial Using Sample App
To simulate a meaningful change:
* Weather `v1` will expose a `GET /weather/<zip>` endpoint for current weather.
* Weather `v2` will updated a `GET /weather/<zip>` endpoint to also include forecasted weather.

We will then walk you through migrating users to v2 by doing the following:
* Quietly deploy v2, without disrupting v1.
* Assign `jdoe` access to `v2`
* Using `jdoe`'s pretend cookie, get the weather forecast
* Migrate the remaining users, to `v2`

When complete, we will have this type network running locally.
![Sample Environment](/weather-svc/weather-net-diagram.png)

You will need to have docker running for this example, but the Aufero sidecar can run anywhere.

## Releasing Weather API V1
### Set Up The Weather API Product In Aufero
1. Log into a [Aufero](https://app.aufero.co). 

2. Add a new product with base-url `http://127.0.0.1`. You can name the product whatever you want.

3. Generate an api-key :key: and select your new product. This will be required to launch the aufero-proxy, so copy down the API key somewhere (you can always view it again from the dashboard.)

### Set Up Local Environemnt and "Release" V1
1. Build `v1` and `v2` of the weather-svc

```
docker build --force-rm -t weather-svc:v1 -f ./weather-svc/v1/Dockerfile ./weather-svc/v1/
docker build --force-rm -t weather-svc:v2 -f ./weather-svc/v2/Dockerfile ./weather-svc/v2/
```

2. Build the docker image for proxy
```
docker build --force-rm -t sample-proxy:latest -f Dockerfile .
```

3. Now, let's create a local network to host these.
```
docker network create my-weather-net --gateway 10.10.10.255 --subnet 10.10.10.0/8
```

4. We then can start the proxy and weather-svc V1 within our network
```
# Start the proxy
docker run -e AUFERO_API_KEY=<api-key> \
           -e AUFERO_DEFAULT_DEPLOYMENT_URL=http://10.10.10.1:3000 \
           -d \
           --network="my-weather-net" \
           --ip="10.10.10.128" \
           -p 127.0.0.1:8080:3000 sample-proxy:latest

# Start the V1 service. Notice how we are not mapping a port to the host. We will
# be relying on the proxy to get us to our deployment.
docker run -d --network="my-weather-net" --ip="10.10.10.1" weather-svc:v1
```

*NOTE: Don't worry about v2 just yet.*

4. Return to Aufero's dashboard to register that deployment with Aufero (this step would most likely be automated in a CI/CD pipeline - see [our docs](https://docs.aufero.co/managing-deployments-and-releases#create-deployments-in-your-ci-cd-pipeline-recommended)). Use the following details:

```
Deployment Name: weather-v1
Internal URI: http://10.10.10.1:3000
Health Check URI: http://10.10.10.1:3000/health
```

*NOTE: We specify the "internal" base url, because in this example only the proxy has network connectivity to the weather-svc via the private ip-address.*

5. Now, release this initial deployment to the "Public" audience. Go to the "Release Dashboard" and follow the on-screen guides to create a Release Plan to immediately release your v2 deployment to the Public audience. 

6. Using curl, get the weather by hitting the Aufero Proxy.
```
curl http://127.0.0.1:8080/weather/20500
```
*Make note of what information is returned in the body*

### Seamless Migration -- Releasing Weather API V2

1. Deploy `weather-svc:v2` to your network

```
docker run -d --network="my-weather-net" --ip="10.10.10.2" weather-svc:v2
```
2. Log into Aufero, register your new v2 deployment with the following details:

```
Deployment Name: weather-v2
Internal URI: http://10.10.10.2:3000
Health Check URI: http://10.10.10.2:3000/health
```

2. Now, let's allow one of our user's, John Doe, to have early-access to v2's API. Back on Aufero's dashboard, go to the "Audiences" page and create another audience for a visitor that has a User ID of 'jdoe'. 

3. Release V2 to John Doe by creating a new release plan for your V2 release and selecting the "Release Now" icon for the new audience you created.

3. Let's try making a request to our app as if we were John Doe.
```
curl --cookie "myWebApp=jdoe:6a204bd89f3c8348afd5c77c717a097a" http://127.0.0.1:8080/weather/20500
```

As 'jdoe', you are routed to v2, and have access to new the weather forecast data! s:raised_hands:

:information_source: *Note: it may take a few seconds after releasing for change to take effect as the sidecar updates.

4. To verify, others NOT have access to the forecast data.

```
# A different user
curl --cookie "myWebApp=jschmo:6ee6b4d40540492az365f6a224867142 "http://127.0.0.1:8080/weather/20500

# An unauthenticated user
curl "http://127.0.0.1:8080/weather/20500
```

5. Log into Aufero, move the public audience to v2.

6. Verify that they too now get forecast data.
   
```
curl http://127.0.0.1:8080/weather/20500
```

:confetti_ball: Congratulations! You just took one of your first steps toward redefining how you release software to users! :mortar_board: 
# Using This Proxy For Your Own App
This example-proxy can serve as a starting point for your own proxy if you do not already have one.
We provide inline comments to help you navigate the code, and you can follow the steps below to make the
necessary updates to get you started:

1. Remove the `./src/weather-svc` folder. This application is purely for demonstration purposes.

2. Update the values within `/identifiers/identifiers-enum.js` with the identifiers you plan to extract from incoming requests. These will be passed to sidecar, and will also be displayed in Aufero's dashboard when creating audiences.

3. Based on the identifiers to be used, create your own logic to extract these values from the incoming [Request Object](http://expressjs.com/en/api.html#req). You may use the `user-id-cookie.js` and `ip-address.js` files as a pattern to guide you. 

4. Update the `router` function within the `proxyOptions` (in `proxy.js`) to add your extracted identifiers to the
array passed to `sidecarRoute()`.