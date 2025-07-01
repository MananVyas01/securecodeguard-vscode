# SecureCodeGuard - A VS Code Security Extension

SecureCodeGuard is a developer-friendly VS Code plugin that scans your code and highlights potential security risks as you work. It provides inline warnings, fix suggestions, and automatic re-scans to help you write safer code.

![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue?style=flat-square&logo=visual-studio-code)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue?style=flat-square&logo=typescript)
![Semgrep](https://img.shields.io/badge/Semgrep-Integrated-green?style=flat-square)
![Security](https://img.shields.io/badge/Security-Analysis-red?style=flat-square&logo=shield)

## Features

- **Real-time Security Scanning**: Detects hardcoded secrets like API keys or credentials
- **Authorization Checks**: Identifies routes or controller functions lacking authorization middleware
- **Dependency Analysis**: Scans `package.json` and `requirements.txt` for outdated or vulnerable dependencies
- **Quick Fixes**: Offers one-click fixes through VS Code's Code Actions (lightbulb)
- **Automatic Re-validation**: Re-runs scans automatically after code fixes

## How It Works

- Listens for file save events inside the editor
- Runs Semgrep rules on supported files (JavaScript, TypeScript, Python, Java, C#)
- Uses VS Code's Diagnostics API to display warnings inline and in the Problems tab
- Suggests fixes through contextual actions or popup dialogs

## Example Security Issues Detected

- `api_key = "12345"` → Suggest using `process.env.API_KEY` or `os.getenv("API_KEY")`
- `app.get('/admin', ...)` → Flags missing `auth` or `isAdmin` middleware
- `"express": "1.2.0"` → Alerts that a newer, more secure version is available
- `document.innerHTML = userInput` → Warns about XSS vulnerability, suggests `textContent`
- `eval(userCode)` → Detects code injection risk, suggests safer alternatives

## Supported Languages & Frameworks

### Languages
- JavaScript
- TypeScript  
- Python
- Java
- C#

### Frameworks
- **Express.js**: Route authorization detection
- **Flask**: Decorator-based authorization checks
- **Node.js**: Package dependency analysis
- **Python**: Requirements dependency analysis

## Getting Started

### Requirements

- VS Code 1.60.0 or higher
- [Semgrep](https://semgrep.dev/docs/getting-started/) installed

```bash
pip install semgrep
```

### Run Locally

```bash
git clone https://github.com/MananVyas01/securecodeguard-vscode.git
cd securecodeguard-vscode
npm install
code .
# Press F5 to launch the Extension Development Host
```

### Usage

1. Open any supported code file in VS Code
2. Save the file to trigger automatic security scanning
3. Review security issues in the Problems tab or inline diagnostics
4. Click the lightbulb icon (💡) for quick fixes
5. Apply fixes and watch automatic re-scan confirm resolution

## Folder Structure

```
/semgrep-rules          # YAML rules for Semgrep security scanning
  ├── hardcoded-secrets.yml
  ├── xss-vulnerability.yml
  ├── code-injection.yml
  ├── missing-auth-express.yml
  └── missing-auth-flask.yml
/src                    # Extension logic
  ├── extension.ts           # Activation and main scanning logic
  ├── codeActions.ts         # Code fix suggestions and quick actions
  ├── semgrepRunner.ts       # Executes and parses Semgrep results
  └── dependencyChecker.ts   # Dependency vulnerability analysis
```

## Security Patterns Detected

### Code Vulnerabilities
- Hardcoded API keys, passwords, and authentication tokens
- XSS vulnerabilities from unsafe DOM manipulation
- Code injection risks from eval() and dynamic execution
- Insecure randomization in security contexts
- SQL injection patterns from unsafe query construction

### Framework Security
- Missing authentication middleware in Express.js routes
- Missing authorization decorators in Flask routes
- Unprotected API endpoints and admin routes

### Dependency Security
- Outdated packages with known vulnerabilities
- Packages with documented CVEs
- Version analysis for potentially vulnerable dependencies

## Demo Video

*[Demo video will be added here]*

## Development Status

This extension currently supports comprehensive static security analysis for multiple programming languages and frameworks. All core features are implemented and tested:

- ✅ Real-time Semgrep integration
- ✅ Inline diagnostics and visual feedback  
- ✅ One-click security fixes
- ✅ Automatic re-validation
- ✅ Dependency vulnerability detection
- ✅ Authorization gap detection

### Future Enhancements
- Integration with external vulnerability databases
- Custom rule editor interface
- Team collaboration features
- CI/CD pipeline integration
- Additional framework support

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is developed as part of a technical assessment and follows best practices for VS Code extension development.

---

**Built for secure software development**
