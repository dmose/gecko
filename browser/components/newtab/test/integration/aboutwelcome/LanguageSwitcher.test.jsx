import React from "react";
import { LanguageSwitcher } from "content-src/aboutwelcome/components/LanguageSwitcher.jsx";
import { render, screen } from "@testing-library/react";

describe("LanguageSwitcher", () => {
  const content = {
    logo: {},
    title: { string_id: "onboarding-live-language-header" },
    has_noodles: true,
    languageSwitcher: {
      downloading: {
        string_id: "onboarding-live-language-button-label-downloading",
      },
      cancel: {
        string_id: "onboarding-live-language-secondary-cancel-download",
      },
      waiting: { string_id: "onboarding-live-language-waiting-button" },
      skip: { string_id: "onboarding-live-language-skip-button-label" },
      action: {
        navigate: true,
      },
    },
  };

  it("should render the Language Switcher modal", () => {
    render(<LanguageSwitcher content={content} />);

    //TODO: Why don't we see the pre-loader?

    assert.exists(
      screen.getByTestId("waiting_primary_button"),
      "The waiting primary button exists"
    );

    assert.exists(
      screen.getByTestId("waiting_img"),
      "The language loader image exists"
    );

    assert.exists(
      screen.getByTestId("cancel_waiting"),
      "The cancel button exists"
    );

    //TODO: Once we're done waiting,
    //click the button to trigger the download and then test the content
    //fireEvent.click('button[value="primary_button"]');

    screen.logTestingPlaygroundURL();
  });
});
