// Panorama enhancements
tabutils._tabView = function() {
  if (!("TabView" in window))
    return;

  TabView.populateGroupMenu = function(aPopup, aExcludeEmpty) {
    while (aPopup.lastChild && aPopup.lastChild.localName != "menuseparator")
      aPopup.removeChild(aPopup.lastChild);

    if (!this._window && !Array.some(gBrowser.mTabs, function(aTab) aTab.hidden))
      return;

    this._initFrame(function() {
      let activeGroupItem = this._window.GroupItems.getActiveGroupItem();
      this._window.GroupItems.groupItems.forEach(function(groupItem) {
        if (!groupItem.hidden && (groupItem.getChildren().length > 0 || !aExcludeEmpty && groupItem.getTitle().length > 0)) {
          let activeTab = groupItem.getActiveTab() || groupItem.getChild(0);
          let m = document.createElement("menuitem");
          m.setAttribute("class", "menuitem-iconic bookmark-item menuitem-with-favicon");
          m.setAttribute("label", activeTab ? activeTab.tab.label : "");
          m.setAttribute("image", activeTab ? activeTab.tab.image : "");
          m.setAttribute("acceltext", groupItem.getTitle() + "[" + groupItem.getChildren().length + "]");
          m.setAttribute("disabled", groupItem == activeGroupItem);
          m.value = groupItem;
          aPopup.appendChild(m);
        }
      });
    }.bind(this));
  };

  TabView.moveTabsTo = function(aTabs, aGroupItem) {
    if (!aGroupItem.isAGroupItem) {
      TabView.moveTabTo(aGroupItem.tab, null);
      aGroupItem = aGroupItem.parent;
    }
    aTabs.forEach(function(aTab) TabView.moveTabTo(aTab, aGroupItem.id));
    gBrowser.updateCurrentBrowser(true);
  };

  TabView.mergeGroup = function(aGroupItem) {
    if (aGroupItem.isAGroupItem) {
      this._window.GroupItems.newTab({});

      let activeGroupItem = this._window.GroupItems.getActiveGroupItem();
      if (activeGroupItem != aGroupItem)
        aGroupItem.getChildren().slice().forEach(function(tabItem) TabView.moveTabTo(tabItem.tab, activeGroupItem.id));
    }
    else {
      this._window.GroupItems.newTab(aGroupItem);
    }
    gBrowser.updateCurrentBrowser(true);
  };

  TabView.selectGroup = function(aGroupItem) {
    if (!aGroupItem)
      return;

    if (aGroupItem.isAGroupItem) {
      let activeTab = aGroupItem.getActiveTab() || aGroupItem.getChild(0);
      if (activeTab)
        gBrowser.selectedTab = activeTab.tab;
    }
    else
      gBrowser.selectedTab = aGroupItem.tab;
  };

  var button = $("tabview-button");
  if (button && !button.hasChildNodes()) {
    let popup = button.appendChild(document.createElement("menupopup"));
    popup.setAttribute("onpopupshowing", "TabView.populateGroupMenu(event.target, true);");
    popup.setAttribute("oncommand", "TabView.selectGroup(event.originalTarget.value);");
    popup.setAttribute("position", "after_end");
    button.setAttribute("type", "menu-button");

    let item = popup.appendChild(document.createElement("menuitem"));
    item.setAttribute("label", $("context_tabViewNewGroup").getAttribute("label"));
    item.setAttribute("command", "cmd_newGroup");
    popup.appendChild(document.createElement("menuseparator"));
  }

  function $() {return document.getElementById.apply(document, arguments);}
};
