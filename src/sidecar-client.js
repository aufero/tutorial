const axios = require('axios');

const IDENTIFIERS_ROUTE = '/audience-identifiers';
const RESOLVE_ROUTE = '/resolve-audience';
const SIDCARE_BASE_URL = 'http://127.0.0.1:5000';

module.exports = {
    /**
     * This function will get you if a uri and a set of identifiers can be routed. 
     * uri: string, for example www.myapp.com. This is the base uri that your customers are trying to access.
     * This is the same uri that's set up in your product. 
     * identifiers: object { name: string, value: string }
     * 
     * For example:
     * ```json
     * { name: "IP Address", value: "127.0.0.1" }
     * ```
     */
    sidecarRoute: async function(uri, i) {
        const body = { uri: uri, identifiers: i };
        console.log(`url: ${body.uri}`)
        console.log(`identifiers: ${JSON.stringify(body.identifiers, null, 2)}`)

        const result = await axios.post(SIDCARE_BASE_URL + RESOLVE_ROUTE, body)
        return {
            uri_resolved: result.data.uri_resolved,
            uri: result.data.uri
        };
    },

    /**
     * Function to post audience identifiers to the sidecar. 
     * This should be run on startup so the Aufero UI knows what audience identifiers should be created. 
     */
    confirmAudienceIdentifiers: async function(identifiers) {
        const body = { identifiers: identifiers };
        
        try {
            const result = await axios.post(SIDCARE_BASE_URL + IDENTIFIERS_ROUTE, body);
            return result;
        } catch (error) {
            console.log("There was an issue posting audience identifier information to the sidecar: ", JSON.stringify(error));
            // throw error; You can determine if this is a "required" part of functionality depending on your needs
        };
    },

    /**
     * Returns a promise that resolves to true if the Sidecar is ready to accept requests, false if not.
     */
    isSidecarReady: async function() {
        const result = await axios.get(SIDCARE_BASE_URL + '/ready').catch((error) => {
            logger.error('There was an issue calling /ready on sidecar: ', JSON.stringify(error));
            return false;
        });

        if (result.data.status === "READY") {
            return true;
        } else {
            logger.warn(`Sidecar is not ready. Status was ${result.data.status}.`)
            return false;
        }
    }
}