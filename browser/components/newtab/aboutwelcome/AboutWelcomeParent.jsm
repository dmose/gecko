/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = ["AboutWelcomeParent"];

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BrowserUtils: "resource://gre/modules/BrowserUtils.sys.mjs",
  BuiltInThemes: "resource:///modules/BuiltInThemes.sys.mjs",
  FxAccounts: "resource://gre/modules/FxAccounts.sys.mjs",
  ShellService: "resource:///modules/ShellService.sys.mjs",
  SpecialMessageActions:
    "resource://messaging-system/lib/SpecialMessageActions.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  AddonManager: "resource://gre/modules/AddonManager.jsm",

  AboutWelcomeTelemetry:
    "resource://activity-stream/aboutwelcome/lib/AboutWelcomeTelemetry.jsm",

  AboutWelcomeDefaults:
    "resource://activity-stream/aboutwelcome/lib/AboutWelcomeDefaults.jsm",

  LangPackMatcher: "resource://gre/modules/LangPackMatcher.jsm",
  AWScreenUtils: "resource://activity-stream/lib/AWScreenUtils.jsm",
});

XPCOMUtils.defineLazyGetter(lazy, "log", () => {
  const { Logger } = ChromeUtils.importESModule(
    "resource://messaging-system/lib/Logger.sys.mjs"
  );
  return new Logger("AboutWelcomeParent");
});

XPCOMUtils.defineLazyGetter(
  lazy,
  "Telemetry",
  () => new lazy.AboutWelcomeTelemetry()
);

const DID_SEE_ABOUT_WELCOME_PREF = "trailhead.firstrun.didSeeAboutWelcome";
const AWTerminate = {
  WINDOW_CLOSED: "welcome-window-closed",
  TAB_CLOSED: "welcome-tab-closed",
  APP_SHUT_DOWN: "app-shut-down",
  ADDRESS_BAR_NAVIGATED: "address-bar-navigated",
};
const LIGHT_WEIGHT_THEMES = {
  AUTOMATIC: "default-theme@mozilla.org",
  DARK: "firefox-compact-dark@mozilla.org",
  LIGHT: "firefox-compact-light@mozilla.org",
  ALPENGLOW: "firefox-alpenglow@mozilla.org",
  "PLAYMAKER-SOFT": "playmaker-soft-colorway@mozilla.org",
  "PLAYMAKER-BALANCED": "playmaker-balanced-colorway@mozilla.org",
  "PLAYMAKER-BOLD": "playmaker-bold-colorway@mozilla.org",
  "EXPRESSIONIST-SOFT": "expressionist-soft-colorway@mozilla.org",
  "EXPRESSIONIST-BALANCED": "expressionist-balanced-colorway@mozilla.org",
  "EXPRESSIONIST-BOLD": "expressionist-bold-colorway@mozilla.org",
  "VISIONARY-SOFT": "visionary-soft-colorway@mozilla.org",
  "VISIONARY-BALANCED": "visionary-balanced-colorway@mozilla.org",
  "VISIONARY-BOLD": "visionary-bold-colorway@mozilla.org",
  "ACTIVIST-SOFT": "activist-soft-colorway@mozilla.org",
  "ACTIVIST-BALANCED": "activist-balanced-colorway@mozilla.org",
  "ACTIVIST-BOLD": "activist-bold-colorway@mozilla.org",
  "DREAMER-SOFT": "dreamer-soft-colorway@mozilla.org",
  "DREAMER-BALANCED": "dreamer-balanced-colorway@mozilla.org",
  "DREAMER-BOLD": "dreamer-bold-colorway@mozilla.org",
  "INNOVATOR-SOFT": "innovator-soft-colorway@mozilla.org",
  "INNOVATOR-BALANCED": "innovator-balanced-colorway@mozilla.org",
  "INNOVATOR-BOLD": "innovator-bold-colorway@mozilla.org",
};

class AboutWelcomeObserver {
  constructor() {
    Services.obs.addObserver(this, "quit-application");

    this.win = Services.focus.activeWindow;
    if (!this.win) {
      return;
    }

    this.terminateReason = AWTerminate.ADDRESS_BAR_NAVIGATED;

    this.onWindowClose = () => {
      this.terminateReason = AWTerminate.WINDOW_CLOSED;
    };

    this.onTabClose = () => {
      this.terminateReason = AWTerminate.TAB_CLOSED;
    };

    this.win.addEventListener("TabClose", this.onTabClose, { once: true });
    this.win.addEventListener("unload", this.onWindowClose, { once: true });
  }

  observe(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "quit-application":
        this.terminateReason = AWTerminate.APP_SHUT_DOWN;
        break;
    }
  }

  // Added for testing
  get AWTerminate() {
    return AWTerminate;
  }

  stop() {
    lazy.log.debug(`Terminate reason is ${this.terminateReason}`);
    Services.obs.removeObserver(this, "quit-application");
    if (!this.win) {
      return;
    }
    this.win.removeEventListener("TabClose", this.onTabClose);
    this.win.removeEventListener("unload", this.onWindowClose);
    this.win = null;
  }
}

class AboutWelcomeParent extends JSWindowActorParent {
  constructor() {
    super();
    this.AboutWelcomeObserver = new AboutWelcomeObserver(this);
  }

  // Static methods that calls into ShellService to check
  // if Firefox is pinned or already default
  static doesAppNeedPin() {
    return lazy.ShellService.doesAppNeedPin();
  }

  static isDefaultBrowser() {
    return lazy.ShellService.isDefaultBrowser();
  }

  didDestroy() {
    if (this.AboutWelcomeObserver) {
      this.AboutWelcomeObserver.stop();
    }
    this.RegionHomeObserver?.stop();

    const ping = {
      event: "SESSION_END",
      event_context: {
        reason: this.AboutWelcomeObserver.terminateReason,
        page: "about:welcome",
      },
      message_id: this.AWMessageId,
    };

    lazy.Telemetry.sendTelemetry(ping);

    // Data here is a dictionary with mixed data types, often including a
    // second dictionary. This could potentially contain even more nesting.
    // Here, rather than try to be exhaustive, we choose to flatten this
    // known object into a depth = 1 object when we can which can be sent to
    // setGleanMetricsAndSubmit directly.
    // Note that we have used the metrics.yaml file
    // to define all of the fields in a way that when send this object it will
    // map with minimal additional effort.
    ping.reason = this.AboutWelcomeObserver.terminateReason;
    ping.page = "about:welcome";
    // Stringify event context to place into a text metric
    ping.event_context = JSON.stringify(ping.event_context);

    this.setGleanMetricsAndSubmit(ping, "SESSION_END");
  }

  snakeToCamelCase(s) {
    return s.toString().replace(/_([a-z])/gi, (_str, group) => {
      return group.toUpperCase();
    });
  }

  /**
   * Iterate through the keys of the finished ping object to assign them to
   * Glean metrics. Potentially fragile since any metric not defined in a
   * metrics.yaml file will not be set, but instead the key that you
   * attempted to set will be placed in the `invalidKeys` string list.
   *
   * @param {Object} ping  Post policy-applied object with remaining fields
   * @param {String} pingType  Type of the ping.
   */
  setGleanMetricsAndSubmit(ping, pingType) {
    // Set the glean metrics by iterating the ping object's keys
    Glean.onboardingMessaging.pingType.set(pingType);
    for (const key of Object.keys(ping)) {
      const camelKey = this.snakeToCamelCase(key);
      const dataType = typeof ping[key];
      try {
        // Note that Glean converts snake/dash-snake case to camelCase.
        if (dataType !== "object") {
          Glean.onboardingMessaging[camelKey].set(ping[key]);
        } else {
          Glean.onboardingMessaging.invalidNestedData.add(camelKey);
          lazy.log.debug(`key: ${camelKey} - type: ${dataType}`);
        }
      } catch (e) {
        Glean.onboardingMessaging.invalidKeys.add(camelKey);
      }
    }
    // Notice here pings exist under GleanPings. "about_welcome" here
    // is a reason, and MUST match one of the reason entries in the pings.yaml
    // specification.
    GleanPings.aboutWelcome.submit("about_welcome");
  }

  /**
   * Handle messages from AboutWelcomeChild.jsm
   *
   * @param {string} type
   * @param {any=} data
   * @param {Browser} the xul:browser rendering the page
   */
  async onContentMessage(type, data, browser) {
    lazy.log.debug(`Received content event: ${type}`);
    switch (type) {
      case "AWPage:SET_WELCOME_MESSAGE_SEEN":
        this.AWMessageId = data;
        try {
          Services.prefs.setBoolPref(DID_SEE_ABOUT_WELCOME_PREF, true);
        } catch (e) {
          lazy.log.debug(`Fails to set ${DID_SEE_ABOUT_WELCOME_PREF}.`);
        }
        break;
      case "AWPage:SPECIAL_ACTION":
        return lazy.SpecialMessageActions.handleAction(data, browser);
      case "AWPage:FXA_METRICS_FLOW_URI":
        return lazy.FxAccounts.config.promiseMetricsFlowURI("aboutwelcome");
      case "AWPage:TELEMETRY_EVENT":
        lazy.Telemetry.sendTelemetry(data);

        // Flatten the data into a single level object that can be sent to
        // setGleanMetricsAndSubmit.
        let ping = {};
        // We should not mutate the keys/values of the source object in case
        // the source object needs to be used again later.
        Object.assign(ping, data);
        let objContext = {};
        // Event Context is typically a string at the point we get it in
        // onContentMessage, but it can be object, so handle that here.
        if (ping.event_context && typeof ping.event_context === "string") {
          objContext = JSON.parse(ping.event_context);
        } else {
          objContext = ping.event_context;
        }

        // We know that we will often have Source and Page, and that these
        // fields are very valuable to have in an easily accesible manner
        // downstream, so we place them in their own fields.
        if (Object.keys(objContext).includes("source")) {
          ping.source = objContext.source;
        }
        if (Object.keys(objContext).includes("page")) {
          ping.page = objContext.page;
        }
        // We do not, however, know the entire contents of event_context.
        // So place the string representation into a Text metric.
        ping.event_context = JSON.stringify(ping.event_context);

        this.setGleanMetricsAndSubmit(ping, type);

        break;
      case "AWPage:GET_ATTRIBUTION_DATA":
        let attributionData = await lazy.AboutWelcomeDefaults.getAttributionContent();
        return attributionData;
      case "AWPage:SELECT_THEME":
        await lazy.BuiltInThemes.ensureBuiltInThemes();
        return lazy.AddonManager.getAddonByID(
          LIGHT_WEIGHT_THEMES[data]
        ).then(addon => addon.enable());
      case "AWPage:GET_SELECTED_THEME":
        let themes = await lazy.AddonManager.getAddonsByTypes(["theme"]);
        let activeTheme = themes.find(addon => addon.isActive);
        // Store the current theme ID so user can restore their previous theme.
        if (activeTheme?.id) {
          LIGHT_WEIGHT_THEMES.AUTOMATIC = activeTheme.id;
        }
        // convert this to the short form name that the front end code
        // expects
        let themeShortName = Object.keys(LIGHT_WEIGHT_THEMES).find(
          key => LIGHT_WEIGHT_THEMES[key] === activeTheme?.id
        );
        return themeShortName?.toLowerCase();
      case "AWPage:DOES_APP_NEED_PIN":
        return AboutWelcomeParent.doesAppNeedPin();
      case "AWPage:NEED_DEFAULT":
        // Only need to set default if we're supposed to check and not default.
        return (
          Services.prefs.getBoolPref("browser.shell.checkDefaultBrowser") &&
          !AboutWelcomeParent.isDefaultBrowser()
        );
      case "AWPage:WAIT_FOR_MIGRATION_CLOSE":
        // Support multiples types of migration: 1) content modal 2) old
        // migration modal 3) standalone content modal
        return new Promise(resolve => {
          const topics = [
            "MigrationWizard:Closed",
            "MigrationWizard:Destroyed",
          ];
          const observer = () => {
            topics.forEach(t => Services.obs.removeObserver(observer, t));
            resolve();
          };
          topics.forEach(t => Services.obs.addObserver(observer, t));
        });
      case "AWPage:GET_APP_AND_SYSTEM_LOCALE_INFO":
        return lazy.LangPackMatcher.getAppAndSystemLocaleInfo();
      case "AWPage:EVALUATE_SCREEN_TARGETING":
        return lazy.AWScreenUtils.evaluateTargetingAndRemoveScreens(data);
      case "AWPage:ADD_SCREEN_IMPRESSION":
        return lazy.AWScreenUtils.addScreenImpression(data);
      case "AWPage:NEGOTIATE_LANGPACK":
        return lazy.LangPackMatcher.negotiateLangPackForLanguageMismatch(data);
      case "AWPage:ENSURE_LANG_PACK_INSTALLED":
        return lazy.LangPackMatcher.ensureLangPackInstalled(data);
      case "AWPage:SET_REQUESTED_LOCALES":
        return lazy.LangPackMatcher.setRequestedAppLocales(data);
      case "AWPage:SEND_TO_DEVICE_EMAILS_SUPPORTED": {
        return lazy.BrowserUtils.sendToDeviceEmailsSupported();
      }
      default:
        lazy.log.debug(`Unexpected event ${type} was not handled.`);
    }

    return undefined;
  }

  /**
   * @param {{name: string, data?: any}} message
   * @override
   */
  receiveMessage(message) {
    const { name, data } = message;
    let browser;

    if (this.manager.rootFrameLoader) {
      browser = this.manager.rootFrameLoader.ownerElement;
      return this.onContentMessage(name, data, browser);
    }

    lazy.log.warn(`Not handling ${name} because the browser doesn't exist.`);
    return null;
  }
}
