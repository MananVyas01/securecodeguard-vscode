# SecureCodeGuard Demo Video Plan

## 5-Minute Walkthrough Structure

| Time | Segment Description                             |
|------|-------------------------------------------------|
| 0:00 | Introduction: Plugin name and purpose           |
| 0:30 | Paste code with hardcoded secret → show result  |
| 1:00 | Apply fix via lightbulb → show re-scan success  |
| 1:30 | Show Express route without auth → trigger warn  |
| 2:00 | Save `package.json` with outdated version       |
| 2:30 | Review Problems tab and popup alerts            |
| 3:00 | Briefly explain folder structure & how it works |
| 4:30 | Wrap up with possible future improvements       |

## Optional Script

### Introduction (0:00 - 0:30)
> "Hi, this is a short demo of SecureCodeGuard — a VS Code extension that helps developers catch common security flaws right inside their editor. It uses Semgrep for scanning and shows real-time suggestions. Let's see how it works."

### Hardcoded Secret Demo (0:30 - 1:00)
1. Open a new JavaScript file
2. Type: `const apiKey = "sk-1234567890abcdef";`
3. Save the file
4. Show the red squiggly underline and diagnostic message
5. Explain how it detected the hardcoded API key

### Quick Fix Demo (1:00 - 1:30)
1. Click on the lightbulb icon next to the hardcoded secret
2. Select the suggested fix: "Use environment variable"
3. Show the code being replaced with `process.env.API_KEY`
4. Save and show the re-scan clearing the warning

### Authorization Check Demo (1:30 - 2:00)
1. Open `test-routes.js` (or create new Express route)
2. Show unprotected admin route: `app.get('/admin', (req, res) => {...})`
3. Save and show the warning about missing authentication middleware
4. Click lightbulb and show suggested fix

### Dependency Vulnerability Demo (2:00 - 2:30)
1. Open `test-package.json` with outdated Express version
2. Save the file
3. Show the modal popup warning about vulnerable dependencies
4. Demonstrate the detailed vulnerability information

### Problems Tab Review (2:30 - 3:00)
1. Show the Problems tab with all detected issues
2. Explain the severity levels (Error, Warning, Info)
3. Show how clicking an issue navigates to the code location

### Architecture Overview (3:00 - 4:30)
1. Briefly show the folder structure
2. Explain Semgrep rules directory
3. Show one YAML rule file as example
4. Mention the TypeScript architecture

### Conclusion (4:30 - 5:00)
> "SecureCodeGuard helps you write more secure code by catching vulnerabilities as you type. It's extensible, fast, and integrates seamlessly with your VS Code workflow. Future versions will include more rules, framework support, and team collaboration features."

## Test Files for Demo

The following test files are available for demonstration:

- `test-routes.js` - Express.js routes with missing auth
- `test-views.py` - Flask routes without authorization
- `test-package.json` - Outdated dependencies
- `test-requirements.txt` - Python package vulnerabilities
- `test-vulnerable-code.js` - Various security issues

## Recording Tips

1. Use a clean VS Code workspace
2. Set font size to 14+ for visibility
3. Record at 1080p minimum resolution
4. Keep mouse movements smooth and deliberate
5. Pause briefly after each action for clarity
6. Use the Command Palette (Ctrl+Shift+P) to show extension commands if needed

## Demo Assets Needed

- [ ] Screen recording software (OBS Studio recommended)
- [ ] Clean VS Code theme (Dark+ or Light+ recommended)
- [ ] Prepared test files
- [ ] Extension installed and activated
- [ ] Semgrep installed and working

## Post-Recording

- [ ] Edit for clarity and pacing
- [ ] Add captions/subtitles
- [ ] Export in MP4 format
- [ ] Upload to YouTube/platform
- [ ] Add link to README.md
