# SecureCodeGuard - VS Code Security Extension

A comprehensive VS Code extension that provides real-time security analysis with Semgrep integration, dependency vulnerability detection, and automated security fixes for secure coding practices.

![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue?style=flat-square&logo=visual-studio-code)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue?style=flat-square&logo=typescript)
![Semgrep](https://img.shields.io/badge/Semgrep-Integrated-green?style=flat-square)
![Security](https://img.shields.io/badge/Security-Analysis-red?style=flat-square&logo=shield)

## Project Overview

SecureCodeGuard is a professional VS Code extension designed to enhance developer security awareness by providing real-time vulnerability detection, automated fixes, and comprehensive security analysis across multiple programming languages and frameworks.

## Features

### Core Security Scanning (Phases 1-2)
- Real-time Semgrep integration with automatic security scanning on file save
- Multi-language support for JavaScript, TypeScript, Python, Java, and C#
- Custom YAML-based Semgrep rules for various vulnerability patterns
- Extension activates on VS Code startup for seamless integration

### Inline Diagnostics & Visualization (Phases 3-4)
- Inline diagnostics with squiggly underlines for security issues
- Integration with VS Code Problems tab for detailed issue tracking
- Severity classification (Error, Warning, Info) for proper prioritization
- User-friendly popup notifications for critical security issues

### Quick-Fix Code Actions (Phase 5)
- One-click security fixes via VS Code lightbulb actions
- Automated remediation for common security patterns
- Interactive popup suggestions for critical vulnerabilities
- Context-aware fixes with framework-specific recommendations

### Automatic Re-validation (Phase 6)
- Automatic Semgrep re-scan after applying fixes
- Instant feedback to confirm fix effectiveness
- Real-time progress notifications during re-scan operations
- Enhanced diagnostic messages with actionable suggestions

### Dependency Vulnerability Detection (Phase 7)
- Package.json analysis for Node.js dependency vulnerabilities
- Requirements.txt analysis for Python dependency security issues
- Detection of outdated versions with known vulnerabilities
- Built-in database of vulnerable package versions
- Detailed reporting with modal dialogs and fix recommendations

### Authorization Detection (Phase 8)
- Express.js route analysis to detect missing authentication middleware
- Flask route analysis to identify routes without authorization decorators
- Smart filtering that excludes public routes and properly protected endpoints
- Framework-specific suggestions tailored to each technology stack

## Security Patterns Detected

### Code Vulnerabilities
- Hardcoded secrets including API keys, passwords, and tokens
- XSS vulnerabilities from innerHTML usage and unsafe DOM manipulation
- Code injection risks from eval() usage and dynamic code execution
- Insecure randomization using Math.random() in security contexts
- SQL injection patterns from unsafe query construction

### Dependency Issues
- Outdated packages with known vulnerabilities
- Known CVEs in package dependencies
- Smart version analysis to detect potentially vulnerable versions

### Authorization Gaps
- Missing middleware in Express.js routes
- Missing decorators in Flask routes
- Backend API security validation issues

## Technical Architecture

```
src/
├── extension.ts          # Main extension logic & Semgrep integration
├── codeActions.ts        # Quick-fix code action provider
├── semgrepRunner.ts      # Semgrep execution & result processing
└── dependencyChecker.ts  # Dependency vulnerability analysis

semgrep-rules/
├── hardcoded-secrets.yml      # API keys, passwords detection
├── xss-vulnerability.yml      # XSS pattern detection
├── code-injection.yml         # eval() and injection patterns
├── insecure-random.yml        # Weak randomization detection
├── missing-auth-express.yml   # Express.js auth middleware
└── missing-auth-flask.yml     # Flask auth decorator detection
```

## Installation & Usage

### Prerequisites
- VS Code 1.60.0 or higher
- Python 3.8+ (for Semgrep)
- Node.js 14+ (for development)

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Python virtual environment with Semgrep
4. Launch extension development host: `F5`

### Usage
1. **Automatic Scanning**: Save any supported file to trigger security analysis
2. **Fix Vulnerabilities**: Click the lightbulb icon for quick fixes
3. **Review Issues**: Check Problems tab for detailed security reports
4. **Dependency Check**: Save `package.json` or `requirements.txt` for vulnerability analysis

## Performance & Reliability

- Fast scanning with optimized Semgrep integration and minimal performance impact
- Robust error handling with comprehensive error management and user feedback
- Real-time progress indicators during operations
- Fail-safe design with graceful handling of edge cases and scanning failures

## Development Status

### Completed Features (8/8 Phases)
- [x] Core Semgrep integration and real-time scanning
- [x] Inline diagnostics and visual feedback
- [x] Quick-fix code actions and popup suggestions
- [x] Automatic re-validation after fixes
- [x] Package dependency vulnerability detection
- [x] Missing authorization detection for web frameworks

### Future Enhancements
- Advanced vulnerability database integration with CVE databases
- Custom rule editor with GUI for creating custom Semgrep rules
- Team collaboration features with shared security policies and rule sets
- CI/CD integration for GitHub Actions and GitLab CI support
- Metrics dashboard for security posture tracking and reporting
- Additional framework support for Django, Spring Boot, and ASP.NET Core

## Testing

The extension includes comprehensive test files for validation:
- `test-routes.js` - Express.js authorization testing
- `test-views.py` - Flask authorization testing  
- `test-package.json` - Dependency vulnerability testing
- `test-requirements.txt` - Python dependency testing

## Impact & Benefits

- Proactive security that catches vulnerabilities during development
- Improved developer productivity with one-click fixes
- Security education through actionable suggestions and recommendations
- Seamless integration with existing VS Code workflow
- Enhanced code quality and overall application security posture

## Technology Stack

- **Frontend**: TypeScript, VS Code Extension API
- **Security Engine**: Semgrep with custom YAML rules
- **Languages**: JavaScript, TypeScript, Python, Java, C#
- **Frameworks**: Express.js, Flask detection
- **Package Managers**: npm, pip dependency analysis

## License

This project is developed as part of a technical assessment and follows best practices for VS Code extension development.

## Contributing

This extension demonstrates comprehensive security analysis capabilities and serves as a foundation for enterprise-grade security tooling in VS Code.

---

**Built for secure software development**
