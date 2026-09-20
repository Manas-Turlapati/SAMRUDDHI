import { useEffect, useState } from "react";

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ta", label: "Tamil" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
  { code: "bn", label: "Bengali" },
  { code: "pa", label: "Punjabi" },
];

const setTranslateCookie = (language) => {
  const value = language === "en" ? "" : `/en/${language}`;
  const maxAge = language === "en" ? "Max-Age=0" : "Max-Age=31536000";
  const host = window.location.hostname;

  document.cookie = `googtrans=${value}; path=/; ${maxAge}`;

  if (host) {
    document.cookie = `googtrans=${value}; path=/; domain=${host}; ${maxAge}`;
  }
};

const applyGoogleLanguage = (language) => {
  const combo = document.querySelector(".goog-te-combo");

  if (!combo) {
    return false;
  }

  combo.value = language;
  combo.dispatchEvent(new Event("change"));
  return true;
};

export default function WebsiteTranslator() {
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => localStorage.getItem("samruddhi_site_language") || "en",
  );

  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: languages.map((language) => language.code).join(","),
          autoDisplay: false,
        },
        "google_translate_element",
      );

      window.setTimeout(() => applyGoogleLanguage(selectedLanguage), 500);
    };

    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else {
      window.googleTranslateElementInit();
    }
  }, [selectedLanguage]);

  const handleLanguageChange = (event) => {
    const language = event.target.value;

    setSelectedLanguage(language);
    localStorage.setItem("samruddhi_site_language", language);
    setTranslateCookie(language);

    if (!applyGoogleLanguage(language)) {
      window.location.reload();
    }
  };

  return (
    <>
      <div id="google_translate_element" className="google-translate-element" />
      <label className="site-language">
        Website language
        <select value={selectedLanguage} onChange={handleLanguageChange}>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
