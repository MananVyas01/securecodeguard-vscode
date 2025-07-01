/**
 * SecureCodeGuard Code Action Provider
 * 
 * Provides quick fixes for security vulnerabilities detected by Semgrep.
 * This enables the lightbulb 💡 feature in VS Code for one-click security fixes.
 * 
 * @author MananVyas01
 * @version 0.0.1
 */

import * as vscode from 'vscode';

/**
 * Code Action Provider for SecureCodeGuard security fixes
 */
export class SecureCodeActionProvider implements vscode.CodeActionProvider {

	/**
	 * Define the kinds of code actions this provider supports
	 */
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	/**
	 * Provide code actions for the given document and range
	 * 
	 * @param document - The document in which the command was invoked
	 * @param range - The range for which the command was invoked
	 * @param context - Additional context about what code actions are being requested
	 * @param token - A cancellation token
	 * @returns Array of code actions (quick fixes)
	 */
	public provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {

		const actions: vscode.CodeAction[] = [];

		// Get the text in the current range
		const text = document.getText(range);
		const lineText = document.lineAt(range.start.line).text;

		// Check for hardcoded API keys
		if (this.containsHardcodedApiKey(text) || this.containsHardcodedApiKey(lineText)) {
			actions.push(this.createApiKeyFix(document, range));
		}

		// Check for hardcoded passwords
		if (this.containsHardcodedPassword(text) || this.containsHardcodedPassword(lineText)) {
			actions.push(this.createPasswordFix(document, range));
		}

		// Check for XSS vulnerabilities (innerHTML usage)
		if (this.containsXssVulnerability(text) || this.containsXssVulnerability(lineText)) {
			actions.push(this.createXssFix(document, range));
		}

		// Check for eval usage
		if (this.containsEvalUsage(text) || this.containsEvalUsage(lineText)) {
			actions.push(this.createEvalFix(document, range));
		}

		// Check for insecure random
		if (this.containsInsecureRandom(text) || this.containsInsecureRandom(lineText)) {
			actions.push(this.createInsecureRandomFix(document, range));
		}

		return actions;
	}

	/**
	 * Check if text contains hardcoded API key patterns
	 */
	private containsHardcodedApiKey(text: string): boolean {
		const apiKeyPatterns = [
			/API_KEY\s*=\s*["']/i,
			/api_key\s*=\s*["']/i,
			/const\s+API_KEY\s*=\s*["']/i,
			/let\s+API_KEY\s*=\s*["']/i,
			/var\s+API_KEY\s*=\s*["']/i
		];
		return apiKeyPatterns.some(pattern => pattern.test(text));
	}

	/**
	 * Check if text contains hardcoded password patterns
	 */
	private containsHardcodedPassword(text: string): boolean {
		const passwordPatterns = [
			/PASSWORD\s*=\s*["']/i,
			/password\s*=\s*["']/i,
			/const\s+PASSWORD\s*=\s*["']/i,
			/let\s+PASSWORD\s*=\s*["']/i,
			/var\s+PASSWORD\s*=\s*["']/i
		];
		return passwordPatterns.some(pattern => pattern.test(text));
	}

	/**
	 * Check if text contains XSS vulnerability patterns
	 */
	private containsXssVulnerability(text: string): boolean {
		return /\.innerHTML\s*=/.test(text);
	}

	/**
	 * Check if text contains eval usage
	 */
	private containsEvalUsage(text: string): boolean {
		return /eval\s*\(/.test(text);
	}

	/**
	 * Check if text contains insecure random usage
	 */
	private containsInsecureRandom(text: string): boolean {
		return /Math\.random\s*\(\)/.test(text);
	}

	/**
	 * Create a fix for hardcoded API keys
	 */
	private createApiKeyFix(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
		const fix = new vscode.CodeAction('🔐 Replace with environment variable', vscode.CodeActionKind.QuickFix);
		fix.edit = new vscode.WorkspaceEdit();

		const line = document.lineAt(range.start.line);
		const lineText = line.text;

		// Replace hardcoded API key with environment variable
		let fixedText: string;
		if (lineText.includes('const ') || lineText.includes('let ') || lineText.includes('var ')) {
			// JavaScript/TypeScript
			fixedText = lineText.replace(
				/(const|let|var)\s+(API_KEY|api_key)\s*=\s*["'][^"']*["']/i,
				'$1 $2 = process.env.$2 || "default_api_key"'
			);
		} else {
			// Python or other languages
			fixedText = lineText.replace(
				/(API_KEY|api_key)\s*=\s*["'][^"']*["']/i,
				'$1 = os.getenv("$1", "default_api_key")'
			);
		}

		fix.edit.replace(document.uri, line.range, fixedText);
		fix.diagnostics = []; // This will be populated by the diagnostics that triggered this fix
		fix.isPreferred = true;

		// Phase 6: Add command to trigger re-scan after fix
		fix.command = {
			title: 'Re-run Semgrep',
			command: 'secureCodeGuard.rescanAfterFix',
			arguments: [document]
		};

		return fix;
	}

	/**
	 * Create a fix for hardcoded passwords
	 */
	private createPasswordFix(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
		const fix = new vscode.CodeAction('🔑 Replace with environment variable', vscode.CodeActionKind.QuickFix);
		fix.edit = new vscode.WorkspaceEdit();

		const line = document.lineAt(range.start.line);
		const lineText = line.text;

		// Replace hardcoded password with environment variable
		let fixedText: string;
		if (lineText.includes('const ') || lineText.includes('let ') || lineText.includes('var ')) {
			// JavaScript/TypeScript
			fixedText = lineText.replace(
				/(const|let|var)\s+(PASSWORD|password)\s*=\s*["'][^"']*["']/i,
				'$1 $2 = process.env.$2 || "default_password"'
			);
		} else {
			// Python or other languages
			fixedText = lineText.replace(
				/(PASSWORD|password)\s*=\s*["'][^"']*["']/i,
				'$1 = os.getenv("$1", "default_password")'
			);
		}

		fix.edit.replace(document.uri, line.range, fixedText);
		fix.isPreferred = true;

		// Phase 6: Add command to trigger re-scan after fix
		fix.command = {
			title: 'Re-run Semgrep',
			command: 'secureCodeGuard.rescanAfterFix',
			arguments: [document]
		};

		return fix;
	}

	/**
	 * Create a fix for XSS vulnerabilities
	 */
	private createXssFix(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
		const fix = new vscode.CodeAction('🛡️ Replace innerHTML with textContent', vscode.CodeActionKind.QuickFix);
		fix.edit = new vscode.WorkspaceEdit();

		const line = document.lineAt(range.start.line);
		const lineText = line.text;

		// Replace innerHTML with textContent
		const fixedText = lineText.replace(/\.innerHTML\s*=/, '.textContent =');

		fix.edit.replace(document.uri, line.range, fixedText);
		fix.isPreferred = true;

		// Phase 6: Add command to trigger re-scan after fix
		fix.command = {
			title: 'Re-run Semgrep',
			command: 'secureCodeGuard.rescanAfterFix',
			arguments: [document]
		};

		return fix;
	}

	/**
	 * Create a fix for eval usage
	 */
	private createEvalFix(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
		const fix = new vscode.CodeAction('⚠️ Replace eval with safe alternative', vscode.CodeActionKind.QuickFix);
		fix.edit = new vscode.WorkspaceEdit();

		const line = document.lineAt(range.start.line);
		const lineText = line.text;

		// Replace eval with safer alternative (JSON.parse for simple cases)
		const fixedText = lineText.replace(/eval\s*\(\s*([^)]+)\s*\)/, 'JSON.parse($1) // TODO: Verify this is safe JSON');

		fix.edit.replace(document.uri, line.range, fixedText);
		fix.isPreferred = true;

		// Phase 6: Add command to trigger re-scan after fix
		fix.command = {
			title: 'Re-run Semgrep',
			command: 'secureCodeGuard.rescanAfterFix',
			arguments: [document]
		};

		return fix;
	}

	/**
	 * Create a fix for insecure random number generation
	 */
	private createInsecureRandomFix(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
		const fix = new vscode.CodeAction('🔒 Replace with crypto-secure random', vscode.CodeActionKind.QuickFix);
		fix.edit = new vscode.WorkspaceEdit();

		const line = document.lineAt(range.start.line);
		const lineText = line.text;

		// Replace Math.random with crypto-secure alternative
		const fixedText = lineText.replace(
			/Math\.random\s*\(\s*\)/,
			'crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1) // Crypto-secure random'
		);

		fix.edit.replace(document.uri, line.range, fixedText);
		fix.isPreferred = true;

		// Phase 6: Add command to trigger re-scan after fix
		fix.command = {
			title: 'Re-run Semgrep',
			command: 'secureCodeGuard.rescanAfterFix',
			arguments: [document]
		};

		return fix;
	}
}
