from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # 1. Navigate to app
        page.goto("http://localhost:1420")

        # Move mouse away from left edge to ensure sidebar is closed
        page.mouse.move(500, 500)

        # 2. Wait for editor
        page.wait_for_selector(".ProseMirror")

        # 3. Focus and type /audio
        editor = page.locator(".ProseMirror")
        editor.click()

        # Ensure we are not covered by sidebar (wait for it to close if it was open)
        # Sidebar closes on mouse leave with 400ms delay.
        page.wait_for_timeout(1000)

        editor.type("/audio")

        # 4. Wait for command menu and select Audio
        audio_option = page.get_by_role("option", name="Audio")
        audio_option.wait_for()

        # 5. Press Enter to insert
        page.keyboard.press("Enter")

        # 6. Wait for Audio Capsule
        record_btn = page.get_by_label("Start recording")
        record_btn.wait_for()

        # 7. Take screenshot of initial state
        page.screenshot(path="verification/audio_capsule_initial.png")
        print("Initial state screenshot taken.")

        # 8. Try to click record
        # Force click might be needed if something is still overlaying, but let's try normal click first
        record_btn.click()

        # Wait a bit for error handling
        page.wait_for_timeout(1000)

        # 9. Verify Error State
        expect(record_btn).to_be_visible()

        page.screenshot(path="verification/audio_capsule_error.png")
        print("Error state screenshot taken.")

        browser.close()

if __name__ == "__main__":
    run()
