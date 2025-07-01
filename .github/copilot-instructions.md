# Copilot Instructions for SecureCodeGuard Extension

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a VS Code extension project. Please use the get_vscode_api with a query as input to fetch the latest VS Code API references.

## Project Context

SecureCodeGuard is a VS Code extension focused on secure code analysis and protection. The extension is built using TypeScript and follows VS Code extension development best practices.

### Key Guidelines

- Use TypeScript for all source code
- Follow VS Code extension architecture patterns
- Implement proper error handling and logging
- Use VS Code API methods appropriately
- Maintain clean, documented code
- Follow security best practices in the implementation

### Architecture

- Main extension entry point: `src/extension.ts`
- Commands are registered in `package.json` under `contributes.commands`
- Extension activation is handled automatically by VS Code based on command contributions
- Use proper disposal patterns for subscriptions and resources

### Development Standards

- Add comprehensive JSDoc comments for all public methods
- Use descriptive variable names and clear code structure
- Implement proper error handling with user-friendly messages
- Follow TypeScript best practices and type safety
