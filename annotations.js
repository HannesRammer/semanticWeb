var analyzer = {
    JSONRootItemScopeList: [],
    HTMLRootItemScopeList: [],
    itemScopeIDList: [],
    crossConnectionIDList: [],
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

        JSONRootItemScopesFromWebpage: function () {
            var HTMLRootItemScopes = analyzer.extract.helper.HTMLRootItemScopesFromWebpage();
            for (var i = 0; i < HTMLRootItemScopes.length; i++) {
                var HTMLRootItemScope = HTMLRootItemScopes[i];
                var jsonJSTreeJsonScope = analyzer.transformHTMLItemScopeToJSON(HTMLRootItemScope, analyzer.itemScopeIDList.length);
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
            if (currentItem['nodeSource'] != storageItem['nodeSource']) {
                if (currentItem['nodeType'] == storageItem['nodeType']) {
                    //when same name -> check fore more similarities
                    if (currentItem['nodeName'] == "" || storageItem['nodeName'] == "" || currentItem['nodeName'] == storageItem['nodeName']) {
                        //when same value -> check fore more similarities
                        if (currentItem['nodeValue'] == storageItem['nodeValue']) {
                            if ((currentItem.children != undefined) && ( storageItem.children != undefined)) {
                                for (var k = 0; k < currentItem.children.length; k++) {
                                    var currentItemChild = currentItem.children[k];
                                    for (var l = 0; l < storageItem.children.length; l++) {
                                        var storageItemChild = storageItem.children[l];
                                        if (storageItemChild != undefined) {
                                            if (currentItemChild['nodeName'] != "thumbnailUrl" && currentItemChild['nodeName'] != "url") {
                                                if (currentItemChild['nodeName'] == storageItemChild['nodeName']) {
                                                    if (currentItemChild['nodeValue'] != "" && currentItemChild['nodeValue'] == storageItemChild['nodeValue']) {
                                                        //Sort numbers in an array in ascending order
                                                        var sortedScopeConnectionIDs = helper.sortAscending([currentItem.scopeID, storageItem.scopeID]);

                                                        //TODO
                                                        var propertyConnectionIDs = [];
                                                        if (sortedScopeConnectionIDs[0] === currentItem.scopeID) {
                                                            propertyConnectionIDs = [currentItemChild['propertyID'], storageItemChild['propertyID']];
                                                        } else {
                                                            propertyConnectionIDs = [storageItemChild['propertyID'], currentItemChild['propertyID']];
                                                        }
                                                        var joinedScopeConnectionID = sortedScopeConnectionIDs.join('-');
                                                        var joinedPropertyConnectionID = propertyConnectionIDs.join('-');

                                                        //add to list if not already exists
                                                        /**first if should not happen due tu differend source
                                                         * if (analyzer.relationBetweenItemScopesAndTheirContainedItemScopes.indexOf(joinedScopeConnectionID) < 0 && analyzer.possibleItemScopeRelationList.indexOf(joinedScopeConnectionID) < 0) {
                                                                analyzer.possibleItemScopeRelationList.push(joinedScopeConnectionID);
                                                            }**/
                                                        //NEW
                                                        var currentCrossId = -1;
                                                        var newCrossId = Object.keys(analyzer.directItemScopeToCrossConnectionHash).length;
                                                        var length = Object.keys(analyzer.directItemScopeToCrossConnectionHash).length;
                                                        var hasCurrentItemScopeId = analyzer.directItemScopeToCrossConnectionHash.hasOwnProperty(currentItem.scopeID);
                                                        var hasStorageItemScopeId = analyzer.directItemScopeToCrossConnectionHash.hasOwnProperty(storageItem.scopeID);
                                                        //find existing cross id
                                                        if (hasCurrentItemScopeId) {
                                                            currentCrossId = analyzer.directItemScopeToCrossConnectionHash[currentItem.scopeID];
                                                        } else {
                                                            if (hasStorageItemScopeId) {
                                                                currentCrossId = analyzer.directItemScopeToCrossConnectionHash[storageItem.scopeID];
                                                            }
                                                        }

                                                        if (currentCrossId == -1) {
                                                            currentCrossId = newCrossId;
                                                        }
                                                        analyzer.directItemScopeToCrossConnectionHash[currentItem.scopeID] = currentCrossId;
                                                        analyzer.directItemScopeToCrossConnectionHash[storageItem.scopeID] = currentCrossId;

                                                        var hasCurrentCrossConnectionId = analyzer.directCrossConnectionToItemScopeHash.hasOwnProperty(currentCrossId.toString());
                                                        if (hasCurrentCrossConnectionId) {
                                                            var itemScopeIDs = analyzer.directCrossConnectionToItemScopeHash[currentCrossId];
                                                            if (itemScopeIDs.indexOf(currentItem.scopeID) < 0) {
                                                                itemScopeIDs.push(currentItem.scopeID);
                                                            }
                                                            if (itemScopeIDs.indexOf(storageItem.scopeID) < 0) {
                                                                itemScopeIDs.push(storageItem.scopeID);
                                                            }

                                                        } else {
                                                            analyzer.directCrossConnectionToItemScopeHash[currentCrossId] = [currentItem.scopeID, storageItem.scopeID];
                                                        }
                                                        if (analyzer.crossConnectionIDList.indexOf(currentCrossId) < 0) {
                                                            analyzer.crossConnectionIDList.push(currentCrossId);
                                                        }
                                                        if (analyzer.possibleItemScopeRelationHash.hasOwnProperty(joinedScopeConnectionID)) {
                                                            var possiblePropertyRelationList = analyzer.possibleItemScopeRelationHash[joinedScopeConnectionID];
                                                            if (possiblePropertyRelationList.indexOf(joinedPropertyConnectionID) < 0) {
                                                                possiblePropertyRelationList.push(joinedPropertyConnectionID);
                                                            }
                                                        } else {
                                                            analyzer.possibleItemScopeRelationHash[joinedScopeConnectionID] = [joinedPropertyConnectionID];
                                                        }
                                                    } else {

                                                    }
                                                }
                                            }
                                        }
                                    }

                                }
                            }
                        }
                    }
                }
            }

        });
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

    transformHTMLItemScopeToJSON: function (itemScope, scopeID) {

        var jsonScope = analyzer.newJSONTreeNode();

        if (analyzer.itemScopeIDList.indexOf(scopeID) > -1) {
            console.log("duplicate Scope ID -> something went wrong");
        }
        jsonScope.scopeID = scopeID;

        jsonScope.nodeSource = document.location.toString();
        jsonScope.nodeType = itemScope.getAttribute("itemtype");
        if (itemScope.getAttribute("itemprop") != null) {
            jsonScope.nodeName = itemScope.getAttribute("itemprop");
        }
        var HTMLItemScopeProperties = itemScope.querySelectorAll('[itemprop]');

        for (var i = 0; i < HTMLItemScopeProperties.length; i++) {
            var HTMLItemScopeProperty = HTMLItemScopeProperties[i];
            //if property is new scope
            if (HTMLItemScopeProperty.getAttribute("itemScope") != null) {
                analyzer.propertyScopeLength += 1;
                var propertyScope = analyzer.transformHTMLItemScopeToJSON(HTMLItemScopeProperty, analyzer.itemScopeIDList.length + analyzer.propertyScopeLength);
                propertyScope.propertyID = i;
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
                jsonProp.propertyID = i;
                jsonProp.nodeName = propertyName;
                jsonProp.nodeValue = propertyValue;
                jsonProp.valueType = valueType;
                jsonScope.children.push(jsonProp);
            }
        }
        if (helper.objectDoesNotExist(jsonScope)) {

            analyzer.jsonHash[scopeID] = jsonScope;
            analyzer.itemScopeIDList.push(scopeID);
            for (var j = 0; j < jsonScope.children.length; j++) {
                var jsonScopeProperty = jsonScope.children[j];
                if (jsonScopeProperty.scopeID != undefined) {
                    //Sort numbers in an array in ascending order
                    var itemScopeConnectionID = helper.sortAscending([jsonScope.scopeID, jsonScopeProperty.scopeID]);
                    var joinedItemScopeConnectionID = itemScopeConnectionID.join('_');
                    //add to list if not already exists
                    if (analyzer.relationBetweenItemScopesAndTheirContainedItemScopes.indexOf(joinedItemScopeConnectionID) < 0) {
                        analyzer.relationBetweenItemScopesAndTheirContainedItemScopes.push(joinedItemScopeConnectionID);
                    }
                }
            }
            analyzer.propertyScopeLength = 0;
        }
        return jsonScope;
    },
    newJSONTreeNode: function () {
        return {
            //id          : "string" // will be autogenerated if omitted
            nodeType: "", // node text
            nodeName: "",
            nodeValue: "",
            nodeSource: "",
            scopeID: undefined,
            propertyID: undefined,
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
        if (nodeName == "") {
            var splitList = jsonScope.nodeType.split("/");
            nodeName = splitList[splitList.length - 1];
        } else {

        }
        var htmlContent = document.createElement("a");
        htmlContent.style.cursor = "pointer";
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
            if (property.nodeType != "") {
                var htmlPropertyScope = visual.createHTMLFromJSONScope(property);
                liType.appendChild(htmlPropertyScope);
                console.log(htmlPropertyScope);
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
                if (property.valueType == "IMG") {
                    var img = document.createElement("IMG");
                    img.src = property.nodeValue;
                    //liPropValue.appendChild(img);
                    liPropName.appendChild(img);
                } else if (property.valueType == "A") {
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
            if (li.style.display == "none") {
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
            Object.keys(analyzer.possibleItemScopeRelationHash).forEach(function (possibleJoinedScopeRelationID) {
                var possibleJoinedScopeRelationIDs = possibleJoinedScopeRelationID.split('-');
                var possiblePropertyRelationList = analyzer.possibleItemScopeRelationHash[possibleJoinedScopeRelationID];
                for (var i = 0; i < possiblePropertyRelationList.length; i++) {

                    var possiblePropertyRelationIDs = possiblePropertyRelationList[i].split('-');
                    var itemScopePropertyConnectionReason = document.createElement("div");
                    var JSONItemScope1 = analyzer.jsonHash[possibleJoinedScopeRelationIDs[0]];
                    var JSONItemScope2 = analyzer.jsonHash[possibleJoinedScopeRelationIDs[1]];
                    for (var j = 0; j < JSONItemScope1.children.length; j++) {
                        var property = JSONItemScope1.children[j];
                        if (property['propertyID'] == parseInt(possiblePropertyRelationIDs[0])) {
                            if (typeof itemScopePropertyConnectionReason.textContent !== "undefined") {
                                itemScopePropertyConnectionReason.textContent = property.nodeName + " : " + property.nodeValue;
                            } else {
                                itemScopePropertyConnectionReason.innerText = property.nodeName + " : " + property.nodeValue;
                            }

                        }
                    }
                    var box = document.createElement("div");
                    box.style.border = "1px solid black";
                    box.style.maxHeight = "150px";
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


            Object.keys(analyzer.directCrossConnectionToItemScopeHash).forEach(function (directCrossConnectionID) {
                var box = document.createElement("div");
                box.style.border = "1px solid black";
                box.style.maxHeight = "150px";
                box.style.width = "100%";
                box.style.overflow = "auto";

                var itemScopeIDs = analyzer.directCrossConnectionToItemScopeHash[directCrossConnectionID];
                for (var i = 0; i < itemScopeIDs.length; i++) {
                    var htmlUl1 = visual.createHTMLFromJSONScope(analyzer.jsonHash[itemScopeIDs[i]]);
                    box.appendChild(htmlUl1);

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
        if (document.getElementById(name) == undefined) {
            var display = document.createElement("div");

            display.id = "container";
            display.style.width = "400px";
            display.style.height = "800px";
            display.style.overflow = "auto";
            display.style.position = "fixed";
            display.style.border = "1px solid black";
            display.style.background = "white";
            display.style.position = "fixed";
            display.style.top = "0";
            display.style.right = "0";
            display.style.zIndex = "999999";

            var analysisTab = document.createElement("div");
            analysisTab.id = "analysis";
            analysisTab.style.width = "400px";
            analysisTab.style.height = "780px";
            analysisTab.style.overflow = "auto";
            analysisTab.style.position = "fixed";
            analysisTab.style.border = "1px solid black";
            analysisTab.style.background = "white";
            analysisTab.style.position = "fixed";
            analysisTab.style.top = "20px";
            analysisTab.style.right = "0";
            analysisTab.style.backgroundColor = "#2daebf";
            analysisTab.style.display = 'block';

            var mappingTab = document.createElement("div");
            mappingTab.id = "mapping";
            mappingTab.style.width = "400px";
            mappingTab.style.height = "780px";
            mappingTab.style.overflow = "auto";
            mappingTab.style.position = "fixed";
            mappingTab.style.border = "1px solid black";
            mappingTab.style.background = "white";
            mappingTab.style.position = "fixed";
            mappingTab.style.top = "20px";
            mappingTab.style.right = "0";
            mappingTab.style.backgroundColor = "#91bd09";
            mappingTab.style.display = 'none';

            var semanticInfo = document.createElement("div");
            semanticInfo.id = "semanticInfo";
            semanticInfo.style.width = "400px";
            semanticInfo.style.height = "780px";
            semanticInfo.style.overflow = "auto";
            semanticInfo.style.position = "fixed";
            semanticInfo.style.border = "1px solid black";
            semanticInfo.style.background = "white";
            semanticInfo.style.position = "fixed";
            semanticInfo.style.top = "20px";
            semanticInfo.style.right = "0";
            semanticInfo.style.backgroundColor = "#ffb515";
            semanticInfo.style.display = 'none';

            var b1 = document.createElement("div");
            var b2 = document.createElement("div");
            var b3 = document.createElement("div");
            b1.style.paddingLeft = "20px";
            b1.style.float = "left";
            b1.style.backgroundColor = "#2daebf";
            b1.style.height = "20px";

            b2.style.paddingLeft = "20px";
            b2.style.float = "left";
            b2.style.backgroundColor = "#91bd09";
            b2.style.height = "18px";

            b3.style.paddingLeft = "20px";
            b3.style.float = "left";
            b3.style.backgroundColor = "#ffb515";
            b3.style.height = "18px";

            if (typeof b1.textContent !== "undefined") {
                b1.textContent = "analysis";
                b2.textContent = "mapping";
                b3.textContent = "schemaInfo";
            } else {
                b1.innerText = "analysis";
                b2.innerText = "mapping";
                b3.innerText = "schemaInfo";
            }
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
        localStorage.setItem("itemScopeIDList", JSON.stringify([]));
        localStorage.setItem("relationBetweenItemScopesAndTheirContainedItemScopes", JSON.stringify([]));
        localStorage.setItem("possibleItemScopeRelationHash", JSON.stringify({}));
        localStorage.setItem("directCrossConnectionToItemScopeHash", JSON.stringify({}));
        localStorage.setItem("directItemScopeToCrossConnectionHash", JSON.stringify({}));
        localStorage.setItem("directItemScopeToCrossConnectionHash", JSON.stringify({}));

    },

    /**
     * load the local storage into the JavaScript environment as JSON objects
     *
     * eg: done before every web page is loaded
     */
    readFromLocalStorage: function () {
        analyzer.jsonHash = JSON.parse(localStorage.getItem("jsonHash")) || {};
        analyzer.itemScopeIDList = JSON.parse(localStorage.getItem("itemScopeIDList")) || [];
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
        localStorage.setItem("itemScopeIDList", JSON.stringify(analyzer.itemScopeIDList));
        localStorage.setItem("relationBetweenItemScopesAndTheirContainedItemScopes", JSON.stringify(analyzer.relationBetweenItemScopesAndTheirContainedItemScopes));
        localStorage.setItem("possibleItemScopeRelationHash", JSON.stringify(analyzer.possibleItemScopeRelationHash));
        localStorage.setItem("directCrossConnectionToItemScopeHash", JSON.stringify(analyzer.directCrossConnectionToItemScopeHash));
        localStorage.setItem("directItemScopeToCrossConnectionHash", JSON.stringify(analyzer.directItemScopeToCrossConnectionHash));
    }
};

var run = {
    run: function () {
        run.analysis();
        run.updateLocalStorage();
    },
    analysis: function () {
        storage.readFromLocalStorage();
        analyzer.extract.JSONRootItemScopesFromWebpage();
        analyzer.mapAllForSemanticReference();
        visual.render.analyzedItemsFromItemList();
        visual.render.mappedPossibleConnections();
        visual.render.semanticMapping();
    },
    updateLocalStorage: function () {
        storage.writeToLocalStorage();
    },
    deleteLocalStorage: function () {
        storage.resetLocalStorage();
    }

};
var helper = {
    objectDoesNotExist: function (currentItem) {

        var doesNotExists = true;
        Object.keys(analyzer.jsonHash).forEach(function (currentItemKey) {
            var storageItem = analyzer.jsonHash[currentItemKey];
            //var currentItem = currentList[i];
            //when same source -> check fore more similarities
            if (currentItem != undefined && storageItem != undefined) {
                if (currentItem['nodeSource'] == storageItem['nodeSource']) {
                    //when same type -> compare properties
                    if (currentItem['nodeType'] == storageItem['nodeType']) {
                        //when same name -> check fore more similarities
                        if (currentItem['nodeName'] == storageItem['nodeName']) {
                            //when same value -> check fore more similarities
                            if (currentItem['nodeValue'] == storageItem['nodeValue']) {
                                //if children (properties) exist and are same length compare
                                if ((currentItem.children != undefined) && ( storageItem.children != undefined)) {
                                    var cLength = currentItem.children.length;
                                    var sLength = storageItem.children.length;

                                    if (cLength > 0 && sLength > 0) {
                                        if (cLength == sLength) {

                                            if (cLength == 1) {//nodeName == url and no name propertie exists
                                                if (currentItem.children[0].nodeType == storageItem.children[0].nodeType) {
                                                    if (currentItem.children[0].nodeName == storageItem.children[0].nodeName) {
                                                        if (currentItem.children[0].nodeValue == storageItem.children[0].nodeValue) {
                                                            doesNotExists = false;
                                                            return doesNotExists;
                                                        }
                                                    }
                                                }
                                            } else {
                                                //compare name properties for final comparison
                                                var duplicatePropertyCount = 0;
                                                for (var j = 0; j < cLength; j++) {
                                                    var currentNode = currentItem.children[j];
                                                    if (currentNode['nodeName'] == "thumbnailUrl" || currentNode['nodeName'] == "url") {
                                                        duplicatePropertyCount += 1;
                                                    } else {
                                                        for (var k = 0; k < sLength; k++) {
                                                            var storageNode = storageItem.children[k];

                                                            if (currentNode['nodeName'] == storageNode['nodeName']) {
                                                                if (currentNode['nodeValue'] == storageNode['nodeValue']) {
                                                                    //currentList.indexOf(currentItem)
                                                                    duplicatePropertyCount += 1;
                                                                    break;
                                                                } else {

                                                                }
                                                            }
                                                        }
                                                    }
                                                    //if all properties are the same -> ignore item

                                                }
                                                if (duplicatePropertyCount == sLength) {
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