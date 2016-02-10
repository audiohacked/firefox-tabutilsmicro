tabutils._multiTabHandler = function() {

  // Select Multiple Tabs
  gBrowser.__defineGetter__("allTabs", function() {
    return this.visibleTabs.slice(this._numPinnedTabs);
  });

  gBrowser.__defineGetter__("selectedTabs", function() {
    return this._selectedTabs ||
           (this._selectedTabs = Array.filter(this.visibleTabs, function(aTab) aTab.hasAttribute("multiselected")));
  });

  gBrowser.__defineSetter__("selectedTabs", function(val) {
    Array.forEach(this.visibleTabs, function(aTab) aTab.removeAttribute("multiselected"));
    Array.forEach(val, function(aTab) {
      if (!aTab.collapsed) {
        if (this.isCollapsedStack(aTab)) {
          let tabs = this.siblingTabsOf(aTab);
          tabs.forEach(function(aTab) aTab.setAttribute("multiselected", true));
        }
        aTab.setAttribute("multiselected", true);
      }
    }, this);
    this._selectedTabs = null;
    this._lastClickedTab = null;
    return val;
  });

  gBrowser.contextTabsOf = function contextTabsOf(aTab) {
    // return aTab.hasAttribute("multiselected") ? this.selectedTabs :
    //        this.isCollapsedStack(aTab) || aTab.mOverTwisty ? this.siblingTabsOf(aTab) : [aTab];
    return aTab.mOverTwisty ? this.siblingTabsOf(aTab) : [aTab];
  };

  gBrowser.selectTab = function selectTab(aTab, aForce) {
    if (aForce == null)
      aForce = !aTab.hasAttribute("multiselected");

    if (this.isCollapsedStack(aTab)) {
      let tabs = this.siblingTabsOf(aTab);
      if (aForce)
        tabs.forEach(function(aTab) aTab.setAttribute("multiselected", true));
      else
        tabs.forEach(function(aTab) aTab.removeAttribute("multiselected"));
    }
    aForce ? aTab.setAttribute("multiselected", true) : aTab.removeAttribute("multiselected");
    this._selectedTabs = null;
    this._lastClickedTab = aTab;
  };

  gBrowser.selectTabs = function selectTabs(aTab, aKeepSelection) {
    var bTab = this._lastClickedTab || this.mCurrentTab;
    var [start, end] = aTab._tPos < bTab._tPos ? [aTab._tPos, bTab._tPos] : [bTab._tPos, aTab._tPos];
    this.selectedTabs = Array.slice(this.mTabs, start, end + 1)
                             .concat(aKeepSelection ? this.selectedTabs : []);
    this._selectedTabs = null;
    this._lastClickedTab = bTab;
  };

  // TUMu_hookCode("gBrowser.onTabSelect", "}", function() {
  //   if (!aTab.hasAttribute("multiselected"))
  //     this.selectedTabs = [];
  // });
  //
  // TUMu_hookCode("gBrowser.onTabMove", "{", function() {
  //   if (aTab.hasAttribute("multiselected"))
  //     this._selectedTabs = null;
  // });
  //
  // TUMu_hookCode("gBrowser.onTabHide", "}", function() {
  //   if (aTab.hasAttribute("multiselected")) {
  //     aTab.removeAttribute("multiselected");
  //     this._selectedTabs = null;
  //   }
  // });

  // TUMu_hookCode("gBrowser.onStackCollapsed", "}", function() {
  //   let tabs = this.siblingTabsOf(aTab);
  //   if (tabs.some(function(aTab) aTab.hasAttribute("multiselected"))) {
  //     tabs.forEach(function(aTab) aTab.removeAttribute("multiselected"));
  //     this._selectedTabs = null;
  //   }
  // });

  // Left/Right/Other/Duplicate/Similar Tabs
  gBrowser.leftTabsOf = function leftTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    return Array.slice(this.visibleTabs, this._numPinnedTabs, this.visibleTabs.indexOf(aTabs[0]));
  };

  gBrowser.rightTabsOf = function rightTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    return Array.slice(this.allTabs, this.allTabs.indexOf(aTabs[aTabs.length - 1]) + 1);
  };

  gBrowser.otherTabsOf = function otherTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    return Array.filter(this.allTabs, function(aTab) Array.indexOf(aTabs, aTab) == -1);
  };

  gBrowser.duplicateTabsOf = function duplicateTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    return Array.filter(this.allTabs, function(aTab) Array.some(aTabs, function(bTab) {
      return aTab.linkedBrowser.currentURI.spec == bTab.linkedBrowser.currentURI.spec;
    }));
  };

  gBrowser.similarTabsOf = function similarTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    return Array.filter(this.allTabs, function(aTab) Array.some(aTabs, function(bTab) {
      try {
        return aTab.linkedBrowser.currentURI.host == bTab.linkedBrowser.currentURI.host;
      }
      catch (e) {
        return aTab.linkedBrowser.currentURI.spec == bTab.linkedBrowser.currentURI.spec;
      }
    }));
  };

  gBrowser.uniqueTabsOf = function uniqueTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    var seenURIs = {};
    return Array.reduce(aTabs, function(aTabs, aTab) {
      var uri = aTab.linkedBrowser.currentURI.spec;
      if (!(uri in seenURIs)) {
        seenURIs[uri] = true;
        aTabs.push(aTab);
      }
      return aTabs;
    }, []);
  };

  //关闭多个标签页
  TUMu_hookCode("gBrowser.warnAboutClosingTabs", /\w+(?= <= 1)/, "($& = arguments[1] && 'length' in arguments[1] ? arguments[1].length : $&)"); // Bug 866880 [Fx24]
  gBrowser.removeTabsBut = function removeTabsBut(aTabs, bTabs) {
    aTabs = aTabs ? "length" in aTabs ? aTabs : [aTabs] : [];
    bTabs = bTabs ? "length" in bTabs ? bTabs : [bTabs] : [];

    aTabs = Array.filter(aTabs, function(aTab) !this.isProtected(aTab), this);

    if (bTabs.length > 0)
      aTabs = Array.filter(aTabs, function(aTab) Array.indexOf(bTabs, aTab) == -1);

    if (aTabs.length == 0)
      return;

    if (aTabs.length == 1)
      return this.removeTab(aTabs[0], {animate: true});

    if (this.warnAboutClosingTabs("closingTabsEnum" in this ? this.closingTabsEnum.ALL : true, aTabs)) { // Bug 866880 [Fx24]
      if (Array.indexOf(aTabs, this.mCurrentTab) > -1)
        this.selectedTab = bTabs[0] || aTabs[0];

      let count = 0;
      for (let i = aTabs.length - 1; i >= 0; i--) {
        this.removeTab(aTabs[i]);
        if (!aTabs[i].parentNode)
          count++;
      }
      this._lastClosedTabsCount = count;
    }
  };

  TUMu_hookCode("undoCloseTab", /.*(ss|SessionStore).undoCloseTab.*/, "for (let i = aIndex == null ? gBrowser._lastClosedTabsCount || 1 : 1; i > 0; i--) $&"); // Bug 898732 [Fx26]

  gBrowser.closeLeftTabs = function(aTab) this.removeTabsBut(this.leftTabsOf(aTab), aTab);
  gBrowser.closeRightTabs = function(aTab) this.removeTabsBut(this.rightTabsOf(aTab), aTab);
  gBrowser.closeOtherTabs = function(aTab) this.removeTabsBut(this.otherTabsOf(aTab), aTab);
  gBrowser.closeDuplicateTabs = function(aTab) this.removeTabsBut(this.duplicateTabsOf(aTab), aTab);
  gBrowser.closeSimilarTabs = function(aTab) this.removeTabsBut(this.similarTabsOf(aTab), aTab);
  gBrowser.closeAllTabs = function() this.removeTabsBut(this.allTabs);
  gBrowser.closeAllDuplicateTabs = function() this.removeTabsBut(this.allTabs, this.uniqueTabsOf(this.allTabs));

  //拖曳多个标签页
  gBrowser.gatherTabs = function gatherTabs(aTabs, aTab, aSuppressTabMove) {
    let index = 0;
    if (aTab) {
      index = aTabs.indexOf(aTab);
      if (index == -1) {
        while (++index < aTabs.length && aTabs[index]._tPos < aTab._tPos);
        aTabs.splice(index, 0, aTab);
      }
    }

    for (let i = index - 1; i >= 0; i--) {
      aTabs[i]._suppressTabMove = aSuppressTabMove;
      this.moveTabBefore(aTabs[i], aTabs[i + 1]);
      delete aTabs[i]._suppressTabMove;
    }

    for (let i = index + 1; i < aTabs.length; i++) {
      aTabs[i]._suppressTabMove = aSuppressTabMove;
      this.moveTabAfter(aTabs[i], aTabs[i - 1]);
      delete aTabs[i]._suppressTabMove;
    }
  };

  gBrowser.moveTabBefore = function moveTabBefore(aTab, bTab) {
    this.moveTabTo(aTab, bTab ? aTab._tPos < bTab._tPos ? bTab._tPos - 1 : bTab._tPos : 0);
  };

  gBrowser.moveTabAfter = function moveTabAfter(aTab, bTab) {
    this.moveTabTo(aTab, bTab ? aTab._tPos > bTab._tPos ? bTab._tPos + 1 : bTab._tPos : this.mTabs.length - 1);
  };

  // TUMu_hookCode("gBrowser.onTabMove", "{", function() {
  //   if (aTab._suppressTabMove)
  //     return;
  // });

  tabutils.addEventListener(gBrowser.mTabContainer, "dragstart", function(event) {
    if (event.target.localName == "tab") {
      let draggedTab = event.target;
      let draggedTabs = gBrowser.contextTabsOf(draggedTab).slice();
      draggedTabs.splice(draggedTabs.indexOf(draggedTab), 1);
      draggedTabs.unshift(draggedTab);

      let dt = event.dataTransfer;
      draggedTabs.forEach(function(aTab, aIndex) {
        dt.mozSetDataAt(TAB_DROP_TYPE, aTab, aIndex);
        dt.mozSetDataAt("text/x-moz-text-internal", aTab.linkedBrowser.currentURI.spec, aIndex);
      });
    }
  }, true);

  // TUMu_hookCode("gBrowser.mTabContainer._setEffectAllowedForDataTransfer",
  //   ["dt.mozItemCount > 1", "false"]
  // );

  // TUMu_hookCode("gBrowser.onTabMove", "}", function() {
  //   if (aTab.hasAttribute("multiselected")) {
  //     let selectedTabs = this.selectedTabs;
  //     if (selectedTabs[selectedTabs.length - 1]._tPos - selectedTabs[0]._tPos >= selectedTabs.length) {
  //       let tabs = selectedTabs.filter(function(aTab) !aTab.collapsed);
  //       tabs.splice(tabs.indexOf(aTab), 1);
  //
  //       let index = 0;
  //       let oldPos = aTab._tPos > event.detail ? event.detail - 0.5 : event.detail + 0.5;
  //       while (index < tabs.length && tabs[index]._tPos < oldPos)
  //         index++;
  //       tabs.splice(index, 0, aTab);
  //
  //       setTimeout(function() {
  //         this.selectedTabs = [];
  //         this.gatherTabs(tabs, aTab);
  //         this.selectedTabs = selectedTabs;
  //       }.bind(this), 0);
  //     }
  //   }
  // });

  TUMu_hookCode("gBrowser.moveTabTo", // Bug 822068 [Fx20]
    ["this.mCurrentTab._selected = false;", "wasFocused = (document.activeElement == this.mCurrentTab);$&"],
    ["this.mCurrentTab._selected = true;", "$&;if (wasFocused) this.mCurrentTab.focus();"]
  );

  ["moveTabBackward", "moveTabForward", "moveTabToStart", "moveTabToEnd"].forEach(function(aMethod) {
    TUMu_hookCode.call(gBrowser, aMethod, "this.mCurrentTab.focus();", "");
  });

  TUMu_hookCode("gBrowser.moveTabBackward", "this.mCurrentTab._tPos", (function() { // Bug 656222 [Fx20]
    (function () {
      let tab = this.mCurrentTab.previousSibling;
      while (tab && tab.boxObject.width == 0)
        tab = tab.previousSibling;
      return tab ? tab._tPos + 1 : 0;
    }).apply(this)
  }).toString().replace(/^.*{|}$/g, ""));

  TUMu_hookCode("gBrowser.moveTabForward", "this.mCurrentTab._tPos", (function() {
    (function () {
      let tab = this.mCurrentTab.nextSibling;
      while (tab && tab.boxObject.width == 0)
        tab = tab.nextSibling;
      return tab ? tab._tPos - 1 : this.mTabs.length;
    }).apply(this)
  }).toString().replace(/^.*{|}$/g, ""));

  // //Protect/Lock/Faviconize/Pin All Tabs
  // [
  //   ["gBrowser.unreadTab", ["unread"]],
  //   ["gBrowser.protectTab", ["protected"]],
  //   ["gBrowser.lockTab", ["locked"]],
  //   ["gBrowser.freezeTab", ["protected", "locked"]],
  //   ["gBrowser.faviconizeTab", ["faviconized"]],
  //   ["gBrowser.pinTab", ["pinned"]],
  //   ["gBrowser.autoReloadTab", ["autoReload"]]
  // ].forEach(function([aFuncName, aAttrs]) {
  //   TUMu_hookCode(aFuncName, "{", (function() {
  //     if ("length" in arguments[0]) {
  //       let aTabs = Array.slice(arguments[0]);
  //       if (aForce == null)
  //         aForce = !aTabs.every(function(aTab) aAttrs.every(function(aAttr) aTab.hasAttribute(aAttr)));
  //
  //       let func = arguments.callee, args = Array.slice(arguments, 2);
  //       aTabs.forEach(function(aTab) {
  //         func.apply(this, Array.concat(aTab, aForce, args));
  //       }, this);
  //       return;
  //     }
  //   }).toString().replace(/^.*{|}$/g, "").replace("aAttrs", aAttrs.toSource()));
  // });

  TUMu_hookCode("gBrowser.reloadTab", /.*reload\b.*/, "try {$&} catch (e) {}");

  gBrowser.moveTabToWindow = function moveTabToWindow(aTabs, aWindow) {
    if (!aWindow) {
      aTabs[0]._selectedTabs = aTabs;
      return this.replaceTabWithWindow(aTabs[0]);
    }

    if (aWindow.gPrivateBrowsingUI.privateBrowsingEnabled != gPrivateBrowsingUI.privateBrowsingEnabled) // Bug 799001 [Fx20]
      return;

    let bTabs = [];
    aTabs.forEach(function(aTab) {
      let bTab = this.addTab();
      bTab.linkedBrowser.stop();
      bTab.linkedBrowser.docShell;
      this.swapBrowsersAndCloseOther(bTab, aTab);
      bTabs.push(bTab);
    }, aWindow.gBrowser);

    if (bTabs.length > 1 && aWindow.TUMu_getPref("extensions.tabutils.autoStack", false))
      aWindow.gBrowser.stackTabs(bTabs);

    return aWindow;
  };

  TUMu_hookCode("gBrowser.swapBrowsersAndCloseOther", /(?=.*_beginRemoveTab.*)/, function() {
    if ([gBrowserInit.onLoad, gBrowserInit._delayedStartup].indexOf(arguments.callee.caller) > -1 ||  // Bug 756313 [Fx19]
        TMP_console.isCallerInList(["onxbldrop", "_handleTabDrop"])) {
      let selectedTabs = aOtherTab._selectedTabs || remoteBrowser.contextTabsOf(aOtherTab);
      if (selectedTabs.length > 1) {
        this.swapBrowsersAndCloseOther(aOurTab, selectedTabs.shift());

        let bTabs = [aOurTab];
        selectedTabs.forEach(function(aTab, aIndex) {
          let bTab = this.addTab();
          bTab.linkedBrowser.stop();
          bTab.linkedBrowser.docShell;
          this.moveTabTo(bTab, aOurTab._tPos + aIndex + 1);
          this.swapBrowsersAndCloseOther(bTab, aTab);
          bTabs.push(bTab);
        }, this);

        if (bTabs.length < this.mTabs.length && TUMu_getPref("extensions.tabutils.autoStack", false))
          this.stackTabs(bTabs);

        return;
      }
    }
  });

  // [
  //   ["context_reloadTab", "gBrowser.mContextTabs.forEach(gBrowser.reloadTab, gBrowser);"],
  //   ["context_reloadAllTabs", "gBrowser.allTabs.forEach(gBrowser.reloadTab, gBrowser);"],
  //   ["context_pinTab", "gBrowser.pinTab(gBrowser.mContextTabs, true);"],
  //   ["context_unpinTab", "gBrowser.pinTab(gBrowser.mContextTabs, false);"],
  //   ["context_openTabInWindow", "gBrowser.moveTabToWindow(gBrowser.mContextTabs);"],
  //   ["context_bookmarkTab", "gBrowser.bookmarkTab(gBrowser.mContextTabs);"],
  //   ["context_closeTab", "gBrowser.removeTabsBut(gBrowser.mContextTabs);"],
  //   ["context_closeOtherTabs", "gBrowser.removeTabsBut(gBrowser.allTabs, gBrowser.mContextTabs);"]
  // ].forEach(function([aId, aCommand]) {
  //   var item = document.getElementById(aId);
  //   if (item) {
  //     item.setAttribute("oncommand", aCommand);
  //     item.setAttribute("multiselected", "any");
  //   }
  // });
}
