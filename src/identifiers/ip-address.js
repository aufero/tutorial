const { Address4, Address6 } = require('ip-address');
const identifierEnum = require('./identifiers-enum');

function extract(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
        if (Address4.isValid(forwardedFor)) {
            let ipv4 = new Address4(forwardedFor);
            return { name: identifierEnum, value: ipv4.correctForm() };
        }

        if (Address6.isValid(forwardedFor)){
            let ipv6 = new Address6(forwardedFor);            
            return { name: "IP Address", value: ipv6.correctForm() };
        }
    }
}

exports.extract = extract;
