tabutils._tabEventListeners = {
  init: function() {
    TUMu_hookCode("gBrowser.addTab",
      ["{", "if (!aURI) aURI = 'about:blank';"],
      [/(?=var evt)/, function() {
        t.arguments = {
          aURI: aURI,
          aReferrerURI: aReferrerURI,
          aRelatedToCurrent: aRelatedToCurrent
        };
      }]
    );

    gBrowser.onTabOpen = function onTabOpen(aTab) {
      var aURI, aReferrerURI, aRelatedToCurrent;
      if (aTab.arguments) {
        aURI = aTab.arguments.aURI;
        aReferrerURI = aTab.arguments.aReferrerURI;
        aRelatedToCurrent = aTab.arguments.aRelatedToCurrent;
      }

      var uri, tags = [];
      try {
        uri = makeURI(aURI);
      }
      catch (e) {
        uri = makeURI("about:blank");
      }

      if (uri.spec != "about:blank")
        tags = tabutils.getTagsForURI(uri, {});
    };

    gBrowser.onLocationChange = function onLocationChange(aTab) {
      var uri = aTab.linkedBrowser.currentURI;
      var tags = tabutils.getTagsForURI(uri, {});
    };

    TUMu_hookCode("gBrowser.mTabProgressListener", /(?=.*isBlankPageURL.*)/, function() {
      if (!isBlankPageURL(this.mBrowser.currentURI.spec) &&
          (!this.mBrowser.lastURI || isBlankPageURL(this.mBrowser.lastURI.spec)) &&
          !this.mBrowser.__SS_data) // Bug 867097 [Fx28]
        this.mTabBrowser.onLocationChange(this.mTab);
    });

    gBrowser.onTabMove = function onTabMove(aTab, event) {};
    gBrowser.onTabClose = function onTabClose(aTab) {};
    gBrowser.onTabSelect = function onTabSelect(aTab) {};
    gBrowser.onTabPinning = function onTabPinning(aTab) {};
    gBrowser.onTabPinned = function onTabPinned(aTab) {};
    gBrowser.onTabHide = function onTabHide(aTab) {};
    gBrowser.onTabShow = function onTabShow(aTab) {};
    gBrowser.onTabStacked = function onTabStacked(aTab) {};
    gBrowser.onTabUnstacked = function onTabUnstacked(aTab) {};
    gBrowser.onStackCollapsed = function onStackCollapsed(aTab) {};
    gBrowser.onStackExpanded = function onStackExpanded(aTab) {};
    gBrowser.onTabRestoring = function onTabRestoring(aTab) {var ss = tabutils._ss;};
    gBrowser.onTabRestored = function onTabRestored(aTab) {var ss = tabutils._ss;};
    gBrowser.onTabClosing = function onTabClosing(aTab) {var ss = tabutils._ss;};

    [
      "TabOpen", "TabMove", "TabClose", "TabSelect",
      "TabPinning", "TabPinned", "TabHide", "TabShow",
      "TabStacked", "TabUnstacked", "StackCollapsed", "StackExpanded",
      "SSTabRestoring", "SSTabRestored", "SSTabClosing"
    ].forEach(function(type) {
      tabutils.addEventListener(gBrowser.mTabContainer, type, this, false);
    }, this);
  },

  handleEvent: function(event) {
    switch (event.type) {
      case "TabOpen": gBrowser.onTabOpen(event.target);break;
      case "TabMove": gBrowser.onTabMove(event.target, event);break;
      case "TabClose": gBrowser.onTabClose(event.target);break;
      case "TabSelect": gBrowser.onTabSelect(event.target);break;
      case "TabPinning": gBrowser.onTabPinning(event.target);break;
      case "TabPinned": gBrowser.onTabPinned(event.target);break;
      case "TabHide": gBrowser.onTabHide(event.target);break;
      case "TabShow": gBrowser.onTabShow(event.target);break;
      case "TabStacked": gBrowser.onTabStacked(event.target);break;
      case "TabUnstacked": gBrowser.onTabUnstacked(event.target);break;
      case "StackCollapsed": gBrowser.onStackCollapsed(event.target);break;
      case "StackExpanded": gBrowser.onStackExpanded(event.target);break;
      case "SSTabRestoring": gBrowser.onTabRestoring(event.target);break;
      case "SSTabRestored": gBrowser.onTabRestored(event.target);break;
      case "SSTabClosing": gBrowser.onTabClosing(event.target);break;
    }
  }
};

tabutils._PlacesUtilsExt = function() {
  PlacesUtils.getItemIdForTag = function getItemIdForTag(aTag) {
    var tagId = -1;
    var tagsResultNode = this.getFolderContents(this.tagsFolderId).root;
    for (var i = 0, cc = tagsResultNode.childCount; i < cc; i++) {
      var node = tagsResultNode.getChild(i);
      if (node.title.toLowerCase() == aTag.toLowerCase()) {
        tagId = node.itemId;
        break;
      }
    }
    tagsResultNode.containerOpen = false;
    return tagId;
  };

  PlacesUtils.getItemIdForTaggedURI = function getItemIdForTaggedURI(aURI, aTag) {
    var tagId = this.getItemIdForTag(aTag);
    if (tagId == -1)
      return -1;

    var bookmarkIds = this.bookmarks.getBookmarkIdsForURI(aURI, {});
    for (let bookmarkId of bookmarkIds) {
      if (this.bookmarks.getFolderIdForItem(bookmarkId) == tagId)
        return bookmarkId;
    }
    return -1;
  };

  PlacesUtils.removeTag = function removeTag(aTag) {
    this.tagging.getURIsForTag(aTag).forEach(function(aURI) {
      this.tagging.untagURI(aURI, [aTag]);
    }, this);
  };
};

tabutils._openUILinkInTab = function() {

  //主页
  TUMu_hookCode("BrowserGoHome", "browser.tabs.loadBookmarksInBackground", "extensions.tabutils.loadHomepageInBackground");

  //地址栏回车键
  TUMu_hookCode("gURLBar.handleCommand",
    [/(let altEnter\s*=.+)((aTriggeringEvent)\s*&&\s*(aTriggeringEvent\.altKey)).*;/, function() {
      let newTabPref = TUMu_getPref('extensions.tabutils.openUrlInTab', true);
      let TUMu_altEnter = ($2 || newTabPref) && !(($3 ? $4 : false) && newTabPref && TUMu_getPref('extensions.tabutils.invertAlt', true));
      $1TUMu_altEnter;
    }],
    [/(?=.*openUILinkIn\(url\, where\, params.*)/, function() {
      params.inBackground = TUMu_getPref('extensions.tabutils.loadUrlInBackground', false);
      params.disallowInheritPrincipal = !mayInheritPrincipal;
      params.event = aTriggeringEvent || {};
    }],
    [/.*loadURIWithFlags.*(?=[\s\S]*(let params[\s\S]*openUILinkIn.*))/, function(s, s1) s1.replace("where", '"current"')],
    ["aTriggeringEvent.preventDefault();", ""],
    ["aTriggeringEvent.stopPropagation();", ""]
  );
  // TUMu_hookCode("openLinkIn", /(?=let uriObj)/, "w.gURLBar.handleRevert();");

  //搜索栏回车键
  if (BrowserSearch.searchBar)
  TUMu_hookCode("BrowserSearch.searchBar.handleSearchCommand",
    [/(\(aEvent && aEvent.altKey\)) \^ (newTabPref)/, "($1 || $2) && !($1 && $2 && TUMu_getPref('extensions.tabutils.invertAlt', true)) && !isTabEmpty(gBrowser.selectedTab)"],
    [/"tab"/, "TUMu_getPref('extensions.tabutils.loadSearchInBackground', false) ? 'background' : 'foreground'"]
  );

  //右键点击书签
  TUMu_hookCode("BookmarksEventHandler.onClick",
    ["aEvent.button == 2", "$& && (aEvent.ctrlKey || aEvent.altKey || aEvent.metaKey || !TUMu_getPref('extensions.tabutils.rightClickBookmarks', 0))"],
    ["aEvent.button == 1", "aEvent.button > 0"],
    ["}", "if (aEvent.button == 2) aEvent.preventDefault();"]
  );
  TUMu_hookCode("checkForMiddleClick",
    ["event.button == 1", "($& || event.button == 2 && !event.ctrlKey && !event.altKey && !event.metaKey && TUMu_getPref('extensions.tabutils.rightClickBookmarks', 0))"],
    [/.*closeMenus.*/, "{$&;event.preventDefault();}"]
  );
  TUMu_hookCode("whereToOpenLink", "e.button == 1", "e.button > 0");

  //保持菜单打开
  TUMu_hookCode("BookmarksEventHandler.onClick", /.*hidePopup.*/, "if (!(TUMu_getPref('extensions.tabutils.middleClickBookmarks', 0) & 4)) $&");
  TUMu_hookCode("checkForMiddleClick", /.*closeMenus.*/, "if (!(TUMu_getPref('extensions.tabutils.middleClickBookmarks', 0) & 4)) $&");

  TUMu_hookCode.call(document.getElementById("PopupAutoCompleteRichResult"), "onPopupClick",
    ["aEvent.button == 2", "$& && (aEvent.ctrlKey || aEvent.altKey || aEvent.metaKey || !TUMu_getPref('extensions.tabutils.rightClickBookmarks', 0))"],
    [/.*closePopup[\s\S]*handleEscape.*/, "if (aEvent.button && TUMu_getPref('extensions.tabutils.middleClickBookmarks', 0) & 4) gBrowser.userTypedValue = null; else {$&}"]
  );

  tabutils.addEventListener(gURLBar.parentNode, "blur", function(event) {
    if (gURLBar.popupOpen && TUMu_getPref('extensions.tabutils.middleClickBookmarks', 0) & 4) {
      gURLBar._dontBlur = true;
      setTimeout(function() {
        gURLBar.mIgnoreFocus = true;
        gURLBar.focus();
        gURLBar.mIgnoreFocus = false;
        gURLBar._dontBlur = false;
      }, 0);
    }
  }, true);
};

tabutils._openLinkInTab = function() {

  //强制在新标签页打开所有链接
  TUMu_hookCode("contentAreaClick", /if[^{}]*event.button == 0[^{}]*{([^{}]|{[^{}]*}|{([^{}]|{[^{}]*})*})*(?=})/, "$&" + (function() {
    if (tabutils.gOpenLinkInTab && !href.startsWith("javascript:")) {
      openNewTabWith(href, linkNode.ownerDocument, null, event, false);
      event.preventDefault();
      return;
    }
  }).toString().replace(/^.*{|}$/g, ""));

  TUMu_hookCode("nsBrowserAccess.prototype.openURI", /(?=switch \(aWhere\))/, function() {
    if (tabutils.gOpenLinkInTab && !isExternal)
      aWhere = Ci.nsIBrowserDOMWindow.OPEN_NEWTAB;
  });

  //强制在后台打开所有新标签页
  TUMu_hookCode("gBrowser.loadOneTab", /(?=var owner)/, "bgLoad = bgLoad && !tabutils.gLoadAllInForeground || tabutils.gLoadAllInBackground;");
  TUMu_hookCode("gBrowser.loadTabs", /(?=var owner)/, "aLoadInBackground = aLoadInBackground && !tabutils.gLoadAllInForeground || tabutils.gLoadAllInBackground;");

  //强制在新标签页打开外部链接
  TUMu_hookCode("contentAreaClick", /if[^{}]*event.button == 0[^{}]*{([^{}]|{[^{}]*}|{([^{}]|{[^{}]*})*})*(?=})/, "$&" + (function() {
    if (/^(https?|ftp)/.test(href) && TUMu_getPref("extensions.tabutils.openExternalInTab", false)) {
      let ourDomain = tabutils.getDomainFromURI(linkNode.ownerDocument.documentURIObject);
      let otherDomain = tabutils.getDomainFromURI(href);
      if (ourDomain != otherDomain) {
        openNewTabWith(href, linkNode.ownerDocument, null, event, false);
        event.preventDefault();
        return;
      }
    }
  }).toString().replace(/^.*{|}$/g, ""));

  //外来链接
  TUMu_hookCode("nsBrowserAccess.prototype.openURI", '"browser.link.open_newwindow"', 'isExternal ? "browser.link.open_external" : $&');

  // L-click
  TUMu_hookCode("contentAreaClick", /.*handleLinkClick.*/g, "if (event.button || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) $&");
  TUMu_hookCode("handleLinkClick", "current", "null");

  // M-click
  TUMu_hookCode("openNewTabWith", "aEvent.shiftKey", "$& ^ (aEvent.button == 1 && TUMu_getPref('extensions.tabutils.middleClickLinks', 0) & 2) > 0");

  // R-Click
  TUMu_hookCode("contentAreaClick",
    ["event.button == 2", "$& && (event.ctrlKey || event.altKey || event.metaKey || !TUMu_getPref('extensions.tabutils.rightClickLinks', 0))"]
  );
  TUMu_hookCode("handleLinkClick",
    ["event.button == 2", "false"],
    ["event.preventDefault();", 'document.getElementById("contentAreaContextMenu").hidePopup();$&', 'g']
  );
  TUMu_hookCode("openNewTabWith", "aEvent.button == 1", "aEvent.button > 0");

  //拖曳链接
  TUMu_hookCode("handleDroppedLink", /.*loadURI.*/, function(s) (function() {
    {
      switch (true) {
        case /\.(xpi|user\.js)$/.test(typeof data == "object" ? data.url : uri): // Bug 846635 [Fx25]
        case !TUMu_getPref("extensions.tabutils.dragAndGo", true):
          $0;break;
        case event.ctrlKey != TUMu_getPref("extensions.tabutils.invertDrag", false):
          BrowserSearch.loadSearch(name || url, true);break;
        default:
          openNewTabWith(typeof data == "object" ? data.url : uri, null, typeof data == "object" ? data.postData : postData.value, event, true, event.target.ownerDocument.documentURIObject);break;
      }
    }
  }).toString().replace(/^.*{|}$/g, "").replace("$0", s));

  for (let b of gBrowser.browsers) {
    b.droppedLinkHandler = handleDroppedLink;
  }

  //在新标签页打开链接时继承历史
  TUMu_hookCode("gBrowser.loadOneTab",
    ["{", function() {
      var currentTab = this.mCurrentTab;
    }],
    [/(?=return tab;)/, function() {
      if (aReferrerURI && TUMu_getPref("extensions.tabutils.openLinkWithHistory", false)) {
        let currentHistory = currentTab.linkedBrowser.sessionHistory;
        let newHistory = tab.linkedBrowser.sessionHistory.QueryInterface(Ci.nsISHistoryInternal);
        for (let i = 0; i <= currentHistory.index; i++) {
          newHistory.addEntry(currentHistory.getEntryAtIndex(i, false), true);
        }
      }
    }]
  );
};

//单窗口模式
tabutils._singleWindowMode = function() {
  if (TUMu_getPref("extensions.tabutils.singleWindowMode", false)) {
    var win = (function() {
      var winEnum = Services.wm.getZOrderDOMWindowEnumerator("navigator:browser", true);
      while (winEnum.hasMoreElements()) {
        var win = winEnum.getNext();
        if (win != window && win.toolbar.visible)
          return win;
      }
    })();

    if (win) {
      TUMu_hookFunc((gBrowserInit.onLoad + gBrowserInit._delayedStartup).toString().match(/^.*{|if \(uriToLoad.*{([^{}]|{[^{}]*}|{([^{}]|{[^{}]*})*})*}|}$/g).join("\n"), // Bug 756313 [Fx19]
        ["{", "var uriToLoad = window.arguments && window.arguments[0];"],
        ["gBrowser.loadTabs(specs, false, true);", "this.gBrowser.loadTabs(specs, false, false);"],
        ["loadOneOrMoreURIs(uriToLoad);", "this.gBrowser.loadTabs(uriToLoad.split('|'), false, false);"],
        [/.*loadURI.*\n.*/, "this.gBrowser.loadOneTab(uriToLoad, window.arguments[2], window.arguments[1] && window.arguments[1].split('=')[1], window.arguments[3] || null, false, window.arguments[4] || false);"],
        [/.*swapBrowsersAndCloseOther.*/, "return;"],
        ["}", "if (uriToLoad) window.close();"]
      ).apply(win);
    }
  }

  tabutils._tabPrefObserver.singleWindowMode = function() {
    if (TUMu_getPref("extensions.tabutils.singleWindowMode", false)) {
      if (TUMu_getPref("browser.link.open_external", 3) == 2)
        TUMu_setPref("browser.link.open_external", 3);
      if (TUMu_getPref("browser.link.open_newwindow") == 2)
        TUMu_setPref("browser.link.open_newwindow", 3);
      if (TUMu_getPref("browser.link.open_newwindow.override.external") == 2) // Bug 509664 [Fx10]
        TUMu_setPref("browser.link.open_newwindow.override.external", 3);
      if (TUMu_getPref("browser.link.open_newwindow.restriction") != 0)
        TUMu_setPref("browser.link.open_newwindow.restriction", 0);
    }
  };

  TUMu_hookCode("OpenBrowserWindow", "{", function() {
    if (TUMu_getPref("extensions.tabutils.singleWindowMode", false))
      return BrowserOpenTab() || gBrowser.getLastOpenedTab();
  });

  TUMu_hookCode("undoCloseWindow", "{", function() {
    if (TUMu_getPref("extensions.tabutils.singleWindowMode", false))
      return undoCloseTab(aIndex);
  });

  TUMu_hookCode("openNewWindowWith", "{", function() {
    if (TUMu_getPref("extensions.tabutils.singleWindowMode", false))
      return openNewTabWith(aURL, aDocument, aPostData, null, aAllowThirdPartyFixup, aReferrer);
  });

  TUMu_hookCode("openLinkIn", /(?=.*getTopWin.*)/, function() {
    if (where == "window" && TUMu_getPref("extensions.tabutils.singleWindowMode", false))
      where = "tab";
  });

  TUMu_hookCode("nsBrowserAccess.prototype.openURI", /(?=switch \(aWhere\))/, function() {
    if (aWhere == Ci.nsIBrowserDOMWindow.OPEN_NEWWINDOW && TUMu_getPref("extensions.tabutils.singleWindowMode", false))
      aWhere = Ci.nsIBrowserDOMWindow.OPEN_NEWTAB;
  });

  TUMu_hookCode("gBrowser.replaceTabWithWindow", "{", function() {
    if (TMP_console.isCallerInList(["_onDragEnd", "onxbldragend"]) && TUMu_getPref("extensions.tabutils.singleWindowMode", false))
      return null;
  });

  tabutils.addEventListener(window, "popupshown", function(event) {
    var singleWindowMode = TUMu_getPref("extensions.tabutils.singleWindowMode", false);
    [
      "appmenu_newNavigator",
      "appmenu_newPrivateWindow",
      "appmenu_recentlyClosedWindowsMenu",
      "menu_newNavigator",
      "menu_newPrivateWindow",
      "historyUndoWindowMenu",
      "context-openlink",
      "context-openlinkprivate",
      "context-openframe",
      "placesContext_open:newwindow"
    ].forEach(function(aId) {
      var item = event.originalTarget.getElementsByAttribute("id", aId)[0];
      if (item)
        item.setAttribute("disabled", singleWindowMode);
    });
  }, false);
};

//标记未读标签页
tabutils._unreadTab = function() {
  gBrowser.unreadTab = function unreadTab(aTab, aForce) {
    if (aForce == null)
      aForce = !aTab.hasAttribute("unread");

    if (aForce && !aTab.selected) {
      tabutils.setAttribute(aTab, "unread", true);
      aTab.setAttribute("rotate", aTab.getAttribute("rotate") != "true");
    }
    else {
      tabutils.removeAttribute(aTab, "unread");
      aTab.removeAttribute("rotate");
    }
  };

  // TUMu_hookCode("gBrowser.onTabRestoring", "}", function() {
  //   this.unreadTab(aTab, ss.getTabValue(aTab, "unread") == "true");
  // });
  //
  // TUMu_hookCode("gBrowser.onTabOpen", "}", function() {
  //   this.unreadTab(aTab, true);
  // });
  //
  // TUMu_hookCode("gBrowser.onTabSelect", "}", function() {
  //   this.unreadTab(aTab, false);
  // });
  //
  // TUMu_hookCode("gBrowser.setTabTitle", /(?=aTab.label = title;)/, function() {
  //   if (!aTab.hasAttribute("busy") && !aTab.linkedBrowser.__SS_restoreState)
  //     this.unreadTab(aTab, true);
  // });
  //
  // TUMu_hookCode("gBrowser.mTabProgressListener", 'this.mTab.setAttribute("unread", "true");', function() {
  //   if (!this.mBrowser.__SS_restoreState)
  //     this.mTabBrowser.unreadTab(this.mTab, true);
  // });
}

//保护标签页、锁定标签页、冻结标签页
tabutils._protectAndLockTab = function() {
  /* aRestoring = null: setAttribute + setTabValue + tagURI
   * aRestoring = false: setAttribute + setTabValue
   * aRestoring = true: setAttribute
   */
  gBrowser.protectTab = function protectTab(aTab, aForce, aRestoring) {
    if (aForce == aTab.hasAttribute("protected"))
      return;

    if (aForce == null)
      aForce = !aTab.hasAttribute("protected");

    if (!aForce) {
      aTab.removeAttribute("protected");
      if (!aRestoring)
        tabutils._ss.deleteTabValue(aTab, "protected");
      if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled) {
        PlacesUtils.tagging.untagURI(aTab.linkedBrowser.currentURI, ["protected"]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);
    }
    else {
      aTab.setAttribute("protected", true);
      if (!aRestoring)
        tabutils._ss.setTabValue(aTab, "protected", String(true));
      if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled && TUMu_getPref("extensions.tabutils.autoProtect", true)) {
        PlacesUtils.tagging.tagURI(aTab.linkedBrowser.currentURI, ["protected"]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);
    }
  };

  gBrowser.lockTab = function lockTab(aTab, aForce, aRestoring) {
    if (aForce == aTab.hasAttribute("locked"))
      return;

    if (aForce == null)
      aForce = !aTab.hasAttribute("locked");

    if (!aForce) {
      aTab.removeAttribute("locked");
      if (!aRestoring)
        tabutils._ss.deleteTabValue(aTab, "locked");
      if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled) {
        PlacesUtils.tagging.untagURI(aTab.linkedBrowser.currentURI, ["locked"]);
      }
    }
    else {
      aTab.setAttribute("locked", true);
      if (!aRestoring)
        tabutils._ss.setTabValue(aTab, "locked", String(true));
      if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled && TUMu_getPref("extensions.tabutils.autoLock", true)) {
        PlacesUtils.tagging.tagURI(aTab.linkedBrowser.currentURI, ["locked"]);
      }
    }
  };

  gBrowser.freezeTab = function freezeTab(aTab, aForce) {
    if (aForce == aTab.hasAttribute("protected") &&
        aForce == aTab.hasAttribute("locked"))
      return;

    if (aForce == null)
      aForce = !aTab.hasAttribute("protected") || !aTab.hasAttribute("locked");

    if (aForce) {
      this.protectTab(aTab, true);
      this.lockTab(aTab, true);
    }
    else {
      this.protectTab(aTab, false);
      this.lockTab(aTab, false);
    }
  };

  gBrowser.isProtected = function isProtected(aTab) {
    return aTab.hasAttribute("protected") || aTab.pinned && this._autoProtectPinned;
  };

  gBrowser.isLocked = function isLocked(aTab) {
    return aTab.hasAttribute("locked") || aTab.pinned && this._autoLockPinned;
  };

  TUMu_hookCode("gBrowser.onTabRestoring", "}", function() {
    this.protectTab(aTab, ss.getTabValue(aTab, "protected") == "true", true);
    this.lockTab(aTab, ss.getTabValue(aTab, "locked") == "true", true);
  });

  gBrowser.autoProtectTab = function autoProtectTab(aTab, aURI, aTags) {
    if (!aTab.hasAttribute("protected") && aTags.indexOf("protected") > -1 && TUMu_getPref("extensions.tabutils.autoProtect", true))
      this.protectTab(aTab, true, false);
  };

  gBrowser.autoLockTab = function autoLockTab(aTab, aURI, aTags) {
    if (aURI.spec != "about:blank" && TUMu_getPref("extensions.tabutils.autoLock", true)) {
      let locked = tabutils.getURIsForTag("locked").some(function(bURI) aURI.spec.startsWith(bURI.spec));
      this.lockTab(aTab, locked, false);
    }
  };

  TUMu_hookCode("gBrowser.onTabOpen", "}", "this.autoProtectTab(aTab, uri, tags);this.autoLockTab(aTab, uri, tags);");
  TUMu_hookCode("gBrowser.onLocationChange", "}", "this.autoProtectTab(aTab, uri, tags);this.autoLockTab(aTab, uri, tags);");

  TUMu_hookCode("gBrowser.removeTab", "{", function() {
    if (this.isProtected(aTab))
      return;
  });
  TUMu_hookCode("gBrowser.createTooltip", /(tab|tn).mOverCloseButton/, "$& && !$1.hasAttribute('protected')");

  TUMu_hookCode("gBrowser.loadURI", "{", function() {
    if (this.isLocked(this.mCurrentTab) && !aURI.startsWith("javascript:"))
      return this.loadOneTab(aURI, aReferrerURI, aCharset, null, null, false);
  });

  TUMu_hookCode("gBrowser.loadURIWithFlags", "{", function() {
    if (this.isLocked(this.mCurrentTab) && !aURI.startsWith("javascript:"))
      return this.loadOneTab(aURI, aReferrerURI, aCharset, aPostData, null, aFlags & Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP);
  });

  TUMu_hookCode("contentAreaClick", /if[^{}]*event.button == 0[^{}]*{([^{}]|{[^{}]*}|{([^{}]|{[^{}]*})*})*(?=})/, "$&" + (function() {
    if (gBrowser.isLocked(gBrowser.mCurrentTab) && !href.startsWith("javascript:")) {
      openNewTabWith(href, linkNode.ownerDocument, null, event, false);
      event.preventDefault();
      return;
    }
  }).toString().replace(/^.*{|}$/g, ""));
};

//图标化标签页
tabutils._faviconizeTab = function() {
  gBrowser.faviconizeTab = function faviconizeTab(aTab, aForce, aRestoring) {
    if (aForce == aTab.hasAttribute("faviconized"))
      return;

    if (aForce == null)
      aForce = !aTab.hasAttribute("faviconized");

    if (!aForce) {
      aTab.removeAttribute("faviconized");
      if (!aRestoring)
        tabutils._ss.deleteTabValue(aTab, "faviconized");
      if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled) {
        PlacesUtils.tagging.untagURI(aTab.linkedBrowser.currentURI, ["faviconized"]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);
    }
    else {
      aTab.setAttribute("faviconized", true);
      if (!aRestoring)
        tabutils._ss.setTabValue(aTab, "faviconized", String(true));
      if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled && TUMu_getPref("extensions.tabutils.autoFaviconize", true)) {
        PlacesUtils.tagging.tagURI(aTab.linkedBrowser.currentURI, ["faviconized"]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);
    }
  };

  TUMu_hookCode("gBrowser.onTabRestoring", "}", function() {
    this.faviconizeTab(aTab, ss.getTabValue(aTab, "faviconized") == "true", true);
  });

  gBrowser.autoFaviconizeTab = function autoFaviconizeTab(aTab, aURI, aTags) {
    if (this.mTabContainer.orient == "horizontal" && !aTab.pinned && aURI.spec != "about:blank" && TUMu_getPref("extensions.tabutils.autoFaviconize", true)) {
      let faviconized = tabutils.getURIsForTag("faviconized").some(function(bURI) aURI.spec.startsWith(bURI.spec));
      this.faviconizeTab(aTab, faviconized, false);
    }
  };

  TUMu_hookCode("gBrowser.onTabOpen", "}", "this.autoFaviconizeTab(aTab, uri, tags);");
  TUMu_hookCode("gBrowser.onLocationChange", "}", "this.autoFaviconizeTab(aTab, uri, tags);");
};

//固定标签页
tabutils._pinTab = function() {
};

//重命名标签页
tabutils._renameTab = function() {
  gBrowser.renameTab = function renameTab(aTab, aTitle, aRestoring) {
    if (aTab.getAttribute("title") == aTitle)
      return;

    aTab[aTitle ? "setAttribute" : "removeAttribute"]("title", aTitle);
    if (!aRestoring)
      tabutils._ss[aTitle ? "setTabValue" : "deleteTabValue"](aTab, "title", aTitle);

    if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled && TUMu_getPref("extensions.tabutils.autoRename", true)) {
      PlacesUtils.tagging[aTitle ? "tagURI" : "untagURI"](aTab.linkedBrowser.currentURI, ["autoRename"]);

      let itemId = PlacesUtils.getItemIdForTaggedURI(aTab.linkedBrowser.currentURI, "autoRename");
      if (itemId != -1)
        PlacesUtils.bookmarks.setItemTitle(itemId, aTitle);
    }

    this.setTabTitle(aTab);
  }

  TUMu_hookCode("gBrowser.onTabRestoring", "}", function() {
    tabutils.restoreAttribute(aTab, "title");
    if (aTab.hasAttribute("title")) {
      aTab.label = aTab.getAttribute("title");
      aTab.crop = "end";
    }
  });

  gBrowser.autoRenameTab = function autoRenameTab(aTab, aURI, aTags) {
    if (!aTab.hasAttribute("title") && aTags.indexOf("autoRename") > -1 && TUMu_getPref("extensions.tabutils.autoRename", true)) {
      let itemId = PlacesUtils.getItemIdForTaggedURI(aURI, "autoRename");
      this.renameTab(aTab, PlacesUtils.bookmarks.getItemTitle(itemId), false);
    }
  };

  TUMu_hookCode("gBrowser.onTabOpen", "}", "this.autoRenameTab(aTab, uri, tags);");
  TUMu_hookCode("gBrowser.onLocationChange", "}", "this.autoRenameTab(aTab, uri, tags);");

  TUMu_hookCode("gBrowser.setTabTitle", "browser.contentTitle", "aTab.getAttribute('title') || $&");
  TUMu_hookCode("gBrowser.getWindowTitleForBrowser", "aBrowser.contentTitle", "this.mTabs[this.browsers.indexOf(aBrowser)].getAttribute('title') || $&");

  //Bookmark title as Tab title
  TUMu_hookCode("gBrowser.loadOneTab",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]);"],
    [/(?=return tab;)/, function() {
      if (lastArg.title && TUMu_getPref("extensions.tabutils.titleAsBookmark", false))
        tab.setAttribute("title", lastArg.title);
    }]
  );

  TUMu_hookCode("gBrowser.loadTabs",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]), aTitles = TUMu_getPref('extensions.tabutils.titleAsBookmark', false) ? lastArg.titles : null;"],
    [/(\w+) = .*addTab.*\[(.*)\].*/g, function(s, s1, s2) (function() {
      $0
      if (aTitles && aTitles[$2])
        $1.setAttribute("title", aTitles[$2]);
    }).toString().replace(/^.*{|}$/g, "").replace("$0", s).replace("$1", s1, "g").replace("$2", s2, "g")]
  );
};

// Restart Tab
tabutils._restartTab = function() {
  gBrowser.restartTab = function restartTab(aTab) {
    if (aTab.hasAttribute("pending")) // Bug 817947 [Fx20]
      return;

    if (this.isLocked(aTab))
      return;

    var tabState = tabutils._ss.getTabState(aTab);
    var bTab = this.addTab();
    bTab.collapsed = true;
    bTab.linkedBrowser.stop();
    bTab.linkedBrowser.docShell;
    this.swapBrowsersAndCloseOther(aTab, bTab);
    tabutils._ss.setTabState(aTab, tabState);
  };

  gBrowser.autoRestartTab = function autoRestartTab(aTab) {
    if (aTab.selected || aTab._restartTimer || ["busy", "pending"].some(function(aAttr) aTab.hasAttribute(aAttr)))
      return;

    if (isBlankPageURL(aTab.linkedBrowser.currentURI.spec))
      return;

    let restartAfter = TUMu_getPref("extensions.tabutils.restartAfter", 0);
    if (restartAfter == 0)
      return;

    aTab._restartTimer = setTimeout(function(aTab) {
      if (aTab && aTab.parentNode)
        gBrowser.restartTab(aTab);
    }, restartAfter * 60 * 1000, aTab);
  };

  TUMu_hookCode("gBrowser.onTabSelect", "}", function() {
    if (aTab._restartTimer) {
      clearTimeout(aTab._restartTimer);
      aTab._restartTimer = null;
    }

    lastTab = this.getLastSelectedTab();
    if (lastTab)
      this.autoRestartTab(lastTab);
  });

  TUMu_hookCode("gBrowser.mTabProgressListener", /(?=var location)/, function() {
    if (this.mTab._restartTimer) {
      clearTimeout(this.mTab._restartTimer);
      this.mTab._restartTimer = null;
    }
    this.mTabBrowser.autoRestartTab(this.mTab);
  });
};

//自动刷新标签页
tabutils._reloadEvery = function() {
  gBrowser.autoReloadTab = function autoReloadTab(aTab, aForce, aRestoring, aInterval) {
    if (aForce == aTab.hasAttribute("autoReload") && (!aForce || aInterval == aTab._reloadInterval))
      return;

    if (aForce == null)
      aForce = !aTab.hasAttribute("autoReload");

    if (!aForce) {
      aTab.removeAttribute("autoReload");
      if (!aRestoring) {
        tabutils._ss.deleteTabValue(aTab, "autoReload");
        tabutils._ss.deleteTabValue(aTab, "reloadInterval");
      }
      if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled) {
        PlacesUtils.tagging.untagURI(aTab.linkedBrowser.currentURI, ["autoReload"]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);

      clearTimeout(aTab._reloadTimer);
    }
    else {
      aTab.setAttribute("autoReload", true);
      aTab._reloadInterval = aInterval || aTab._reloadInterval || TUMu_getPref("extensions.tabutils.reloadInterval", 10);
      TUMu_setPref("extensions.tabutils.reloadInterval", aTab._reloadInterval);
      if (!aRestoring) {
        tabutils._ss.setTabValue(aTab, "autoReload", String(true));
        tabutils._ss.setTabValue(aTab, "reloadInterval", String(aTab._reloadInterval));
      }

      if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled && TUMu_getPref("extensions.tabutils.autoEnableAutoReload", true)) {
        PlacesUtils.tagging.tagURI(aTab.linkedBrowser.currentURI, ["autoReload"]);

        let itemId = PlacesUtils.getItemIdForTaggedURI(aTab.linkedBrowser.currentURI, "autoReload");
        if (itemId != -1)
          PlacesUtils.setAnnotationsForItem(itemId, [{name: "reloadInterval", value: aTab._reloadInterval}]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);

      clearTimeout(aTab._reloadTimer);
      aTab._reloadTimer = setTimeout(function(aTab) {
        if (aTab && aTab.parentNode)
          gBrowser.reloadTab(aTab);
      }, aTab._reloadInterval * 1000, aTab);
    }
  };

  TUMu_hookCode("gBrowser.onTabRestoring", "}", function() {
    this.autoReloadTab(aTab, ss.getTabValue(aTab, "autoReload") == "true", true, ss.getTabValue(aTab, "reloadInterval"));
  });

  gBrowser.autoAutoReloadTab = function autoAutoReloadTab(aTab, aURI, aTags) {
    if (!aTab.hasAttribute("autoReload") && aTags.indexOf("autoReload") > -1 && TUMu_getPref("extensions.tabutils.autoEnableAutoReload", true)) {
      let itemId = PlacesUtils.getItemIdForTaggedURI(aURI, "autoReload"), reloadInterval;
      if (PlacesUtils.annotations.itemHasAnnotation(itemId, "reloadInterval")) {
        reloadInterval = PlacesUtils.annotations.getItemAnnotation(itemId, "reloadInterval");
      }
      this.autoReloadTab(aTab, true, false, reloadInterval);
    }
  };

  TUMu_hookCode("gBrowser.onTabOpen", "}", "this.autoAutoReloadTab(aTab, uri, tags);");
  TUMu_hookCode("gBrowser.onLocationChange", "}", "this.autoAutoReloadTab(aTab, uri, tags);");

  TUMu_hookCode("gBrowser.mTabProgressListener", /(?=var location)/, function() {
    if (this.mTab.hasAttribute("autoReload")) {
      clearTimeout(this.mTab._reloadTimer);
      this.mTab._reloadTimer = setTimeout(function(aTab) {
        if (aTab && aTab.parentNode)
          gBrowser.reloadTab(aTab);
      }, this.mTab._reloadInterval * 1000, this.mTab);
    }
  });

  gBrowser.updateAutoReloadPopup = function updateAutoReloadPopup(aPopup) {
    var sepCustom = aPopup.getElementsByAttribute("anonid", "sep_custom")[0];
    while (sepCustom.previousSibling.localName == "menuitem")
      aPopup.removeChild(sepCustom.previousSibling);

    aPopup.parentNode.getAttribute("list").split(",").forEach(function(value) {
      if (value > 0) {
        let item = aPopup.insertBefore(document.createElement("menuitem"), sepCustom);
        item.value = value;
        item.label = Label(value);
        item.setAttribute("type", "radio");
      }
    });

    aPopup.value = gBrowser.mContextTab._reloadInterval || TUMu_getPref("extensions.tabutils.reloadInterval", 10);
    aPopup.label = Label(aPopup.value);

    var itemEnable = aPopup.getElementsByAttribute("anonid", "enable")[0];
    itemEnable.setAttribute("checked", gBrowser.mContextTabs.every(function(aTab) aTab.hasAttribute("autoReload")));
    itemEnable.setAttribute("label", itemEnable.getAttribute("text") + ": " + aPopup.label);

    var itemCustom = aPopup.getElementsByAttribute("anonid", "custom")[0];
    var item = aPopup.getElementsByAttribute("value", aPopup.value)[0];
    if (item) {
      item.setAttribute("checked", true);
    }
    else {
      itemCustom.setAttribute("checked", true);
    }

    if (itemCustom.hasAttribute("checked")) {
      itemCustom.setAttribute("value", aPopup.value);
      itemCustom.setAttribute("label", itemCustom.getAttribute("text") + ": " + aPopup.label);
    }
    else {
      itemCustom.setAttribute("label", itemCustom.getAttribute("text") + PlacesUIUtils.ellipsis);
    }

    function Label(value) {
      let m = parseInt(value / 60), s = value % 60, result = [];
      if (m > 0) {
        result.push(m);
        result.push(aPopup.getAttribute(m > 1 ? "minutes" : "minute"));
      }
      if (s > 0 || m == 0) {
        result.push(s);
        result.push(aPopup.getAttribute(s > 1 ? "seconds" : "second"));
      }
      return result.join(" ");
    }
  };
};

// Bookmark tabs with history
tabutils._bookmarkTabs = function() {
  gBrowser.bookmarkTab = function(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    if (aTabs.length > 1) {
      let tabURIs = !gPrivateBrowsingUI.privateBrowsingEnabled && TUMu_getPref("extensions.tabutils.bookmarkWithHistory", false) ?
                    Array.map(aTabs, function(aTab) [aTab.linkedBrowser.currentURI, [{name: 'bookmarkProperties/tabState', value: tabutils._ss.getTabState(aTab)}]]) :
                    Array.map(aTabs, function(aTab) aTab.linkedBrowser.currentURI);
      PlacesUIUtils.showBookmarkDialog({action: "add",
                                        type: "folder",
                                        URIList: tabURIs,
                                        hiddenRows: ["description"]}, window);
    }
    else
      PlacesCommandHook.bookmarkPage(aTabs[0].linkedBrowser, PlacesUtils.bookmarksMenuFolderId, true);
  };

  if (tabutils.fxVersion < 40) { // https://hg.mozilla.org/mozilla-central/diff/d84b62b367b4/browser/base/content/browser-places.js
  TUMu_hookCode("PlacesCommandHook.bookmarkPage",
    [/(?=.*(createItem|PlacesCreateBookmarkTransaction).*)/, function() {
      var annos = [descAnno];
      if (!gPrivateBrowsingUI.privateBrowsingEnabled && TUMu_getPref("extensions.tabutils.bookmarkWithHistory", false)) {
        let tab = gBrowser.mTabs[gBrowser.browsers.indexOf(aBrowser)];
        if (tab)
          annos.push({name: "bookmarkProperties/tabState", value: tabutils._ss.getTabState(tab)});
      }
    }],
    [/.*(createItem|PlacesCreateBookmarkTransaction).*/, function(s) s.replace("[descAnno]", "annos")]  // Bug 575955 [Fx13]
  );
  }

  TUMu_hookCode("PlacesCommandHook.bookmarkCurrentPages",
    ["this.uniqueCurrentPages", (function() {
      !gPrivateBrowsingUI.privateBrowsingEnabled && TUMu_getPref("extensions.tabutils.bookmarkAllWithHistory", true) ?
      Array.map(gBrowser.allTabs, function(aTab) [aTab.linkedBrowser.currentURI, [{name: 'bookmarkProperties/tabState', value: tabutils._ss.getTabState(aTab)}]]) :
      Array.map(gBrowser.allTabs, function(aTab) aTab.linkedBrowser.currentURI);
    }).toString().replace(/^.*{|}$/g, "")],
    ["pages.length > 1", "true"]
  );

  //Highlight bookmarks with history
  TUMu_hookCode("PlacesViewBase.prototype._createMenuItemForPlacesNode", /(?=return element;)/, function() {
    if (aPlacesNode.itemId != -1 && PlacesUtils.annotations.itemHasAnnotation(aPlacesNode.itemId, "bookmarkProperties/tabState"))
      element.setAttribute("history", true);
  });

  TUMu_hookCode("PlacesToolbar.prototype._insertNewItem", "}", function() {
    if (aChild.itemId != -1 && PlacesUtils.annotations.itemHasAnnotation(aChild.itemId, "bookmarkProperties/tabState"))
      button.setAttribute("history", true);
  });

  //Open bookmarks with history
  TUMu_hookCode("gBrowser.loadOneTab",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]);"],
    [/(?=return tab;)/, function() {
      if (lastArg.itemId && PlacesUtils.annotations.itemHasAnnotation(lastArg.itemId, "bookmarkProperties/tabState")) {
        tab.linkedBrowser.stop();
        tabutils._ss.setTabState(tab, PlacesUtils.annotations.getItemAnnotation(lastArg.itemId, "bookmarkProperties/tabState"));
      }
    }]
  );

  TUMu_hookCode("gBrowser.loadTabs",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]), aItemIds = lastArg.itemIds;"],
    [/(\w+) = .*addTab.*\[(.*)\].*/g, function(s, s1, s2) (function() {
      $0
      if (aItemIds && aItemIds[$2] && PlacesUtils.annotations.itemHasAnnotation(aItemIds[$2], "bookmarkProperties/tabState")) {
        $1.linkedBrowser.stop();
        tabutils._ss.setTabState($1, PlacesUtils.annotations.getItemAnnotation(aItemIds[$2], "bookmarkProperties/tabState"));
      }
    }).toString().replace(/^.*{|}$/g, "").replace("$0", s).replace("$1", s1, "g").replace("$2", s2, "g")]
  );
};


// tabutils._miscFeatures = function() {
//   TUMu_hookCode("gBrowser.onTabOpen", "}", function() { //Bug 615039
//     TUMu_hookCode.call(aTab.linkedBrowser, "loadURIWithFlags", "{", function() {
//       try {
//         makeURI(aURI);
//       }
//       catch (e) {
//         try {
//           if (aURI && aURI.indexOf(".") == -1
//               && aFlags & Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP
//               && TUMu_getPref("keyword.enabled")
//               && TUMu_getPref("network.dns.ignoreHostonly", false))
//             aURI = Services.nsIURIFixup.keywordToURI(aURI).spec;
//         }
//         catch (e) {}
//       }
//     });
//   });
//
//   if ("TreeStyleTabBrowser" in window) //Compatibility with Tree Style Tab
//   TUMu_hookCode("TreeStyleTabBrowser.prototype.positionPinnedTabs", "{", "return;");
//
//   if ("openGMarkLabelInTabs" in window) //Compatibility with GMarks
//   TUMu_hookCode("openGMarkLabelInTabs",
//     [/.*openUILinkIn.*/, ""],
//     [/(?=.*(labelArray)(?![\s\S]*\1))/, function() {
//       var urls = [label.url for (label of labelArray)];
//       var loadInBackground = TUMu_getPref("browser.tabs.loadBookmarksInBackground");
//       gBrowser.loadTabs(urls, loadInBackground, false);
//     }]
//   );
//
//   TUMu_hookCode("BookmarkingUI" in window ? "BookmarkingUI._updateStar" : "PlacesStarButton._updateStateInternal", /(?=.*this._itemIds.*)/, function() { //Bug 650527
//     this._itemIds = this._itemIds.filter(function(itemId) {
//       var parentId = PlacesUtils.bookmarks.getFolderIdForItem(itemId);
//       var grandparentId = PlacesUtils.bookmarks.getFolderIdForItem(parentId);
//       return grandparentId != PlacesUtils.tagsFolderId;
//     });
//   });
//
//   //Compatibility with themes
//   for (let sheet of Array.slice(document.styleSheets)) {
//     switch (sheet.href) {
//       case "chrome://browser/skin/browser.css":
//         for (let cssRule of Array.slice(sheet.cssRules)) {
//           switch (cssRule.selectorText) {
//             case "#tabbrowser-tabs[positionpinnedtabs] > .tabbrowser-tab[pinned]:before": // Bug 877368 [Fx29]
//             case "#tabbrowser-tabs[positionpinnedtabs] > .tabbrowser-tab[pinned]::before":
//               tabutils.insertRule(cssRule.cssText.replace("#tabbrowser-tabs[positionpinnedtabs] >", ""));
//               break;
//             case ".tabbrowser-arrowscrollbox > .arrowscrollbox-scrollbox":
//               tabutils.insertRule(cssRule.cssText.replace(cssRule.selectorText, ".tabbrowser-tabs[orient='horizontal']:not([overflow]):not([multirow]) $&"))
//                       .style.MozMarginStart = "-" + cssRule.style.MozPaddingStart;
//               tabutils.insertRule(cssRule.cssText.replace(cssRule.selectorText, "#PinnedTabsBarItems"));
//               tabutils.insertRule(cssRule.cssText.replace(cssRule.selectorText, ".tabbrowser-tabs[orient='horizontal']:not([overflow]):not([multirow]) #PinnedTabsBarItems"))
//                       .style.MozMarginEnd = "-" + cssRule.style.MozPaddingEnd;
//               break;
//             case ".tab-throbber[pinned], .tab-icon-image[pinned]":
//             case ".tab-throbber[pinned], .tab-icon-image[pinned], .tabs-newtab-button > .toolbarbutton-icon":
//               tabutils.insertRule(cssRule.cssText.replace(cssRule.selectorText, '.tabbrowser-tabs[orient="horizontal"] > .tabbrowser-tab[faviconized] :-moz-any(.tab-throbber, .tab-icon-image)'));
//               break;
//             default:
//               if (/> .tabbrowser-tab/.test(cssRule.selectorText)) {
//                 tabutils.insertRule(cssRule.cssText.replace(RegExp.lastMatch, ".tabbrowser-tab"));
//                 continue;
//               }
//
//               if (/> .tabbrowser-arrowscrollbox > .arrowscrollbox-scrollbox/.test(cssRule.selectorText)) {
//                 tabutils.insertRule(cssRule.cssText.replace(RegExp.lastMatch, "#PinnedTabsBarItems"));
//                 continue;
//               }
//           }
//         }
//         break;
//       case "chrome://clrtabs/skin/prefs.css":
//         for (let cssRule of Array.slice(sheet.cssRules)) {
//           switch (cssRule.selectorText) {
//             case "tab.tabbrowser-tab .tab-text.tab-label": // Compat. with ColorfulTabs 17.2
//             case "#tabbrowser-tabs tab.tabbrowser-tab .tab-text.tab-label": // Compat. with ColorfulTabs 22.3
//               cssRule.style.setProperty("color", cssRule.style.getPropertyValue("color"), "");
//               break;
//           }
//         }
//         break;
//     }
//   }
// };

//浏览区右键菜单
tabutils._mainContextMenu = function() {
  nsContextMenu.prototype.isLinkSelected = function() {
    var focusedWindow = document.commandDispatcher.focusedWindow;
    if (!focusedWindow || focusedWindow == window)
      focusedWindow = window.content;

    var links = focusedWindow.document.links;
    var selection = focusedWindow.getSelection();
    if (!links || !selection)
      return false;

    this.linkURLs = [];
    for (let link of links) {
      if (selection.containsNode(link, true) && (link.offsetHeight > 0) && this.linkURLs.indexOf(link.href) == -1)
        this.linkURLs.push(link.href);
    }

    var item = document.getElementById("context-openselectedlinksintab");
    item.setAttribute("label", item.getAttribute("label").replace(/\d*(?=])/, this.linkURLs.length));

    return this.linkURLs.length > 1;
  };

  nsContextMenu.prototype.openSelectedLinksInTab = function() {
    this.linkURLs.forEach(function(aURL) openNewTabWith(aURL, this.target.ownerDocument, null, null, false), this);
  };

  //TUMu_hookCode("nsContextMenu.prototype.initOpenItems", /.*openlinkincurrent.*/, function(s) s.replace("onPlainTextLink", "shouldShow"));
  TUMu_hookCode("nsContextMenu.prototype.initOpenItems", "}", function() {
    this.showItem("context-openselectedlinksintab", this.isLinkSelected());
  });
};


// List all tabs
tabutils._allTabsPopup = function() {
  var allTabsPopup = gBrowser.mTabContainer.mAllTabsPopup;
  if (!allTabsPopup)
    return;

  tabutils.addEventListener(allTabsPopup.parentNode, "popupshowing", function(event) {
    while (allTabsPopup.firstChild && allTabsPopup.firstChild.tab) //Bug 714594 (Fx12), 716271 (Fx12)
      allTabsPopup.removeChild(allTabsPopup.firstChild);

    var lastVisibleItem = null;
    for (let item of allTabsPopup.childNodes) {
      if (item.tab)
        break;

      if (item.localName == "menuseparator")
        item.hidden = !lastVisibleItem || lastVisibleItem.localName == "menuseparator";

      if (!item.hidden && !item.collapsed)
        lastVisibleItem = item;
    }

    var item = $("context_showAllTabs");
    if (item && !item.hidden && !item.collapsed) {
      item.setAttribute("checked", gBrowser.mTabContainer.getAttribute("showAllTabs"));
      item.setAttribute("disabled", gBrowser.mTabContainer.orient == "vertical");
    }

    var tabs = gBrowser.allTabs;
    var item = $("context_readAllTabs");
    if (item && !item.hidden && !item.collapsed) {
      let unread = tabs.every(function(aTab) !aTab.hasAttribute("unread"));
      item.setAttribute("label", unread ? item.getAttribute("label_unread") : item.getAttribute("label_read"));
      item.setAttribute("disabled", tabs.every(function(aTab) aTab.selected));
    }

    [
      ["context_protectAllTabs", "protected"],
      ["context_lockAllTabs", "locked"],
      ["context_faviconizeAllTabs", "faviconized"]
    ].forEach(function([aId, aAttr]) {
      let item = $(aId);
      if (item && !item.hidden && !item.collapsed)
        item.setAttribute("checked", tabs.every(function(aTab) aTab.hasAttribute(aAttr)));
    });

    if (gBrowser.mTabContainer.orient == "vertical") {
      let item = $("context_faviconizeAllTabs");
      if (item && !item.hidden && !item.collapsed)
        item.setAttribute("disabled", tabs.every(function(aTab) !aTab.hasAttribute("faviconized")));
    }

    $("context_restartAllTabs").setAttribute("disabled", $("context_lockAllTabs").getAttribute("checked") == "true");
    $("context_closeAllTabs").setAttribute("disabled", $("context_protectAllTabs").getAttribute("checked") == "true");
    $("context_closeAllDuplicateTabs").setAttribute("disabled", $("context_protectAllTabs").getAttribute("checked") == "true");
    $("context_unselectAllTabs").setAttribute("disabled", gBrowser.selectedTabs.length == 0);
  }, true);

  function $() {return document.getElementById.apply(document, arguments);}
};

tabutils._hideTabBar = function() {
  if (onViewToolbarsPopupShowing.name == "onViewToolbarsPopupShowing") //Compa. with Omnibar
  TUMu_hookCode("onViewToolbarsPopupShowing", /(?=.*addon-bar.*)/, function() { // Bug 749804 [Fx29]
    let tabsToolbar = document.getElementById("TabsToolbar");
    if (toolbarNodes.indexOf(tabsToolbar) == -1)
      toolbarNodes.push(tabsToolbar);
  });

  if ("getTogglableToolbars" in window) // Bug 940669 [Fx29]
  TUMu_hookCode("getTogglableToolbars", /(?=.*return.*)/, function() {
    toolbarNodes = [...new Set(toolbarNodes)];
  });

  TUMu_hookCode("setToolbarVisibility", /.*setAttribute.*/, 'if (toolbar.id == "TabsToolbar") gBrowser.mTabContainer.visible = isVisible; else $&');
  TUMu_hookCode("gBrowser.mTabContainer.updateVisibility", "{", 'if (!TUMu_getPref("browser.tabs.autoHide")) return;');
};

//撤销关闭标签页按钮
tabutils._undoCloseTabButton = function() {
  TUMu_hookCode("RecentlyClosedTabsAndWindowsMenuUtils" in window ?
              "RecentlyClosedTabsAndWindowsMenuUtils._undoCloseMiddleClick" : // Bug 928640 [Fx27]
              "HistoryMenu.prototype._undoCloseMiddleClick",
    ["{", function() {
      if (aEvent.button == 2) {
        tabutils._ss.forgetClosedTab(window, Array.indexOf(aEvent.originalTarget.parentNode.childNodes, aEvent.originalTarget));
        aEvent.originalTarget.parentNode.removeChild(aEvent.originalTarget);
        tabutils.updateUndoCloseTabCommand();
        aEvent.preventDefault();
        return;
      }
    }],
    [/undoCloseTab.*/, function() { // Bug 942464 [Fx28]
      undoCloseTab(Array.indexOf(aEvent.originalTarget.parentNode.childNodes, aEvent.originalTarget));
      aEvent.originalTarget.parentNode.removeChild(aEvent.originalTarget);
    }]
  );

  TUMu_hookCode("HistoryMenu.prototype.populateUndoSubmenu",
    ["}", function() { // Bug 926928 [Fx27]
      for (let item = undoPopup.firstChild; item && item.localName == "menuitem"; item = item.nextSibling) {
        item.setAttribute("oncommand", "undoCloseTab(Array.indexOf(this.parentNode.childNodes, this));");
      }
    }],
    ["}", function() {
      var sanitizeItem = document.getElementById("sanitizeItem");
      var m = undoPopup.appendChild(document.createElement("menuitem"));
      m.setAttribute("label", sanitizeItem.getAttribute("label").replace("\u2026", ""));
      m.setAttribute("accesskey", sanitizeItem.getAttribute("accesskey"));
      m.addEventListener("command", function() {
        while (tabutils._ss.getClosedTabCount(window) > 0)
          tabutils._ss.forgetClosedTab(window, 0);
        tabutils.updateUndoCloseTabCommand();
      }, false);
    }],
    ["}", function() {
      undoPopup.setAttribute("onclick", "if (tabutils._ss.getClosedTabCount(window) == 0) closeMenus(this);event.stopPropagation();");
      undoPopup.setAttribute("oncommand", "event.stopPropagation();");
      undoPopup.setAttribute("context", "");
    }],
    ["}", function() { // Bug 958813
      if (!undoPopup.hasStatusListener) {
        undoPopup.addEventListener("DOMMenuItemActive", function(event) {XULBrowserWindow.setOverLink(event.target.getAttribute("targetURI"));}, false);
        undoPopup.addEventListener("DOMMenuItemInactive", function() {XULBrowserWindow.setOverLink("");}, false);
        undoPopup.hasStatusListener = true;
      }
    }]
  );

  tabutils._undoCloseMiddleClick = HistoryMenu.prototype._undoCloseMiddleClick;
  tabutils.populateUndoSubmenu = HistoryMenu.prototype.populateUndoSubmenu;
  tabutils._getClosedTabCount = HistoryMenu.prototype._getClosedTabCount; // Bug 1064217 [Fx35]
  TUMu_hookCode("tabutils.populateUndoSubmenu",
    [/var undoPopup.*/, "var undoPopup = arguments[0];"],
    [/.*undoMenu.*/g, ""],
    ["return;", "return false;"],
    ["}", "return true;"]
  );

  tabutils.updateUndoCloseTabCommand = function updateUndoCloseTabCommand() {
    if (tabutils._ss.getClosedTabCount(window) == 0)
      document.getElementById("History:UndoCloseTab").setAttribute("disabled", true);
    else
      document.getElementById("History:UndoCloseTab").removeAttribute("disabled");
    gBrowser._lastClosedTabsCount = null;
  };
  document.getElementById("History:UndoCloseTab").setAttribute("disabled", true);
  TUMu_hookCode("gBrowser.onTabClose", "}", "tabutils.updateUndoCloseTabCommand();");
  TUMu_hookCode("gBrowser.onTabRestoring", "}", "tabutils.updateUndoCloseTabCommand();");
  TUMu_hookCode("gSessionHistoryObserver.observe", "}", "tabutils.updateUndoCloseTabCommand();");
  TUMu_hookCode("TabContextMenu.updateContextMenu", 'document.getElementById("context_undoCloseTab").disabled =', "");
};

tabutils._firstRun = function() {
  if (TUMu_getPref("extensions.tabutils.firstRun"))
    return;
  TUMu_setPref("extensions.tabutils.firstRun", true);

  let navbar = document.getElementById("nav-bar");
  navbar.currentSet = navbar.currentSet.replace(/closetab-button|undoclosetab-button|button_tuOptions/g, "")
                                       .replace("urlbar-container", "closetab-button,undoclosetab-button,button_tuOptions,$&");
  navbar.setAttribute("currentset", navbar.currentSet);
  document.persist(navbar.id, "currentset");
};

tabutils._tabPrefObserver = {
  init: function() {
    window.addEventListener("unload", this, false);
    this.register();

    //Close buttons
    TUMu_hookCode("gBrowser.mTabContainer.adjustTabstrip",
    ["this._originalAdjustTabstripFunc();", "if (this.TUMu_mCloseButtons == 10) {this.mCloseButtons = this.legacy_mCloseButtons; $&}"],
		["}", function() {
        if (this.TUMu_mCloseButtons != 10) {
          var def = "alltabs";
          var map = {
             0: "activetab",
             1: "alltabs",
             2: "hidden",
            16: "activepointedtab",
            18: "pointedtab"
          };
          var value = map[this.TUMu_mCloseButtons] || def;
          if (value == "alltabs") {
            let tab = this.tabbrowser.visibleTabs[this.tabbrowser._numPinnedTabs];
            if (tab && tab.getBoundingClientRect().width <= this.mTabClipWidth) {
              value = "hidden";
            }
          }
          this.setAttribute("closebuttons", value);
        }
      }]
    );

    //Tab counter
    TUMu_hookCode("gBrowser.mTabContainer.adjustTabstrip", "{", function() {
      if (this.mAllTabsPopup) {
        let n = gBrowser.mTabs.length - gBrowser._removingTabs.length;
        let m = gBrowser.allTabs.length;
        this.mAllTabsPopup.parentNode.label = m == n ? n : [m, n].join("/");
      }
    });

    //Tab animations
    TUMu_hookCode("gBrowser.removeTab", 'window.getComputedStyle(aTab).maxWidth == "0.1px"', 'aTab.boxObject.width == 0');

    //Don't allow drag/dblclick on the tab bar to act on the window
    if ("_update" in TabsInTitlebar) // Compat. with Linux
    TUMu_hookCode("TabsInTitlebar._update", "!this._dragBindingAlive", "$& && TUMu_getPref('extensions.tabutils.dragBindingAlive', true)");

    Services.prefs.getChildList("extensions.tabutils.", {}).sort().concat([
      "browser.tabs.animate", //Bug 649671
      "browser.tabs.tabClipWidth",
      "browser.tabs.tabMaxWidth",
      "browser.tabs.tabMinWidth",
      "browser.tabs.tabMinHeight"
    ]).forEach(function(aPrefName) {
      this.observe(null, "nsPref:changed", aPrefName);
    }, this);
  },

  register: function() {
    Services.prefs.addObserver("", this, false);
  },

  unregister: function() {
    Services.prefs.removeObserver("", this);
  },

  cssRules: {},
  tabSelector: [
    '.tabbrowser-tab#Selector# > * > .tab-content',
    '.alltabs-item#Selector#'
  ].join(),
  textSelector: [
    '.tabbrowser-tab#Selector# > * > .tab-content > .tab-text',
    '.alltabs-item#Selector#'
  ].join(),
  bgSelector: [
    '.tabbrowser-tab#Selector#',
    '.tabbrowser-tab#Selector# > * > .tab-content',
    '.tabbrowser-tab#Selector# > * > .tab-content > *',
    '.alltabs-item#Selector#'
  ].join(),

  batching: false,
  observe: function(aSubject, aTopic, aData) {
    if (aTopic != "nsPref:changed" || this.batching)
      return;

    switch (aData) {
      case "browser.tabs.animate": this.animate();return;
      case "browser.tabs.tabClipWidth": this.tabClipWidth();return;
      case "browser.tabs.tabMaxWidth": this.tabMaxWidth();return;
      case "browser.tabs.tabMinWidth": this.tabMinWidth();return;
      case "browser.tabs.tabMinHeight": this.tabMinHeight();return;
    }

    if (!aData.startsWith("extensions.tabutils."))
      return;

    let name = aData.slice(20).replace(".", "_", "g");
    if (name in this) {
      this[name]();
      return;
    }

    //Tab stack coloring
    if (/^extensions.tabutils.colorStack.([0-9A-Fa-f]+)$/.test(aData)) {
      this.updateStackColor(RegExp.$1, TUMu_getPref(aData));
      return;
    }

    //Tab highlighting
    if (/^extensions.tabutils.(?:highlight|styles.|selector.)([^.]+)$/.test(aData)) {
      let prefName = RegExp.$1.toLowerCase();
      if (!(prefName in this.cssRules)) {
        let selector = TUMu_getPref("extensions.tabutils.selector." + prefName);
        if (!selector)
          return;

        this.cssRules[prefName] = {
          tab: tabutils.insertRule(this.tabSelector.replace('#Selector#', selector, 'g') + '{}'),
          text: tabutils.insertRule(this.textSelector.replace('#Selector#', selector, 'g') + '{}'),
          bg: tabutils.insertRule(this.bgSelector.replace('#Selector#', selector, 'g') + '{}')
        };
      }

      let style = {};
      try {
        if (TUMu_getPref("extensions.tabutils.highlight" + prefName[0].toUpperCase() + prefName.slice(1)))
          style = JSON.parse(TUMu_getPref("extensions.tabutils.styles." + prefName));
      }
      catch (e) {}

      let tabStyle = this.cssRules[prefName].tab.style;
      tabStyle.setProperty("outline", style.outline ? "1px solid" : "", "");
      tabStyle.setProperty("outline-offset", style.outline ? "-1px" : "", "");
      tabStyle.setProperty("outline-color", style.outline ? style.outlineColorCode : "", "");
      tabStyle.setProperty("-moz-outline-radius", style.outline ? "4px" : "", "");
      tabStyle.setProperty("opacity", style.opacity ? style.opacityCode : "", "");

      let textStyle = this.cssRules[prefName].text.style;
      textStyle.setProperty("font-weight", style.bold ? "bold" : "", "");
      textStyle.setProperty("font-style", style.italic ? "italic" : "", "");
      textStyle.setProperty("text-decoration", style.underline ? "underline" : style.strikethrough ? "line-through" : "", "");
      textStyle.setProperty("color", style.color ? style.colorCode : "", "important");

      let bgStyle = this.cssRules[prefName].bg.style;
      bgStyle.setProperty("background-image", style.bgColor ? "-moz-linear-gradient(" + style.bgColorCode + "," + style.bgColorCode + ")" : "", "important");
      return;
    }

    //Custom context menuitems
    if (/^extensions.tabutils.menu.([^.]+)$/.test(aData)) {
      let item = document.getElementById(RegExp.$1);
      if (item)
        item.collapsed = !TUMu_getPref(aData);
      return;
    }

    if (/^extensions.tabutils.menu.([^.]+).([^.]+)$/.test(aData)) {
      let item = document.getElementById(RegExp.$1);
      if (!item) {
        item = document.createElement("menuitem");
        item.id = RegExp.$1;
        item.collapsed = !TUMu_getPref("extensions.tabutils.menu." + RegExp.$1);

        if (item.id.toLowerCase().indexOf("alltabs") > -1 && gBrowser.mTabContainer.mAllTabsPopup)
          gBrowser.mTabContainer.mAllTabsPopup.insertBefore(item, document.getElementById("sep_closeAllTabs"));
        else
          gBrowser.tabContextMenu.insertBefore(item, document.getElementById("sep_closeTab"));
      }
      this.setAttribute(item, RegExp.$2, TUMu_getPref(aData));
      return;
    }

    //Custom shortcut keys
    if (/^extensions.tabutils.shortcut.([^.]+)$/.test(aData)) {
      let key = document.getElementById(RegExp.$1);
      if (key)
        key.setAttribute("disabled", !TUMu_getPref(aData));
      return;
    }

    if (/^extensions.tabutils.shortcut.([^.]+).([^.]+)$/.test(aData)) {
      let key = document.getElementById(RegExp.$1);
      if (!key) {
        key = document.getElementById("tuKeyset").appendChild(document.createElement("key"));
        key.id = RegExp.$1;
        key.setAttribute("disabled", !TUMu_getPref("extensions.tabutils.shortcut." + RegExp.$1));
      }
      this.setAttribute(key, RegExp.$2, TUMu_getPref(aData));
      return;
    }

    //Custom toolbar buttons
    if (/^extensions.tabutils.button.([^.]+)$/.test(aData)) {
      let button = document.getElementById(RegExp.$1);
      if (button)
        button.collapsed = !TUMu_getPref(aData);
      return;
    }

    if (/^extensions.tabutils.button.(newtab-button|alltabs-button|tabs-closebutton).([^.]+)$/.test(aData)) {
      [
        gBrowser.mTabContainer.mTabstrip.querySelector(".tabs-" + RegExp.$1),
        document.getAnonymousElementByAttribute(gBrowser.mTabContainer, "anonid", RegExp.$1),
        document.getElementById(RegExp.$1 == "newtab-button" ? "new-tab-button" : RegExp.$1)
      ].forEach(function(button) {
        if (button)
          this.setAttribute(button, RegExp.$2, TUMu_getPref(aData));
      }, this);
      return;
    }

    if (/^extensions.tabutils.button.([^.]+).([^.]+)$/.test(aData)) {
      let button = document.getElementById(RegExp.$1) || gNavToolbox.palette.getElementsByAttribute("id", RegExp.$1)[0];
      if (!button) {
        button = document.getElementById("nav-bar").appendChild(document.createElement("toolbarbutton"));
        button.id = RegExp.$1;
        button.image = gBrowser.mFaviconService.defaultFavicon.spec;
        button.className = "toolbarbutton-1 chromeclass-toolbar-additional";
        button.collapsed = !TUMu_getPref("extensions.tabutils.button." + RegExp.$1);
      }
      this.setAttribute(button, RegExp.$2, TUMu_getPref(aData));
      return;
    }

    //Inject CSS code
    if (/^extensions.tabutils.css.[^.]+$/.test(aData)) {
      try {
        tabutils.insertRule(TUMu_getPref(aData));
      }
      catch (e) {}
      return;
    }

    //Inject JS code
    if (/^extensions.tabutils.js.[^.]+$/.test(aData)) {
      try {
        new Function(TUMu_getPref(aData))();
      }
      catch (e) {}
      return;
    }
  },

  setAttribute: function(aElt, aAttr, aVal) {
    if (aVal == null) {
      aElt.removeAttribute(aAttr);
      return;
    }

    aElt.setAttribute(aAttr, aVal);

    if (aAttr == "insertbefore") {
      let refNode = document.getElementById(aVal);
      if (refNode)
        refNode.parentNode.insertBefore(aElt, refNode);
      return;
    }

    if (aAttr == "insertafter") {
      let refNode = document.getElementById(aVal);
      if (refNode)
        refNode.parentNode.insertBefore(aElt, refNode.nextSibling);
      return;
    }

    if (aAttr == "parent") {
      let parentNode = document.getElementById(aVal);
      if (parentNode)
        parentNode.appendChild(aElt);
      return;
    }

    if (aAttr == "separator") {
      let refNode = aVal == "before" ? aElt : aElt.nextSibling;
      if (aElt.localName == "menuitem" || aElt.localName == "menu")
        aElt.parentNode.insertBefore(document.createElement("menuseparator"), refNode);
      else if (aElt.localName == "toolbarbutton" || aElt.localName == "toolbaritem")
        aElt.parentNode.insertBefore(document.createElement("toolbarseparator"), refNode);
    }
  },

  animate: function() {
    gBrowser.mTabContainer.setAttribute("dontanimate", !TUMu_getPref("browser.tabs.animate"));
  },

  tabClipWidth: function() {
    gBrowser.mTabContainer.mTabClipWidth = TUMu_getPref("browser.tabs.tabClipWidth");
    gBrowser.mTabContainer.adjustTabstrip();
  },

  tabMaxWidth: function() {
    this._tabWidthRule[0].style.setProperty("max-width", TUMu_getPref("browser.tabs.tabMaxWidth") + "px", "");
    this._tabWidthRule[1].style.setProperty("width", TUMu_getPref("browser.tabs.tabMaxWidth") + "px", "");
    gBrowser.mTabContainer.adjustTabstrip();
  },

  tabMinWidth: function() {
    this._tabWidthRule[0].style.setProperty("min-width", TUMu_getPref("browser.tabs.tabMinWidth") + "px", "");
    gBrowser.mTabContainer.adjustTabstrip();
  },

  tabFitTitle: function() {
    gBrowser.mTabContainer.setAttribute("tabfittitle", TUMu_getPref("extensions.tabutils.tabFitTitle"));
  },

  tabMinHeight: function() {
    this._tabHeightRule[0].style.setProperty("min-height", TUMu_getPref("browser.tabs.tabMinHeight") + "px", "important");
    this.tabstripHeight();
  },

  tabstripHeight: function() {
    var tab = gBrowser.mTabContainer.lastChild;
    while (tab && tab.boxObject.height == 0)
      tab = tab.previousSibling;
    if (!tab)
      return;

    var wasSelected = tab.selected;
    var wasPinned = tab.pinned;

    tab.removeAttribute("selected");
    tab.removeAttribute("pinned");
    this._tabHeightRule[1].style.minHeight = "";

    var style = getComputedStyle(tab);
    var height = tab.boxObject.height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    this._tabHeightRule[1].style.minHeight = height + "px";

    wasSelected ? tab.setAttribute("selected", true) : tab.removeAttribute("selected");
    wasPinned ? tab.setAttribute("pinned", true) : tab.removeAttribute("pinned");
  },

  get _tabWidthRule() {
    delete this._tabWidthRule;
    return this._tabWidthRule = [
      tabutils.insertRule('.tabbrowser-tab:not([faviconized]) {width: 0; -moz-box-flex: 100;}'),
      tabutils.insertRule('.tabbrowser-arrowscrollbox[orient="vertical"] > scrollbox {}'),
      tabutils.insertRule('#tabbrowser-tabs[orient="vertical"] > .tabbrowser-tab {max-width: none !important; -moz-box-flex: 0;}')
    ];
  },

  get _tabHeightRule() {
    delete this._tabHeightRule;
    return this._tabHeightRule = [
      tabutils.insertRule('.tabbrowser-tab, .tabbrowser-arrowscrollbox > .tabs-newtab-button {}'),
      tabutils.insertRule('.tabbrowser-tabs:not([multirow]) .tabbrowser-arrowscrollbox > scrollbox {}')
    ];
  },

  closeButtons: function() {
    gBrowser.mTabContainer.legacy_mCloseButtons = TUMu_getPref("browser.tabs.closeButtons");
    gBrowser.mTabContainer.TUMu_mCloseButtons = TUMu_getPref("extensions.tabutils.closeButtons");
    gBrowser.mTabContainer.adjustTabstrip();
  },

  showTabCounter: function() {
    var allTabsPopup = gBrowser.mTabContainer.mAllTabsPopup;
    if (allTabsPopup)
      allTabsPopup.parentNode.setAttribute("showTabCounter", TUMu_getPref("extensions.tabutils.showTabCounter"));

    gBrowser.mTabContainer.adjustTabstrip();
    this.tabstripHeight();
  },

  showLeftSpace: function() {
    gBrowser.mTabContainer.setAttribute("showLeftSpace", TUMu_getPref("extensions.tabutils.showLeftSpace"));
    gBrowser.mTabContainer.adjustTabstrip();
  },

  showRightSpace: function() {
    gBrowser.mTabContainer.setAttribute("showRightSpace", TUMu_getPref("extensions.tabutils.showRightSpace"));
    gBrowser.mTabContainer.adjustTabstrip();
  },

  statusbarMode: function() {
    switch (TUMu_getPref("extensions.tabutils.statusbarMode")) {
      case 0: document.getElementById("status-bar").setAttribute("mode", "icons");break;
      case 1: document.getElementById("status-bar").setAttribute("mode", "text");break;
      default: document.getElementById("status-bar").setAttribute("mode", "full");break;
    }
  },

  hideOpenInTab: function() {
    var hideOpenInTab = TUMu_getPref("extensions.tabutils.hideOpenInTab");
    var toolbarItem = document.getElementById("statusbar-openintab");
    //Check if toolbar item is not removed by user
    if (toolbarItem) {
      toolbarItem.collapsed = hideOpenInTab;
    }
  },

  hideLoadInBackground: function() {
    var hideLoadInBackground = TUMu_getPref("extensions.tabutils.hideLoadInBackground");
    if (hideLoadInBackground)
      TUMu_setPref("extensions.tabutils.loadAllInBackground", false);
    var toolbarItem = document.getElementById("statusbar-loadinbackground");
    //Check if toolbar item is not removed by user
    if (toolbarItem) {
      toolbarItem.collapsed = hideLoadInBackground;
    }
  },

  hideLoadInForeground: function() {
    var hideLoadInForeground = TUMu_getPref("extensions.tabutils.hideLoadInForeground");
    if (hideLoadInForeground)
      TUMu_setPref("extensions.tabutils.loadAllInForeground", false);
    var toolbarItem = document.getElementById("statusbar-loadinforeground");
    //Check if toolbar item is not removed by user
    if (toolbarItem) {
      toolbarItem.collapsed = hideLoadInForeground;
    }
  },

  openLinkInTab: function() {
    tabutils.gOpenLinkInTab = TUMu_getPref("extensions.tabutils.openLinkInTab");
    var toolbarItem = document.getElementById("statusbar-openintab");
    //Check if toolbar item is not removed by user
    if (toolbarItem) {
      toolbarItem.setAttribute("checked", tabutils.gOpenLinkInTab);
    }
  },

  loadAllInBackground: function() {
    tabutils.gLoadAllInBackground = TUMu_getPref("extensions.tabutils.loadAllInBackground");
    if (tabutils.gLoadAllInBackground)
      TUMu_setPref("extensions.tabutils.loadAllInForeground", false);
    var toolbarItem = document.getElementById("statusbar-loadinbackground");
    //Check if toolbar item is not removed by user
    if (toolbarItem) {
      toolbarItem.setAttribute("checked", tabutils.gLoadAllInBackground);
    }
  },

  loadAllInForeground: function() {
    tabutils.gLoadAllInForeground = TUMu_getPref("extensions.tabutils.loadAllInForeground");
    if (tabutils.gLoadAllInForeground)
      TUMu_setPref("extensions.tabutils.loadAllInBackground", false);
    var toolbarItem = document.getElementById("statusbar-loadinforeground");
    //Check if toolbar item is not removed by user
    if (toolbarItem) {
      toolbarItem.setAttribute("checked", tabutils.gLoadAllInForeground);
    }
  },

  loadInNewTab: function() {
    switch (TUMu_getPref("extensions.tabutils.loadInNewTab")) {
      case 0: TUMu_setPref("browser.newtab.url", "about:blank");break;
      case 1: TUMu_setPref("browser.newtab.url", gHomeButton.getHomePage().split("|")[0]);break;
    }
  },

  dragBindingAlive: function() {
    let tabsToolbar = document.getElementById("TabsToolbar");
    if (tabsToolbar._dragBindingAlive != null)
      tabsToolbar._dragBindingAlive = TUMu_getPref("extensions.tabutils.dragBindingAlive", true);
  },

  pinTab_autoProtect: function() {
    gBrowser._autoProtectPinned = TUMu_getPref("extensions.tabutils.pinTab.autoProtect");
  },

  pinTab_autoLock: function() {
    gBrowser._autoLockPinned = TUMu_getPref("extensions.tabutils.pinTab.autoLock");
  },

  pinTab_autoFaviconize: function() {
    gBrowser._autoFaviconizePinned = TUMu_getPref("extensions.tabutils.pinTab.autoFaviconize");
    gBrowser.mTabContainer.setAttribute("autoFaviconizePinned", gBrowser._autoFaviconizePinned);
    gBrowser.mTabContainer.positionPinnedTabs();
    gBrowser.mTabContainer.adjustTabstrip();
  },

  pinTab_showPhantom: function() {
    gBrowser.updatePinnedTabsBar();
    gBrowser.mTabContainer.setAttribute("showPhantom", TUMu_getPref("extensions.tabutils.pinTab.showPhantom"));
    gBrowser.mTabContainer.positionPinnedTabs();
    gBrowser.mTabContainer.adjustTabstrip();
  },

  colorStack: function() {
    gBrowser.mTabContainer.setAttribute("colorStack", TUMu_getPref("extensions.tabutils.colorStack"));
  },

  toolbarShadowOnTab: "-moz-linear-gradient(bottom, rgba(10%,10%,10%,.4) 1px, transparent 1px)",
  bgTabTexture: "-moz-linear-gradient(transparent, hsla(0,0%,45%,.1) 1px, hsla(0,0%,32%,.2) 80%, hsla(0,0%,0%,.2))",
  bgTabTextureHover: "-moz-linear-gradient(hsla(0,0%,100%,.3) 1px, hsla(0,0%,75%,.2) 80%, hsla(0,0%,60%,.2))",
  selectedTabTexture: "-moz-linear-gradient(rgba(255,255,255,0), rgba(255,255,255,.5) 50%)",

  _tabColoringRules: {},
  updateStackColor: function(group, color) {
    if (color && !(group in this._tabColoringRules)) {
      let selectorText;
      if (group[0] == "{")
        selectorText = '#main-window .tabbrowser-tab[group="' + group + '"]:not([group-counter="1"])';
      else
        selectorText = '.tabbrowser-tabs[colorStack="true"] > .tabbrowser-tab[group^="{' + group + '"]:not([group-counter="1"])';

      this._tabColoringRules[group] = [
        tabutils.insertRule(selectorText + '{}'),
        tabutils.insertRule(selectorText + ':hover {}'),
        tabutils.insertRule(selectorText + '[selected] {}'),
        tabutils.insertRule('#main-window[tabsontop=false]:not([disablechrome]) ' + selectorText.replace('#main-window', '#tabbrowser-tabs >') + '[selected]:not(:-moz-lwtheme) {}')
      ];
    }

    if (group in this._tabColoringRules) {
      let gradient = '-moz-linear-gradient(' + color + ', -moz-dialog)';
      this._tabColoringRules[group][0].style.backgroundImage = color ? [this.toolbarShadowOnTab, this.bgTabTexture, gradient].join() : "";
      this._tabColoringRules[group][1].style.backgroundImage = color ? [this.toolbarShadowOnTab, this.bgTabTextureHover, gradient].join() : "";
      this._tabColoringRules[group][2].style.backgroundImage = color ? [this.selectedTabTexture, gradient].join() : "";
      this._tabColoringRules[group][3].style.backgroundImage = color ? [this.toolbarShadowOnTab, this.selectedTabTexture, gradient].join() : "";
    }
  },

  handleEvent: function(event) {
    switch (event.type) {
      case "load":
        window.removeEventListener("load", this, false);
        this.init();
        break;
      case "unload":
        window.removeEventListener("unload", this, false);
        this.unregister();
        break;
    }
  }
};

tabutils._tagsFolderObserver = {
  _tags: ["protected", "locked", "faviconized", "pinned", "autoRename", "autoReload"],
  _tagIds: [],
  _taggedURIs: [],

  _getIndexForTag: function(aTag) {
    for (let i = 0; i < this._tags.length; i++) {
      if (this._tags[i].toLowerCase() == aTag.toLowerCase())
        return i;
    }
    return -1;
  },

  _updateTaggedURIs: function(aTag, aIndex) {
    if (aIndex == null) {
      aIndex = typeof(aTag) == "string" ? this._getIndexForTag(aTag)
                                        : this._tagIds.indexOf(aTag);
      if (aIndex == -1)
        return;
      aTag = this._tags[aIndex];
    }

    this._tagIds[aIndex] = -1;
    this._taggedURIs[aIndex] = PlacesUtils.tagging.getURIsForTag(aTag);
    this._tagIds[aIndex] = PlacesUtils.getItemIdForTag(aTag);
  },

  init: function() {
    this._tags.forEach(this._updateTaggedURIs, this);
    PlacesUtils.bookmarks.addObserver(this, false);
  },

  uninit: function() {
    PlacesUtils.bookmarks.removeObserver(this);
  },

  getURIsForTag: function(aTag) {
    let index = this._getIndexForTag(aTag);
    return index > -1 && this._tagIds[index] > -1 ? this._taggedURIs[index] : [];
  },

  getTagsForURI: function(aURI) {
    let tags = [];
    this._tags.forEach(function(aTag, aIndex) {
      if (this._tagIds[aIndex] > -1 &&
          this._taggedURIs[aIndex].some(function(bURI) aURI.spec == bURI.spec))
        tags.push(aTag);
    }, this);
    return tags;
  },

  onItemAdded: function(aItemId, aParentId, aIndex, aItemType, aURI, aTitle/* 6.0 */) {
    if (aParentId == PlacesUtils.bookmarks.tagsFolder &&
        aItemType == PlacesUtils.bookmarks.TYPE_FOLDER) {
      if (aTitle == null)
        aTitle = PlacesUtils.bookmarks.getItemTitle(aItemId);
      this._updateTaggedURIs(aTitle);
    }
    else if (aItemType == PlacesUtils.bookmarks.TYPE_BOOKMARK) {
      this._updateTaggedURIs(aParentId);
    }
  },

  onItemRemoved: function(aItemId, aParentId, aIndex, aItemType) {
    if (aParentId == PlacesUtils.bookmarks.tagsFolder &&
        aItemType == PlacesUtils.bookmarks.TYPE_FOLDER) {
      this._updateTaggedURIs(aItemId);
    }
    else if (aItemType == PlacesUtils.bookmarks.TYPE_BOOKMARK) {
      this._updateTaggedURIs(aParentId);
    }
  },

  onItemChanged: function(aItemId, aProperty, aIsAnnotationProperty, aNewValue, aLastModified, aItemType, aParentId/* 6.0 */) {
    if (aParentId == null)
      aParentId = PlacesUtils.bookmarks.getFolderIdForItem(aItemId);

    if (aProperty == "title" &&
        aParentId == PlacesUtils.bookmarks.tagsFolder &&
        aItemType == PlacesUtils.bookmarks.TYPE_FOLDER) {
      this._updateTaggedURIs(aItemId);
      this._updateTaggedURIs(aNewValue);
    }
    else if (aProperty = "uri" && aItemType == PlacesUtils.bookmarks.TYPE_BOOKMARK) {
      this._updateTaggedURIs(aParentId);
    }
  },

  onItemMoved: function(aItemId, aOldParentId, aOldIndex, aNewParentId, aNewIndex, aItemType) {
    if (aItemType == PlacesUtils.bookmarks.TYPE_FOLDER) {
      if (aOldParentId == PlacesUtils.bookmarks.tagsFolder)
        this._updateTaggedURIs(aItemId);
      else if (aNewParentId == PlacesUtils.bookmarks.tagsFolder)
        this._updateTaggedURIs(PlacesUtils.bookmarks.getItemTitle(aItemId));
    }
    else if (aItemType == PlacesUtils.bookmarks.TYPE_BOOKMARK) {
      this._updateTaggedURIs(aOldParentId);
      this._updateTaggedURIs(aNewParentId);
    }
  },

  onBeginUpdateBatch: function() {},
  onEndUpdateBatch: function() {},
  onBeforeItemRemoved: function() {},
  onItemVisited: function() {},
  QueryInterface: XPCOMUtils.generateQI([Ci.nsINavBookmarkObserver])
};

tabutils._tabOpeningOptions = function() {

  //新建标签页时利用已有空白标签页
  // TUMu_hookCode("gBrowser.addTab",
  //   [/if \(arguments.length == 2[^{}]*\) {[^{}]*}/, "$&" + (function() {
  //     if (!isBlankPageURL(aURI)) {
  //       let t = aFromExternal && isTabEmpty(this.selectedTab) && this.selectedTab || this.getBlankTab();
  //       if (t) {
  //         let b = this.getBrowserForTab(t);
  //         return t;
  //       }
  //     }
  //   }).toString().replace(/^.*{|}$/g, "")],
  //   [/(?=return t;)/, gBrowser.addTab.toString().match(/var (uriIsBlankPage|uriIsNotAboutBlank|uriIsAboutBlank).*|let (docShellsSwapped|usingPreloadedContent)[\s\S]*(?=\n.*(docShellsSwapped|usingPreloadedContent).*)|if \((uriIsNotAboutBlank|.*uriIsAboutBlank)\) {([^{}]|{[^{}]*})*}/g).join("\n")] // Bug 716108 [Fx16], Bug 1077652 [Fx37]
  // );

  gBrowser.getBlankTab = function getBlankTab() {
    var reuseBlank = TUMu_getPref("extensions.tabutils.reuseBlank", 1);
    return reuseBlank & 1 && this.isBlankTab(this.mCurrentTab) ? this.mCurrentTab :
           reuseBlank & 2 && this.isBlankTab(this.mTabContainer.lastChild) ? this.mTabContainer.lastChild :
           reuseBlank & 4 ? this.getFirstBlankTabBut() : null;
  };

  gBrowser.getFirstBlankTabBut = function getFirstBlankTabBut(aTab) {
    for (let tab of this.visibleTabs) {
      if (tab != aTab && this.isBlankTab(tab))
        return tab;
    }
  };

  gBrowser.isBlankTab = function isBlankTab(aTab) {
    return this.isBlankBrowser(aTab.linkedBrowser)
        && ["busy", "pending"].every(function(aAttr) !aTab.hasAttribute(aAttr));
  };

  gBrowser.isBlankBrowser = function isBlankBrowser(aBrowser) {
    return (!aBrowser.currentURI || isBlankPageURL(aBrowser.currentURI.spec))
        && (!aBrowser.sessionHistory || aBrowser.sessionHistory.count < 2)
        && (!aBrowser.webProgress || !aBrowser.webProgress.isLoadingDocument);
  };
  // TUMu_hookCode("isBlankPageURL", 'aURL == "about:blank"', "gInitialPages.indexOf(aURL) > -1");

  //自动关闭非主动打开的空白标签页
  // TUMu_hookCode("gBrowser.mTabProgressListener", /(?=var location)/, function() {
  //   if (aWebProgress.DOMWindow.document.documentURI == "about:blank"
  //       && aRequest.QueryInterface(nsIChannel).URI.spec != "about:blank"
  //       && aStatus == 0
  //       && TUMu_getPref("extensions.tabutils.removeUnintentionalBlank", true)) {
  //     let win = aWebProgress.DOMWindow;
  //     win._closeTimer = win.setTimeout(function() {
  //       this.mTabBrowser.isBlankTab(this.mTab) && this.mTabBrowser.removeTab(this.mTab);
  //     }.bind(this), 750);
  //   }
  // });

  // Not understand the purpose of the module,
  // and it has been broken since Firefox 38.
  // https://hg.mozilla.org/releases/mozilla-aurora/diff/120b108aa176/toolkit/mozapps/downloads/DownloadLastDir.jsm [Bug 1115248]
  /*
  let tmp = {};
  Cu.import("resource://gre/modules/DownloadLastDir.jsm", tmp);

  if (tmp.DownloadLastDir && // Bug 722995 [Fx19]
      tmp.DownloadLastDir.prototype.getFileAsync && // Bug 854299 [Fx23]
      tmp.DownloadLastDir.prototype.getFileAsync.name != "TUMu_getFileAsync")
  tmp.DownloadLastDir.prototype.getFileAsync = (function() {
    let getFileAsync = tmp.DownloadLastDir.prototype.getFileAsync;
    return function TUMu_getFileAsync(aURI, aCallback) {
      let win = this.window;
      if (win._closeTimer) {
        win.clearTimeout(win._closeTimer);
        win._closeTimer = null;

        aCallback = (function() {
          let lastDirCallback = aCallback;
          return function TUMu_LastDirCallback(lastDir) {
            lastDirCallback(lastDir);
            if (!win.closed) {
              win.setTimeout(win.close, 250);
            }
          };
        })();
      }
      getFileAsync.apply(this, arguments);
    };
  })();
  */

  //在当前标签页的右侧打开新标签页
  //连续打开后台标签时保持原有顺序
  // TUMu_hookCode("gBrowser.addTab",
  //   [/\S*insertRelatedAfterCurrent\S*(?=\))/, "false"],
  //   [/(?=(return t;)(?![\s\S]*\1))/, function() {
  //     if (t.hasAttribute("opener")) {
  //       function shouldStack(tab) { let args = tab.arguments; return args.aReferrerURI || args.aRelatedToCurrent && args.aURI != "about:blank"; }
  //
  //       let lastRelatedTab = this.mCurrentTab;
  //       let isStack = this.isStackedTab(lastRelatedTab);
  //       let willStack = (isStack || TUMu_getPref("extensions.tabutils.autoStack", false)) && shouldStack(t);
  //       if (isStack && !willStack)
  //         lastRelatedTab = this.lastSiblingTabOf(lastRelatedTab);
  //
  //       if (TUMu_getPref("extensions.tabutils.openTabNext.keepOrder", true)) {
  //         let tab = lastRelatedTab.nextSibling;
  //         let panelId = this.mCurrentTab.linkedPanel + "#";
  //         for (; tab && tab.pinned; tab = tab.nextSibling);
  //         for (; tab && tab.getAttribute("opener") == panelId && tab != t && (!willStack || shouldStack(tab)); tab = tab.nextSibling)
  //           lastRelatedTab = tab;
  //       }
  //
  //       if (willStack)
  //         this.attachTabTo(t, lastRelatedTab, {move: true, expand: true});
  //       this.moveTabTo(t, t._tPos > lastRelatedTab._tPos ? lastRelatedTab._tPos + 1 : lastRelatedTab._tPos);
  //     }
  //   }]
  // );

  // TUMu_hookCode("gBrowser.onTabOpen", "}", function() {
  //   if ((function() {
  //     switch (TUMu_getPref("extensions.tabutils.openTabNext", 1)) {
  //       case 1: //All
  //       case 2: return aRelatedToCurrent || aReferrerURI || (aURI != "about:blank" && aURI != "about:newtab"); //All but New Tab
  //       case 3: return aRelatedToCurrent == null ? aReferrerURI : aRelatedToCurrent; //None but Links
  //       default: return false; //None
  //     }
  //   })()) {
  //     aTab.setAttribute("opener", this.mCurrentTab.linkedPanel + "#");
  //   }
  // });
  //
  // TUMu_hookCode("gBrowser.onTabPinned", "}", function() {
  //   aTab.removeAttribute("opener");
  // });
  //
  // TUMu_hookCode("gBrowser.onTabUnstacked", "}", function() {
  //   aTab.removeAttribute("opener");
  //   if (aTab.selected)
  //     this.updateCurrentBrowser(true);
  // });

  //新建标签页
  // if (BrowserOpenTab.name == "BrowserOpenTab") { //Compatibility with Speed Dial
  //   TUMu_hookCode("BrowserOpenTab",
  //     [/.*openUILinkIn\((.*)\)/, function(s, s1) s.replace(s1, (
  //       s1 = s1.split(","),
  //       s1.push("{inBackground: TUMu_getPref('extensions.tabutils.loadNewInBackground', false)}"),
  //       s1.push("{relatedToCurrent: TUMu_getPref('extensions.tabutils.openTabNext', 1) == 1}"),
  //       s1.join().replace("},{", ",")
  //     ))] // Bug 490225 [Fx11]
  //   );
  // }
  // TUMu_hookCode("isBlankPageURL", "aURL == BROWSER_NEW_TAB_URL", "$& && TUMu_getPref('extensions.tabutils.markNewAsBlank', true)");
  // TUMu_hookCode("URLBarSetURI", "gInitialPages.indexOf(uri.spec) != -1", "isBlankPageURL(uri.spec)");
  // TUMu_hookCode("gBrowser._beginRemoveTab", /.*addTab.*/, "BrowserOpenTab();");
  // TUMu_hookCode("gBrowser._endRemoveTab", /.*addTab.*/, "BrowserOpenTab();");

  gBrowser.getLastOpenedTab = function getLastOpenedTab() {
    return this.mTabContainer.getElementsByAttribute("linkedpanel", this.mPanelContainer.lastChild.id)[0];
  };

  //复制标签页
  // TUMu_hookCode("gBrowser.duplicateTab",
  //   [/return/g, "var tab ="],
  //   ["}", function() {
  //     this.detachTab(tab, true);
  //     if (TMP_console.isCallerInList(["_onDrop", "onxbldrop", "duplicateTabIn"])) {
  //       if (TUMu_getPref("extensions.tabutils.openDuplicateNext", true)) {
  //         if (this.isStackedTab(aTab))
  //           aTab = this.lastSiblingTabOf(aTab);
  //         this.moveTabTo(tab, tab._tPos > aTab._tPos ? aTab._tPos + 1 : aTab._tPos);
  //       }
  //       if (!tabutils.gLoadAllInBackground && !TUMu_getPref("extensions.tabutils.loadDuplicateInBackground", false))
  //         this.selectedTab = tab;
  //     }
  //     return tab;
  //   }]
  // );

  //撤销关闭标签页
  // TUMu_hookCode("gBrowser.moveTabTo", "}", function() {
  //   if (TMP_console.callerName() == "ssi_undoCloseTab"
  //       && !TUMu_getPref("extensions.tabutils.restoreOriginalPosition", true))
  //     return;
  // });
};

tabutils._tabClosingOptions = function() {

  //关闭标签页时选择左侧/右侧/第一个/最后一个标签
  gBrowser._tabsToSelect = function _tabsToSelect(aTabs) {
    if (!aTabs)
      aTabs = this.visibleTabs;

    let tabs = new Array(this.mTabs.length);
    for (let tab of aTabs)
      tabs[tab._tPos] = tab;

    var aTab = this.mCurrentTab;
    var seenTabs = [];
    seenTabs[aTab._tPos] = true;

    var selectOnClose = TUMu_getPref("extensions.tabutils.selectOnClose", 0);
    if (selectOnClose & 0x80) for (let tab of _tabs_(0x80)) yield tab;
    if (selectOnClose & 0x40) for (let tab of _tabs_(0x40)) yield tab;
    if (selectOnClose & 0x20) for (let tab of _tabs_(0x20)) yield tab;
    if (selectOnClose & 0x03) for (let tab of _tabs_(selectOnClose & 0x03)) yield tab;
    if (selectOnClose & 0x1c) for (let tab of _tabs_(selectOnClose & 0x1c)) yield tab;

    function _tabs_(selectOnClose) {
      for (let tab of __tabs__(selectOnClose)) {
        if (!(tab._tPos in seenTabs)) {
          seenTabs[tab._tPos] = true;
          yield tab;
        }
      }
    }

    function __tabs__(selectOnClose) {
      switch (selectOnClose) {
        case 1: //Left
          for (let i = aTab._tPos - 1; i >= 0; i--) if (i in tabs) yield tabs[i];
          break;
        case 2: //Right
          for (let i = aTab._tPos + 1; i < tabs.length; i++) if (i in tabs) yield tabs[i];
          break;
        case 4: //First
          for (let i = 0; i < tabs.length; i++) if (i in tabs) yield tabs[i];
          break;
        case 8: //Last
          for (let i = tabs.length - 1; i >= 0; i--) if (i in tabs) yield tabs[i];
          break;
        case 0x10: //Last selected
          for (let tab of gBrowser.mTabContainer._tabHistory) if (tab._tPos in tabs) yield tab;
          break;
        case 0x20: //Unread
          for (let tab of __tabs__()) if (tab.hasAttribute("unread")) yield tab;
          break;
        case 0x40: //Related
          for (let tab of __tabs__()) if (gBrowser.isRelatedTab(tab, aTab)) yield tab;
          break;
        case 0x80: //Unread Related
          for (let tab of __tabs__(0x20)) if (gBrowser.isRelatedTab(tab, aTab)) yield tab;
          break;
        case undefined: //Right or Rightmost
          for (let i = aTab._tPos + 1; i < tabs.length; i++) if (i in tabs) yield tabs[i];
          for (let i = aTab._tPos - 1; i >= 0; i--) if (i in tabs) yield tabs[i];
          break;
      }
    }
  };

  gBrowser._blurTab = function _blurTab(aTab) {
    if (!aTab.selected)
      return this.mCurrentTab;

    try {
      return this.selectedTab = this._tabsToSelect().next();
    }
    catch (e) {
      if (this.selectedTab = this.getLastSelectedTab())
        return this.selectedTab;

      return this.selectedTab = BrowserOpenTab() || gBrowser.getLastOpenedTab();
    }
  };

  //关闭标签页时选择亲属标签
  // TUMu_hookCode("gBrowser.onTabSelect", "}", function() {
  //   var panelId = aTab.linkedPanel + "#";
  //   Array.forEach(this.visibleTabs, function(aTab) {
  //     if (aTab.getAttribute("opener").startsWith(panelId))
  //       aTab.setAttribute("opener", panelId + (+aTab.getAttribute("opener").slice(panelId.length) + 1));
  //   });
  // });

  // TUMu_hookCode("gBrowser.onTabClose", "}", function() {
  //   if (aTab.hasAttribute("opener")) {
  //     let opener = aTab.getAttribute("opener");
  //     let panelId = aTab.linkedPanel + "#";
  //     Array.forEach(this.visibleTabs, function(aTab) {
  //       if (aTab.getAttribute("opener").startsWith(panelId))
  //         aTab.setAttribute("opener", opener);
  //     });
  //   }
  // });

  // TUMu_hookCode("gBrowser.loadTabs", "}", function() {
  //   if (aURIs.length > 1)
  //     this.updateCurrentBrowser(true);
  // });

  gBrowser.isRelatedTab = function isRelatedTab(aTab, bTab) {
    if (!bTab)
      bTab = this.mCurrentTab;

    return aTab.hasAttribute("opener") && aTab.getAttribute("opener") == bTab.getAttribute("opener")
        || aTab.getAttribute("opener").startsWith(bTab.linkedPanel + "#")
        || bTab.getAttribute("opener").startsWith(aTab.linkedPanel + "#");
  };

  //关闭标签页时选择上次浏览的标签
  gBrowser.mTabContainer._tabHistory = Array.slice(gBrowser.mTabs);
  TUMu_hookCode("gBrowser.onTabOpen", "}", function() {
    var tabHistory = this.mTabContainer._tabHistory;
    tabHistory.splice(1, 0, aTab);
    aTab._lastAccessed = Date.now();
    tabutils._ss.setTabValue(aTab, "lastAccessed", String(aTab._lastAccessed));
  });

  // TUMu_hookCode("gBrowser.onTabSelect", "}", function() {
  //   var tabHistory = this.mTabContainer._tabHistory;
  //   lastTab = tabHistory[0];
  //   lastTab._lastAccessed = Date.now();
  //   tabutils._ss.setTabValue(lastTab, "lastAccessed", String(lastTab._lastAccessed));
  //
  //   var index = tabHistory.indexOf(aTab);
  //   if (index > -1)
  //     tabHistory.splice(index, 1);
  //   tabHistory.unshift(aTab);
  //   aTab._lastAccessed = Infinity;
  //   tabutils._ss.setTabValue(aTab, "lastAccessed", String(aTab._lastAccessed));
  // });

  // TUMu_hookCode("gBrowser.onTabClose", "}", function() {
  //   var tabHistory = this.mTabContainer._tabHistory;
  //   var index = tabHistory.indexOf(aTab);
  //   if (index > -1)
  //     tabHistory.splice(index, 1);
  // });

  // TUMu_hookCode("gBrowser.onTabRestoring", "}", function() { // Bug 445461 [Fx30]
  //   var tabHistory = this.mTabContainer._tabHistory;
  //   var index = tabHistory.indexOf(aTab);
  //   if (index > -1)
  //     tabHistory.splice(index, 1);
  //
  //   if (aTab._lastAccessed == Infinity)
  //     tabutils._ss.setTabValue(aTab, "lastAccessed", String(aTab._lastAccessed));
  //   else
  //     aTab._lastAccessed = tabutils._ss.getTabValue(aTab, "lastAccessed");
  //
  //   for (index = 0; index < tabHistory.length; index++) {
  //     if (tabHistory[index]._lastAccessed < aTab._lastAccessed)
  //       break;
  //   }
  //   tabHistory.splice(index, 0, aTab);
  // });

  gBrowser.getLastSelectedTab = function getLastSelectedTab(aDir) {
    var tabHistory = this.mTabContainer._tabHistory;
    var index = tabHistory.indexOf(this.mCurrentTab);
    return tabHistory[aDir < 0 ? index - 1 : index + 1]
        || tabHistory[aDir < 0 ? tabHistory.length - 1 : 0];
  };

  //Ctrl+Tab切换到上次浏览的标签
  //Ctrl+左右方向键切换到前一个/后一个标签
  tabutils.addEventListener(window, "keydown", function(event) {
    if (!event.ctrlKey || event.altKey || event.metaKey)
      return;

    switch (event.keyCode) {
      case event.DOM_VK_UP:
      case event.DOM_VK_DOWN:
      case event.DOM_VK_LEFT:
      case event.DOM_VK_RIGHT:
        if (!TUMu_getPref("extensions.tabutils.handleCtrlArrow"))
          return;
        // Fallback
      case event.DOM_VK_PAGE_UP:
      case event.DOM_VK_PAGE_DOWN:
        if (event.shiftKey)
          return;
        event.stopPropagation(); // Compat. with some sites
        // Fallback
      case event.DOM_VK_TAB:
        if (TUMu_getPref("extensions.tabutils.handleCtrl"))
          gBrowser._previewMode = true;
        break;
    }
  }, true);

  tabutils.addEventListener(window, "keypress", function(event) {
    if (!event.ctrlKey || event.altKey || event.metaKey)
      return;

    switch (event.keyCode) {
      case event.DOM_VK_TAB:
        if (TUMu_getPref("extensions.tabutils.handleCtrlTab")) {
          gBrowser.selectedTab = gBrowser.getLastSelectedTab(event.shiftKey ? -1 : 1);
          event.stopPropagation();
          event.preventDefault();
        }
        break;
      case event.DOM_VK_LEFT:
      case event.DOM_VK_RIGHT:
        if (!event.shiftKey && TUMu_getPref("extensions.tabutils.handleCtrlArrow")) {
          let rtl = getComputedStyle(gBrowser.mTabContainer).direction == "rtl";
          gBrowser.mTabContainer.advanceSelectedTab(event.keyCode == event.DOM_VK_LEFT ^ rtl ? -1 : 1, true);
          event.stopPropagation();
          event.preventDefault();
        }
        break;
      case event.DOM_VK_UP:
      case event.DOM_VK_DOWN:
        if (!event.shiftKey && TUMu_getPref("extensions.tabutils.handleCtrlArrow")) {
          gBrowser.selectedTab = gBrowser.nextSiblingTabOf(gBrowser.selectedTab, event.keyCode == event.DOM_VK_UP ? -1 : 1, true);
          event.stopPropagation();
          event.preventDefault();
        }
        break;
    }
  }, true);

  tabutils.addEventListener(window, "keyup", function(event) {
    switch (event.keyCode) {
      case event.DOM_VK_LEFT:
      case event.DOM_VK_RIGHT:
        if (event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey &&
            TUMu_getPref("extensions.tabutils.handleCtrlArrow"))
          event.stopPropagation(); // Compat. with some sites
        break;
    }
  }, true);

  tabutils.addEventListener(window, "keyup", function(event) {
    switch (event.keyCode) {
      case event.DOM_VK_CONTROL:
        if (gBrowser._previewMode) {
          gBrowser._previewMode = false;
          gBrowser.updateCurrentBrowser(true);
        }
        break;
    }
  }, false);

  // TUMu_hookCode("gBrowser.onTabClose", "}", function() {
  //   if (gBrowser._previewMode) {
  //     gBrowser.selectedTab = gBrowser.mTabContainer._tabHistory[0];
  //     gBrowser._previewMode = false;
  //   }
  // });

  // TUMu_hookCode("gBrowser.updateCurrentBrowser", /.*dispatchEvent[\s\S]*_tabAttrModified.*/, "$&};if (window.windowState != window.STATE_MINIMIZED) {");

  //Don't close the last primary window with the las tab
  // TUMu_hookCode("gBrowser._beginRemoveTab",
  //     /_closeWindowWithLastTab|Services\.prefs\.getBoolPref\("browser\.tabs\.closeWindowWithLastTab"\)/, // Bug 997681 [Fx31]
  //     "$& && " + (function() { //Implement to Bug 607893
  //   (TUMu_getPref("extensions.tabutils.closeLastWindowWithLastTab", false) || function() {
  //     var winEnum = Services.wm.getEnumerator("navigator:browser");
  //     while (winEnum.hasMoreElements()) {
  //       var win = winEnum.getNext();
  //       if (win != window && win.toolbar.visible)
  //         return win;
  //     }
  //   }())
  // }).toString().replace(/^.*{|}$/g, ""));

  //Don't resize tabs until mouse leaves the tab bar
  gBrowser.mTabContainer.__defineGetter__("_tabSizingRule", function() { //Bug 465086, 649654
    delete this._tabSizingRule;
    return this._tabSizingRule = tabutils.insertRule('.tabbrowser-tabs[dontresize] > .tabbrowser-tab:not([pinned]):not([faviconized]) {}');
  });

  gBrowser.mTabContainer._lockTabSizing = function() {};
  gBrowser.mTabContainer._unlockTabSizing = function() {};

  gBrowser.mTabContainer._revertTabSizing = function _revertTabSizing() {
    if (!this._tabSizingLocked)
      return;

    if (this._tabSizingLocked == 1) {
      this._tabSizingLocked = false;
      return;
    }

    this.mTabstrip._scrollbox.style.maxWidth = "";
    this._closingTabsSpacer.style.minWidth = "";
    this.removeAttribute("dontresize");
    this._tabSizingLocked = false;

    if (this.hasAttribute("overflow") && this.mTabstrip._scrollbox.scrollWidth <= this.mTabstrip._scrollbox.clientWidth) {
      this.mTabstrip._scrollButtonUp.style.visibility = "";
      this.mTabstrip._scrollButtonDown.style.visibility = "";
      this.removeAttribute("overflow");
    }
    this.adjustTabstrip();
    this._fillTrailingGap();
  };

  tabutils.addEventListener(gBrowser.mTabContainer, 'mouseover', function(event) {
    if (this._tabSizingLocked || this.hasAttribute("multirow") || this.orient == "vertical"
        || event.target.localName != "tab" || event.target.pinned
        || !TUMu_getPref("extensions.tabutils.delayResizing", true))
      return;

    this._tabSizingLocked = true;
    window.addEventListener('mousemove', function(event) {
      let boxObject = gBrowser.mTabContainer.boxObject;
      if (event.screenY < boxObject.screenY - boxObject.height * 0.5 || event.screenY > boxObject.screenY + boxObject.height * 1.5) {
        window.removeEventListener('mousemove', arguments.callee, false);
        gBrowser.mTabContainer._revertTabSizing();
      }
    }, false);
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, 'TabClose', function(event) {
    if (!this._tabSizingLocked || event.target.pinned)
      return;

    if (this._tabSizingLocked == 1) {
      this.mTabstrip._scrollbox.style.maxWidth = this.mTabstrip._scrollbox.clientWidth + "px";
      this._tabSizingLocked++;
    }

    let tab = event.target;
    let visibleTabs = Array.filter(this.childNodes, function(aTab) aTab.boxObject.width > 0);
    let flexibleTabs = Array.filter(visibleTabs, function(aTab) getComputedStyle(aTab).MozBoxFlex > 0);
    if (flexibleTabs.length == 0)
      return;

    if (tab == visibleTabs[visibleTabs.length - 1] || tab == flexibleTabs[flexibleTabs.length - 1]) {
      if (this.hasAttribute("dontresize")) {
        let spacer = this._closingTabsSpacer;
        spacer.style.MozBoxFlex = 1;
        spacer.style.minWidth = getComputedStyle(spacer).width;
        spacer.style.MozBoxFlex = "";

        this.setAttribute("dontanimate", true);
        this.removeAttribute("dontresize");this.clientTop; //Bug 649247
        this.setAttribute("dontanimate", !TUMu_getPref("browser.tabs.animate"));
      }
      return;
    }

    if (!this.hasAttribute("dontresize")) {
      let width = flexibleTabs[0].getBoundingClientRect().width;
      this._tabSizingRule.style.setProperty("max-width", width + "px", "important");

      this.setAttribute("dontanimate", true);
      this.setAttribute("dontresize", true);this.clientTop;
      this.setAttribute("dontanimate", !TUMu_getPref("browser.tabs.animate"));
    }

    if (!this.mTabstrip._scrollButtonUp.disabled) {
      let spacer = this._closingTabsSpacer;
      let width = parseFloat(spacer.style.minWidth) || 0;
      width += tab.getBoundingClientRect().width;

      if (!this.mTabstrip._scrollButtonDown.disabled) {
        let scrollbox = this.mTabstrip._scrollbox;
        width -= scrollbox.scrollLeftMax - scrollbox.scrollLeft; // Bug 766937 [Fx16]
      }
      spacer.style.minWidth = width + "px";
    }
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, 'TabOpen', function(event) {
    if (this._tabSizingLocked)
      this._revertTabSizing();
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, 'underflow', function(event) {
    if (this._tabSizingLocked > 1) {
      this.setAttribute("overflow", true);
      this.mTabstrip._scrollButtonUp.style.visibility = "visible";
      this.mTabstrip._scrollButtonDown.style.visibility = "visible";
    }
  }, false);
};
