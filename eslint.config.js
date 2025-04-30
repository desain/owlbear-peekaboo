import js from "@eslint/js";
import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist"] },
    {
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommendedTypeChecked,
        ],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
            "prefer-arrow-functions": preferArrowFunctions,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,

            "react-refresh/only-export-components": [
                "warn",
                { allowConstantExport: true },
            ],

            "@typescript-eslint/switch-exhaustiveness-check": "error",
            "@typescript-eslint/no-misused-promises": [
                "error",
                {
                    checksVoidReturn: false,
                },
            ],
            "@typescript-eslint/prefer-readonly": "error",

            curly: "error",
            "class-methods-use-this": [
                "error",
                {
                    exceptMethods: ["continueExecution"],
                },
            ],
            "arrow-body-style": ["error", "as-needed"],
            "no-restricted-syntax": [
                "error",
                // https://typescript-eslint.io/troubleshooting/faqs/general/#how-can-i-ban-specific-language-feature
                {
                    selector: "TSEnumDeclaration",
                    message: "Custom restriction: Avoid using Typescript enums",
                },
                {
                    selector: "MethodDefinition[static = true] ThisExpression",
                    message: "Prefer using the class's name directly.",
                },
                {
                    selector: "TSTupleType > :not(TSNamedTupleMember):not(TSRestType)",
                    message: "All tuples should have labels.",
                },
                {
                    selector:
                        ':matches(PropertyDefinition, MethodDefinition)[accessibility="private"]',
                    message: "Use #private instead",
                },
            ],

            "prefer-arrow-functions/prefer-arrow-functions": [
                "error",
                {
                    allowNamedFunctions: true,
                    allowObjectProperties: false,
                    classPropertiesAllowed: true,
                    disallowPrototype: true,
                    returnStyle: "implicit",
                    singleReturnOnly: false,
                },
            ],
        },
    },
);
