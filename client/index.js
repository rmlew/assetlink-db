const replace_characters = ["'", '"', ',', '/', ':', ';', '?', '>', '<', '!', '@', '#', '$', '%', '^', '(', ')', '=', '{', '}', '[', ']', '|', '\\', '`'];

/* 1) Create an instance of CSInterface. */
var csInterface = new CSInterface();

var username = "rlewis1@armstrongceilings.com";
var password = "66KuTNtW33fus4364";

var activeAjaxRequests = 0;
var linkMap = [];

/* 2) Make a reference to your HTML button and add a click handler. */
var loginButton = document.querySelector("#sign-in-button");
loginButton.addEventListener("click", testLoginCredentials);

var openButton = document.querySelector("#open-button");
openButton.addEventListener("click", getLinkMatches);

var selectedButton = document.querySelector("#selected-button");
selectedButton.addEventListener("click", getSelectedLinkMatches);

function show(elt) {
    elt.style.display = "block";
}

function hide(elt) {
    elt.style.display = "none";
}

function resetExtension() {
    hide(document.getElementById("links-updated"));
    hide(document.getElementById("show-candidates"));
    hide(document.getElementById("finding-candidates"));
    if (username == null || password == null) {
        show(Document.getElementById("sign-in"));
    } else {
        show(document.getElementById("starting-options"));
    }
}

function linkSelectedAssets(links_string) {
    var links = links_string.split("|");
    var link_map = new Map();
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var radios = document.getElementsByName(link);
        for (var j = 0; j < radios.length; j++) {
            if (radios[j].checked && radios[j].value != 'none') {
                link_map.set(link, radios[j].value);
                break;
            }
        }
    }
    
    // Convert the Map to a generic Javascript object, so JSON.stringify will work
    var link_map_obj = Array.from(link_map).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
    }, {});
    
    hide(document.getElementById("show-candidates"));
    show(document.getElementById("linking-assets"));
    
    var script = "linkAssets(" + JSON.stringify(link_map_obj) + ")";
    csInterface.evalScript(script, (links_restored_string) => {
        hide(document.getElementById("linking-assets"));
        show(document.getElementById("updating-links"));
        
        var links_list = links_restored_string.split("|");
        
        var display = "<h1 style='color:red;'>ERROR: Links could not be updated...</h1>";
        
        if (links_list.length > 0 && links_restored_string != "") {
            display = "<h1>Links Restored:</h1><ol>";
            for (var i = 0; i < links_list.length; i++) {
                display += "<li>" + links_list[i] + "</li>";
            }
            display += "</ol>";
            
            display += "<button onclick='resetExtension()'>Start Over</button>";
                
            hide(document.getElementById("updating-links"));
            document.getElementById("links-updated").innerHTML = display;
            show(document.getElementById("links-updated"));
        } else {
            display = "<h1>No new assets were linked, so no updates were required.</h1>";
            display += "<button onclick='resetExtension()'>Start Over</button>";
                
            hide(document.getElementById("updating-links"));
            document.getElementById("links-updated").innerHTML = display;
            show(document.getElementById("links-updated"));
        }
    });
}

function testLoginCredentials() {
    // Check if jQuery imported properly
    if (typeof jQuery == 'undefined') {
        alert("jQuery did not import properly. Cancelling request.");
        return;
    }

    //username = document.getElementById("username").value;
    //password = document.getElementById("password").value;

    var url = "";
    if (aemConfig.aemPort == "") {
        url = aemConfig.aemScheme + "://" + aemConfig.aemServer + "/bin/querybuilder.json";
    } else {
        url = aemConfig.aemScheme + "://" + aemConfig.aemServer + ":" + aemConfig.aemPort + "/bin/querybuilder.json";   
    }
    
    $.ajax({
        url: url,
        type: 'GET',
        async: true,
        beforeSend: function(xhr) {
            xhr.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
        },
        success: function(data, textStatus, jQxhr) {
            hide(document.getElementById("sign-in"));
            show(document.getElementById("starting-options"));
        },
        error: function(jqXhr, textStatus, errorThrown) {
            alert("ERROR: " + jqXhr.status + " " + errorThrown);
            alert("You may have provided the wrong credentials, or your configuration file may need updating.");
        }
    });
}

function getSelectedLinkMatches() {
    if (username == null || password == null) {
        hide(document.getElementById("show-candidates"));
        hide(document.getElementById("starting-options"));
        show(document.getElementById("sign-in"));
        return;
    }
    
    hide(document.getElementById("show-candidates"));
    hide(document.getElementById("starting-options"));
    show(document.getElementById("finding-candidates"));
    
    var script = "getSelectedLinkFilenames()";
    
    executeLinkMatchesScript(script);
}

function getLinkMatches() {
    if (username == null || password == null) {
        hide(document.getElementById("show-candidates"));
        hide(document.getElementById("starting-options"));
        show(document.getElementById("sign-in"));
        return;
    }
    
    hide(document.getElementById("show-candidates"));
    hide(document.getElementById("starting-options"));
    show(document.getElementById("finding-candidates"));
    
    var script = "getLinkFilenames()";
    
    executeLinkMatchesScript(script);
}

function openHyperlink(hyperlink) {
    window.cep.util.openURLInDefaultBrowser(hyperlink);
}

function sanitizeLinkName(link) {
    for (var i = 0; i < replace_characters.length; i++) {
        link = link.split(replace_characters[i]).join("*");
    }
    return "*" + link + "*";
}

function executeLinkMatchesScript(script) {
    csInterface.evalScript(script, (links_string) => {
        var links = links_string.split("|");
        var display = "";
        
        var completed = 0;
        linkMap = [];
        
        if (links.length > 0 && links_string != "") {
            display = "<div><ul>";
            activeAjaxRequests = 0;
            for (var i = 0; i < links.length; i++) {
                var db_result_pos = original_filenames.indexOf(links[i]);
                var link = "";
                if (db_result_pos != -1) {
                    link = sanitizeLinkName(replacement_filenames[db_result_pos]);
                } else {
                    link = sanitizeLinkName(links[i]);
                }
                //alert("Searching AEM for " + link);
                // Build the querybuilder URL
                var url = "";
                if (aemConfig.aemPort == "") {
                    url = aemConfig.aemScheme + "://" + aemConfig.aemServer + "/bin/querybuilder.json?";
                } else {
                    url = aemConfig.aemScheme + "://" + aemConfig.aemServer + ":" + aemConfig.aemPort + "/bin/querybuilder.json?";
                }
                link = link.replace("®", "R");
                link = link.replace("™", "TM");
                url += "path=/content/dam";
                url += "&type=dam:Asset";
                url += "&nodename=" + link.replace("&", "%26");
                url += "&p.guessTotal=50";
                url += "&orderby=path";

                doAjaxRequest(i, url, links, display, links_string);
            }
        } else {
            display += "<h1>No unlinked assets found in active document</h1>";
            display += "<button id = 'try-again'>Try Again</button>";
            
            hide(document.getElementById("finding-candidates"));
            document.getElementById("show-candidates").innerHTML = display;
            show(document.getElementById("show-candidates"));
            if (links.length < 1 || links_string == "") {
                document.querySelector("#try-again").addEventListener("click", resetExtension);
            }
        }
    });
}

function doAjaxRequest(index, url, links, display, links_string) {
    $.ajax({
        url: url,
        type: 'GET',
        async: true,
        beforeSend: function(xhr) {
            xhr.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
            activeAjaxRequests++;
        },
        success: function(data, textStatus, jQxhr) {
            if (data.results > 0) {
                var mapping_child = [];
                for (var j = 0; j < data.hits.length; j++) {
                    var hit = data.hits[j];
                    mapping_child.push(hit.path);
                }

                var link_name = links[index];
                var mapping = [link_name, mapping_child];
                linkMap.push(mapping);
            } else {
                linkMap.push([links[index], []]);
            }
        },
        error: function(jqXhr, textStatus, errorThrown) {
            alert("ERROR: " + jqXhr.status + " " + errorThrown);
        },
        complete: function(jqXhr, textStatus) {
            activeAjaxRequests--;
            if (activeAjaxRequests == 0) {
                candidateSearchComplete(links, display, links_string);
            }
        }
    });
}

function candidateSearchComplete(links, display, links_string) {
    // First, assemble the links
    var processed_links = []
    for (var k = 0; k < linkMap.length; k++) {
        var link = linkMap[k][0];
        var candidates = linkMap[k][1];
        // Only process non-duplicate links
        if (processed_links.indexOf(link) < 0) {
            processed_links.push(link);
            if (candidates.length > 0) {
                if (original_filenames.indexOf(link) != -1) {
                    display += "<li style='color:#9999ff;'>Replacement candidates for " + link;
                } else {
                    display += "<li style='color:#99ff99;'>Candidates for " + link;
                }
                display += "<div style='color:rgb(214, 214, 214);'> (click a candidate to view asset in-browser)</div>";
                display += "<div style='color:rgb(214, 214, 214);'>";
                for (var l = 0; l < candidates.length; l++) {
                    var candidate = candidates[l];
                    display += "<input type='radio' id='candidate" + l.toString() + "' name='" + link + "'";
                    if (l == 0) {
                        display += "value='" + candidate + "' checked>";
                    } else {
                        display += "value='" + candidate + "'>";
                    }
                    display += "<label for='candidate" + l.toString() + "'>";
                    display += "<a href='#' style='color:#ccffff;' ";
                    display += "onclick='window.cep.util.openURLInDefaultBrowser(\"";
                    display += aemConfig.aemScheme + "://" + aemConfig.aemServer;
                    if (aemConfig.aemPort == "") {
                        display += "/assetdetails.html" + candidate + "\");'>" + candidate + "</a>";
                    } else {
                        display += ":" + aemConfig.aemPort + "/assetdetails.html" + candidate + "\");'>" + candidate + "</a>";
                    }
                    display += "</label></input><br>";
                }
                display += "<input type='radio' id='none' name='" + link + "' value='none'>";
                display += "<label for='none'>None of these (link will not be replaced)</label>";
                display += "</input></div></li>";
            } else {
                display += "<li style='color:red;'>No candidates found for " + link + "</li>";
            }
        }
    }

    display += "</ul>";
    display += "<button onclick='linkSelectedAssets(\"" + links_string + "\")'>Link Selected Assets</button>";
    display += "<br><br><button onclick='resetExtension()'>Cancel</button>";
    display += "</div>";

    hide(document.getElementById("finding-candidates"));
    document.getElementById("show-candidates").innerHTML = display;
    show(document.getElementById("show-candidates"));
}
