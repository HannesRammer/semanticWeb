// ==UserScript==
// @name         Semantic annotations
// @namespace    http://your.homepage/
// @version      1.0
// @description  Semantic analyzer
// @author       Hannes Rammer
// @match        https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=de
// @grant        none
// ==/UserScript==
var analyzer = {
    itemScopesToContainedItemScopes: {},
    withIncludedProperties: true,
    specialIdList: [],
    JSONRootItemScopeList: [],
    HTMLRootItemScopeList: [],
    itemScopeIdList: [],
    jsonHash: {},
    possibleItemScopeRelationHash: [],
    directCrossConnectionToItemScopeHash: {},
    directItemScopeToCrossConnectionHash: {},
    propertyScopeLength: 0,
    extract: {
        /**
         * create a json list from all found root scope items
         * @effect adds json scope item to analyzer.JSONRootItemScopeList
         */

        JSONRootItemScopesFromWebpage: function (scopeList) {
            //var HTMLRootItemScopes = analyzer.extract.helper.HTMLRootItemScopesFromWebpage();
            var HTMLRootItemScopes = scopeList;//analyzer.extract.helper.HTMLRootItemScopesFromWebpage();
            for (var i = 0; i < HTMLRootItemScopes.length; i++) {
                var HTMLRootItemScope = HTMLRootItemScopes[i];
                var jsonJSTreeJsonScope = analyzer.transformHTMLItemScopeToJSON(HTMLRootItemScope, analyzer.itemScopeIdList.length);
                analyzer.JSONRootItemScopeList.push(jsonJSTreeJsonScope);
            }
        },
        helper: {
            HTMLRootItemScopesFromWebpage: function () {
                analyzer.HTMLRootItemScopeList = [];
                analyzer.extract.helper.findHTMLRootItemScopes(document.body);
                return analyzer.HTMLRootItemScopeList;
            },
            findHTMLRootItemScopes: function (item) {
                var isScope = item.hasAttribute('itemscope');
                if (isScope) {
                    analyzer.HTMLRootItemScopeList.push(item);
                } else {
                    var children = item.children;
                    var hasChildren = children.length > 0;
                    if (hasChildren) {
                        for (var i = 0; i < children.length; i++) {
                            var newItem = item.children[i];
                            analyzer.extract.helper.findHTMLRootItemScopes(newItem);
                        }
                    }
                }
            }
        }
    },


    /**
     * compares single scope items with all scope Items in List to find possible connections
     * only comparing items from different http sources
     * @param currentItem
     * @prerequisite same itemSope, different nodeSource and at least 1 identical attribute
     * @effect adds possible connection id string eg. '0_1' to analyzer.possibleItemScopeRelationList list  TODO UPDATE
     */
    createPossibleConnectionsBetweenScopeItemAndList: function (currentItem) {
        //for (var i = 0; i < analyzer.jsonList.length; i++) {
        Object.keys(analyzer.jsonHash).forEach(function (storageItemKey) {
            var storageItem = analyzer.jsonHash[storageItemKey];
            //if (currentItem['nodeSource'] !== storageItem['nodeSource']) {
            if (currentItem['scopeId'] !== storageItem['scopeId']) {
                if (currentItem['nodeType'] === storageItem['nodeType']) {
                    //when same name -> check fore more similarities
                    var cNodeName = currentItem['nodeName'];
                    var sNodeName = storageItem['nodeName'];
                    var emptyName = cNodeName === "" || sNodeName === "";
                    var sameName = cNodeName === sNodeName;
                    var isPlural = false;
                    if (cNodeName + "s" === sNodeName || cNodeName === sNodeName + "s") {
                        isPlural = true;
                    }

                    if (emptyName || sameName || isPlural) {
                        //when same value -> check fore more similarities

                        var cleanCurrentString = helper.toLowerCaseTrimmedSpaces(currentItem['nodeValue']);
                        var cleanStorageString = helper.toLowerCaseTrimmedSpaces(storageItem['nodeValue']);
                        if (cleanCurrentString === cleanStorageString) {
                            analyzer.createDirectConnection(currentItem, storageItem);
                        }
                    }
                }

            }

        });
    },

    createDirectConnection: function (currentItem, storageItem) {
        if ((currentItem.children !== undefined) && ( storageItem.children !== undefined)) {
            for (var k = 0; k < currentItem.children.length; k++) {
                var currentItemChild = currentItem.children[k];
                var currentItemChildNodeName = currentItemChild['nodeName'];
                for (var l = 0; l < storageItem.children.length; l++) {
                    var storageItemChild = storageItem.children[l];
                    if (storageItemChild !== undefined) {
                        if (currentItemChildNodeName !== "thumbnailUrl" && currentItemChildNodeName !== "url" && currentItemChildNodeName !== "image" && currentItemChildNodeName !== "provider") {
                            if (currentItemChildNodeName === storageItemChild['nodeName']) {
                                var cleanCurrentString = helper.toLowerCaseTrimmedSpaces(currentItemChild['nodeValue']);
                                var cleanStorageString = helper.toLowerCaseTrimmedSpaces(storageItemChild['nodeValue']);
                                if (cleanCurrentString !== "" && cleanCurrentString === cleanStorageString) {
                                    //Sort numbers in an array in ascending order
                                    var sortedScopeConnectionIds = helper.sortAscending([currentItem.scopeId, storageItem.scopeId]);

                                    //TODO
                                    var propertyConnectionIds = [];
                                    if (sortedScopeConnectionIds[0] === currentItem.scopeId) {
                                        propertyConnectionIds = [currentItemChild['propertyId'], storageItemChild['propertyId']];
                                    } else {
                                        propertyConnectionIds = [storageItemChild['propertyId'], currentItemChild['propertyId']];
                                    }
                                    var joinedScopeConnectionId = sortedScopeConnectionIds.join('-');
                                    var joinedPropertyConnectionId = propertyConnectionIds.join('-');

                                    //add to list if not already exists
                                    //first if should not happen due tu differend source
                                    //  if (analyzer.relationBetweenItemScopesAndTheirContainedItemScopes.indexOf(joinedScopeConnectionId) < 0 && analyzer.possibleItemScopeRelationList.indexOf(joinedScopeConnectionId) < 0) {
                                    //                              analyzer.possibleItemScopeRelationList.push(joinedScopeConnectionId);
                                    //                        }
                                    //NEW
                                    var currentCrossId = -1;
                                    var newCrossId = Object.keys(analyzer.directItemScopeToCrossConnectionHash).length;
                                    var hasCurrentItemScopeId = analyzer.directItemScopeToCrossConnectionHash.hasOwnProperty(currentItem.scopeId);
                                    var hasStorageItemScopeId = analyzer.directItemScopeToCrossConnectionHash.hasOwnProperty(storageItem.scopeId);
                                    //find existing cross id
                                    if (hasCurrentItemScopeId) {
                                        currentCrossId = analyzer.directItemScopeToCrossConnectionHash[currentItem.scopeId];
                                    } else {
                                        if (hasStorageItemScopeId) {
                                            currentCrossId = analyzer.directItemScopeToCrossConnectionHash[storageItem.scopeId];
                                        }
                                    }

                                    if (currentCrossId === -1) {
                                        currentCrossId = newCrossId;
                                    }
                                    analyzer.directItemScopeToCrossConnectionHash[currentItem.scopeId] = currentCrossId;
                                    analyzer.directItemScopeToCrossConnectionHash[storageItem.scopeId] = currentCrossId;

                                    var hasCurrentCrossConnectionId = analyzer.directCrossConnectionToItemScopeHash.hasOwnProperty(currentCrossId.toString());
                                    var itemScopeIds = analyzer.directCrossConnectionToItemScopeHash[currentCrossId];
                                    if (hasCurrentCrossConnectionId) {
                                        if (itemScopeIds.indexOf(currentItem.scopeId) < 0) {
                                            itemScopeIds.push(currentItem.scopeId);
                                        }
                                        if (itemScopeIds.indexOf(storageItem.scopeId) < 0) {
                                            itemScopeIds.push(storageItem.scopeId);
                                        }

                                    } else {
                                        itemScopeIds = [currentItem.scopeId, storageItem.scopeId];
                                    }
                                    analyzer.directCrossConnectionToItemScopeHash[currentCrossId] = helper.sortAscending(itemScopeIds)

                                    if (analyzer.possibleItemScopeRelationHash.hasOwnProperty(joinedScopeConnectionId)) {
                                        var possiblePropertyRelationList = analyzer.possibleItemScopeRelationHash[joinedScopeConnectionId];
                                        if (possiblePropertyRelationList.indexOf(joinedPropertyConnectionId) < 0) {
                                            possiblePropertyRelationList.push(joinedPropertyConnectionId);
                                        }
                                    } else {
                                        analyzer.possibleItemScopeRelationHash[joinedScopeConnectionId] = [joinedPropertyConnectionId];
                                    }
                                } else {

                                }
                            }
                        }
                    }
                }
            }
        }
    },
    mapAllForSemanticReference: function () {
        //for (var i = 0; i < analyzer.jsonList.length; i++) {
        var currentItemCount = 0;
        Object.keys(analyzer.jsonHash).forEach(function (currentItemKey) {
            var currentItem = analyzer.jsonHash[currentItemKey];

            analyzer.createPossibleConnectionsBetweenScopeItemAndList(currentItem);
            //when same source -> check fore more similarities
            currentItemCount += 1;
        });
    },

    transformHTMLItemScopeToJSON: function (itemScope, scopeId) {

        var jsonScope = analyzer.newJSONTreeNode();

        if (analyzer.itemScopeIdList.indexOf(scopeId) > -1) {
            console.log("duplicate Scope Id -> something went wrong");
        }
        jsonScope.scopeId = scopeId;

        jsonScope.nodeSource = document.location.toString();
        jsonScope.nodeType = itemScope.getAttribute("itemtype");
        if (itemScope.getAttribute("itemprop") !== null) {
            jsonScope.nodeName = itemScope.getAttribute("itemprop");
        }
        //var HTMLItemScopeProperties = itemScope.querySelectorAll('[itemprop]');
        var HTMLItemScopeProperties = analyzer.getItemScopeProperties(itemScope);

        for (var i = 0; i < HTMLItemScopeProperties.length; i++) {
            var HTMLItemScopeProperty = HTMLItemScopeProperties[i];
            var spcecialid = HTMLItemScopeProperty.getAttribute("specialid");
            var index = analyzer.specialIdList.indexOf(parseInt(spcecialid));
            if (analyzer.withIncludedProperties || (index >= 0)) {
                analyzer.specialIdList.splice(index, 1);
                //if property is new scope
                if (HTMLItemScopeProperty.getAttribute("itemScope") !== null) {
                    analyzer.propertyScopeLength += 1;
                    var propertyScope = analyzer.transformHTMLItemScopeToJSON(HTMLItemScopeProperty, analyzer.itemScopeIdList.length + analyzer.propertyScopeLength);
                    propertyScope.propertyId = i;
                    //TODO see if needed
                    jsonScope.children.push(propertyScope);
                } else {
                    var propertyName = HTMLItemScopeProperty.getAttribute("itemprop").toString();
                    var propertyValue = "";
                    var valueType = "TEXT";
                    if (HTMLItemScopeProperty.tagName === "IMG") {
                        propertyValue = HTMLItemScopeProperty.src;
                        valueType = "IMG";
                    } else if (HTMLItemScopeProperty.tagName === "A") {
                        propertyValue = HTMLItemScopeProperty.href;
                        valueType = "A";
                    } else {
                        if (typeof HTMLItemScopeProperty.textContent !== "undefined") {
                            propertyValue = HTMLItemScopeProperty.textContent;
                        } else {
                            propertyValue = HTMLItemScopeProperty.innerText;
                        }
                    }
                    var jsonProp = analyzer.newJSONTreeNode();
                    jsonProp.propertyId = i;
                    jsonProp.nodeName = propertyName;
                    jsonProp.nodeValue = helper.toLowerCaseTrimmedSpaces(propertyValue);
                    jsonProp.valueType = valueType;
                    jsonScope.children.push(jsonProp);
                }
            }
        }
        if (helper.objectDoesNotExist(jsonScope)) {

            analyzer.jsonHash[scopeId] = jsonScope;
            analyzer.itemScopeIdList.push(scopeId);
            for (var j = 0; j < jsonScope.children.length; j++) {
                var jsonScopeProperty = jsonScope.children[j];
                if (jsonScopeProperty.scopeId !== undefined) {
                    var scopeId = jsonScope.scopeId;
                    var propertyScopeId = jsonScopeProperty.scopeId;
                    //Sort numbers in an array in ascending order
                    //var itemScopeConnectionId = helper.sortAscending([scopeId, propertyScopeId]);
                    //add to list if not already exists

                    if (analyzer.itemScopesToContainedItemScopes.hasOwnProperty(scopeId)) {
                        var relationList = analyzer.itemScopesToContainedItemScopes[scopeId];
                        if (relationList.indexOf(propertyScopeId) < 0) {
                            relationList.push(propertyScopeId);
                        }
                    } else {
                        analyzer.itemScopesToContainedItemScopes[scopeId] = [propertyScopeId];
                    }

                    if (analyzer.itemScopesToContainedItemScopes.hasOwnProperty(propertyScopeId)) {
                        var relationList = analyzer.itemScopesToContainedItemScopes[propertyScopeId];
                        if (relationList.indexOf(scopeId) < 0) {
                            relationList.push(scopeId);
                        }
                    } else {
                        analyzer.itemScopesToContainedItemScopes[propertyScopeId] = [scopeId];
                    }


                }
            }
            analyzer.propertyScopeLength = 0;
        }
        return jsonScope;
    },
    getItemScopeProperties: function (itemScope) {
        var specialId = 0;

        var allIncludingDuplicates = itemScope.querySelectorAll('[itemprop]');
        for (var i = 0; i < allIncludingDuplicates.length; i++) {
            allIncludingDuplicates[i].setAttribute("specialId", specialId.toString());
            analyzer.specialIdList.push(specialId);
            specialId += 1;
        }
        return allIncludingDuplicates;
    },

    newJSONTreeNode: function () {
        return {
            //id          : "string" // will be autogenerated if omitted
            nodeType: "", // node text
            nodeName: "",
            nodeValue: "",
            nodeSource: "",
            scopeId: undefined,
            propertyId: undefined,
            children: []//,  // array of strings or objects
        };
    }

};

var visual = {
    setListStyle: function (htmlElement) {
        htmlElement.style.fontFamily = "monospace";
        htmlElement.style.margin = 0;
    },
    createHTMLFromJSONScope: function (jsonScope) {
        var ul = document.createElement("ul");
        var ulType = document.createElement("ul");
        var liType = document.createElement("li");
        var liName = document.createElement("li");
        var liValue = document.createElement("li");
        liType.style.display = "none";
        liType.className = "liType";
        liName.className = "liName";
        liValue.className = "liValue";
        visual.setListStyle(liType);
        visual.setListStyle(liName);
        visual.setListStyle(liValue);
        var nodeName = jsonScope.nodeName;
        if (nodeName === "") {
            var splitList = jsonScope.nodeType.split("/");
            nodeName = splitList[splitList.length - 1];
        } else {

        }
        nodeName = "ID:" + jsonScope.scopeId + " " + nodeName;
        var htmlContent = document.createElement("a");
        var browserLink = document.createElement("a");
        htmlContent.style.cursor = "pointer";
        //htmlContent.title = "ItemScopeId:" + jsonScope.scopeId;
        htmlContent.title = JSON.stringify(jsonScope);
        htmlContent.style.color = "#a9014b";

        if (typeof liType.textContent !== "undefined") {
            htmlContent.textContent = nodeName;
            browserLink.textContent = "->";
            liType.textContent = jsonScope.nodeType;
            liValue.textContent = jsonScope.nodeValue;
        } else {
            htmlContent.innerText = nodeName;
            browserLink.innerText = "->";
            liType.innerText = jsonScope.nodeType;
            liValue.innerText = jsonScope.nodeValue;
        }
        liName.appendChild(htmlContent);
        liName.appendChild(browserLink);


        htmlContent.onclick = function () {
            visual.toggleItemScopeView(liType);
        };
        ulType.appendChild(liType);
        liName.appendChild(ulType);
        ul.appendChild(liName);
        browserLink.onclick = function () {
            console.time('browser');
            visual.render.relationsForItemScope(jsonScope);
            console.timeEnd('browser');

        };


        //liType.appendChild(liChildren);
        var properties = jsonScope.children;
        var newScope = true;
        for (var i = 0; i < properties.length; i++) {
            var property = properties[i];
            if(property.nodeName === "name" && newScope ){
                browserLink.innerText += property.nodeValue;
                newScope = false;
            }

            //if property is new scope
            if (property.nodeType !== "") {
                var htmlPropertyScope = visual.createHTMLFromJSONScope(property);
                liType.appendChild(htmlPropertyScope);
                //console.log(htmlPropertyScope);
            } else {
                var ulPropName = document.createElement("ul");
                var liPropName = document.createElement("li");
                visual.setListStyle(liPropName);
                var ulPropValue = document.createElement("ul");
                if (typeof liPropName.textContent !== "undefined") {
                    liPropName.textContent = property.nodeName;
                } else {
                    liPropName.innerText = property.nodeName;
                }
                if (property.valueType === "IMG") {
                    var img = document.createElement("IMG");
                    img.src = property.nodeValue;
                    //liPropValue.appendChild(img);
                    liPropName.appendChild(img);
                } else if (property.valueType === "A") {
                    var a = document.createElement("a");
                    a.href = property.nodeValue;
                    if (typeof a.textContent !== "undefined") {
                        a.textContent = property.nodeValue;
                    } else {
                        a.innerText = property.nodeValue;
                    }
                    liPropName.appendChild(a);
                } else {
                    if (typeof liPropName.textContent !== "undefined") {
                        liPropName.textContent = liPropName.textContent + " : " + property.nodeValue;
                    } else {
                        liPropName.innerText = liPropName.innerText + " : " + property.nodeValue;
                    }
                }
                ulPropName.appendChild(liPropName);
                ulPropName.appendChild(ulPropValue);
                liType.appendChild(ulPropName);
            }
        }
        //console.log(ul);
        return ul;
    },

    /**
     * function used on scope Elements liType div onclick function to toggle display properties
     * @param li
     */
    toggleItemScopeView: function (li) {
        //var target = event.target;
        if (li.className === "liType") {
            if (li.style.display === "none") {
                li.style.display = "block";
            } else {
                li.style.display = "none";
            }
        }

    },
    render: {
        currentWebPageItems: function () {
            var webPageBox = visual.getDisplay("WebPage");
            for (var i = 0; i < analyzer.JSONRootItemScopeList.length; i++) {
                var item = analyzer.JSONRootItemScopeList[i];
                var htmlUl = visual.createHTMLFromJSONScope(item);
                webPageBox.appendChild(htmlUl);
            }
        },
        directConnections: function () {
            var directConnectionBox = visual.getDisplay("DirectConnection");
            Object.keys(analyzer.possibleItemScopeRelationHash).forEach(function (possibleJoinedScopeRelationId) {
                var possibleJoinedScopeRelationIds = possibleJoinedScopeRelationId.split('-');
                var possiblePropertyRelationList = analyzer.possibleItemScopeRelationHash[possibleJoinedScopeRelationId];
                var possiblePropertyRelationListLength = possiblePropertyRelationList.length;
                for (var i = 0; i < possiblePropertyRelationListLength; i++) {

                    var possiblePropertyRelationIds = possiblePropertyRelationList[i].split('-');
                    var itemScopePropertyConnectionReason = document.createElement("div");
                    var JSONItemScope1 = analyzer.jsonHash[possibleJoinedScopeRelationIds[0]];
                    var JSONItemScope2 = analyzer.jsonHash[possibleJoinedScopeRelationIds[1]];
                    var children1 = JSONItemScope1.children;
                    var children1Length = children1.length;
                    for (var j = 0; j < children1Length; j++) {
                        var property = children1[j];
                        if (property['propertyId'] === parseInt(possiblePropertyRelationIds[0])) {
                            if (typeof itemScopePropertyConnectionReason.textContent !== "undefined") {
                                itemScopePropertyConnectionReason.textContent = property.nodeName + " : " + property.nodeValue;
                            } else {
                                itemScopePropertyConnectionReason.innerText = property.nodeName + " : " + property.nodeValue;
                            }

                        }
                    }
                    var box = document.createElement("div");
                    box.style.border = "1px solid black";
                    box.style.maxHeight = "450px";
                    box.style.width = "100%";
                    box.style.overflow = "auto";


                    var htmlUl1 = visual.createHTMLFromJSONScope(JSONItemScope1);
                    var htmlUl2 = visual.createHTMLFromJSONScope(JSONItemScope2);
                    box.appendChild(itemScopePropertyConnectionReason);
                    box.appendChild(htmlUl1);
                    box.appendChild(htmlUl2);
                    directConnectionBox.appendChild(box);
                }
            });
        },
        directCrossConnection: function () {
            var directCrossConnectionBox = visual.getDisplay("DirectCrossConnection");

            Object.keys(analyzer.directCrossConnectionToItemScopeHash).forEach(function (directCrossConnectionId) {
                var box = document.createElement("div");
                box.style.border = "1px solid black";
                box.style.maxHeight = "450px";
                box.style.width = "100%";
                box.style.overflow = "auto";


                var itemScopeIds = analyzer.directCrossConnectionToItemScopeHash[directCrossConnectionId];
                var itemScopeIdsDublicate = JSON.parse(JSON.stringify(itemScopeIds));
                for (var i = 0; i < itemScopeIdsDublicate.length; itemScopeIdsDublicate.splice(0, 1)) {

                    var firstItemScopeId = itemScopeIdsDublicate[i];
                    var firstItemScopeCount = 0;
                    for (var j = i + 1; j < itemScopeIdsDublicate.length; j++) {
                        var secondItemScopeId = itemScopeIdsDublicate[j];
                        var sorted = helper.sortAscending([firstItemScopeId, secondItemScopeId]);
                        var connectionString = sorted[0] + "-" + sorted[1];
                        //console.log(connectionString);
                        if (analyzer.possibleItemScopeRelationHash.hasOwnProperty(connectionString)) {
                            var propertyConnections = analyzer.possibleItemScopeRelationHash[connectionString];
                            var connectionTable = document.createElement("table");
                            var connectionTR = document.createElement("tr");
                            var firstItemScopeTD = document.createElement("td");
                            var connectionTD = document.createElement("td");
                            var secondItemScopeTD = document.createElement("td");
                            firstItemScopeTD.width = "45%";
                            connectionTD.width = "10%";
                            secondItemScopeTD.width = "45%";
                            connectionTable.style.width = "100%";
                            connectionTable.style.border = "1px dotted black";
                            connectionTable.appendChild(connectionTR);
                            connectionTR.appendChild(firstItemScopeTD);
                            connectionTR.appendChild(connectionTD);
                            connectionTR.appendChild(secondItemScopeTD);

                            var div1 = document.createElement("div");
                            var div2 = document.createElement("div");
                            div1.style.overflow = "auto";
                            div2.style.overflow = "auto";
                            div1.style.width = "400px";
                            div2.style.width = "400px";
                            div1.style.maxHeight = "200px";
                            div2.style.maxHeight = "200px";

                            var firstItemScopeUL = visual.createHTMLFromJSONScope(analyzer.jsonHash[firstItemScopeId]);
                            var secondItemScopeUL = visual.createHTMLFromJSONScope(analyzer.jsonHash[secondItemScopeId]);

                            div1.appendChild(firstItemScopeUL);
                            div2.appendChild(secondItemScopeUL);
                            var propertyTitleList = "";
                            var countedPropertyCount = 0;
                            for (var k = 0; k < propertyConnections.length; k++) {
                                var propertyConnectionId = propertyConnections[k].split("-")[0];
                                var propertyObject = analyzer.jsonHash[firstItemScopeId].children[propertyConnectionId];
                                var propertyObjectNodeName = propertyObject['nodeName'];
                                if (propertyObjectNodeName !== "thumbnailUrl" && propertyObjectNodeName !== "url" && propertyObjectNodeName !== "image" && propertyObjectNodeName !== "provider") {
                                    countedPropertyCount++;
                                    propertyTitleList += propertyObject.nodeName + " : " + propertyObject.nodeValue + "\n";
                                }
                            }

                            var connectionLink = document.createElement("a");
                            var connectionLinkText = countedPropertyCount + "connection";

                            if (propertyConnections.length !== 1) {
                                connectionLinkText += "s";
                            }
                            if (typeof connectionLink.textContent !== "undefined") {
                                connectionLink.textContent = connectionLinkText;

                            } else {
                                connectionLink.innerText = connectionLinkText;

                            }

                            connectionLink.title = propertyTitleList;
                            if (firstItemScopeCount === 0) {
                                firstItemScopeTD.appendChild(div1);
                            }
                            firstItemScopeCount++;
                            connectionTD.appendChild(connectionLink);
                            secondItemScopeTD.appendChild(div2);
                            box.appendChild(connectionTable);
                        }
                    }
                    //var htmlUl1 = visual.createHTMLFromJSONScope(analyzer.jsonHash[itemScopeIds[i]]);
                    //box.appendChild(htmlUl1);
                }

                directCrossConnectionBox.appendChild(box);

            });
        },
        relationsForItemScope: function (itemScope) {
            var browserBox = visual.getDisplay("Browser");
            browserBox.innerHTML = "";
            helper.toggleTab("Browser");
            var mainItemScopeUL = visual.createHTMLFromJSONScope(itemScope);
            browserBox.appendChild(mainItemScopeUL);
            var itemScopeId = itemScope.scopeId;

            //render direct connection
            visual.render.renderBox(browserBox, itemScopeId,"direct_connection");
            //render cross connection
            var hasCrossConnection = analyzer.directItemScopeToCrossConnectionHash.hasOwnProperty(itemScopeId);
            if (hasCrossConnection) {
                var crossConnectionId = analyzer.directItemScopeToCrossConnectionHash[itemScopeId];
                var itemScopeIdList = analyzer.directCrossConnectionToItemScopeHash[crossConnectionId];
                var listLength = itemScopeIdList.length;
                for (var i = 0; i < listLength; i++) {
                    visual.render.renderBox(browserBox, itemScopeIdList[i],"cross_connection");
                }
            }

        },
        renderBox: function (browserBox,itemScopeId,name) {
            var box = document.createElement("div");
            box.style.border = "1px dotted black";
            var directRelations = analyzer.itemScopesToContainedItemScopes[itemScopeId];

            for (var j = 0; j < directRelations.length; j++) {
                var relItemScope = analyzer.jsonHash[directRelations[j]];
                var relItemScopeUL = visual.createHTMLFromJSONScope(relItemScope);

                box.appendChild(relItemScopeUL);
            }
            browserBox.appendChild(box);
            return browserBox;
        }
    },

    /**
     * creates the analyzer display and returns the wanted display tab
     * @param name : id of display tab div as string
     * @returns {HTMLElement}
     */

    getDisplay: function (name) {
        name = name + "Box";
        if (document.getElementById(name) === null) {
            var display = document.createElement("div");

            display.id = "semantic_container";
            display.style.width = "150px";
            display.style.height = "30px";
            display.style.position = "fixed";
            display.style.border = "1px solid black";
            display.style.background = "white";
            display.style.top = "0";
            display.style.right = "0";
            display.style.zIndex = "999999";

            var webPageButton = helper.createButton("WebPage", "#2daebf");
            var directConnectionButton = helper.createButton("DirectConnection", "#91bd09");
            var directCrossConnectionButton = helper.createButton("DirectCrossConnection", "#91bd09");
            var browserButton = helper.createButton("Browser", "#ffb515");

            var webPageTab = helper.createTab("WebPage", "#2daebf");
            var directConnectionTab = helper.createTab("DirectConnection", "#91bd09");
            var directCrossConnectionTab = helper.createTab("DirectCrossConnection", "#91bd09");
            var browserTab = helper.createTab("Browser", "#ffb515");

            var b0 = document.createElement("div");
            b0.style.paddingLeft = "20px";
            b0.style.float = "left";
            b0.style.height = "20px";

            if (typeof b0.textContent !== "undefined") {
                b0.textContent = name;
            } else {
                b0.innerText = name;
            }
            b0.onclick = function () {
                var container = document.getElementById("semantic_container");
                if (container.style.width === "150px") {
                    container.style.width = "1024px";
                    container.style.height = "800px";
                    webPageButton.style.display = 'block';
                    directConnectionButton.style.display = 'block';
                    directCrossConnectionButton.style.display = 'block';
                    browserButton.style.display = 'block';
                    webPageTab.style.display = 'block';

                } else {
                    container.style.width = "150px";
                    container.style.height = "30px";
                    webPageButton.style.display = 'none';
                    directConnectionButton.style.display = 'none';
                    directCrossConnectionButton.style.display = 'none';
                    webPageTab.style.display = 'none';
                    directConnectionTab.style.display = 'none';
                    directCrossConnectionTab.style.display = 'none';
                    browserButton.style.display = 'none';

                }
            };
            display.appendChild(b0);
            display.appendChild(webPageButton);
            display.appendChild(directConnectionButton);
            display.appendChild(directCrossConnectionButton);
            display.appendChild(browserButton);
            display.appendChild(webPageTab);
            display.appendChild(directConnectionTab);
            display.appendChild(directCrossConnectionTab);
            display.appendChild(browserTab);

            var body = document.getElementsByTagName("body")[0];
            body.appendChild(display);
            return document.getElementById(name);
        } else {
            return document.getElementById(name);
        }

    }

};

var storage = {

    /**
     * deletes all entries by resetting the local storage
     */
    resetLocalStorage: function () {
        localStorage.setItem("jsonHash", JSON.stringify({}));
        localStorage.setItem("itemScopeIdList", JSON.stringify([]));
        localStorage.setItem("itemScopesToContainedItemScopes", JSON.stringify({}));
        localStorage.setItem("possibleItemScopeRelationHash", JSON.stringify({}));
        localStorage.setItem("directCrossConnectionToItemScopeHash", JSON.stringify({}));
        localStorage.setItem("directItemScopeToCrossConnectionHash", JSON.stringify({}));

    },

    /**
     * load the local storage into the JavaScript environment as JSON objects
     *
     * eg: done before every web page is loaded
     */
    readFromLocalStorage: function () {
        analyzer.jsonHash = JSON.parse(localStorage.getItem("jsonHash")) || {};
        analyzer.itemScopeIdList = JSON.parse(localStorage.getItem("itemScopeIdList")) || [];
        analyzer.itemScopesToContainedItemScopes = JSON.parse(localStorage.getItem("itemScopesToContainedItemScopes")) || {};
        analyzer.possibleItemScopeRelationHash = JSON.parse(localStorage.getItem("possibleItemScopeRelationHash")) || {};
        analyzer.directCrossConnectionToItemScopeHash = JSON.parse(localStorage.getItem("directCrossConnectionToItemScopeHash")) || {};
        analyzer.directItemScopeToCrossConnectionHash = JSON.parse(localStorage.getItem("directItemScopeToCrossConnectionHash")) || {};

    },

    /**
     * stores the JSON objects into the local storage system
     */
    writeToLocalStorage: function () {
        //create json object from local storage
        localStorage.setItem("jsonHash", JSON.stringify(analyzer.jsonHash));
        localStorage.setItem("itemScopeIdList", JSON.stringify(analyzer.itemScopeIdList));
        localStorage.setItem("itemScopesToContainedItemScopes", JSON.stringify(analyzer.itemScopesToContainedItemScopes));
        localStorage.setItem("possibleItemScopeRelationHash", JSON.stringify(analyzer.possibleItemScopeRelationHash));
        localStorage.setItem("directCrossConnectionToItemScopeHash", JSON.stringify(analyzer.directCrossConnectionToItemScopeHash));
        localStorage.setItem("directItemScopeToCrossConnectionHash", JSON.stringify(analyzer.directItemScopeToCrossConnectionHash));
    }
};

var run = {
    run: function () {
        console.time('run');

        run.localStorageToJavaScript();
        run.analysis();
        run.mapping();
        run.rendering();
        run.javaScripToLocalStorage();
        console.timeEnd('run');
    },
    analysis: function () {
        console.log("START analysis");

        console.log("--------------");
        console.time('analysis');
        console.log("analyzing : extracting data from webpage");
        analyzer.extract.JSONRootItemScopesFromWebpage(analyzer.extract.helper.HTMLRootItemScopesFromWebpage());
        console.timeEnd('analysis');
        console.log("------------");
        console.log("END analysis");
    },
    mapping: function () {
        console.log("START mapping");
        console.log("-------------");
        console.time('mapping');
        console.log("mappping : find connections between references");
        analyzer.mapAllForSemanticReference();
        console.timeEnd('mapping');
        console.log("-----------");
        console.log("END mapping");

    },
    rendering: function () {
        console.log("START rendering");
        console.log("---------------");
        console.time('rendering');
        console.time('currentWebPageItems');
        visual.render.currentWebPageItems();
        console.timeEnd('currentWebPageItems');
        console.time('directConnections');
        //visual.render.directConnections();
        console.timeEnd('directConnections');
        console.time('directCrossConnection');
        visual.render.directCrossConnection();
        console.timeEnd('directCrossConnection');
        console.timeEnd('rendering');
        console.log("-------------");
        console.log("END rendering");
    },
    localStorageToJavaScript: function () {
        console.log("START : read from LocalStorage store in JS");
        console.time('localStorageToJavaScript');
        storage.readFromLocalStorage();
        console.timeEnd('localStorageToJavaScript');
        console.log("END : read from LocalStorage store in JS");
    },
    javaScripToLocalStorage: function () {
        console.log("START : update LocalStorage from code");
        console.time('javaScripToLocalStorage');
        storage.writeToLocalStorage();
        console.timeEnd('javaScripToLocalStorage');
        console.log("END : update LocalStorage from code");
    },
    deleteLocalStorage: function () {
        console.log("START : delete LocalStorage");
        console.time('deleteLocalStorage');
        storage.resetLocalStorage();
        console.timeEnd('deleteLocalStorage');
        console.log("END : delete LocalStorage");
    }


};
var helper = {
    toLowerCaseTrimmedSpaces: function (string) {
        return string.toLowerCase().replace(/\s+/g, ' ').replace(/^\s+|\s+$/, '')
    },
    objectDoesNotExist: function (currentItem) {

        var doesNotExists = true;
        Object.keys(analyzer.jsonHash).forEach(function (currentItemKey) {
            var storageItem = analyzer.jsonHash[currentItemKey];
            //var currentItem = currentList[i];
            //when same source -> check fore more similarities
            if (currentItem !== undefined && storageItem !== undefined) {
                if (currentItem['nodeSource'] === storageItem['nodeSource']) {
                    //when same type -> compare properties
                    if (currentItem['nodeType'] === storageItem['nodeType']) {
                        //when same name -> check fore more similarities
                        if (currentItem['nodeName'] === storageItem['nodeName']) {
                            //when same value -> check fore more similarities
                            var cleanCurrentItemNodeValue = helper.toLowerCaseTrimmedSpaces(currentItem['nodeValue']);
                            var cleanStorageItemNodeValue = helper.toLowerCaseTrimmedSpaces(storageItem['nodeValue']);
                            if (cleanCurrentItemNodeValue === cleanStorageItemNodeValue) {
                                //if children (properties) exist and are same length compare
                                var currentChildren = currentItem.children;
                                var storageChildren = storageItem.children;
                                if ((currentChildren !== undefined) && ( storageChildren !== undefined)) {
                                    var cLength = currentChildren.length;
                                    var sLength = storageChildren.length;

                                    if (cLength > 0 && sLength > 0) {
                                        if (cLength === sLength) {

                                            if (cLength === 1) {//nodeName === url and no name propertie exists
                                                if (currentChildren[0]['nodeType'] === storageChildren[0]['nodeType']) {
                                                    if (currentChildren[0]['nodeName'] === storageChildren[0]['nodeName']) {
                                                        var cleanCurrentItemChildNodeValue = helper.toLowerCaseTrimmedSpaces(currentChildren[0]['nodeValue']);
                                                        var cleanStorageItemChildNodeValue = helper.toLowerCaseTrimmedSpaces(storageChildren[0]['nodeValue']);

                                                        if (cleanCurrentItemChildNodeValue === cleanStorageItemChildNodeValue) {
                                                            doesNotExists = false;
                                                            return doesNotExists;
                                                        }
                                                    }
                                                }
                                            } else {
                                                //compare name properties for final comparison
                                                var duplicatePropertyCount = 0;
                                                for (var j = 0; j < cLength; j++) {
                                                    var currentChildNodeName = currentChildren[j]['nodeName'];
                                                    if (currentChildNodeName === "thumbnailUrl" || currentChildNodeName === "url" || currentChildNodeName === "image" || currentChildNodeName === "provider") {
                                                        duplicatePropertyCount += 1;
                                                    } else {
                                                        for (var k = 0; k < sLength; k++) {
                                                            if (currentChildNodeName === storageChildren[k]['nodeName']) {
                                                                var cleanCurrentItemChildNodeValue = helper.toLowerCaseTrimmedSpaces(currentChildren[j]['nodeValue']);
                                                                var cleanStorageItemChildNodeValue = helper.toLowerCaseTrimmedSpaces(storageChildren[k]['nodeValue']);
                                                                if (cleanCurrentItemChildNodeValue === cleanStorageItemChildNodeValue) {
                                                                    duplicatePropertyCount += 1;
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                    //if all properties are the same -> ignore item
                                                }
                                                if (duplicatePropertyCount === sLength) {
                                                    doesNotExists = false;
                                                    return doesNotExists;
                                                }
                                            }
                                        }
                                    } else {
                                        //both the same with no children
                                        doesNotExists = false;
                                        return doesNotExists;
                                    }
                                } else {//both the same with undefined children
                                    doesNotExists = false;
                                    return doesNotExists;
                                }
                            } else {

                            }
                        } else {

                        }
                    } else {

                    }
                } else {

                }
            }
        });
        return doesNotExists;
    },
    sortAscending: function (unsortedList) {
        return unsortedList.sort(function (a, b) {
            return a - b
        });
    },
    sortByLengthDesc: function (unsortedList) {
        return unsortedList.sort(function (a, b) {
            if (a.length > b.length)
                return -1;
            if (a.length < b.length)
                return 1;
            return 0;
        });
    },
    createTab: function (name, color) {
        var tab = document.createElement("div");
        tab.id = name + "Tab";
        tab.className = "SemanticTab";
        tab.style.width = "100%";
        tab.style.height = "779px";
        tab.style.overflowY = "auto";
        tab.style.borderTop = "1px solid black";
        tab.style.background = "white";
        tab.style.top = "20px";
        tab.style.right = "0";
        tab.style.backgroundColor = color;
        tab.style.display = 'none';
        var box = document.createElement("div");
        box.style.width = "100%";
        box.style.height = "100%";
        box.id = name + "Box";
        tab.appendChild(box);
        return tab;
    },
    createButton: function (name, color) {
        var button = document.createElement("div");
        button.style.padding = "1px 10px";
        button.id = name + "Button";
        button.style.float = "left";
        button.style.backgroundColor = color;
        button.style.height = "20px";
        button.style.display = "none";

        if (typeof button.textContent !== "undefined") {
            button.textContent = name;
        } else {
            button.innerText = name;
        }

        button.onclick = function () {
            helper.toggleTab(name);
        };
        return button;
    },
    toggleTab: function (name) {
        var tabs = document.getElementsByClassName("SemanticTab");
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (tab.id == name + "Tab") {
                tab.style.display = 'block';
            } else {
                tab.style.display = 'none';
            }
        }
    }
};
run.run();