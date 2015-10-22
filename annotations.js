// ==UserScript==
// @name         Semantic annotation aggregation Browser
// @namespace    http://your.homepage/
// @version      1.0
// @description  Scan webpages for semantic structure as provided by Schema.org, interconnect found semantic information, and make them available through browser
// @author       Hannes Rammer
// @match
// @grant        none
// ==/UserScript==
var analyzer = {
    timesTaken: "",
    percent: 50,
    itemScopesToContainedItemScopes: {},
    withIncludedProperties: true,
    specialIdList: [],
    JSONRootItemScopeList: [],
    HTMLRootItemScopeList: [],
    itemScopeIdList: [],
    jsonHash: {},
    possibleItemScopeRelationHash: [],
    possibleItemScopeRelationHashWithT: [],
    directCrossConnectionToItemScopeHash: {},
    directItemScopeToCrossConnectionHash: {},
    directCrossConnectionToItemScopeHashWithT: {},
    directItemScopeToCrossConnectionHashWithT: {},
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

                    var isPlural = helper.isPlural(cNodeName, sNodeName);
                    var createConnection = (emptyName || sameName);//&& isPlural;
                    //do not create relations for plurals eg connecting all actors of an actor list to the list and therefore to each other

                    if (createConnection) {
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
                        //if (currentItemChildNodeName !== "thumbnailUrl" && currentItemChildNodeName !== "url" && currentItemChildNodeName !== "image" && currentItemChildNodeName !== "provider") {
                        if (currentItemChildNodeName !== "thumbnailUrl" && currentItemChildNodeName !== "image" && currentItemChildNodeName !== "provider") {
                            if (currentItemChildNodeName === storageItemChild['nodeName']) {
                                var cleanCurrentString = helper.toLowerCaseTrimmedSpaces(currentItemChild['nodeValue']);
                                var cleanStorageString = helper.toLowerCaseTrimmedSpaces(storageItemChild['nodeValue']);
                                if (cleanCurrentString !== "" && cleanCurrentString === cleanStorageString) {
                                    //Sort numbers in an array in ascending order
                                    var sortedScopeConnectionIds = helper.sortAscending([currentItem.scopeId, storageItem.scopeId]);
                                    var propertyConnectionIds = [];
                                    if (sortedScopeConnectionIds[0] === currentItem.scopeId) {
                                        propertyConnectionIds = [currentItemChild['propertyId'], storageItemChild['propertyId']];
                                    } else {
                                        propertyConnectionIds = [storageItemChild['propertyId'], currentItemChild['propertyId']];
                                    }
                                    var joinedScopeConnectionId = sortedScopeConnectionIds.join('-');
                                    var joinedPropertyConnectionId = propertyConnectionIds.join('-');
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
                                    analyzer.directCrossConnectionToItemScopeHash[currentCrossId] = helper.sortAscending(itemScopeIds);
                                    if (analyzer.possibleItemScopeRelationHash.hasOwnProperty(joinedScopeConnectionId)) {
                                        var possiblePropertyRelationList = analyzer.possibleItemScopeRelationHash[joinedScopeConnectionId];
                                        if (possiblePropertyRelationList.indexOf(joinedPropertyConnectionId) < 0) {
                                            possiblePropertyRelationList.push(joinedPropertyConnectionId);
                                        }
                                    } else {
                                        analyzer.possibleItemScopeRelationHash[joinedScopeConnectionId] = [joinedPropertyConnectionId];
                                    }
                                    ////////With Threshold
                                    var percents = helper.percents(currentItem, storageItem);
                                    if (percents[0] >= analyzer.percent || percents[1] >= analyzer.percent) {
                                        var currentCrossIdWithT = -1;
                                        var newCrossIdWithT = Object.keys(analyzer.directItemScopeToCrossConnectionHashWithT).length;
                                        var hasCurrentItemScopeIdWithT = analyzer.directItemScopeToCrossConnectionHashWithT.hasOwnProperty(currentItem.scopeId);
                                        var hasStorageItemScopeIdWithT = analyzer.directItemScopeToCrossConnectionHashWithT.hasOwnProperty(storageItem.scopeId);
                                        //find existing cross id
                                        if (hasCurrentItemScopeIdWithT) {
                                            currentCrossIdWithT = analyzer.directItemScopeToCrossConnectionHashWithT[currentItem.scopeId];
                                        } else {
                                            if (hasStorageItemScopeIdWithT) {
                                                currentCrossIdWithT = analyzer.directItemScopeToCrossConnectionHashWithT[storageItem.scopeId];
                                            }
                                        }
                                        if (currentCrossIdWithT === -1) {
                                            currentCrossIdWithT = newCrossIdWithT;
                                        }
                                        analyzer.directItemScopeToCrossConnectionHashWithT[currentItem.scopeId] = currentCrossIdWithT;
                                        analyzer.directItemScopeToCrossConnectionHashWithT[storageItem.scopeId] = currentCrossIdWithT;
                                        var hasCurrentCrossConnectionIdWithT = analyzer.directCrossConnectionToItemScopeHashWithT.hasOwnProperty(currentCrossIdWithT.toString());
                                        var itemScopeIdsWithT = analyzer.directCrossConnectionToItemScopeHashWithT[currentCrossIdWithT];
                                        if (hasCurrentCrossConnectionIdWithT) {
                                            if (itemScopeIdsWithT.indexOf(currentItem.scopeId) < 0) {
                                                itemScopeIdsWithT.push(currentItem.scopeId);
                                            }
                                            if (itemScopeIdsWithT.indexOf(storageItem.scopeId) < 0) {
                                                itemScopeIdsWithT.push(storageItem.scopeId);
                                            }
                                        } else {
                                            itemScopeIdsWithT = [currentItem.scopeId, storageItem.scopeId];
                                        }
                                        analyzer.directCrossConnectionToItemScopeHashWithT[currentCrossIdWithT] = helper.sortAscending(itemScopeIdsWithT);
                                        if (analyzer.possibleItemScopeRelationHashWithT.hasOwnProperty(joinedScopeConnectionId)) {
                                            var possiblePropertyRelationListWithT = analyzer.possibleItemScopeRelationHashWithT[joinedScopeConnectionId];
                                            if (possiblePropertyRelationListWithT.indexOf(joinedPropertyConnectionId) < 0) {
                                                possiblePropertyRelationListWithT.push(joinedPropertyConnectionId);
                                            }
                                        } else {
                                            analyzer.possibleItemScopeRelationHashWithT[joinedScopeConnectionId] = [joinedPropertyConnectionId];
                                        }
                                    }
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
            currentItemCount += 1;
        });
    },

    transformHTMLItemScopeToJSON: function (itemScope, scopeId) {
        var jsonScope = analyzer.newJSONTreeNode();
        if (analyzer.itemScopeIdList.indexOf(scopeId) > -1) {
            console.log("duplicate Scope Id -> something went wrong");
        }
        jsonScope.scopeId = scopeId;
        jsonScope.nodeSource = helper.cleanUrl(document.location.toString());
        jsonScope.nodeType = itemScope.getAttribute("itemtype");
        if (itemScope.getAttribute("itemprop") !== null) {
            jsonScope.nodeName = itemScope.getAttribute("itemprop");
        }
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
                        propertyValue = "#";//HTMLItemScopeProperty.src;
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
                    propertyValue = helper.toLowerCaseTrimmedSpaces(propertyValue);

                    if (propertyValue.indexOf("http://") > -1 || propertyValue.indexOf("https://") > -1) {
                        propertyValue = helper.cleanUrl(propertyValue);
                    }
                    jsonProp.nodeValue = propertyValue;
                    jsonProp.valueType = valueType;
                    jsonScope.children.push(jsonProp);
                }
            }
        }
        if (helper.objectDoesNotExist(jsonScope)) {
            var scopeId = jsonScope.scopeId;
            if (analyzer.jsonHash.hasOwnProperty(scopeId)) {
            } else {
                analyzer.jsonHash[scopeId] = jsonScope;
            }
            if (analyzer.itemScopeIdList.indexOf(scopeId) == -1) {
                analyzer.itemScopeIdList.push(scopeId);
            }
            for (var j = 0; j < jsonScope.children.length; j++) {
                var jsonScopeProperty = jsonScope.children[j];
                if (jsonScopeProperty.scopeId !== undefined) {
                    var propertyScopeId = jsonScopeProperty.scopeId;
                    if (analyzer.itemScopeIdList.indexOf(propertyScopeId) == -1) {
                        analyzer.itemScopeIdList.push(propertyScopeId);
                    }
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
                    if (analyzer.jsonHash.hasOwnProperty(propertyScopeId)) {

                    } else {
                        analyzer.jsonHash[propertyScopeId] = jsonScopeProperty;
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
        if (jsonScope === undefined) {
            console.log("something went wrong: undefined jsonSope");
        }
        var ul = document.createElement("ul");
        var ulType = document.createElement("ul");
        var liType = document.createElement("li");
        var liName = document.createElement("li");
        var liValue = document.createElement("li");
        ul.style.margin = "0";
        ul.style.padding = "5px 15px";
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
        browserLink.style.cursor = "pointer";
        //htmlContent.title = "ItemScopeId:" + jsonScope.scopeId;
        htmlContent.title = JSON.stringify(jsonScope);
        htmlContent.style.color = "#a9014b";
        htmlContent.style.fontWeight = "bold";
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
        var properties = jsonScope.children;
        var newScope = true;
        for (var i = 0; i < properties.length; i++) {
            var property = properties[i];
            if (property.nodeName === "name" && newScope) {
                if (nodeName.indexOf("actors") === -1) {
                    if (typeof browserLink.textContent !== "undefined") {
                        browserLink.textContent += property.nodeValue;
                    } else {
                        browserLink.innerText += property.nodeValue;
                    }
                }
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
                    img.src = "#";//property.nodeValue;
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
        return ul;
    },

    /**
     * function used on scope Elements liType div onclick function to toggle display properties
     * @param li
     */
    toggleItemScopeView: function (li) {
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
                            firstItemScopeTD.width = "37%";
                            connectionTD.width = "26%";
                            secondItemScopeTD.width = "37%";
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
                            //div1.style.width = "400px";
                            //div2.style.width = "400px";
                            div1.style.maxHeight = "200px";
                            div2.style.maxHeight = "200px";
                            var firstItem = analyzer.jsonHash[firstItemScopeId];
                            var secondItem = analyzer.jsonHash[secondItemScopeId];
                            var firstItemScopeUL = visual.createHTMLFromJSONScope(firstItem);
                            var secondItemScopeUL = visual.createHTMLFromJSONScope(secondItem);
                            div1.appendChild(firstItemScopeUL);
                            div2.appendChild(secondItemScopeUL);
                            var propertyTitleList = "";
                            var countedPropertyCount = 0;
                            for (var k = 0; k < propertyConnections.length; k++) {
                                var propertyConnectionId = propertyConnections[k].split("-")[0];
                                var propertyObject = analyzer.jsonHash[firstItemScopeId].children[propertyConnectionId];
                                var propertyObjectNodeName = propertyObject['nodeName'];
                                //if (propertyObjectNodeName !== "thumbnailUrl" && propertyObjectNodeName !== "url" && propertyObjectNodeName !== "image" && propertyObjectNodeName !== "provider") {
                                if (propertyObjectNodeName !== "thumbnailUrl" && propertyObjectNodeName !== "image" && propertyObjectNodeName !== "provider") {
                                    countedPropertyCount++;
                                    propertyTitleList += propertyObject.nodeName + " : " + propertyObject.nodeValue + "\n";
                                }
                            }
                            var perc1 = ((100 / firstItem.children.length ) * countedPropertyCount).toFixed(2);
                            var perc2 = ((100 / secondItem.children.length ) * countedPropertyCount).toFixed(2);
                            var connectionLink = document.createElement("a");
                            var connectionLinkText = "<b>" + perc1 + "%</b> " + countedPropertyCount + "connection";
                            if (propertyConnections.length !== 1) {
                                connectionLinkText += "s";
                            }
                            connectionLinkText += " <b>" + perc2 + "%</b>";
                            connectionLink.innerHTML = connectionLinkText;
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
                }
                directCrossConnectionBox.appendChild(box);
            });
        },
        relationsForItemScope: function (itemScope) {
            var browserBox = visual.getDisplay("Browser");
            var listManager = [];
            browserBox.innerHTML = "";
            helper.toggleTab("Browser");
            var itemScopeId = itemScope.scopeId;
            //render direct connection
            visual.render.renderBox(browserBox, itemScopeId, "direct_connection", 100, listManager);
            //render cross connection
            var hasCrossConnection = analyzer.directItemScopeToCrossConnectionHashWithT.hasOwnProperty(itemScopeId);
            if (hasCrossConnection) {
                var crossConnectionId = analyzer.directItemScopeToCrossConnectionHashWithT[itemScopeId];
                var itemScopeIdList = analyzer.directCrossConnectionToItemScopeHashWithT[crossConnectionId];
                var listLength = itemScopeIdList.length;
                for (var i = 0; i < listLength; i++) {
                    var percents = helper.percents(itemScope, analyzer.jsonHash[itemScopeIdList[i]]);
                    if (percents[0] >= analyzer.percent || percents[1] >= analyzer.percent) {
                        visual.render.renderBox(browserBox, itemScopeIdList[i], "cross_connection", percents[1], listManager);
                    }
                }
            }
        },
        renderBox: function (browserBox, itemScopeId, name, percent, listManager) {
            var innerBox = document.createElement("div");
            innerBox.style.border = "1px dotted black";
            var outerBox = document.createElement("div");
            outerBox.style.border = "1px solid black";
            var itemScope = analyzer.jsonHash[itemScopeId];
            //browserBox.appendChild(visual.createHTMLFromJSONScope(itemScope));
            if (typeof innerBox.textContent !== "undefined") {
                innerBox.textContent = name + " " + percent + "%";//+ " via :";
            } else {
                innerBox.innerText = name + " " + percent + "%";//+ " via :";
            }
            outerBox.appendChild(visual.createHTMLFromJSONScope(itemScope));
            outerBox.appendChild(innerBox);
            var directRelations = analyzer.itemScopesToContainedItemScopes[itemScopeId];
            if (directRelations !== undefined) {
                for (var j = 0; j < directRelations.length; j++) {
                    var relItemScope = analyzer.jsonHash[directRelations[j]];
                    if (relItemScope !== undefined) {
                        if (listManager.indexOf(relItemScope.scopeId) < 0) {
                            listManager.push(relItemScope.scopeId);
                            var relItemScopeUL = visual.createHTMLFromJSONScope(relItemScope);
                            innerBox.appendChild(relItemScopeUL);
                        }
                    }
                }
            }
            if (typeof innerBox.textContent !== "undefined") {
                if (innerBox.textContent !== "cross_connection " + percent + "%") {
                    browserBox.appendChild(outerBox);
                }
            } else {
                if (innerBox.innerText !== "cross_connection " + percent + "%") {
                    browserBox.appendChild(outerBox);
                }
            }
        }
    },

    /**
     * creates the analyzer display and returns the wanted display tab
     * @param nameVar : id of display tab div as string
     * @returns {HTMLElement}
     */
    getDisplay: function (nameVar) {
        var name = nameVar + "Box";
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
            display.style.zIndex = "9999999999";
            display.style.fontSize = "16px";
            display.style.fontFamily = "monospace";
            //display.style.fontWeight = "bold";

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
                    directConnectionButton.style.display = 'none';
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
        localStorage.setItem("possibleItemScopeRelationHashWithT", JSON.stringify({}));
        localStorage.setItem("directCrossConnectionToItemScopeHash", JSON.stringify({}));
        localStorage.setItem("directItemScopeToCrossConnectionHash", JSON.stringify({}));
        localStorage.setItem("directCrossConnectionToItemScopeHashWithT", JSON.stringify({}));
        localStorage.setItem("directItemScopeToCrossConnectionHashWithT", JSON.stringify({}));

    },
    /**
     * load the local storage into the JavaScript environment as JSON objects
     * eg: done before every web page is loaded
     */
    readFromLocalStorage: function () {
        analyzer.jsonHash = JSON.parse(localStorage.getItem("jsonHash")) || {};
        analyzer.itemScopeIdList = JSON.parse(localStorage.getItem("itemScopeIdList")) || [];
        analyzer.itemScopesToContainedItemScopes = JSON.parse(localStorage.getItem("itemScopesToContainedItemScopes")) || {};
        analyzer.possibleItemScopeRelationHash = JSON.parse(localStorage.getItem("possibleItemScopeRelationHash")) || {};
        analyzer.possibleItemScopeRelationHashWithT = JSON.parse(localStorage.getItem("possibleItemScopeRelationHashWithT")) || {};
        analyzer.directCrossConnectionToItemScopeHash = JSON.parse(localStorage.getItem("directCrossConnectionToItemScopeHash")) || {};
        analyzer.directItemScopeToCrossConnectionHash = JSON.parse(localStorage.getItem("directItemScopeToCrossConnectionHash")) || {};
        analyzer.directCrossConnectionToItemScopeHashWithT = JSON.parse(localStorage.getItem("directCrossConnectionToItemScopeHashWithT")) || {};
        analyzer.directItemScopeToCrossConnectionHashWithT = JSON.parse(localStorage.getItem("directItemScopeToCrossConnectionHashWithT")) || {};
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
        localStorage.setItem("possibleItemScopeRelationHashWithT", JSON.stringify(analyzer.possibleItemScopeRelationHashWithT));
        localStorage.setItem("directCrossConnectionToItemScopeHash", JSON.stringify(analyzer.directCrossConnectionToItemScopeHash));
        localStorage.setItem("directItemScopeToCrossConnectionHash", JSON.stringify(analyzer.directItemScopeToCrossConnectionHash));
        localStorage.setItem("directCrossConnectionToItemScopeHashWithT", JSON.stringify(analyzer.directCrossConnectionToItemScopeHashWithT));
        localStorage.setItem("directItemScopeToCrossConnectionHashWithT", JSON.stringify(analyzer.directItemScopeToCrossConnectionHashWithT));
    }
};
var helper = {
    isPlural: function (cName, sName) {
        var isPlural = false;
        if (cName + "s" === sName || cName === sName + "s") {
            isPlural = true;
        }
        if (cName === "actors" || sName === "actors") {
            isPlural = true;
        }
        return isPlural;
    },
    percents: function (firstItem, secondItem) {
        var countedPropertyCount = 0;
        for (var i = 0; i < firstItem.children.length; i++) {
            var propertyObject1 = firstItem.children[i];
            var propertyObjectNodeName1 = propertyObject1['nodeName'];
            for (var j = 0; j < secondItem.children.length; j++) {
                var propertyObject2 = secondItem.children[j];
                var propertyObjectNodeName2 = propertyObject2['nodeName'];
                if (propertyObjectNodeName1 !== "thumbnailUrl" && propertyObjectNodeName1 !== "url" && propertyObjectNodeName1 !== "image" && propertyObjectNodeName1 !== "provider") {
                    if (propertyObjectNodeName2 !== "thumbnailUrl" && propertyObjectNodeName2 !== "image" && propertyObjectNodeName2 !== "provider") {
                        if (propertyObjectNodeName1 === propertyObjectNodeName2) {
                            if (propertyObject1['nodeValue'] === propertyObject2['nodeValue']) {
                                countedPropertyCount++;
                                break;
                            }
                        }
                    }
                }
            }
        }
        var perc1 = ((100 / firstItem.children.length ) * countedPropertyCount).toFixed(2);
        var perc2 = ((100 / secondItem.children.length ) * countedPropertyCount).toFixed(2);
        return [perc1, perc2];
    },
    toLowerCaseTrimmedSpaces: function (string) {
        return string.toLowerCase().replace(/\s+/g, ' ').replace(/^\s+|\s+$/, '');
    },
    cleanUrl: function (string) {
        var ignoredUrls = ["www.imdb.com/plugins", "www.imdb.com/offsite",
            "www.imdb.com/video", "www.imdb.com/language",
            "www.imdb.com/country", "www.imdb.com/search", "pro.imdb.com/signup"];
        for (var i = 0; i < ignoredUrls.length; i++) {
            if (string.indexOf(ignoredUrls[i]) > -1) {
                return "";
            }
        }
        if (string.indexOf("//www.imdb.com/") > -1) {
            //remove unnecessary reference from link to improve mapping of person instances
            var splitUrl = string.split("?");
            string = splitUrl[0];
        }
        return string;
    },
    objectDoesNotExist: function (currentItem) {
        var doesNotExists = true;
        var currentItemKeys = Object.keys(analyzer.jsonHash);
        for (var x = 0; x < currentItemKeys.length; x++) {
            var currentItemKey = currentItemKeys[x];
            var storageItem = analyzer.jsonHash[currentItemKey];
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
                                                    if (currentChildNodeName === "thumbnailUrl" || currentChildNodeName === "image" || currentChildNodeName === "provider") {
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
                            }
                        }
                    }
                }
            }
        }
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
var run = {
    run: function (auto, analyze, map, render) {
        console.time('run');
        if (analyze) {
            run.localStorageToJavaScript();
            run.analysis();
            run.javaScripToLocalStorage();
        }
        if (map) {
            run.localStorageToJavaScript();
            run.mapping();
            run.javaScripToLocalStorage();
        }
        if (render) {
            run.localStorageToJavaScript();
            run.rendering();
        }
        if (auto) {
            automatize.extractMovieFromIMDB();
        }
        console.timeEnd('run');
        return false;
    },
    analysis: function () {
        console.log("START analysis");
        console.log("--------------");
        console.time('analysis');
        console.log("analyzing : extracting data from webpage");
        analyzeRunStart = new Date().getTime().toString();
        analyzer.extract.JSONRootItemScopesFromWebpage(analyzer.extract.helper.HTMLRootItemScopesFromWebpage());
        analyzeRunEnd = new Date().getTime().toString();
        analyzer.timesTaken += "analyze" + (analyzeRunEnd - analyzeRunStart).toFixed(2) + "ms ";
        console.timeEnd('analysis');
        console.log("------------");
    },
    mapping: function () {
        console.log("START mapping");
        console.log("-------------");
        console.log("mappping : find connections between references");
        var mapRunStart = new Date().getTime().toString();
        analyzer.mapAllForSemanticReference();
        var mapRunEnd = new Date().getTime().toString();
        analyzer.timesTaken += "map" + (mapRunEnd - mapRunStart).toFixed(2) + "ms ";
        console.log("-----------");
    },
    rendering: function () {
        console.log("START rendering");
        console.log("---------------");
        console.time('rendering');
        var renderRunStart = new Date().getTime().toString();
        console.time('currentWebPageItems');
        visual.render.currentWebPageItems();
        console.timeEnd('currentWebPageItems');
        //console.time('directConnections');
        //visual.render.directConnections();
        //console.timeEnd('directConnections');
        console.time('directCrossConnection');
        visual.render.directCrossConnection();
        console.timeEnd('directCrossConnection');
        var renderRunEnd = new Date().getTime().toString();
        analyzer.timesTaken += "render" + (renderRunEnd - renderRunStart).toFixed(2) + "ms ";
        console.timeEnd('rendering');
        console.log("-------------");
    },
    localStorageToJavaScript: function () {
        console.log("START : read from LocalStorage store in JS");
        var loadRunStart = new Date().getTime().toString();
        storage.readFromLocalStorage();
        var loadRunEnd = new Date().getTime().toString();
        analyzer.timesTaken += "load" + (loadRunEnd - loadRunStart).toFixed(2) + "ms ";
        console.log("END : read from LocalStorage store in JS");
    },
    javaScripToLocalStorage: function () {
        console.log("START : update LocalStorage from code");
        storeRunStart = new Date().getTime().toString();
        storage.writeToLocalStorage();
        storeRunEnd = new Date().getTime().toString();
        analyzer.timesTaken += "store" + (storeRunEnd - storeRunStart).toFixed(2) + "ms ";
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

var automatize = {
    IMDB: {},
    count: 0,
    extractMovieFromIMDB: function () {
        automatize.IMDB = JSON.parse(localStorage.getItem("SemanticIMDB")) || {};
        var url = "http://www.imdb.com/title/";
        if (document.location.href.indexOf(url) > -1) {
            var split = document.location.href.split("/tt");
            var currentId = parseInt(split[1]);
            var lastVisited = 87331;
            if (automatize.IMDB[url] === undefined) {
                automatize.IMDB[url] = {};
            }
            if (automatize.IMDB[url]["tt"] === undefined) {
                automatize.IMDB[url]["tt"] = {};
            }
            if (automatize.IMDB["count"] === undefined) {
                automatize.IMDB["count"] = 0;
            }
            if (automatize.IMDB[url]["lastVisited"] !== undefined) {
                lastVisited = automatize.IMDB[url]["lastVisited"];
            }
            var nextVisit = lastVisited + 1;
            if (currentId == nextVisit) {
                automatize.IMDB["count"] = 0;//reset count
                automatize.IMDB[url]["lastVisited"] = currentId;
                automatize.IMDB[url]["tt"][currentId] = analyzer.timesTaken;
                localStorage.setItem("SemanticIMDB", JSON.stringify(automatize.IMDB));
                document.location.href = url + "tt" + (currentId + 1) + "/";
            } else {
                automatize.IMDB["count"] += 1;//reset count
                if (automatize.IMDB["count"] == 2) {
                    automatize.IMDB[url]["lastVisited"] = nextVisit;
                    automatize.IMDB["count"] = 0;
                }
                localStorage.setItem("SemanticIMDB", JSON.stringify(automatize.IMDB));
                var finalUrl = url + "tt" + nextVisit + "/";
                document.location = finalUrl;
            }
        }
    }
};
//automatize,analyze,map,render
//run.run(true, true, false, false);//automatic IMDB
//run.run(false, true, false, false);//analyze
//run.run(false, false, true, false);//map
//run.run(false, false, false, true);//render
run.run(false, true, true, true);//all