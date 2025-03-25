// ==UserScript==
// @name         Eclesiar Battle Tracker (WIP)
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Track battle round and status on Eclesiar Battletrack with table displayst)
// @author       WS
// @iconURL      https://i.imgur.com/yqPIZiO.jpeg
// @match        https://eclesiar.com/battletrack
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

window.onload = function() {
    console.log('Page loaded');

    // Remove the wrapper if it exists
    const wrapper = document.querySelector('.wrapper');
    if (wrapper) {
        wrapper.remove();
        console.log('Wrapper removed');
    } else {
        console.log('Wrapper not found');
    }

    // Create a button to add a battle
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Battle';
    addButton.style.margin = '10px';
    addButton.onclick = () => {
        const battleId = prompt('Enter Battle ID:');
        if (battleId) {
            console.log('Battle ID entered:', battleId);

            // Add battleId to battleIds array
            if (!battleIds.includes(battleId)) {
                battleIds.push(battleId);
                console.log('Battle ID added to tracking list:', battleId);
            } else {
                console.log('Battle ID already being tracked.');
            }

            fetchAuthToken(() => fetchBattleData(battleId));
        } else {
            console.log('No Battle ID provided.');
        }
    };
    document.body.appendChild(addButton);

    // Create a timer element to display "Time until next update"
    const timerDiv = document.createElement('div');
    timerDiv.id = 'updateTimer';
    timerDiv.style.marginTop = '10px';
    timerDiv.style.fontWeight = 'bold';
    document.body.appendChild(timerDiv);

    // Update countdown function
    setInterval(updateCountdown, 1000);
};

// Authentication token and time tracking
let authToken = '';
let remainingTime = 'Fetching...';
let updateInterval = 60; // 60 seconds interval for updates
let nextUpdateTime = updateInterval;
let battleIds = []; // Array to hold battle IDs

// Store remaining times for each battle
const remainingTimes = {};

// Function to update all battles
function updateBattles() {
    battleIds.forEach(battleId => {
        fetchBattleData(battleId); // Fetch and update each battle individually
    });
}

// Function to update remaining time for each battle individually
function updateRemainingTime() {
    battleIds.forEach(battleId => {
        // Decrease remaining time for the specific battle if it's greater than 0
        if (remainingTimes[battleId] > 0) {
            remainingTimes[battleId]--;
        }

        // Find the corresponding status table to update the displayed time
        const statusDiv = document.getElementById(`statusTableDiv_${battleId}`);
        if (statusDiv) {
            // The third row contains the remaining time in the second cell (column 2)
            const roundRow = statusDiv.querySelector('tr:nth-child(3)');
            const timeCell = roundRow.querySelector('td:last-child');
            if (timeCell) {
                const timeLeft = remainingTimes[battleId];
                const hours = Math.floor(timeLeft / 3600);
                const minutes = Math.floor((timeLeft % 3600) / 60);
                const seconds = timeLeft % 60;
                timeCell.textContent = `Remaining Time: ${hours}h ${minutes}m ${seconds}s`;
            }
        }
    });
}

// Call updateRemainingTime function every second or at your preferred interval
setInterval(updateRemainingTime, 1000); // Update every second

// Fetch auth token function
function fetchAuthToken(callback) {
    const url = 'https://eclesiar.com/dashboard';
    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function (response) {
            if (response.status === 200) {
                const scriptContent = response.responseText.match(/var bearerAuth = "(.*?)";/);
                if (scriptContent && scriptContent[1]) {
                    authToken = `Bearer ${scriptContent[1]}`;
                    console.log('Bearer Auth Token:', authToken);
                    callback();
                } else {
                    console.error('Could not find Bearer auth token in response.');
                }
            } else {
                console.error('Error fetching auth token:', response.statusText);
            }
        },
        onerror: function (error) {
            console.error('Error fetching auth token:', error);
        }
    });
}
// Fetch battle data function
function fetchBattleData(battleId) {
    const battleUrl = `https://eclesiar.com/war/${battleId}`;
    GM_xmlhttpRequest({
        method: 'GET',
        url: battleUrl,
        onload: function(response) {
            if (response.status === 200) {
                // Parse the response text into a DOM object
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.responseText, 'text/html');

                // Extract time area and round information
                const timeArea = doc.querySelector('.war-content-area__header--time-area');
                const roundMatch = timeArea ? timeArea.innerHTML.match(/<span>Round (\d+)<\/span>/) : null;
                const currentRound = roundMatch ? roundMatch[1] : 'Unknown';

                // Fetch the attacker and defender using their respective class structure
                const attackerElement = doc.querySelector('.war-content-area__header--top .col-4 a'); // Attacker's country element (first .col-4)
                const defenderElement = doc.querySelector('.war-content-area__header--top .col-4.text-right a'); // Defender's country element (last .col-4 with .text-right)

                // Extract the text content from the found elements
                const attacker = attackerElement ? attackerElement.textContent.trim() : 'Unknown Attacker';
                const defender = defenderElement ? defenderElement.textContent.trim() : 'Unknown Defender';

                // Output the extracted information (for testing)
                console.log('Attacker: ', attacker);
                console.log('Defender: ', defender);

                // Extract end timestamp
                const endTimestampMatch = response.responseText.match(/var endTimestamp = (\d+);/);
                const endTimestamp = endTimestampMatch ? parseInt(endTimestampMatch[1]) : null;

                if (endTimestamp) {
                    const now = Math.floor(Date.now() / 1000);
                    const timeLeft = endTimestamp - now;

                    if (timeLeft > 0) {
                        remainingTimes[battleId] = timeLeft; // Store the specific remaining time for this battle
                    } else {
                        remainingTimes[battleId] = 0;
                    }
                }

                displayStatusTable(battleId, {
                    currentRound: currentRound,
                    remainingTime: remainingTimes[battleId],
                    attacker: attacker,
                    defender: defender,
                });

                // Extract round ID
                const roundIdMatch = response.responseText.match(/var roundId = (\d+);/);
                const roundId = roundIdMatch ? roundIdMatch[1] : null;

                if (roundId) {
                    fetchWarStatus(battleId, roundId);
                } else {
                    console.error('Round ID not found in response.');
                }
            } else {
                console.error('Failed to fetch battle data:', response.statusText);
            }
        },
        onerror: function(error) {
            console.error('Error fetching battle data:', error);
        }
    });
}


// Fetch war status function
function fetchWarStatus(battleId, roundId) {
    GM_xmlhttpRequest({
        method: "OPTIONS",
        url: 'https://api.eclesiar.com/war/status',
        onload: function (response) {
            if (response.status === 200) {
                console.log('OPTIONS request successful.');

                const payload = new URLSearchParams();
                payload.append('round_id', roundId);

                GM_xmlhttpRequest({
                    method: "POST",
                    url: 'https://api.eclesiar.com/war/status',
                    headers: {
                        'Authorization': authToken,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: payload.toString(),
                    onload: function (response) {
                        console.log('POST response code:', response.status);
                        console.log('Response:', response.responseText);

                        if (response.status === 200) {
                            const responseData = JSON.parse(response.responseText);
                            const warData = responseData.data;

                            updateStatusTable(battleId, {
                                attackerScore: warData.attackerScore,
                                defenderScore: warData.defenderScore,
                                attackerPoints: warData.attackerPoints,
                                defenderPoints: warData.defenderPoints,
                                remainingTime: remainingTime
                            });
                        } else {
                            console.error('Failed to fetch war status (POST):', response.statusText);
                        }
                    },
                    onerror: function (error) {
                        console.error('Error fetching war status (POST):', error);
                    }
                });
            } else {
                console.error('Failed to send OPTIONS request:', response.statusText);
            }
        },
        onerror: function (error) {
            console.error('Error sending OPTIONS request:', error);
        }
    });
}

GM_addStyle(`
  body {
      background: linear-gradient(to bottom, rgba(255,255,255,0) 50vh, rgba(255,255,255,1) 100vh),
                  url('https://img.freepik.com/premium-photo/white-wall-with-white-background-that-says-word-it_994023-371201.jpg') no-repeat center center fixed;
      background-size: cover;
  }
`);

// Display the status table with restored structure
function displayStatusTable(battleId, data) {
    let statusDiv = document.getElementById(`statusTableDiv_${battleId}`);

    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = `statusTableDiv_${battleId}`;
        statusDiv.style.border = '1px solid #ccc';
        statusDiv.style.padding = '10px';
        statusDiv.style.marginTop = '20px';
        statusDiv.style.backgroundColor = '#f9f9f9';
        document.body.appendChild(statusDiv);
    }

    statusDiv.innerHTML = ''; // Clear the old content

    const table = document.createElement('table');
    table.className = 'battle-status-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Row 1: Attacker and Defender with the current round
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#007BFF';
    headerRow.style.color = 'white';

    const attackerCell = document.createElement('th');
    attackerCell.textContent = `Attacker - ${data.attacker}`;
    headerRow.appendChild(attackerCell);

    const defenderCell = document.createElement('th');
    defenderCell.textContent = `Defender - ${data.defender}`;
    headerRow.appendChild(defenderCell);

    table.appendChild(headerRow);

    // Row 2: Attacker and Defender scores with points
    const scoreRow = document.createElement('tr');

    const attackerScoreCell = document.createElement('td');
    attackerScoreCell.textContent = `Score: ${data.attackerScore} (${data.attackerPoints})`;
    scoreRow.appendChild(attackerScoreCell);

    const defenderScoreCell = document.createElement('td');
    defenderScoreCell.textContent = `Score: ${data.defenderScore} (${data.defenderPoints})`;
    scoreRow.appendChild(defenderScoreCell);

    table.appendChild(scoreRow);

    // Row 3: Current round and remaining time
    const roundRow = document.createElement('tr');
    const roundCell = document.createElement('td');
    roundCell.textContent = `Current Round: ${data.currentRound}`;
    roundRow.appendChild(roundCell);

    const timeCell = document.createElement('td');
    timeCell.textContent = `Remaining Time: ${data.remainingTime} seconds`;
    roundRow.appendChild(timeCell);

    table.appendChild(roundRow);

    // Row 4: Clickable battle link
    const linkRow = document.createElement('tr');
    const linkCell = document.createElement('td');
    linkCell.colSpan = 2; // Span the link across two columns

    const battleLink = document.createElement('a');
    battleLink.href = `https://eclesiar.com/war/${battleId}`;
    battleLink.textContent = 'Go to Battle';
    battleLink.target = '_blank';  // Open the link in a new tab
    battleLink.style.color = '#007BFF';  // Blue color for the link
    battleLink.style.textDecoration = 'underline';  // Underline the link
    battleLink.style.fontWeight = 'bold';  // Make it bold

    linkCell.appendChild(battleLink);
    linkRow.appendChild(linkCell);

    table.appendChild(linkRow);

    // Row 5: Remove Battle button
    const removeRow = document.createElement('tr');
    const removeCell = document.createElement('td');
    removeCell.colSpan = 2; // Span the button across two columns

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove Battle';
    removeButton.style.backgroundColor = '#ff4d4d'; // Red background for remove button
    removeButton.style.color = 'white';
    removeButton.onclick = () => {
        // Remove the battleId from battleIds array
        battleIds = battleIds.filter(id => id !== battleId);
        console.log(`Battle ID ${battleId} removed from tracking list.`);
        // Remove the status table
        statusDiv.remove();
    };

    removeCell.appendChild(removeButton);
    removeRow.appendChild(removeCell);
    table.appendChild(removeRow);

    statusDiv.appendChild(table);
}

// Update countdown function
function updateCountdown() {
    const timerDiv = document.getElementById('updateTimer');
    timerDiv.textContent = `Time until next update: ${nextUpdateTime}s`;

    if (nextUpdateTime > 0) {
        nextUpdateTime--;
    } else {
        // Reset the countdown timer and update status
        console.log('Countdown reached 0. Fetching updates for all battles...');
        nextUpdateTime = updateInterval;

        // Fetch and update each battle's status
        battleIds.forEach(battleId => {
            console.log(`Fetching data for Battle ID: ${battleId}`);
            fetchBattleData(battleId);
        });
    }
}

// Function to update the status table with new data
function updateStatusTable(battleId, newData) {
    console.log('Updating status table for Battle ID:', battleId);
    const statusDiv = document.getElementById(`statusTableDiv_${battleId}`);
    if (statusDiv) {
        const scoreRow = statusDiv.querySelector('tr:nth-child(2)'); // Score row
        if (scoreRow) {
            const attackerScoreCell = scoreRow.querySelector('td:first-child');
            const defenderScoreCell = scoreRow.querySelector('td:last-child');
            if (attackerScoreCell) {
                attackerScoreCell.textContent = `Score: ${newData.attackerScore} (${newData.attackerPoints})`;
            }
            if (defenderScoreCell) {
                defenderScoreCell.textContent = `Score: ${newData.defenderScore} (${newData.defenderPoints})`;
            }
        }

        const timeRow = statusDiv.querySelector('tr:nth-child(3)'); // Remaining time row
        if (timeRow) {
            const timeCell = timeRow.querySelector('td:last-child');
            if (timeCell) {
                timeCell.textContent = `Remaining Time: ${newData.remainingTime}`;
            }
        }
    } else {
        console.error('Status div not found for Battle ID:', battleId);
    }
}
