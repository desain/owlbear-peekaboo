from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(ignore_https_errors=True)
    page = context.new_page()

    try:
        page.goto("https://localhost:5173/src/popoverSettings/popoverSettings.html", wait_until="domcontentloaded")

        # The ExtensionWrapper needs time to initialize and render the component.
        # We'll wait for the #reactApp div to have some children before proceeding.
        react_app_locator = page.locator("#reactApp")
        expect(react_app_locator).to_have_count(1)
        expect(react_app_locator.locator('> *')).to_have_count(1, timeout=15000)

        # Now that the app has likely rendered, we can look for the title.
        expect(page.get_by_text("Visibility Tool Settings")).to_be_visible(timeout=10000)

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)