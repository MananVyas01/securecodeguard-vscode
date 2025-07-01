/**
 * SecureCodeGuard VS Code Extension
 * 
 * This extension provides secure code analysis and protection features for VS Code.
 * 
 * @author MananVyas01
 * @version 0.0.1
 */

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { SecureCodeActionProvider } from './codeActions';
import { initializeSemgrepRunner, runSemgrepOnDocument } from './semgrepRunner';
import { checkVulnerableLibraries } from './dependencyChecker';

// Create a diagnostic collection for SecureCodeGuard
let diagnosticCollection: vscode.DiagnosticCollection;

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 * 
 * @param context - The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('✅ SecureCodeGuard is now active!');

	// Also show an activation message to the user
	vscode.window.showInformationMessage('🛡️ SecureCodeGuard Extension Activated!');

	// Initialize the diagnostic collection for inline security warnings
	diagnosticCollection = vscode.languages.createDiagnosticCollection('secureCodeGuard');
	context.subscriptions.push(diagnosticCollection);

	// Initialize the semgrep runner with the diagnostic collection and extension context
	initializeSemgrepRunner(diagnosticCollection, context);

	// Phase 5: Register Code Action Provider for quick fixes
	// This enables the lightbulb 💡 feature for security fixes
	const codeActionProvider = new SecureCodeActionProvider();
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			[
				{ language: 'javascript', scheme: 'file' },
				{ language: 'typescript', scheme: 'file' },
				{ language: 'python', scheme: 'file' },
				{ language: 'java', scheme: 'file' },
				{ language: 'csharp', scheme: 'file' }
			],
			codeActionProvider,
			{
				providedCodeActionKinds: SecureCodeActionProvider.providedCodeActionKinds
			}
		)
	);

	// Register the Hello World command
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const helloWorldCommand = vscode.commands.registerCommand('securecodeguard.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from SecureCodeGuard!');
	});

	// Add the command to the extension's subscriptions so it gets disposed when the extension is deactivated
	context.subscriptions.push(helloWorldCommand);

	// Phase 6: Register the re-scan command for automatic Semgrep re-run after fixes
	const rescanAfterFixCommand = vscode.commands.registerCommand('secureCodeGuard.rescanAfterFix', (document: vscode.TextDocument) => {
		// Run Semgrep on the specific document after a fix is applied
		runSemgrepOnDocument(document);
	});
	context.subscriptions.push(rescanAfterFixCommand);

	// Phase 2 & 3 & 4: Listen to file save events, run Semgrep scan, and show inline diagnostics
	// Add an event listener that triggers whenever a file is saved
	const onSaveDisposable = vscode.workspace.onDidSaveTextDocument((document) => {
		// Get the full file path of the saved document
		const fileName = document.fileName;
		const scheme = document.uri.scheme;

		console.log(`📁 File saved event triggered!`);
		console.log(`   - File Name: ${fileName}`);
		console.log(`   - URI Scheme: ${scheme}`);
		console.log(`   - Language: ${document.languageId}`);

		// Display an information message with the saved file path
		// Only show notification for actual files (not untitled)
		if (scheme === 'file') {
			vscode.window.showInformationMessage(`📁 File saved: ${fileName}`);

			// Phase 7: Check for dependency vulnerabilities in package.json or requirements.txt
			if (document.fileName.endsWith('package.json') || document.fileName.endsWith('requirements.txt')) {
				checkVulnerableLibraries(document);
			} else {
				// Phase 3 & 4: Run Semgrep security scan and create inline diagnostics for regular code files
				runSemgrepScan(fileName, document, context);
			}
		} else {
			vscode.window.showInformationMessage(`📁 Document saved: ${document.fileName} (${scheme})`);
		}
	});

	// Add the save event listener to the extension's subscriptions for proper cleanup
	context.subscriptions.push(onSaveDisposable);
}

/**
 * Run Semgrep security scan on the specified file and create inline diagnostics
 * 
 * @param filePath - The absolute path to the file to scan
 * @param document - The TextDocument object for creating diagnostics
 * @param context - The extension context
 */
function runSemgrepScan(filePath: string, document: vscode.TextDocument, context: vscode.ExtensionContext): void {
	console.log(`🔍 Starting Semgrep scan for: ${filePath}`);

	// Get the path to semgrep-rules directory
	const extensionPath = context.extensionPath;
	const semgrepRulesPath = path.join(extensionPath, 'semgrep-rules');

	// Use the full path to semgrep executable from virtual environment
	const semgrepExecutable = path.join(extensionPath, '.venv', 'Scripts', 'semgrep.exe');

	// Construct the Semgrep CLI command
	const semgrepCmd = `"${semgrepExecutable}" --config "${semgrepRulesPath}" --json "${filePath}"`;

	console.log(`🔍 Running command: ${semgrepCmd}`);

	// Run Semgrep asynchronously
	cp.exec(semgrepCmd, (error, stdout, stderr) => {
		if (error) {
			console.error(`❌ Semgrep execution error: ${error.message}`);
			vscode.window.showErrorMessage(`Semgrep error: ${error.message}`);
			return;
		}

		if (stderr) {
			console.error(`⚠️ Semgrep stderr: ${stderr}`);
		}

		if (stdout) {
			try {
				const results = JSON.parse(stdout);
				console.log(`📊 Semgrep scan completed for: ${path.basename(filePath)}`);

				// Create array to hold diagnostics for this file
				const diagnostics: vscode.Diagnostic[] = [];

				// Check if security issues were found
				if (results.results && results.results.length > 0) {
					const issueCount = results.results.length;

					console.log('🚨 Semgrep Security Results:', results);

					// Create diagnostics for each issue
					results.results.forEach((issue: any, index: number) => {
						console.log(`Issue ${index + 1}:`, {
							rule: issue.check_id,
							message: issue.extra.message,
							severity: issue.extra.severity,
							line: issue.start.line,
							file: issue.path
						});

						// Convert Semgrep 1-based line/col to VS Code 0-based positions
						const startLine = Math.max(0, issue.start.line - 1);
						const startCol = Math.max(0, issue.start.col - 1);
						const endLine = Math.max(0, issue.end.line - 1);
						const endCol = Math.max(0, issue.end.col - 1);

						// Create VS Code range for the diagnostic
						const range = new vscode.Range(
							new vscode.Position(startLine, startCol),
							new vscode.Position(endLine, endCol)
						);

						// Determine diagnostic severity based on Semgrep severity
						let severity = vscode.DiagnosticSeverity.Warning;
						if (issue.extra.severity === 'ERROR') {
							severity = vscode.DiagnosticSeverity.Error;
						} else if (issue.extra.severity === 'INFO') {
							severity = vscode.DiagnosticSeverity.Information;
						}

						// Enhance diagnostic message with specific suggestions for authorization issues
						let enhancedMessage = issue.extra.message;
						if (issue.check_id.includes('missing-auth') || issue.check_id.includes('flask-missing-auth')) {
							enhancedMessage = enhanceAuthorizationMessage(issue.extra.message, issue.check_id, document.languageId);
						}

						// Create the diagnostic
						const diagnostic = new vscode.Diagnostic(
							range,
							`${enhancedMessage} (Rule: ${issue.check_id})`,
							severity
						);

						// Add additional metadata
						diagnostic.source = 'SecureCodeGuard';
						diagnostic.code = issue.check_id;

						diagnostics.push(diagnostic);

						// Phase 5: Show popup fix suggestions for critical security issues
						if (issue.check_id.includes('hardcoded-api-key')) {
							showApiKeyFixPopup(document, range);
						} else if (issue.check_id.includes('hardcoded-password')) {
							showPasswordFixPopup(document, range);
						} else if (issue.check_id.includes('xss-vulnerability')) {
							showXssFixPopup(document, range);
						}
					});

					// Set diagnostics for this file
					diagnosticCollection.set(document.uri, diagnostics);

					// Show warning notification with count
					vscode.window.showWarningMessage(
						`🚨 Security issues detected! Found ${issueCount} issue(s). Check Problems tab for details.`
					);
				} else {
					// Clear diagnostics for this file (no issues found)
					diagnosticCollection.set(document.uri, []);

					// Show success notification
					vscode.window.showInformationMessage('✅ No security issues detected.');
					console.log('✅ Semgrep scan completed - no issues found');
				}
			} catch (parseError) {
				console.error(`❌ Failed to parse Semgrep output: ${parseError}`);
				vscode.window.showErrorMessage('Failed to parse Semgrep output');
				// Clear diagnostics on parse error
				diagnosticCollection.set(document.uri, []);
			}
		}
	});
}

/**
 * This method is called when your extension is deactivated
 * Clean up any resources here if needed
 */
export function deactivate() {
	// Currently no cleanup needed
}

/**
 * Enhance authorization-related diagnostic messages with specific suggestions
 * @param originalMessage - The original Semgrep message
 * @param ruleId - The Semgrep rule ID
 * @param languageId - The VS Code language ID of the document
 * @returns Enhanced message with specific recommendations
 */
function enhanceAuthorizationMessage(originalMessage: string, ruleId: string, languageId: string): string {
	let suggestions = '';
	
	if (ruleId.includes('missing-auth-middleware')) {
		// Express.js authorization suggestions
		suggestions = ' → Consider adding middleware like `auth`, `isAdmin`, `requireAuth`, or `verifyToken`';
	} else if (ruleId.includes('flask-missing-auth')) {
		// Flask authorization suggestions
		suggestions = ' → Consider adding decorators like `@login_required`, `@jwt_required`, `@requires_auth`, or `@admin_required`';
	}
	
	// Add language-specific suggestions
	if (languageId === 'javascript' || languageId === 'typescript') {
		if (!suggestions) {
			suggestions = ' → Consider adding Express.js middleware for authentication/authorization';
		}
	} else if (languageId === 'python') {
		if (!suggestions) {
			suggestions = ' → Consider adding Flask auth decorators or manual authorization checks';
		}
	}
	
	return originalMessage + suggestions;
}

/**
 * Show popup fix suggestion for hardcoded API keys
 */
function showApiKeyFixPopup(document: vscode.TextDocument, range: vscode.Range): void {
	vscode.window.showInformationMessage(
		'🔐 Hardcoded API key detected. Replace with environment variable?',
		'Fix Now',
		'Ignore'
	).then((selection) => {
		if (selection === 'Fix Now') {
			applyApiKeyFix(document, range);
		}
	});
}

/**
 * Show popup fix suggestion for hardcoded passwords
 */
function showPasswordFixPopup(document: vscode.TextDocument, range: vscode.Range): void {
	vscode.window.showInformationMessage(
		'🔑 Hardcoded password detected. Replace with environment variable?',
		'Fix Now',
		'Ignore'
	).then((selection) => {
		if (selection === 'Fix Now') {
			applyPasswordFix(document, range);
		}
	});
}

/**
 * Show popup fix suggestion for XSS vulnerabilities
 */
function showXssFixPopup(document: vscode.TextDocument, range: vscode.Range): void {
	vscode.window.showInformationMessage(
		'🛡️ XSS vulnerability detected. Replace innerHTML with textContent?',
		'Fix Now',
		'Ignore'
	).then((selection) => {
		if (selection === 'Fix Now') {
			applyXssFix(document, range);
		}
	});
}

/**
 * Apply API key fix via popup
 */
function applyApiKeyFix(document: vscode.TextDocument, range: vscode.Range): void {
	const edit = new vscode.WorkspaceEdit();
	const line = document.lineAt(range.start.line);
	const lineText = line.text;

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

	edit.replace(document.uri, line.range, fixedText);
	vscode.workspace.applyEdit(edit);
	vscode.window.showInformationMessage('✅ API key replaced with environment variable!');

	// Phase 6: Trigger re-scan after popup fix
	runSemgrepOnDocument(document);
}

/**
 * Apply password fix via popup
 */
function applyPasswordFix(document: vscode.TextDocument, range: vscode.Range): void {
	const edit = new vscode.WorkspaceEdit();
	const line = document.lineAt(range.start.line);
	const lineText = line.text;

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

	edit.replace(document.uri, line.range, fixedText);
	vscode.workspace.applyEdit(edit);
	vscode.window.showInformationMessage('✅ Password replaced with environment variable!');

	// Phase 6: Trigger re-scan after popup fix
	runSemgrepOnDocument(document);
}

/**
 * Apply XSS fix via popup
 */
function applyXssFix(document: vscode.TextDocument, range: vscode.Range): void {
	const edit = new vscode.WorkspaceEdit();
	const line = document.lineAt(range.start.line);
	const lineText = line.text;

	const fixedText = lineText.replace(/\.innerHTML\s*=/, '.textContent =');

	edit.replace(document.uri, line.range, fixedText);
	vscode.workspace.applyEdit(edit);
	vscode.window.showInformationMessage('✅ XSS vulnerability fixed by replacing innerHTML with textContent!');

	// Phase 6: Trigger re-scan after popup fix
	runSemgrepOnDocument(document);
}
