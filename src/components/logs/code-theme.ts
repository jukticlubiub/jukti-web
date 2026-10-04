import type { ThemeRegistration } from "shiki";

/**
 * Syntax colors for code in Jukti Logs, in the site's ember palette. Every color is
 * at least 5.5:1 against the background (comments are the lowest).
 */
export const emberCodeTheme: ThemeRegistration = {
  name: "jukti-ember",
  type: "dark",
  fg: "#e6e1dd",
  bg: "#0c0705",
  colors: {
    "editor.foreground": "#e6e1dd",
    "editor.background": "#0c0705",
  },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#8f847d" } },
    {
      scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.control", "keyword.other"],
      settings: { foreground: "#f57c48" },
    },
    {
      scope: ["meta.preprocessor", "keyword.control.directive", "punctuation.definition.directive", "entity.name.function.preprocessor"],
      settings: { foreground: "#ec6a3c" },
    },
    { scope: ["string", "string.quoted", "punctuation.definition.string", "string.template"], settings: { foreground: "#ffc9a6" } },
    { scope: ["constant.numeric", "constant.language", "constant.character", "constant.other"], settings: { foreground: "#ff9e6b" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call.generic"], settings: { foreground: "#ffffff" } },
    {
      scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "storage.type.built-in", "entity.name.namespace"],
      settings: { foreground: "#f7b38c" },
    },
    { scope: ["variable.parameter", "variable.language", "support.variable"], settings: { foreground: "#f0d9cc" } },
    { scope: ["keyword.operator", "punctuation", "meta.brace"], settings: { foreground: "#b3a79f" } },
    { scope: ["entity.name.tag"], settings: { foreground: "#f57c48" } },
    { scope: ["entity.other.attribute-name"], settings: { foreground: "#f7b38c" } },
  ],
};
