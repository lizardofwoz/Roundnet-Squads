let matchups = [];
let variance = 3;
let value8As7 = false;
let includeVariances = false;

function go() {
    matchups = [];
    let net1 = document.getElementById("net1").value;
    let net2 = document.getElementById("net2").value;
    let net3 = document.getElementById("net3").value;
    let prev1 = document.getElementById("prev1").value;
    let prev2 = document.getElementById("prev2").value;
    let prev3 = document.getElementById("prev3").value;
    let matchupSubs = document.getElementById("subs").value;
    let matchupNonSubs = document.getElementById("required").value; // Required players (e.g. 12357)
    let pairsToAvoid = document.getElementById("avoid").value; // e.g. "14,52"
    let customization = {};
    try {
        customization = JSON.parse(document.getElementById("customization").value); // player names
    } catch (error) {}
    let squadSizeElement = document.getElementById("squad-size");
    let squadSize = parseInt(squadSizeElement.options[squadSizeElement.selectedIndex].text);
    let varianceInput = document.getElementById("variance").value;
    includeVariances = document.getElementById("includeVariances").checked;
    value8As7 = document.getElementById("value8as7").checked;
    document.getElementById("results").innerHTML = "";
    document.getElementById("error-text").innerHTML = "";
    let [valid, error] = isValid(net1, net2, net3, prev1, prev2, prev3, matchupSubs, matchupNonSubs, varianceInput);
    if (!valid) {
        setError(error);
        return;
    }
    if (varianceInput.length > 0) {
        variance = parseInt(varianceInput);
    }
    else {
        variance = 3;
    }
    matchupSubs = getPlayersFromInput(matchupSubs);
    matchupNonSubs = getPlayersFromInput(matchupNonSubs);
 
    let opposingNetSums = [getSum(net1), getSum(net2), getSum(net3)];
    let free = new Array(squadSize+1).fill(true) // Don't use index 0
    generate(opposingNetSums, 0, 0, 1, free, new Array(opposingNetSums.length*2));
    let list = filter(matchups, prev1, prev2, prev3, pairsToAvoid, customization, matchupSubs, matchupNonSubs);
    if (list.length === 0) {
        setError("No possible match-ups. Change the requirements or increase the net variance.");
        return;
    }
    let tableNode = document.createElement("table");
    let headerRowNode = document.createElement("tr");
    for (let i = 0; i < 3; i++) {
        let headerCellNode = createCellNode("Net " + (i+1), true);
        headerRowNode.appendChild(headerCellNode);
    }
    headerRowNode.appendChild(createCellNode("Sub", true));
    if (includeVariances) {
        headerRowNode.appendChild(createCellNode("Variances", true));
    }
    tableNode.appendChild(headerRowNode);
    for (m of list) {
        let subs = getSubs(m, squadSize);
        let rowNode = document.createElement("tr");
        let names = [];
        if ("names" in customization) {
            names = customization["names"];
        }
        for (let i = 0; i < 4; i++) {
            let str = "";
            if (i === 3) { // Sub column
                str = subs;
                if (subs.length === 1 && "names" in customization) {
                    str += ` (${names[subs[0]-1]})`;
                }
            }
            else {
                str = ""+m[2*i]+m[2*i+1];
                if ("names" in customization) {
                    str += ` (${names[m[2*i]-1]}/${names[m[2*i+1]-1]})`;
                }
            }
            let cellNode = createCellNode(str, false);
            rowNode.appendChild(cellNode);
        }
        if (includeVariances) {
            let var1 = Math.abs(opposingNetSums[0]-getSum(""+m[0]+m[1]));
            let var2 = Math.abs(opposingNetSums[1]-getSum(""+m[2]+m[3]));
            let var3 = Math.abs(opposingNetSums[2]-getSum(""+m[4]+m[5]));
            let varianceStr = `${var1}, ${var2}, ${var3}`;
            let cellNode = createCellNode(varianceStr, false);
            rowNode.appendChild(cellNode);
        }
        tableNode.appendChild(rowNode);
    }
    document.getElementById("results").appendChild(tableNode);
    let countNode = document.createElement("p");
    let text = document.createTextNode("Results: " + list.length);
    countNode.appendChild(text);
    document.getElementById("results").appendChild(countNode);
}

function createCellNode(str, isHeader) {
    let cellNode = document.createElement(isHeader ? "th" : "td");
    let cellText = document.createTextNode(str);
    cellNode.appendChild(cellText);
    return cellNode;
}

function swapNets(netA, netB) {
    let net1 = document.getElementById("net1").value;
    let net2 = document.getElementById("net2").value;
    let net3 = document.getElementById("net3").value;
    let vals = [net1, net2, net3];
    let valA = vals[netA-1];
    let valB = vals[netB-1];
    let ids = ["net1", "net2", "net3"];
    document.getElementById(ids[netB-1]).value = valA;
    document.getElementById(ids[netA-1]).value = valB;
}

function setError(error) {
    document.getElementById("error-text").innerHTML = "Error: " + error;
}

function toggleOtherOptions() {
    if (document.getElementById("other-options").style.display === "none") {
        document.getElementById("other-options").style.display = "block";
    }
    else {
        document.getElementById("other-options").style.display = "none";
    }
}

// playerIdx is index of player on the net (0 or 1)
function generate(opposingNetSums, netIdx, playerIdx, startingPlayer, free, matchup) {
    if (netIdx >= 3) {
        matchups.push([...matchup]);
        return;
    }
    let matchupIdx = netIdx*2+playerIdx;
    for (let i = startingPlayer; i < free.length; i++) {
        if (!free[i]) {
            continue;
        }
        free[i] = false;
        matchup[matchupIdx] = i;
        if (playerIdx === 0) {
            generate(opposingNetSums, netIdx, (playerIdx+1)%2, i+1, free, matchup);
        }
        else {
            // 8's can have the value 7 if that option is enabled
            let p1Value = value8As7 && matchup[matchupIdx-1] === 8 ? 7 : matchup[matchupIdx-1];
            let p2Value = value8As7 && i === 8 ? 7 : i;
            let netSum = p1Value + p2Value;
            if (Math.abs(netSum-opposingNetSums[netIdx]) <= variance) {
                generate(opposingNetSums, netIdx+1, (playerIdx+1)%2, 1, free, matchup);
            }
        }

        free[i] = true;
    }
}

function getSubs(matchup, squadSize) {
    let playing = new Array(squadSize+1);
    for (let i = 0; i < matchup.length; i++) {
        playing[matchup[i]] = true;
    }
    let subs = "";
    for (let i = 1; i < playing.length; i++) {
        if (!playing[i]) {
            if (subs.length > 0) {
                subs += ", " + i;
            }
            else {
                subs += i;
            }
        }
    }
    return subs;
}

function filter(list, prev1, prev2, prev3, pairsToAvoid, customization, matchupSubs, matchupNonSubs) {
    let badPairs = [];
    if (prev1.length === 2) {
        badPairs.push(sortPair(prev1));
    }
    if (prev2.length === 2) {
        badPairs.push(sortPair(prev2));
    }
    if (prev3.length === 2) {
        badPairs.push(sortPair(prev3));
    }
    if (pairsToAvoid.length > 0) {
        let pairsToAvoidArr = pairsToAvoid.split(/, */);
        for (pair of pairsToAvoidArr) {
            badPairs.push(sortPair(pair));
        }
    }
    if ("pairsToAvoid" in customization) {
        let pairsToAvoidArr = customization["pairsToAvoid"];
        for (pair of pairsToAvoidArr) {
            badPairs.push(sortPair(pair));
        }
    }

    let filtered = [];
    for (m of list) {
        let bad = false;
        for (let i = 0; !bad && i < 6; i++) {
            if (matchupSubs.includes(m[i])) {
                bad = true;
            }
        }
        for (let i = 0; !bad && i < 3; i++) {
            let net = ""+m[i*2]+m[i*2+1];
            if (badPairs.includes(net)) {
                bad = true;
            }
        }
        if (!matchupNonSubs.every(req => m.includes(req))) {
            bad = true;
        }
        if (!bad) {
            filtered.push(m);
        }
    }
    return filtered;
}

// E.g. "125" -> [1, 2, 5]
function getPlayersFromInput(playersStr) {
    let players = [];
    for (let i = 0; i < playersStr.length; i++) {
        players.push(parseInt(playersStr.charAt(i)));
    }
    return players;
}

function sortPair(net) {
    if (net.length === 0) {
        return net;
    }
    let a = parseInt(net.charAt(0));
    let b = parseInt(net.charAt(1));
    if (a < b) {
        return net;
    }
    return ""+b+a;
}

// 8's can have the value 7 if that option is enabled
function getSum(net) {
    let sum = 0;
    for (let i = 0; i < net.length; i++) {
        let c = net.charAt(i);
        if ('1' <= c && c <= '9') {
            let num = parseInt(c);
            sum += value8As7 && num === 8 ? 7 : num;
        }
    }
    return sum;
}

function isValid(net1, net2, net3, prev1, prev2, prev3, subs, matchupNonSubs, variance) {
    if (!isValidLengthAndNumeric(net1, 2) || !isValidLengthAndNumeric(net2, 2) || !isValidLengthAndNumeric(net3, 2)) {
        return [false, "Enter 2 rankings per net, without spaces or commas (e.g. 25 for players 2 and 5)"];
    }
    if (!isValidLengthAndNumeric(prev1, 2, true) || !isValidLengthAndNumeric(prev2, 2, true) || !isValidLengthAndNumeric(prev3, 2, true)) {
        return [false, "Enter 2 rankings per net, without spaces or commas (e.g. 25 for players 2 and 5). If this is the first round, your team's previous round rankings can be left blank."];
    }
    if (!isValidRangeAndNumeric(subs, 1, 2, true)) {
        return [false, "Enter the ranking of the player(s) to sub this round, without spaces or commas"];
    }
    if (!isValidRangeAndNumeric(matchupNonSubs, 1, 6, true)) {
        return [false, "Enter the ranking of the player(s) that must play this round, without spaces or commas"];
    }
    if (!isValidLengthAndNumeric(variance, 1, true)) {
        return [false, "Variance must be a single-digit number (leave it blank for default variance)"];
    }
    return [true, ""];
}

function isValidLengthAndNumeric(str, len, optional) {
    // Some fields can be left blank
    if (str == null || str.length === 0) {
        return optional === true;
    }
    return str.length === len && isNumeric(str);
}

function isValidRangeAndNumeric(str, minLen, maxLen, optional) {
    // Some fields can be left blank
    if (str == null || str.length === 0) {
        return optional === true;
    }
    return str.length >= minLen && str.length <= maxLen && isNumeric(str);
}

function isNumeric(str) {
    return /^\d+$/.test(str);
}