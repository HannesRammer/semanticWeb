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
    withIncludedProperties:true,
    specialIdList: [],
    JSONRootItemScopeList: [],
    HTMLRootItemScopeList: [],
    itemScopeIdList: [],
    crossConnectionIdList: [],
    jsonHash: {},
    possibleItemScopeRelationHash: [],
    directCrossConnectionToItemScopeHash: {},
    directItemScopeToCrossConnectionHash: {},
    relationBetweenItemScopesAndTheirContainedItemScopes: [],
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
            if (currentItem['nodeSource'] !== storageItem['nodeSource']) {
                if (currentItem['nodeType'] === storageItem['nodeType']) {
                    //when same name -> check fore more similarities
                    if (currentItem['nodeName'] === "" || storageItem['nodeName'] === "" || currentItem['nodeName'] === storageItem['nodeName']) {
                        //when same value -> check fore more similarities
                        var cleanCurrentString = helper.toLowerCaseTrimmedSpaces(currentItem['nodeValue']);
                        var cleanStorageString = helper.toLowerCaseTrimmedSpaces(storageItem['nodeValue']);
                        if (cleanCurrentString === cleanStorageString) {
                            analyzer.createDirectConnection(currentItem,storageItem);
                        }
                    }
                }

            }

        });
    },

    createDirectConnection:function(currentItem,storageItem){
        if ((currentItem.children !== undefined) && ( storageItem.children !== undefined)) {
            for (var k = 0; k < currentItem.children.length; k++) {
                var currentItemChild = currentItem.children[k];
                for (var l = 0; l < storageItem.children.length; l++) {
                    var storageItemChild = storageItem.children[l];
                    if (storageItemChild !== undefined) {
                        if (currentItemChild['nodeName'] !== "thumbnailUrl" && currentItemChild['nodeName'] !== "url" && currentItemChild['nodeName'] !== "image") {
                            if (currentItemChild['nodeName'] === storageItemChild['nodeName']) {
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
                                    /**first if should not happen due tu differend source
                                     * if (analyzer.relationBetweenItemScopesAndTheirContainedItemScopes.indexOf(joinedScopeConnectionId) < 0 && analyzer.possibleItemScopeRelationList.indexOf(joinedScopeConnectionId) < 0) {
                                                                    analyzer.possibleItemScopeRelationList.push(joinedScopeConnectionId);
                                                                }**/
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
                                    if (hasCurrentCrossConnectionId) {
                                        var itemScopeIds = analyzer.directCrossConnectionToItemScopeHash[currentCrossId];
                                        if (itemScopeIds.indexOf(currentItem.scopeId) < 0) {
                                            itemScopeIds.push(currentItem.scopeId);
                                        }
                                        if (itemScopeIds.indexOf(storageItem.scopeId) < 0) {
                                            itemScopeIds.push(storageItem.scopeId);
                                        }

                                    } else {
                                        analyzer.directCrossConnectionToItemScopeHash[currentCrossId] = [currentItem.scopeId, storageItem.scopeId];
                                    }
                                    if (analyzer.crossConnectionIdList.indexOf(currentCrossId) < 0) {
                                        analyzer.crossConnectionIdList.push(currentCrossId);
                                    }
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
                    //Sort numbers in an array in ascending order
                    var itemScopeConnectionId = helper.sortAscending([jsonScope.scopeId, jsonScopeProperty.scopeId]);
                    var joinedItemScopeConnectionId = itemScopeConnectionId.join('_');
                    //add to list if not already exists
                    if (analyzer.relationBetweenItemScopesAndTheirContainedItemScopes.indexOf(joinedItemScopeConnectionId) < 0) {
                        analyzer.relationBetweenItemScopesAndTheirContainedItemScopes.push(joinedItemScopeConnectionId);
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
        var htmlContent = document.createElement("a");
        htmlContent.style.cursor = "pointer";
        //htmlContent.title = "ItemScopeId:" + jsonScope.scopeId;
        htmlContent.title = JSON.stringify(jsonScope);
        htmlContent.style.color = "#a9014b";
        if (typeof liType.textContent !== "undefined") {
            htmlContent.textContent = nodeName;
            liType.textContent = jsonScope.nodeType;
            liValue.textContent = jsonScope.nodeValue;
        } else {
            htmlContent.innerText = nodeName;
            liType.innerText = jsonScope.nodeType;
            liValue.innerText = jsonScope.nodeValue;
        }
        liName.appendChild(htmlContent);
        ul.appendChild(liName);

        htmlContent.onclick = function () {
            visual.toggleItemScopeView(liType);
        };
        liName.appendChild(ulType);
        ulType.appendChild(liType);

        //liType.appendChild(liChildren);
        var properties = jsonScope.children;
        for (var i = 0; i < properties.length; i++) {
            var property = properties[i];
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
        analyzedItemsFromItemList: function () {
            var analysisTab = visual.getDisplay("analysis");
            for (var i = 0; i < analyzer.JSONRootItemScopeList.length; i++) {
                var item = analyzer.JSONRootItemScopeList[i];
                var htmlUl = visual.createHTMLFromJSONScope(item);
                analysisTab.appendChild(htmlUl);
            }
        },
        mappedPossibleConnections: function () {
            var mappingTab = visual.getDisplay("mapping");
            Object.keys(analyzer.possibleItemScopeRelationHash).forEach(function (possibleJoinedScopeRelationId) {
                var possibleJoinedScopeRelationIds = possibleJoinedScopeRelationId.split('-');
                var possiblePropertyRelationList = analyzer.possibleItemScopeRelationHash[possibleJoinedScopeRelationId];
                for (var i = 0; i < possiblePropertyRelationList.length; i++) {

                    var possiblePropertyRelationIds = possiblePropertyRelationList[i].split('-');
                    var itemScopePropertyConnectionReason = document.createElement("div");
                    var JSONItemScope1 = analyzer.jsonHash[possibleJoinedScopeRelationIds[0]];
                    var JSONItemScope2 = analyzer.jsonHash[possibleJoinedScopeRelationIds[1]];
                    for (var j = 0; j < JSONItemScope1.children.length; j++) {
                        var property = JSONItemScope1.children[j];
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
                    mappingTab.appendChild(box);
                }
            });
        },
        semanticMapping: function () {
            var mappingTab = visual.getDisplay("semanticInfo");

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
                            firstItemScopeTD.width = "33%";
                            connectionTD.width = "33%";
                            secondItemScopeTD.width = "33%";

                            connectionTable.appendChild(connectionTR);
                            connectionTR.appendChild(firstItemScopeTD);
                            connectionTR.appendChild(connectionTD);
                            connectionTR.appendChild(secondItemScopeTD);

                            var firstItemScopeUL = visual.createHTMLFromJSONScope(analyzer.jsonHash[firstItemScopeId]);
                            var secondItemScopeUL = visual.createHTMLFromJSONScope(analyzer.jsonHash[secondItemScopeId]);
                            var propertyTitleList = "";
                            var countedPropertyCount = 0;
                            for (var k = 0; k < propertyConnections.length; k++) {
                                var propertyConnectionId = propertyConnections[k].split("-")[0];
                                var propertyObject = analyzer.jsonHash[firstItemScopeId].children[propertyConnectionId];
                                if (propertyObject.nodeName !== "thumbnailUrl" && propertyObject.nodeName !== "url" && propertyObject['nodeName'] !== "image") {
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
                            connectionTD.appendChild(connectionLink);

                            connectionLink.title = propertyTitleList;
                            if (firstItemScopeCount === 0) {
                                firstItemScopeTD.appendChild(firstItemScopeUL);
                            }
                            firstItemScopeCount++;
                            connectionTD.appendChild(connectionLink);
                            secondItemScopeTD.appendChild(secondItemScopeUL);
                            box.appendChild(connectionTable);
                        }
                    }
                    //var htmlUl1 = visual.createHTMLFromJSONScope(analyzer.jsonHash[itemScopeIds[i]]);
                    //box.appendChild(htmlUl1);
                }

                mappingTab.appendChild(box);

            });
        }
    },

    /**
     * creates the analyzer display and returns the wanted display tab
     * @param name : id of display tab div as string
     * @returns {HTMLElement}
     */

    getDisplay: function (name) {
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

            var analysisTab = document.createElement("div");
            analysisTab.id = "analysis";
            analysisTab.style.width = "100%";
            analysisTab.style.height = "779px";
            analysisTab.style.overflowY = "auto";
            analysisTab.style.borderTop = "1px solid black";
            analysisTab.style.background = "white";
            analysisTab.style.top = "20px";
            analysisTab.style.right = "0";
            analysisTab.style.backgroundColor = "#2daebf";
            analysisTab.style.display = 'none';

            var mappingTab = document.createElement("div");
            mappingTab.id = "mapping";
            mappingTab.style.width = "100%";
            mappingTab.style.height = "779px";
            mappingTab.style.overflowY = "auto";
            mappingTab.style.borderTop = "1px solid black";
            mappingTab.style.background = "white";
            mappingTab.style.top = "20px";
            mappingTab.style.right = "0";
            mappingTab.style.backgroundColor = "#91bd09";
            mappingTab.style.display = 'none';

            var semanticInfo = document.createElement("div");
            semanticInfo.id = "semanticInfo";
            semanticInfo.style.width = "100%";
            semanticInfo.style.height = "779px";
            semanticInfo.style.overflowY = "auto";
            semanticInfo.style.borderTop = "1px solid black";
            semanticInfo.style.background = "white";
            semanticInfo.style.top = "20px";
            semanticInfo.style.right = "0";
            semanticInfo.style.backgroundColor = "#ffb515";
            semanticInfo.style.display = 'none';

            var b0 = document.createElement("div");
            var b1 = document.createElement("div");
            var b2 = document.createElement("div");
            var b3 = document.createElement("div");
            b0.style.paddingLeft = "20px";
            b0.style.float = "left";
            //b0.style.backgroundColor = "#2daebf";
            b0.style.height = "20px";

            b1.style.paddingLeft = "20px";
            b1.style.float = "left";
            b1.style.backgroundColor = "#2daebf";
            b1.style.height = "20px";
            b1.style.display = "none";

            b2.style.paddingLeft = "20px";
            b2.style.float = "left";
            b2.style.backgroundColor = "#91bd09";
            b2.style.height = "18px";
            b2.style.display = "none";

            b3.style.paddingLeft = "20px";
            b3.style.float = "left";
            b3.style.backgroundColor = "#ffb515";
            b3.style.height = "18px";
            b3.style.display = "none";

            if (typeof b1.textContent !== "undefined") {
                b0.textContent = "semanticWindow";
                b1.textContent = "analysis";
                b2.textContent = "mapping";
                b3.textContent = "schemaInfo";
            } else {
                b0.innerText = "semanticWindow";
                b1.innerText = "analysis";
                b2.innerText = "mapping";
                b3.innerText = "schemaInfo";
            }
            b0.onclick = function () {
                var container = document.getElementById("semantic_container");
                if (container.style.width === "150px") {
                    container.style.width = "1024px";
                    container.style.height = "800px";
                    b1.style.display = 'block';
                    b2.style.display = 'block';
                    b3.style.display = 'block';
                    analysisTab.style.display = 'block';

                } else {
                    container.style.width = "150px";
                    container.style.height = "30px";
                    b1.style.display = 'none';
                    b2.style.display = 'none';
                    b3.style.display = 'none';
                    analysisTab.style.display = 'none';
                    mappingTab.style.display = 'none';
                    semanticInfo.style.display = 'none';

                }
            };
            b1.onclick = function () {
                var a = document.getElementById("analysis");
                a.style.display = 'block';
                b1.style.height = "20px";
                var b = document.getElementById("mapping");
                b.style.display = 'none';
                b2.style.height = "18px";
                var c = document.getElementById("semanticInfo");
                c.style.display = 'none';
                b3.style.height = "18px";
            };
            b2.onclick = function () {
                var a = document.getElementById("analysis");
                a.style.display = 'none';
                b1.style.height = "18px";
                var b = document.getElementById("mapping");
                b.style.display = 'block';
                b2.style.height = "20px";
                var c = document.getElementById("semanticInfo");
                c.style.display = 'none';
                b3.style.height = "18px";
            };
            b3.onclick = function () {
                var a = document.getElementById("analysis");
                a.style.display = 'none';
                b1.style.height = "18px";
                var b = document.getElementById("mapping");
                b.style.display = 'none';
                b2.style.height = "18px";
                var c = document.getElementById("semanticInfo");
                c.style.display = 'block';
                b3.style.height = "20px";
            };
            display.appendChild(b0);
            display.appendChild(b1);
            display.appendChild(b2);
            display.appendChild(b3);
            display.appendChild(analysisTab);
            display.appendChild(mappingTab);
            display.appendChild(semanticInfo);

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
        localStorage.setItem("relationBetweenItemScopesAndTheirContainedItemScopes", JSON.stringify([]));
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
        analyzer.relationBetweenItemScopesAndTheirContainedItemScopes = JSON.parse(localStorage.getItem("relationBetweenItemScopesAndTheirContainedItemScopes")) || [];
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
        localStorage.setItem("relationBetweenItemScopesAndTheirContainedItemScopes", JSON.stringify(analyzer.relationBetweenItemScopesAndTheirContainedItemScopes));
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
    mapping: function(){
        console.log("START mapping");
        console.log("-------------");
        console.time('mapping');
        console.log("mappping : find connections between references");
        analyzer.mapAllForSemanticReference();
        console.timeEnd('mapping');
        console.log("-----------");
        console.log("END mapping");

    },
    rendering : function(){
        console.log("START rendering");
        console.log("---------------");
        console.time('rendering');
        console.time('analyzedItemsFromItemList');
        visual.render.analyzedItemsFromItemList();
        console.timeEnd('analyzedItemsFromItemList');
        console.time('mappedPossibleConnections');
        visual.render.mappedPossibleConnections();
        console.timeEnd('mappedPossibleConnections');
        console.time('semanticMapping');
        visual.render.semanticMapping();
        console.timeEnd('semanticMapping');
        console.timeEnd('rendering');
        console.log("-------------");
        console.log("END rendering");
    },
    localStorageToJavaScript: function(){
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
    toLowerCaseTrimmedSpaces:function(string){
        return string.toLowerCase().replace(/\s+/g,' ').replace(/^\s+|\s+$/,'')
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
                                                    if (currentChildren[j]['nodeName'] === "thumbnailUrl" || currentChildren[j]['nodeName'] === "url" || currentChildren[j]['nodeName'] === "image") {
                                                        duplicatePropertyCount += 1;
                                                    } else {
                                                        for (var k = 0; k < sLength; k++) {
                                                            if (currentChildren[j]['nodeName'] === storageChildren[k]['nodeName']) {
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
    }

};
run.run();