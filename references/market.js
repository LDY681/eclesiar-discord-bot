// ==UserScript==
// @name         Eclesiar Market Hunt (WIP)
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Fetch and display market data from API
// @iconURL      https://i.imgur.com/yqPIZiO.jpeg
// @match        https://eclesiar.com/checkmarket
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function() {
    'use strict';

    const apiUrl = 'https://api.eclesiar.com/market/get';
    const countries = {
        3: 'United States of America',
        46: 'Indonesia',
        13: 'Portugal',
        7: 'Brazil',
        30: 'Bulgaria',
        19: 'Lithuania',
        28: 'Romania',
        14: 'Spain',
        48: 'Philippines',
        16: 'Sweden',
        23: 'Serbia',
        15: 'Germany',
        42: 'India',
        33: 'Russia',
        44: 'Japan',
        20: 'Slovenia',
        21: 'Croatia',
        25: 'Albania',
        17: 'Italy',
        24: 'North Macedonia',
        10: 'Argentina',
        26: 'Greece',
        37: 'South Africa',
        18: 'Poland',
        27: 'Hungary',
        45: 'South Korea',
        36: 'Egypt',
        40: 'Iran',
        22: 'Bosnia and Herzegovina',
        35: 'Israel',
        31: 'Turkey',
        12: 'France',
        32: 'Ukraine',
        39: 'Saudi Arabia',
        47: 'Australia',
        2: 'United Kingdom',
        41: 'Pakistan',
        8: 'Chile',
        34: 'Georgia',
        5: 'Colombia',
        4: 'Mexico',
        43: 'China',
        11: 'Ireland',
        6: 'Peru',
        38: 'Iraq'
    };

    let authToken; // Variable to hold the auth token
    let allOffers = []; // Array to hold all offers collected
    let isSortedAsc = true; // Variable to track sorting order

    // Function to fetch the Bearer auth token from the military unit page
    function fetchAuthToken(callback) {
        const url = 'https://eclesiar.com/dashboard'; // Adjust this URL as needed
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function (response) {
                if (response.status === 200) {
                    const scriptContent = response.responseText.match(/var bearerAuth = "(.*?)";/);
                    if (scriptContent && scriptContent[1]) {
                        authToken = `Bearer ${scriptContent[1]}`; // Extract the token
                        console.log('Bearer Auth Token:', authToken); // Log the token
                        callback(); // Proceed to add the button
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

    // Function to send POST request to fetch market data
    async function fetchMarketData(countryId, productType, quality) {
        if (!authToken) {
            console.error('Authorization token not available.');
            return;
        }

        const payload = {
            page: 1,
            type: productType,
            quality: quality,
            countryid: countryId
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Authorization': authToken,
                },
                body: new URLSearchParams(payload).toString()
            });

            const data = await response.json();
            console.log('Full API response:', data);

            if (data && data.data && data.data.offers) {
                allOffers.push(...data.data.offers); // Add the new offers to the allOffers array
            } else {
                console.error('No offers found in the response.');
            }
        } catch (error) {
            console.error('Request failed:', error);
        }
    }

    // Function to display the market data as a table on the page
    function insertMarketDataTable() {
        let table = `<table id="market-data-table" border="1" style="width:100%; border-collapse: collapse;">
                       <thead>
                         <tr>
                           <th>Item Name</th>
                           <th>Quality</th>
                           <th>Seller</th>
                           <th>Supply</th>
                           <th style="cursor:pointer;" id="value-header">Value</th>
                           <th>Currency</th>
                         </tr>
                       </thead>
                       <tbody>`;

        allOffers.forEach(offer => {
            table += `<tr>
                        <td><img src="${offer.avatar}" width="32" height="32" alt="avatar"> ${offer.name}</td>
                        <td>${offer.quality}</td>
                        <td><a href="${offer.seller.url}"><img src="${offer.seller.avatar}" width="32" height="32" alt="seller avatar"> ${offer.seller.username}</a></td>
                        <td>${offer.supply}</td>
                        <td>${offer.value}</td>
                        <td><img src="${offer.currency.avatar}" width="32" height="32" alt="currency"> ${offer.currency.name}</td>
                      </tr>`;
        });

        table += `</tbody></table>`;

        const customDiv = document.getElementById('market-data-div');
        if (customDiv) {
            customDiv.innerHTML = table;

            // Attach sorting functionality to the Value header
            document.getElementById('value-header').onclick = toggleSort; // Attach the sort function
        } else {
            console.error('Custom div not found. Table not inserted.');
        }
    }

    // Function to toggle sorting by value
    function toggleSort() {
        isSortedAsc = !isSortedAsc; // Toggle sorting order
        allOffers.sort((a, b) => isSortedAsc ? a.value - b.value : b.value - a.value); // Sort offers by value
        insertMarketDataTable(); // Re-insert the table with sorted data
    }

    // Create a custom div for displaying market data
    function createCustomDiv() {
        const div = $('<div id="market-data-div" style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ccc; margin-top: 20px; border-radius: 5px;"></div>');
        $('body').append(div);
    }

    // Add buttons to manually trigger the data fetch
    function addButtons() {
        const fetchButton = $('<button>Fetch Market Data</button>');
        fetchButton.css({
            padding: '10px',
            margin: '20px',
            backgroundColor: '#007BFF',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
        });

        const checkAllButton = $('<button>Check All Countries</button>');
        checkAllButton.css({
            padding: '10px',
            margin: '20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
        });

        // Create a container for the buttons
        const buttonContainer = $('<div></div>').css({ display: 'flex', alignItems: 'center', marginBottom: '10px' });
        buttonContainer.append(fetchButton, checkAllButton);
        $('body').prepend(buttonContainer); // Move buttons to the top of the body

        fetchButton.on('click', async function() {
            const countryId = parseInt($('#country-select').val());
            const productType = $('#product-select').val();
            let quality = parseInt($('#quality-select').val());
            // Automatically set quality to 0 for specific product types
            if (['MATERIALS', 'CEREAL', 'DIAMONDS', 'AIRMATERIALS'].includes(productType)) {
                quality = 0;
            }
            await fetchMarketData(countryId, productType, quality); // Ensure this waits for data
            insertMarketDataTable(); // Insert data after fetching
        });

        checkAllButton.on('click', async function() {
            allOffers = []; // Clear previous offers
            for (const countryId of Object.keys(countries)) {
                const productType = $('#product-select').val();
                let quality = parseInt($('#quality-select').val());
                // Automatically set quality to 0 for specific product types
                if (['MATERIALS', 'CEREAL', 'DIAMONDS', 'AIRMATERIALS'].includes(productType)) {
                    quality = 0;
                }
                await fetchMarketData(countryId, productType, quality); // Fetch data for each country
                await new Promise(resolve => setTimeout(resolve, 300)); // Delay of 300ms
            }
            insertMarketDataTable(); // Insert all offers after fetching
        });
    }

    // Create dropdowns for country, product, and quality
    function createDropdowns() {
        const countrySelect = $('<select id="country-select"></select>');
        Object.entries(countries).sort((a, b) => a[1].localeCompare(b[1])).forEach(([key, value]) => {
            countrySelect.append(`<option value="${key}">${value}</option>`);
        });

        const productSelect = $('<select id="product-select"></select>');
        const productTypes = {
            ANY: 'Any',
            CEREAL: 'Grain',
            FOOD: 'Food',
            MATERIALS: 'Iron',
            WEAPONS: 'Weapons',
            DIAMONDS: 'Fuel',
            TICKETS: 'Ticket',
            AIRMATERIALS: 'Titanium'
        };
        Object.entries(productTypes).forEach(([key, value]) => {
            productSelect.append(`<option value="${key}">${value}</option>`);
        });

        const qualitySelect = $('<select id="quality-select"></select>');
        for (let i = 0; i <= 5; i++) {
            qualitySelect.append(`<option value="${i}">${i}</option>`);
        }

        // Set quality to 0 for specific product types
        productSelect.on('change', function() {
            const selectedType = $(this).val();
            if (['MATERIALS', 'CEREAL', 'DIAMONDS', 'AIRMATERIALS'].includes(selectedType)) {
                qualitySelect.val(0); // Set quality to 0
            }
        });

        // Add dropdowns to the body
        const dropdownContainer = $('<div></div>').css({ display: 'flex', alignItems: 'center' });
        dropdownContainer.append(countrySelect, productSelect, qualitySelect);
        $('body').prepend(dropdownContainer); // Move dropdowns to the top of the body
    }

    // Execute on page load
    window.onload = function() {
        console.log('Page loaded');
        const wrapper = document.querySelector('.wrapper');
        if (wrapper) {
            wrapper.remove();
        } else {
            console.log('Wrapper not found');
        }

        createDropdowns();
        createCustomDiv();
        addButtons();
        fetchAuthToken(() => {
            console.log('Auth token fetched and UI initialized.');
        });
    };

})();