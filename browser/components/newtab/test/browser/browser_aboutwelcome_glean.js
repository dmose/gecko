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
  Services.fog.testResetFOG();
  // Let's check that there is nothing in the impression event.
  // This is useful in mochitests because glean inits fairly late in startup.
  // We want to make sure we are fully initialized during testing so that
  // when we call testGetValue() we get predictable behavior.
  Assert.equal(undefined, Glean.onboardingMessaging.messageId.testGetValue());

  // Setup testBeforeNextSubmit. We do this first, progress onboarding, submit
  // and then check submission. We put the asserts inside testBeforeNextSubmit
  // because metric lifetimes are 'ping' and are cleared after submission.
  // See: https://firefox-source-docs.mozilla.org/toolkit/components/glean/user/instrumentation_tests.html#xpcshell-tests
  let pingSubmitted = false;
  GleanPings.aboutWelcome.testBeforeNextSubmit(reason => {
    Assert.equal("about_welcome", reason);
    pingSubmitted = true;

    Assert.equal(
      Glean.onboardingMessaging.pingType.testGetValue(),
      "AWPage:TELEMETRY_EVENT"
    );
    Assert.equal(
      Glean.onboardingMessaging.messageId.testGetValue(),
      "MR_WELCOME_DEFAULT"
    );
    let invalidKeys = Glean.onboardingMessaging.invalidKeys.testGetValue();
    Assert.equal(invalidKeys, undefined);
  });

  const sandbox = sinon.createSandbox();
  let browser = await openAboutWelcome();
  let aboutWelcomeActor = await getAboutWelcomeParent(browser);
  // Stub AboutWelcomeParent Content Message Handler
  sandbox.spy(aboutWelcomeActor, "onContentMessage");
  registerCleanupFunction(() => {
    sandbox.restore();
  });

  await onButtonClick(browser, "button.primary");
  await onButtonClick(browser, "button.primary");
  await onButtonClick(browser, "button.primary");

  GleanPings.aboutWelcome.submit();
  Assert.ok(pingSubmitted, "Ping was submitted, callback was called.");
});
