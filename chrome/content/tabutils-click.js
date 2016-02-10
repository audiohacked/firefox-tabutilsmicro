
tabutils._tabClickingOptions = function() {

  //载入剪贴板URL
  // gBrowser.loadURLFromClipboard = function loadURLFromClipboard(aTab) {
  //   var url = readFromClipboard();
  //   if (!url)
  //     return;
  //
  //   if (aTab) {
  //     aTab.linkedBrowser.stop();
  //     aTab.linkedBrowser.loadURIWithFlags(url, Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP);
  //   }
  //   else {
  //     this.loadOneTab(url, null, null, null, TUMu_getPref('extensions.tabutils.loadNewInBackground', false), true);
  //   }
  // };

  //浏览历史菜单
  // TUMu_hookCode("FillHistoryMenu",
  //   ["count <= 1", "count == 0"],
  //   [/(?=var webNav)/, function() {
  //     var tab = document.popupNode;
  //     if (!tab || tab.localName != 'tab')
  //       tab = gBrowser.selectedTab;
  //     aParent.value = tab._tPos;
  //   }],
  //   ["gBrowser.webNavigation", "tab.linkedBrowser.webNavigation"]
  // );
  // TUMu_hookCode("gotoHistoryIndex",
  //   ["gBrowser.selectedTab", "tab", "g"],
  //   ["gBrowser", "tab.linkedBrowser", "g"],
  //   [/(?=let where)/, "let tab = gBrowser.mTabs[aEvent.target.parentNode.value];"]
  // );

  // TUMu_hookCode("TabContextMenu.updateContextMenu", "aPopupMenu.triggerNode", "document.popupNode", "g");
  // TUMu_hookCode("gBrowser.mTabContainer._selectNewTab", "{", function() {
  //   if (TMP_console.isCallerInList(["onxblmousedown"]) &&
  //       !aNewTab.selected)
  //     aNewTab.setAttribute("firstclick", true);
  // });

  gBrowser.onTabClick = function onTabClick(event) {
    if (event.target.hasAttribute("firstclick")) {
      event.target.removeAttribute("firstclick");
      if (event.button == 0 && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey)
        return;
    }

    if (event.altKey) {
      window.addEventListener("keyup", function(event) {
        if (event.keyCode == event.DOM_VK_ALT) {
          window.removeEventListener("keyup", arguments.callee, true);
          event.preventDefault();
          event.stopPropagation();
        }
      }, true);
    }

    var type = [
      event.ctrlKey || event.metaKey ? "Ctrl" : "",
      event.altKey ? "Alt" : "",
      event.shiftKey ? "Shift" : "",
      event.button == 1 ? "Middle" : event.button == 2 ? "Right" : ""
    ].join("").replace(/./, function(s) s.toLowerCase());

    if (type) {
      this.doClickAction(type, event);
    }
    else if (event.detail == 1 && !event.target.mOverCloseButton) {
      event.target._leftClickTimer = setTimeout(function() {
        this.doClickAction("left", event);
      }.bind(this), TUMu_getPref("extensions.tabutils.leftClickTabDelay", 250));
    }
  };

  gBrowser.onTabBarDblClick = function onTabBarDblClick(event) {
    if (event.button == 0 && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey
        && !this._blockDblClick && !gBrowser._blockDblClick) {
      clearTimeout(event.target._leftClickTimer);
      this.doClickAction("dbl", event);
    }
  };

  gBrowser._getTargetTab = function _getTargetTab(event) {
    if (event.target.localName == "tab")
      return event.target;

    for (let target = event.originalTarget; target; target = target.parentNode) {
      switch (target.localName) {
        case "tab":
        case "tabs": return target;
        case "menuitem": return target.tab;
        case "toolbarbutton": return target.command == "cmd_newNavigatorTab" ? target : null;
      }
    }
    return null;
  };

  gBrowser.doClickAction = function doClickAction(type, event) {
    var target = this._getTargetTab(event);
    if (!target)
      return;

    TabContextMenu.contextTab = target.localName == "tab" ? target : gBrowser.mCurrentTab;
    gBrowser.mContextTabs = gBrowser.contextTabsOf(gBrowser.mContextTab);

    var prefName = target.localName == "tab" ? "ClickTab" :
                   target.localName == "tabs" ? "ClickTabBar" : "ClickNewTabButton";
    var action = TUMu_getPref("extensions.tabutils." + type + prefName, 0);
    var code = TUMu_getPref("extensions.tabutils.mouse." + action + ".oncommand");
    if (code) {
      try {
        new Function("event", code)(event);
      }
      catch (e) {}

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    function $() document.getElementById.apply(document, arguments);

    switch (action) {
      case 0: //Default
        return;
      case 1: //New Tab
        BrowserOpenTab();
        break;
      case 2: //Duplicate Tab
        $("context_duplicateTab").doCommand();
        break;
      case 3: //Reload Tab
        $("context_reloadTab").doCommand();
        break;
      case 4: //Close Tab
        $("context_closeTab").doCommand();
        break;
      case 5: //Undo Close Tab
        undoCloseTab();
        break;
      case 6: //Load URL from Clipboard
        gBrowser.loadURLFromClipboard(target.localName == "tab" ? gBrowser.mContextTab : null);
        break;
      case 7: //Switch to Last Selected Tab
        // if (gBrowser.mContextTab.selected) {
        //   gBrowser.selectedTab = gBrowser.getLastSelectedTab();
        // }
        break;
      case 11: //Session History Menu
        var backForwardMenu = $("backForwardMenu");
        document.popupNode = gBrowser.mContextTab;
        backForwardMenu.setAttribute("onpopuphidden", "if (event.target == this) document.popupNode = null;");
        backForwardMenu.openPopupAtScreen(event.screenX, event.screenY, true);
        break;
      case 12: //Recently Closed Tabs
        $("undoCloseTabPopup").openPopupAtScreen(event.screenX, event.screenY, true);
        break;
      case 13: //List All Tabs
        var allTabsPopup = gBrowser.mTabContainer.mAllTabsPopup;
        if (allTabsPopup) {
          allTabsPopup.openPopupAtScreen(event.screenX, event.screenY, true);
        }
        break;
      case 14: //Tab Context Menu
        var tabContextMenu = gBrowser.tabContextMenu;
        document.popupNode = gBrowser.mContextTab;
        tabContextMenu.setAttribute("onpopuphidden", "if (event.target == this) document.popupNode = null;");
        tabContextMenu.openPopupAtScreen(event.screenX, event.screenY, true);
        break;
      case 16: //Toolbar Context Menu
        $("toolbar-context-menu").openPopupAtScreen(event.screenX, event.screenY, true);
        break;
      case 15: //Bookmarks
        $("bookmarksPopup").openPopupAtScreen(event.screenX, event.screenY, false);
        break;
      case 21: //Protect Tab
        $("context_protectTab").doCommand();
        break;
      case 22: //Lock Tab
        $("context_lockTab").doCommand();
        break;
      case 23: //Freeze Tab
        gBrowser.freezeTab(gBrowser.mContextTabs);
        break;
      case 24: //Faviconize Tab
        $("context_faviconizeTab").doCommand();
        break;
      case 25: //Pin Tab
        gBrowser.pinTab(gBrowser.mContextTabs);
        break;
      case 26: //Hide Tab
        break;
      case 27: //Rename Tab
        $("context_renameTab").doCommand();
        break;
      case 28: //Restart Tab
        $("context_restartTab").doCommand();
        break;
      case 29: //Reload Tab Every
        $("context_reloadEvery").getElementsByAttribute("anonid", "enable")[0].doCommand();
        break;
      case 31: //Select a Tab
        $("context_selectTab").doCommand();
        break;
      case 32: //Select Multiple Tabs
        $("context_selectTabs").doCommand();
        break;
      case 33: //Select Multiple Tabs (+)
        gBrowser.selectTabs(gBrowser.mContextTab, true);
        break;
      case 34: //Select All Tabs
        $("context_selectAllTabs").doCommand();
        break;
      case 35: //Unselect All Tabs
        $("context_unselectAllTabs").doCommand();
        break;
      case 36: //Invert Selection
        $("context_invertSelection").doCommand();
        break;
      case 37: //Select Similar Tabs
        gBrowser.selectedTabs = gBrowser.similarTabsOf(gBrowser.mContextTabs);
        break;
      case 41: //Close Left Tabs
        $("context_closeLeftTabs").doCommand();
        break;
      case 42: //Close Right Tabs
        $("context_closeRightTabs").doCommand();
        break;
      case 43: //Close Other Tabs
        $("context_closeOtherTabs").doCommand();
        break;
      case 44: //Close Duplicate Tabs
        $("context_closeDuplicateTabs").doCommand();
        break;
      case 45: //Close Similar Tabs
        $("context_closeSimilarTabs").doCommand();
        break;
      case 46: //Close All Tabs
        $("context_closeAllTabs").doCommand();
        break;
      case 51: //Collapse/Expand Stack
        $("context_collapseStack").doCommand();
        break;
      case 52: //Recolor Stack
        $("context_colorStack").doCommand();
        break;
      default: //Do Nothing
        break;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  gBrowser.mTabContainer.setAttribute("onclick", "if (event.button == 0) gBrowser.onTabClick(event);");
  gBrowser.mTabContainer.setAttribute("ondblclick", "gBrowser.onTabBarDblClick(event);");
  tabutils.addEventListener(gBrowser.mTabContainer, "MozMouseHittest", function(event) {if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey || event.detail > 0) event.stopPropagation();}, true);
  tabutils.addEventListener(gBrowser.mTabContainer, "click", function(event) {if (event.button == 1) gBrowser.onTabClick(event);}, true);
  tabutils.addEventListener(gBrowser.mTabContainer, "contextmenu", function(event) {if (event.button == 2) gBrowser.onTabClick(event);}, true);
  tabutils.addEventListener(gBrowser.mTabContainer, "dblclick", function(event) {if (event.target.localName == "tabs") gBrowser.onTabBarDblClick(event);}, true);

  //Mouse release to select
  // TUMu_hookCode("gBrowser.mTabContainer._selectNewTab", "{", function() {
  //   if (TMP_console.isCallerInList(["onxblmousedown"]) &&
  //       TUMu_getPref("extensions.tabutils.mouseReleaseSelect", true))
  //     return;
  // });

  // TUMu_hookCode("gBrowser.onTabClick", "{", function() {
  //   if (event.button == 0 && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey
  //       && event.target.localName == "tab" && !event.target.selected && !event.target.mOverCloseButton) {
  //     this.mTabContainer._selectNewTab(event.target);
  //     return;
  //   }
  // });

  //Mouse hover to select
  // gBrowser.mTabContainer._mouseHoverSelectTimer = null;
  // tabutils.addEventListener(gBrowser.mTabContainer, 'mouseover', function(event) {
  //   if (event.target.localName == 'tab' && !event.target.selected && TUMu_getPref("extensions.tabutils.mouseHoverSelect", false)) {
  //     clearTimeout(this._mouseHoverSelectTimer);
  //     this._mouseHoverSelectTimer = setTimeout(function(aTab) {
  //       if (aTab && !aTab.mOverCloseButton)
  //         gBrowser.selectedTab = aTab;
  //     }, TUMu_getPref("extensions.tabutils.mouseHoverSelectDelay", 250), event.target);
  //   }
  // }, false);

  // tabutils.addEventListener(gBrowser.mTabContainer, 'mouseout', function(event) {
  //   if (event.target.localName == 'tab') {
  //     clearTimeout(this._mouseHoverSelectTimer);
  //     this._mouseHoverSelectTimer = null;
  //   }
  // }, false);

  //Mouse scroll to select
  // tabutils.addEventListener(gBrowser.mTabContainer, 'DOMMouseScroll', function(event) {
  //   if (event.ctrlKey) {
  //     document.getElementById(event.detail < 0 ? "cmd_prevGroup" : "cmd_nextGroup").doCommand();
  //     event.stopPropagation();
  //     return;
  //   }
  //
  //   if (event.originalTarget != this.mTabstrip._scrollButtonUp &&
  //       event.originalTarget != this.mTabstrip._scrollButtonDown &&
  //       TUMu_getPref("extensions.tabutils.mouseScrollSelect", false)) {
  //     let scrollDir = event.detail < 0 ^ TUMu_getPref("extensions.tabutils.mouseScrollSelectDir", false) ? -1 : 1;
  //     this.advanceSelectedTab(scrollDir, TUMu_getPref("extensions.tabutils.mouseScrollSelectWrap", false));
  //     event.stopPropagation();
  //   }
  // }, true);

  //Center current tab
  // TUMu_hookCode("gBrowser.onTabSelect", "}", function() {
  //   if (TUMu_getPref("extensions.tabutils.centerCurrentTab", false)) {
  //     let tabStrip = this.mTabContainer.mTabstrip;
  //     let scrollRect = tabStrip.scrollClientRect;
  //     let tabRect = aTab.getBoundingClientRect();
  //     let [start, end] = tabStrip._startEndProps;
  //     tabStrip._stopSmoothScroll();
  //     tabStrip.scrollPosition += (tabRect[start] + tabRect[end])/2 - (scrollRect[start] + scrollRect[end])/2;
  //   }
  // });
};
