/**
 * Semgrep Runner Utility
 * 
 * Provides functionality to run Semgrep scans on documents and handle results.
 * This utility is used for automatic re-scanning after applying security fixes.
 * 
 * @author MananVyas01
 * @version 0.0.1
 */

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { recordIssueDetected, recordScanSession } from './metrics';

// Get the diagnostic collection (will be passed from extension.ts)
let diagnosticCollection: vscode.DiagnosticCollection;
let extensionContext: vscode.ExtensionContext;

/**
 * Initialize the semgrep runner with the diagnostic collection and extension context
 * @param collection - The diagnostic collection from the main extension
 * @param context - The extension context for accessing extension path
 */
export function initializeSemgrepRunner(collection: vscode.DiagnosticCollection, context: vscode.ExtensionContext): void {
	diagnosticCollection = collection;
	extensionContext = context;
}

/**
 * Run Semgrep scan on a specific document
 * @param document - The TextDocument to scan
 */
export function runSemgrepOnDocument(document: vscode.TextDocument): void {
	console.log(`🔄 Re-running Semgrep scan after fix for: ${document.fileName}`);
	
	// Check if extension context is available
	if (!extensionContext) {
		vscode.window.showErrorMessage('Extension context not initialized for Semgrep scan');
		return;
	}

	// Use extension path instead of workspace path for semgrep-rules and executable
	const extensionPath = extensionContext.extensionPath;
	const semgrepRulesPath = path.join(extensionPath, 'semgrep-rules');
	const semgrepExecutable = path.join(extensionPath, '.venv', 'Scripts', 'semgrep.exe');
	
	// Construct the Semgrep CLI command
	const filePath = document.fileName;
	const semgrepCmd = `"${semgrepExecutable}" --config "${semgrepRulesPath}" --json "${filePath}"`;
	
	console.log(`🔍 Re-scan command: ${semgrepCmd}`);
	
	// Show progress indicator
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "🔄 Re-scanning for security issues...",
		cancellable: false
	}, async (progress) => {
		return new Promise<void>((resolve) => {
			// Run Semgrep asynchronously
			cp.exec(semgrepCmd, (error, stdout, stderr) => {
				if (error) {
					console.error(`❌ Semgrep re-scan error: ${error.message}`);
					vscode.window.showErrorMessage(`Semgrep re-scan error: ${error.message}`);
					resolve();
					return;
				}
				
				if (stderr) {
					console.error(`⚠️ Semgrep re-scan stderr: ${stderr}`);
				}
				
				if (stdout) {
					try {
						const results = JSON.parse(stdout);
						console.log(`📊 Semgrep re-scan completed for: ${path.basename(filePath)}`);
						
						// Process the results
						processSemgrepResults(document, results);
						
					} catch (parseError) {
						console.error(`❌ Failed to parse Semgrep re-scan output: ${parseError}`);
						vscode.window.showErrorMessage('Failed to parse Semgrep re-scan output');
						// Clear diagnostics on parse error
						diagnosticCollection.set(document.uri, []);
					}
				}
				resolve();
			});
		});
	});
}

/**
 * Process Semgrep results and update diagnostics
 * @param document - The document that was scanned
 * @param results - The parsed Semgrep JSON results
 */
function processSemgrepResults(document: vscode.TextDocument, results: any): void {
	// Create array to hold diagnostics for this file
	const diagnostics: vscode.Diagnostic[] = [];
	
	// Check if security issues were found
	if (results.results && results.results.length > 0) {
		const issueCount = results.results.length;
		
		console.log('🔄 Re-scan found remaining issues:', results);
		
		// Create diagnostics for each remaining issue
		results.results.forEach((issue: any, index: number) => {
			console.log(`Remaining Issue ${index + 1}:`, {
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
			
			// Add to diagnostics array
			diagnostics.push(diagnostic);
			
			// Record the issue detection in metrics
			recordIssueDetected(issue.check_id, path.basename(document.fileName));
		});
		
		// Set diagnostics for this file
		diagnosticCollection.set(document.uri, diagnostics);
		
		// Show warning notification with remaining issues count
		vscode.window.showWarningMessage(
			`⚠️ ${issueCount} security issue(s) remain after fix. Check Problems tab for details.`
		);
	} else {
		// Clear diagnostics for this file (no issues found)
		diagnosticCollection.set(document.uri, []);
		
		// Show success notification
		vscode.window.showInformationMessage('✅ All security issues resolved! Great job!');
		console.log('✅ Re-scan completed - all issues resolved');
	}
	
	// Record the scan session with issue count
	recordScanSession(path.basename(document.fileName), diagnostics.length);
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
