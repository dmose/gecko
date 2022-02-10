/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { ExperimentFakes } = ChromeUtils.import(
  "resource://testing-common/NimbusTestUtils.jsm"
);
const { ExperimentAPI } = ChromeUtils.import(
  "resource://nimbus/ExperimentAPI.jsm"
);
const { TelemetryTestUtils } = ChromeUtils.import(
  "resource://testing-common/TelemetryTestUtils.jsm"
);
const { PanelTestProvider } = ChromeUtils.import(
  "resource://activity-stream/lib/PanelTestProvider.jsm"
);
const { ASRouter } = ChromeUtils.import(
  "resource://activity-stream/lib/ASRouter.jsm"
);

async function waitForEventsToClear() {
  info("entering waitForEventsToClear");
  await TestUtils.waitForCondition(() => {
    Services.telemetry.clearEvents();
    let events = Services.telemetry.snapshotEvents(
      Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
      true
    ).content;
    info("waiting for clearing, current event snapshot: ");
    info(JSON.stringify(events));
    return !events || !events.length;
  }, "Waiting for telemetry events to get cleared");

  info("about to call snapshotEvents");
  Services.telemetry.snapshotEvents(
    Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
    true
  );
  info("clearing call to snapshotEvents has returned");

  info("final call to clearEvents");
  Services.telemetry.clearEvents();
  info("calls to clearEvents have completed");
}

add_task(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      // Since we're counting telemetry events; let's keep things
      // deterministic.
      ["browser.newtab.preload", false],
    ],
  });
});

/**
 * These tests ensure that the experiment and remote default capabilities
 * for the "privatebrowsing" feature are working as expected.
 */

async function openTabAndWaitForRender() {
  let { win, tab } = await openAboutPrivateBrowsing();
  await SpecialPowers.spawn(tab, [], async function() {
    // Wait for render to complete
    await ContentTaskUtils.waitForCondition(() =>
      content.document.documentElement.hasAttribute(
        "PrivateBrowsingRenderComplete"
      )
    );
  });
  return { win, tab };
}

function waitForTelemetryEvent(category) {
  info("waiting for telemetry event");
  return TestUtils.waitForCondition(() => {
    let events = Services.telemetry.snapshotEvents(
      Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
      false
    ).content;
    if (!events) {
      return null;
    }
    events = events.filter(e => e[1] == category);
    info(JSON.stringify(events));
    if (events.length) {
      return events[0];
    }
    return null;
  }, "waiting for telemetry event");
}

async function setupMSExperimentWithMessage(message) {
  Services.telemetry.clearEvents();
  Services.telemetry.snapshotEvents(
    Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
    true
  );
  let doExperimentCleanup = await ExperimentFakes.enrollWithFeatureConfig({
    featureId: "pbNewtab",
    enabled: true,
    value: message,
  });
  Services.prefs.setStringPref(
    "browser.newtabpage.activity-stream.asrouter.providers.messaging-experiments",
    '{"id":"messaging-experiments","enabled":true,"type":"remote-experiments","messageGroups":["pbNewtab"],"updateCycleInMs":0}'
  );
  // Reload the provider
  await ASRouter._updateMessageProviders();
  // Wait to load the messages from the messaging-experiments provider
  await ASRouter.loadMessagesFromAllProviders();

  registerCleanupFunction(async () => {
    // Clear telemetry side effects
    Services.telemetry.clearEvents();
    // Make sure the side-effects from dismisses are cleared.
    ASRouter.unblockAll();
    // Reload the provider again at cleanup to remove the experiment message
    await ASRouter._updateMessageProviders();
    // Wait to load the messages from the messaging-experiments provider
    await ASRouter.loadMessagesFromAllProviders();
    Services.prefs.clearUserPref(
      "browser.newtabpage.activity-stream.asrouter.providers.messaging-experiments"
    );
  });

  Assert.ok(
    ASRouter.state.messages.find(m => m.id.includes(message.id)),
    "Experiment message found in ASRouter state"
  );

  return doExperimentCleanup;
}

add_task(async function test_experiment_messaging_system() {
  const LOCALE = Services.locale.appLocaleAsBCP47;
  let doExperimentCleanup = await setupMSExperimentWithMessage({
    id: "PB_NEWTAB_MESSAGING_SYSTEM",
    template: "pb_newtab",
    content: {
      promoEnabled: true,
      infoEnabled: true,
      infoBody: "fluent:about-private-browsing-info-title",
      promoLinkText: "fluent:about-private-browsing-prominent-cta",
      infoLinkUrl: "http://foo.example.com/%LOCALE%",
      promoLinkUrl: "http://bar.example.com/%LOCALE%",
    },
    // Priority ensures this message is picked over the one in
    // OnboardingMessageProvider
    priority: 5,
    targeting: "true",
  });

  // info("about to wait for normandy event");
  // let normandyEvent = await waitForTelemetryEvent("normandy");
  // info("normandy event received");
  // info(JSON.stringify(normandyEvent));
  await waitForEventsToClear();

  let { win, tab } = await openTabAndWaitForRender();

  await SpecialPowers.spawn(tab, [LOCALE], async function(locale) {
    const infoBody = content.document.getElementById("info-body");
    const promoLink = content.document.getElementById(
      "private-browsing-vpn-link"
    );

    // Check experiment values are rendered
    is(
      infoBody.textContent,
      "You’re in a Private Window",
      "should render infoBody with fluent"
    );
    is(
      promoLink.textContent,
      "Stay private with Mozilla VPN",
      "should render promoLinkText with fluent"
    );
    is(
      content.document.querySelector(".info a").getAttribute("href"),
      "http://foo.example.com/" + locale,
      "should format the infoLinkUrl url"
    );
    is(
      content.document.querySelector(".promo a").getAttribute("href"),
      "http://bar.example.com/" + locale,
      "should format the promoLinkUrl url"
    );
  });

  await waitForTelemetryEvent("normandy");
  TelemetryTestUtils.assertEvents(
    [
      {
        method: "expose",
        extra: {
          featureId: "pbNewtab",
        },
      },
    ],
    { category: "normandy" },
    { process: "content" }
  );

  await BrowserTestUtils.closeWindow(win);
  await doExperimentCleanup();
  await waitForEventsToClear();
});

add_task(async function test_experiment_messaging_system_impressions() {
  const LOCALE = Services.locale.appLocaleAsBCP47;
  let doExperimentCleanup = await setupMSExperimentWithMessage({
    id: `PB_NEWTAB_MESSAGING_SYSTEM_${Math.random()}`,
    template: "pb_newtab",
    content: {
      promoEnabled: true,
      infoEnabled: true,
      infoBody: "fluent:about-private-browsing-info-title",
      promoLinkText: "fluent:about-private-browsing-prominent-cta",
      infoLinkUrl: "http://foo.example.com/%LOCALE%",
      promoLinkUrl: "http://bar.example.com/%LOCALE%",
    },
    frequency: {
      lifetime: 2,
    },
    // Priority ensures this message is picked over the one in
    // OnboardingMessageProvider
    priority: 5,
    targeting: "true",
  });

  await waitForEventsToClear();

  let { win: win1, tab: tab1 } = await openTabAndWaitForRender();

  await SpecialPowers.spawn(tab1, [LOCALE], async function(locale) {
    is(
      content.document.querySelector(".promo a").getAttribute("href"),
      "http://bar.example.com/" + locale,
      "should format the promoLinkUrl url"
    );
  });

  await waitForTelemetryEvent("normandy");
  TelemetryTestUtils.assertEvents(
    [
      {
        method: "expose",
        extra: {
          featureId: "pbNewtab",
        },
      },
    ],
    { category: "normandy" },
    { process: "content" }
  );

  let { win: win2, tab: tab2 } = await openTabAndWaitForRender();

  await SpecialPowers.spawn(tab2, [LOCALE], async function(locale) {
    is(
      content.document.querySelector(".promo a").getAttribute("href"),
      "http://bar.example.com/" + locale,
      "should format the promoLinkUrl url"
    );
  });

  await waitForTelemetryEvent("normandy");
  TelemetryTestUtils.assertEvents(
    [
      {
        method: "expose",
        extra: {
          featureId: "pbNewtab",
        },
      },
    ],
    { category: "normandy" },
    { process: "content" }
  );

  let { win: win3, tab: tab3 } = await openTabAndWaitForRender();

  await SpecialPowers.spawn(tab3, [], async function() {
    is(
      content.document.querySelector(".promo a"),
      null,
      "should no longer render the experiment message after 2 impressions"
    );
  });
  TelemetryTestUtils.assertNumberOfEvents(0, {
    category: "normandy",
    method: "expose",
  });

  await BrowserTestUtils.closeWindow(win1);
  await BrowserTestUtils.closeWindow(win2);
  await BrowserTestUtils.closeWindow(win3);
  await doExperimentCleanup();
  await waitForEventsToClear();
});

// Temporarily disabled for intermittent failure issues, even though the functionality
// seems to work.  When this patch lands, we'll ask for manual QA verification of the "dismiss"
// functionality.  https://bugzilla.mozilla.org/show_bug.cgi?id=1754536 has the gory details.

// add_task(async function test_experiment_messaging_system_dismiss() {
//   const LOCALE = Services.locale.appLocaleAsBCP47;
//   let doExperimentCleanup = await setupMSExperimentWithMessage({
//     id: `PB_NEWTAB_MESSAGING_SYSTEM_${Math.random()}`,
//     template: "pb_newtab",
//     content: {
//       promoEnabled: true,
//       infoEnabled: true,
//       infoBody: "fluent:about-private-browsing-info-title",
//       promoLinkText: "fluent:about-private-browsing-prominent-cta",
//       infoLinkUrl: "http://foo.example.com/%LOCALE%",
//       promoLinkUrl: "http://bar.example.com/%LOCALE%",
//     },
//     // Priority ensures this message is picked over the one in
//     // OnboardingMessageProvider
//     priority: 5,
//     targeting: "true",
//   });

//   let { win: win1, tab: tab1 } = await openTabAndWaitForRender();

//   await SpecialPowers.spawn(tab1, [LOCALE], async function(locale) {
//     is(
//       content.document.querySelector(".promo a").getAttribute("href"),
//       "http://bar.example.com/" + locale,
//       "should format the promoLinkUrl url"
//     );

//     content.document.querySelector("#dismiss-btn").click();
//     info("button clicked");
//   });

//   let telemetryEvent = await waitForTelemetryEvent("aboutprivatebrowsing");

//   ok(
//     telemetryEvent[2] == "click" && telemetryEvent[3] == "dismiss_button",
//     "recorded the dismiss button click"
//   );

//   let { win: win2, tab: tab2 } = await openTabAndWaitForRender();

//   await SpecialPowers.spawn(tab2, [], async function() {
//     is(
//       content.document.querySelector(".promo a"),
//       null,
//       "should no longer render the experiment message after dismissing"
//     );
//   });

//   await BrowserTestUtils.closeWindow(win1);
//   await BrowserTestUtils.closeWindow(win2);
//   await doExperimentCleanup();
// });
