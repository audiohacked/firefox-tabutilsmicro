// Tab Context Menu
tabutils._tabContextMenu = function() {
  function $() {return document.getElementById.apply(document, arguments);}

  tabutils.populateWindowMenu = function populateWindowMenu(aPopup, aExcludePopup) {
    while (aPopup.lastChild && aPopup.lastChild.localName != "menuseparator")
      aPopup.removeChild(aPopup.lastChild);

    var winEnum = Services.wm.getEnumerator("navigator:browser");
    while (winEnum.hasMoreElements()) {
      var win = winEnum.getNext();
      var m = document.createElement("menuitem");
      m.setAttribute("class", "menuitem-iconic bookmark-item menuitem-with-favicon");
      m.setAttribute("label", win.gBrowser.mCurrentTab.label);
      m.setAttribute("image", win.gBrowser.mCurrentTab.image);
      m.setAttribute("acceltext", "[" + win.gBrowser.mTabs.length + "]");
      m.setAttribute("disabled", win == window || aExcludePopup && !win.toolbar.visible ||
                                 win.gPrivateBrowsingUI.privateBrowsingEnabled != gPrivateBrowsingUI.privateBrowsingEnabled);
      m.window = win;
      aPopup.appendChild(m);
    }
  };
};
