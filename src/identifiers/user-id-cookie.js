const identifierEnum = require('./identifiers-enum');

/**
 *  In this simplified example, the cookie is of the form:
 *      myWebApp=<userId>:<sessionId>
 *      myWebApp=jdoe:a5c5b1a86d7f4eb472d4b267dea684ee
 *         
 *      NOTE: This is a demonstration. 
 *          In production, you will likely need to parse, decode, look-up the userId,
 *          and potentially cache userId for faster inspection of subsequent requests.
 */
function extract(req) {
    if (req.cookies.myWebApp) {
        const myWebAppCookie = req.cookies.myWebApp;
        const userId = myWebAppCookie.split(':')[0];
        return { name: identifierEnum.USER_ID, value: userId };
    }
}

exports.extract = extract;
