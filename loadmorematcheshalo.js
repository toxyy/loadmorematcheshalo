// ==UserScript==
// @name         Halo Waypoint - Load More Matches
// @namespace    https://github.com/toxyy/loadmorematcheshalo
// @version      1.0
// @description  Readd load more matches button to Halo Waypoint (for mcc at least, untested on other games). Hard limit of 100 games.
// @author       Toxyy
// @match        https://www.halowaypoint.com/halo-the-master-chief-collection/players/*
// @icon         https://www.google.com/s2/favicons?domain=halowaypoint.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

//next xml stuff is to allow us to get the request headers to pull x_343_authorization_spartan

// Reasign the existing setRequestHeader function to
// something else on the XMLHtttpRequest class
XMLHttpRequest.prototype.wrappedSetRequestHeader =
  XMLHttpRequest.prototype.setRequestHeader;

// Override the existing setRequestHeader function so that it stores the headers
XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    // Call the wrappedSetRequestHeader function first
    // so we get exceptions if we are in an erronous state etc.
    this.wrappedSetRequestHeader(header, value);

    // Create a headers map if it does not exist
    if(!this.headers) {
        this.headers = {};
    }

    // Create a list for the header that if it does not exist
    if(!this.headers[header]) {
        this.headers[header] = [];
    }

    // Add the value to the header
    this.headers[header].push(value);
}

//globals
let x_343_authorization_spartan = '';
let gamertag = "";
let current_page = 2;
var index = 19;
let jsx_longnum_rows = 0;
var matchTable = '';

async function fetchStats(page = 1) {
    const response = await fetch('https://mcc-gateway.svc.halowaypoint.com/hmcc/users/gt('+gamertag+')/matches?page='+page+'&pageSize=20', {
        "credentials": "omit",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:96.0) Gecko/20100101 Firefox/96.0",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "x-343-authorization-spartan": x_343_authorization_spartan,
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "If-None-Match": "W/\"10ff-gS/6uhv2DVa9evAHlzdzHxqeVEY\"",
            "Cache-Control": "max-age=0"
        },
        "referrer": "https://www.halowaypoint.com/",
        "method": "GET",
        "mode": "cors"
    });

    response.ok;// => false
    response.status;// => 404
    const data = await response.text();
    let arr = JSON.parse(data);
    return arr;
}

function buildRows(data) {
    let out = '';

    for(const row of data) {
        index++;
        out += '<tr class="'+jsx_longnum_rows+' row_'+index+'">\
			<td class="'+jsx_longnum_rows+'">'+(index+1)+'</td>\
			<td class="'+jsx_longnum_rows+'">'+(row["won"] ? 'Won' : 'Loss')+'</td>\
			<td class="'+jsx_longnum_rows+'">'+(row["kills"]/row["deaths"]).toFixed(3)+'</td>\
			<td class="'+jsx_longnum_rows+'">'+row["kills"]+'</td>\
			<td class="'+jsx_longnum_rows+'">'+row["deaths"]+'</td>\
			<td class="'+jsx_longnum_rows+'">--</td>\
        </tr>';
    }

    matchTable.childNodes[1].insertAdjacentHTML('beforeend', out);
	//get text element that says Last 20 Games
    let lastgames = document.querySelector('.games-played .simple-table .has-border h3.container.title.small-module');
    lastgames.innerText = 'Last '+((current_page-1)*20)+' Games';
}

function loadMoreMatches() {
    let arr = fetchStats(current_page++);
	//no more than 100 matches in the data at a time unfortunately
    if(current_page === 6) {
        document.getElementById("loadmore-matches").disabled = true;
    }
    arr.then(function(value) {
        buildRows(value['matches']);
    });
}

async function loadMoreButton() {
    //wait until matches are on page
    while(!document.querySelector('[aria-label="Last 20 Games"]')) {
        await new Promise(r => setTimeout(r, 500));
    }
    matchTable = document.querySelector('[aria-label="Last 20 Games"]');

    //get button element for css
    var xpath = "//span[text()='Get Halo']";
    var matchingElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    //get jsx-### from the button to match css stuff
    var reg = /(?:jsx-)(\d*)/g;
    var jsx_longnum = matchingElement.className.match(reg);
    jsx_longnum_rows = matchTable.className.match(reg);
    //add new load button
    matchTable.insertAdjacentHTML('afterend', "<div class='new-loadmore'>\
		<button id='loadmore-matches' class='"+jsx_longnum+" button'>\
		   <div class='"+jsx_longnum+" outer-shadow'></div>\
		   <div class='"+jsx_longnum+" outer'></div>\
		   <div class='"+jsx_longnum+" container'>\
			  <div class='"+jsx_longnum+" container-shadow'></div>\
			  <div class='"+jsx_longnum+" container-background'></div>\
			  <span class='"+jsx_longnum+" content'>Load More</span>\
              <span class='"+jsx_longnum+" chevron'>»</span>\
		   </div>\
		</button>\
	</div>\
	<style>\
	.new-loadmore {\
		margin-top: 19px;\
		text-align: center;\
	}\
	</style>");
    document.getElementById("loadmore-matches").addEventListener("click", loadMoreMatches);
}

//main
((() => {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
            this.addEventListener('load', function() {
                if(this.responseURL.indexOf("matches?page=1&pageSize=20") > -1) {
                    //get gamertag
                    var reg = /(?<=gt\()([^)]*)/g;
                    gamertag = this.responseURL.match(reg);
                    //we need this for the request header to get more stats
                    x_343_authorization_spartan = this.headers['x-343-authorization-spartan'][0];
                    loadMoreButton();
                }
            });
        origOpen.apply(this, arguments);
    };
}))();