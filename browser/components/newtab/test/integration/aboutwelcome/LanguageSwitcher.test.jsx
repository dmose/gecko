import React from "react";
import { LanguageSwitcher } from "content-src/aboutwelcome/components/LanguageSwitcher.jsx"
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
		render( <LanguageSwitcher content={content} />);

		screen.logTestingPlaygroundURL();
	})
})