// popup.js - Logic for the Quick Resale Search popup

const productTitleElement = document.getElementById('product-title');
const searchButtonsElement = document.getElementById('search-buttons');
const errorMessageElement = document.getElementById('error-message');

/**
 * Attempts to detect the product title from the current page.
 * This function is executed in the context of the active tab's page.
 * It tries common elements where titles are often found.
 * @returns {string | null} The detected product title or null.
 */
function detectProductTitleOnPage() {
    // Prioritize common semantic or ID/class based selectors
    const selectors = [
        'h1',                         // Main heading
        '[itemprop="name"]',          // Schema.org itemprop
        '#productTitle',              // Common Amazon ID
        '#product-name',              // Common generic ID
        '.product-title',             // Common generic class
        '.product_title',             // Another common class
        'meta[property="og:title"]',  // Open Graph title (get content attribute)
        'meta[name="twitter:title"]' // Twitter card title (get content attribute)
    ];

    let title = null;

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            if (element.tagName === 'META') {
                title = element.getAttribute('content');
            } else {
                title = element.innerText;
            }
            // Basic cleanup: trim whitespace
            if (title) {
                title = title.trim();
                // Further cleanup: remove extra spaces, potentially site name if pattern is known
                title = title.replace(/\s+/g, ' ');
                if (title) break; // Stop if we found a non-empty title
            }
        }
    }

    // Fallback to document title if nothing else found
    if (!title) {
        title = document.title.trim();
        // Very basic cleanup for document title (might remove too much/little)
        // Try removing text after common separators like | , •, -
        const separators = ['|', '•', ' - '];
        for (const sep of separators) {
            if (title.includes(sep)) {
                title = title.split(sep)[0].trim();
                break;
            }
        }
    }

    console.log("Detected title attempt:", title);
    return title || null; // Return null if empty after all attempts
}

/**
 * Creates search buttons based on the detected product title.
 * @param {string | null} title - The detected product title.
 */
function createSearchButtons(title) {
    // Clear any existing buttons or error messages
    searchButtonsElement.innerHTML = '';
    errorMessageElement.style.display = 'none';

    if (!title) {
        productTitleElement.textContent = 'N/A';
        errorMessageElement.style.display = 'block';
        return; // Don't create buttons if no title
    }

    productTitleElement.textContent = title; // Display the detected title
    const encodedTitle = encodeURIComponent(title);

    const searchSites = [
        {
            name: 'eBay (Sold)',
            url: `https://www.ebay.com/sch/i.html?_from=R40&_nkw=${encodedTitle}&_sacat=0&LH_Complete=1&LH_Sold=1&rt=1&_ipg=240`, // More specific sold items URL
            className: 'ebay'
        },
        {
            name: 'Google Shopping',
            url: `https://www.google.com/search?tbm=shop&q=${encodedTitle}`,
            className: 'google'
        },
        {
            name: 'Amazon',
            url: `https://www.amazon.com/s?k=${encodedTitle}`,
            className: 'amazon'
        }
        // Add more sites here if needed
        // { name: 'StockX', url: `https://stockx.com/search?s=${encodedTitle}`, className: 'stockx' },
    ];

    searchSites.forEach(site => {
        const button = document.createElement('button');
        button.textContent = `Search ${site.name}`;
        button.className = site.className; // Apply specific class for styling
        button.title = `Search for "${title}" on ${site.name}`;
        button.addEventListener('click', () => {
            chrome.tabs.create({ url: site.url }); // Open search in new tab
        });
        searchButtonsElement.appendChild(button);
    });
}

// --- Main Execution ---

// When the popup is opened, get the active tab and execute the script
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.id) {
            // Execute the content script function in the active tab
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: detectProductTitleOnPage // The function to execute on the page
            });

            // Process the results (executeScript returns an array)
            if (results && results.length > 0) {
                const detectedTitle = results[0].result;
                createSearchButtons(detectedTitle);
            } else {
                 createSearchButtons(null); // Handle case where script execution failed or returned nothing
                 console.error("Script execution failed or returned no result.");
            }

        } else {
            console.error("Could not get active tab ID.");
            createSearchButtons(null); // Show error state
        }
    } catch (error) {
        console.error("Error executing script or processing results:", error);
        productTitleElement.textContent = 'Error';
        errorMessageElement.textContent = `An error occurred: ${error.message}`;
        errorMessageElement.style.display = 'block';
        searchButtonsElement.innerHTML = ''; // Clear buttons on error
    }
});
