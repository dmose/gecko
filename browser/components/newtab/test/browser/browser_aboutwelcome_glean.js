/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests for the Glean version of onboarding telemetry.
 */

const TEST_DEFAULT_CONTENT = [
  {
    id: "AW_STEP1",

    content: {
      position: "split",
      title: "Step 1",
      page: "page 1",
      source: "test",
      primary_button: {
        label: "Next",
        action: {
          navigate: true,
        },
      },
      secondary_button: {
        label: "link",
      },
      secondary_button_top: {
        label: "link top",
        action: {
          type: "SHOW_FIREFOX_ACCOUNTS",
          data: { entrypoint: "test" },
        },
      },
      help_text: {
        text: "Here's some sample help text",
      },
    },
  },
  {
    id: "AW_STEP2",
    content: {
      position: "center",
      title: "Step 2",
      page: "page 1",
      source: "test",
      primary_button: {
        label: "Next",
        action: {
          navigate: true,
        },
      },
      secondary_button: {
        label: "link",
      },
      has_noodles: true,
    },
  },
  {
    id: "AW_STEP3",
    content: {
      title: "Step 3",
      tiles: {
        type: "theme",
        action: {
          theme: "<event>",
        },
        data: [
          {
            theme: "automatic",
            label: "theme-1",
            tooltip: "test-tooltip",
          },
          {
            theme: "dark",
            label: "theme-2",
          },
        ],
      },
      primary_button: {
        label: "Next",
        action: {
          navigate: true,
        },
      },
      secondary_button: {
        label: "Import",
        action: {
          type: "SHOW_MIGRATION_WIZARD",
          data: { source: "chrome" },
        },
      },
    },
  },
  {
    id: "AW_STEP4",
    auto_advance: "primary_button",
    content: {
      title: "Step 4",
      primary_button: {
        label: "Next",
        action: {
          navigate: true,
        },
      },
      secondary_button: {
        label: "link",
      },
    },
  },
];

const TEST_DEFAULT_JSON = JSON.stringify(TEST_DEFAULT_CONTENT);

async function openAboutWelcome() {
  await setAboutWelcomePref(true);
  await setAboutWelcomeMultiStage(TEST_DEFAULT_JSON);

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:welcome",
    true
  );
  registerCleanupFunction(() => {
    BrowserTestUtils.removeTab(tab);
  });
  return tab.linkedBrowser;
}

add_task(async function test_welcome_telemetry() {
  // TODO(bug 1833453): Bounce data collection prefs to quickly clean things.
  await SpecialPowers.pushPrefEnv({
    set: [["telemetry.fog.test.localhost_port", 0]],
  });
  await SpecialPowers.popPrefEnv();

  // Have to turn on AS telemetry for anything to be recorded.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.newtabpage.activity-stream.telemetry", true]],
  });
  registerCleanupFunction(async () => {
    await SpecialPowers.popPrefEnv();
  });

  Services.fog.testResetFOG();
  // Let's check that there is nothing in the impression event.
  // This is useful in mochitests because glean inits fairly late in startup.
  // We want to make sure we are fully initialized during testing so that
  // when we call testGetValue() we get predictable behavior.
  Assert.equal(undefined, Glean.messagingSystem.messageId.testGetValue());

  // Setup testBeforeNextSubmit. We do this first, progress onboarding, submit
  // and then check submission. We put the asserts inside testBeforeNextSubmit
  // because metric lifetimes are 'ping' and are cleared after submission.
  // See: https://firefox-source-docs.mozilla.org/toolkit/components/glean/user/instrumentation_tests.html#xpcshell-tests
  let pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;

    Assert.equal(
      Glean.messagingSystem.messageId.testGetValue(),
      "MR_WELCOME_DEFAULT"
    );
    let unknownKeys = Glean.messagingSystem.unknownKeys.testGetValue();
    Assert.equal(unknownKeys, undefined);
  });

  const sandbox = sinon.createSandbox();
  let browser = await openAboutWelcome();
  Assert.ok(pingSubmitted, "Ping was submitted, callback was called.");
  let aboutWelcomeActor = await getAboutWelcomeParent(browser);
  registerCleanupFunction(() => {
    sandbox.restore();
  });

  // Let's reset and assert some values in the next button click.
  pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;

    Assert.equal(
      Glean.messagingSystem.event.testGetValue(), "CLICK_BUTTON");
    Assert.equal(Glean.messagingSystem.eventSource.testGetValue(), "primary_button");
    Assert.equal(
      Glean.messagingSystem.messageId.testGetValue(),
      "MR_WELCOME_DEFAULT_0_AW_STEP1"
    );
    let unknownKeys = Glean.messagingSystem.unknownKeys.testGetValue();
    Assert.equal(unknownKeys, undefined);
  });
  await onButtonClick(browser, "button.primary");
  Assert.ok(pingSubmitted, "Ping was submitted, callback was called.");

  // TODO: Asserts for this button
  await onButtonClick(browser, "button.primary");
  // TODO: Asserts for this button
  await onButtonClick(browser, "button.primary");

});
