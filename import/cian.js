import CianParser from "../classes/workers/CianParser.js";
import CianApiParser from "../classes/workers/CianApiParser.js";

let proxyType = process.argv[2];

if (proxyType === 'api') {
    let cianParser = new CianApiParser();
    cianParser.startParsing();
} else {
    let cianParser = new CianParser();
    cianParser.startParsing();
}

