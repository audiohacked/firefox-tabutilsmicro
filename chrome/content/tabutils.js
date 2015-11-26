var tabutils = {
  init: function() {
    // this._tabEventListeners.init();
    // this._PlacesUtilsExt();

    // this._openUILinkInTab();
    // this._openLinkInTab();
    // this._singleWindowMode();

    // this._tabOpeningOptions();
    // this._tabClosingOptions();
    this._tabClickingOptions();

    // this._unreadTab();
    // this._protectAndLockTab();
    // this._faviconizeTab();
    // this._pinTab();
    // this._phantomTabs();
    // this._renameTab();
    // this._restartTab();
    // this._reloadEvery();
    // this._bookmarkTabs();
    this._tabView();
    this._multiTabHandler();
    // this._stackTabs();
    // this._multirowTabs();
    // this._verticalTabs();

    window.addEventListener("load", this, false);
    window.addEventListener("unload", this, false);

    if (gBrowser.mTabListeners.length > 0) { // Bug 463384 [Fx5]
      let tabListener = gBrowser.mTabListeners[0];
      gBrowser.browsers[0].webProgress.removeProgressListener(gBrowser.mTabFilters[0]);
      gBrowser.mTabFilters[0].removeProgressListener(gBrowser.mTabListeners[0]);
      gBrowser.mTabListeners[0] = gBrowser.mTabProgressListener(tabListener.mTab, tabListener.mBrowser, tabListener.mBlank);
      gBrowser.mTabFilters[0].addProgressListener(gBrowser.mTabListeners[0], Ci.nsIWebProgress.NOTIFY_ALL);
      gBrowser.browsers[0].webProgress.addProgressListener(gBrowser.mTabFilters[0], Ci.nsIWebProgress.NOTIFY_ALL);
    }

    if (!("privateBrowsingEnabled" in gPrivateBrowsingUI)) { // Bug 799001 [Fx20]
      XPCOMUtils.defineLazyGetter(gPrivateBrowsingUI, "privateBrowsingEnabled", function() {
        return PrivateBrowsingUtils.isWindowPrivate(window);
      });
    }

    this.fxOnOS = Services.appinfo.OS; //WINNT, Linux or Darwin
    this.fxVersion = parseFloat(Services.appinfo.version);
    document.documentElement.setAttribute("OS", this.FxOnOS);
    document.documentElement.setAttribute("v4", true);
    document.documentElement.setAttribute("v6", true);
    document.documentElement.setAttribute("v14", true);
    document.documentElement.setAttribute("v17", true);
    document.documentElement.setAttribute("v29", this.fxVersion >= 29.0);
    document.documentElement.setAttribute("v31", this.fxVersion >= 31.0);

    gBrowser.mTabContainer._originalAdjustTabstripFunc = gBrowser.mTabContainer.adjustTabstrip;
    gBrowser.mTabContainer.adjustTabstrip = function adjustTabstrip() {
      this._originalAdjustTabstripFunc();
    }

//    Function.prototype.__defineGetter__("stack", function() {
//      var stack = [];
//      for (let caller = this; caller && stack.length < 15; caller = caller.caller) {
//        stack.push(caller.name);
//      }
//      return stack;
//    });
//
//    TU_hookCode("gBrowser.addTab", "{", "Cu.reportError([arguments.callee.stack, aURI]);");
//    TU_hookCode("gBrowser.moveTabTo", "{", "Cu.reportError([arguments.callee.stack, aTab._tPos, aIndex]);");
//    TU_hookCode("gBrowser._beginRemoveTab", "{", "Cu.reportError([arguments.callee.stack]);");
//    TU_hookCode("gBrowser._endRemoveTab", "{", "Cu.reportError([arguments.callee.stack]);");
//    TU_hookCode("gBrowser._blurTab", "{", "Cu.reportError([arguments.callee.stack]);");
//
//    TU_hookCode("gBrowser.pinTab", "{", "Cu.reportError([arguments.callee.stack]);");
//    TU_hookCode("gBrowser.mTabContainer.adjustTabstrip", "{", "Cu.reportError([arguments.callee.stack]);");
//    TU_hookCode("gBrowser.mTabContainer.positionPinnedTabs", "{", "Cu.reportError([arguments.callee.stack]);");
//    TU_hookCode("gBrowser.mTabContainer.stylePinnedTabs", "{", "Cu.reportError([arguments.callee.stack]);");
  },

  onload: function() {
    // this._miscFeatures();
    // this._mainContextMenu();
    this._tabContextMenu();
    // this._allTabsPopup();
    // this._hideTabBar();
    // this._undoCloseTabButton();
    // this._tabPrefObserver.init();
    // this._tagsFolderObserver.init();

    // this._firstRun();
  },

  setAttribute: function(aTab, aAttr, aVal) {
    if (!aVal)
      return this.removeAttribute(aTab, aAttr);

    aTab.setAttribute(aAttr, aVal);
    this._ss.setTabValue(aTab, aAttr, String(aVal));
  },

  removeAttribute: function(aTab, aAttr) {
    aTab.removeAttribute(aAttr);
    this._ss.deleteTabValue(aTab, aAttr);
  },

  restoreAttribute: function(aTab, aAttr) {
    let aVal = this._ss.getTabValue(aTab, aAttr);
    if (aVal)
      aTab.setAttribute(aAttr, aVal);
    else
      aTab.removeAttribute(aAttr);
  },

  getURIsForTag: function() this._tagsFolderObserver.getURIsForTag.apply(this._tagsFolderObserver, arguments),
  getTagsForURI: function() this._tagsFolderObserver.getTagsForURI.apply(this._tagsFolderObserver, arguments),

  getDomainFromURI: function(aURI, aAllowThirdPartyFixup) {
    try {
      if (typeof aURI == "string")
        aURI = Services.nsIURIFixup.createFixupURI(aURI, aAllowThirdPartyFixup);
    }
    catch (e) {}

    try {
      return Services.eTLD.getBaseDomain(aURI);
    }
    catch (e) {}

    try {
      return aURI.host;
    }
    catch (e) {
      return aURI.spec;
    }
  },

  get _styleSheet() {
    for (let sheet of Array.slice(document.styleSheets)) {
      if (sheet.href == "chrome://tabutils/skin/tabutils.css") {
        delete this._styleSheet;
        return this._styleSheet = sheet;
      }
    }
    return document.styleSheets[0];
  },

  // insertRule: function(rule) {
  //   var ss = this._styleSheet;
  //   return ss.cssRules[ss.insertRule(rule, ss.cssRules.length)];
  // },

  _eventListeners: [],
  addEventListener: function() {
    arguments[0].addEventListener.apply(arguments[0], Array.slice(arguments, 1));
    this._eventListeners.push(arguments);
  },

  onunload: function() {
    this._eventListeners.forEach(function(args) document.removeEventListener.apply(args[0], Array.slice(args, 1)));
    // this._tagsFolderObserver.uninit();
  },

  handleEvent: function(event) {
    window.removeEventListener(event.type, this, false);
    switch (event.type) {
      case "DOMContentLoaded": this.init();break;
      case "load": this.onload();break;
      case "unload": this.onunload();break;
    }
  }
};
window.addEventListener("DOMContentLoaded", tabutils, false);

[
  ["@mozilla.org/browser/sessionstore;1", "nsISessionStore", "_ss", tabutils], // Bug 898732 [Fx26]
  ["@mozilla.org/docshell/urifixup;1", "nsIURIFixup"], // Bug 802026 [Fx20]
  ["@mozilla.org/places/colorAnalyzer;1", "mozIColorAnalyzer"],
  ["@mozilla.org/widget/clipboardhelper;1", "nsIClipboardHelper"],
  ["@mozilla.org/uuid-generator;1", "nsIUUIDGenerator"]
].forEach(function([aContract, aInterface, aName, aObject])
  XPCOMUtils.defineLazyServiceGetter(aObject || Services, aName || aInterface, aContract, aInterface)
);

