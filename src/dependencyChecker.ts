/**
 * Dependency Checker Utility
 * 
 * Provides functionality to scan package.json and requirements.txt files
 * for outdated or potentially vulnerable dependencies.
 * 
 * @author MananVyas01
 * @version 0.0.1
 */

import * as vscode from 'vscode';

/**
 * Check for vulnerable or outdated libraries in package.json or requirements.txt
 * @param document - The TextDocument to analyze for dependency issues
 */
export function checkVulnerableLibraries(document: vscode.TextDocument): void {
	console.log(`📦 Checking dependencies in: ${document.fileName}`);
	
	const fileContent = document.getText();
	const fileName = document.fileName;
	const issues: string[] = [];
	
	try {
		if (fileName.endsWith('package.json')) {
			checkPackageJson(fileContent, issues);
		} else if (fileName.endsWith('requirements.txt')) {
			checkRequirementsTxt(fileContent, issues);
		}
		
		// Display results to user
		displayDependencyResults(issues, fileName);
		
	} catch (error) {
		console.error(`❌ Error checking dependencies: ${error}`);
		vscode.window.showErrorMessage(`Failed to analyze dependencies: ${error}`);
	}
}

/**
 * Check package.json for outdated dependencies
 * @param content - File content as string
 * @param issues - Array to store detected issues
 */
function checkPackageJson(content: string, issues: string[]): void {
	try {
		const packageData = JSON.parse(content);
		
		// Check dependencies
		if (packageData.dependencies) {
			checkDependencyObject(packageData.dependencies, issues, 'dependency');
		}
		
		// Check devDependencies
		if (packageData.devDependencies) {
			checkDependencyObject(packageData.devDependencies, issues, 'devDependency');
		}
		
		// Check peerDependencies
		if (packageData.peerDependencies) {
			checkDependencyObject(packageData.peerDependencies, issues, 'peerDependency');
		}
		
		console.log(`📊 package.json analysis completed. Found ${issues.length} potential issues.`);
		
	} catch (parseError) {
		console.error(`❌ Failed to parse package.json: ${parseError}`);
		issues.push('⚠️ Invalid JSON format in package.json - could not parse dependencies');
	}
}

/**
 * Check a dependency object for outdated versions
 * @param dependencies - Object containing package: version pairs
 * @param issues - Array to store detected issues
 * @param type - Type of dependency (dependency, devDependency, etc.)
 */
function checkDependencyObject(dependencies: any, issues: string[], type: string): void {
	for (const [packageName, version] of Object.entries(dependencies)) {
		const versionStr = version as string;
		
		// Check for outdated version patterns
		if (isOutdatedVersion(versionStr)) {
			issues.push(`📦 ${packageName} (${type}): version ${versionStr} appears outdated`);
		}
		
		// Check for known vulnerable packages (basic example)
		if (isKnownVulnerablePackage(packageName, versionStr)) {
			issues.push(`🚨 ${packageName} (${type}): version ${versionStr} has known security vulnerabilities`);
		}
	}
}

/**
 * Check requirements.txt for outdated dependencies
 * @param content - File content as string
 * @param issues - Array to store detected issues
 */
function checkRequirementsTxt(content: string, issues: string[]): void {
	const lines = content.split('\n');
	
	for (const line of lines) {
		const trimmedLine = line.trim();
		
		// Skip empty lines and comments
		if (!trimmedLine || trimmedLine.startsWith('#')) {
			continue;
		}
		
		// Match package==version pattern
		const match = trimmedLine.match(/^([a-zA-Z0-9\-_]+)\s*==\s*([0-9\.]+.*?)$/);
		if (match) {
			const [, packageName, version] = match;
			
			// Check for outdated version patterns
			if (isOutdatedVersion(version)) {
				issues.push(`🐍 ${packageName}: version ${version} appears outdated`);
			}
			
			// Check for known vulnerable packages
			if (isKnownVulnerablePackage(packageName, version)) {
				issues.push(`🚨 ${packageName}: version ${version} has known security vulnerabilities`);
			}
		}
	}
	
	console.log(`📊 requirements.txt analysis completed. Found ${issues.length} potential issues.`);
}

/**
 * Check if a version appears outdated based on simple heuristics
 * @param version - Version string to check
 * @returns true if version appears outdated
 */
function isOutdatedVersion(version: string): boolean {
	// Remove common version prefixes and suffixes
	const cleanVersion = version.replace(/[^0-9\.]/g, '');
	
	// Check if version starts with 0.x (often pre-release)
	if (cleanVersion.startsWith('0.')) {
		return true;
	}
	
	// Check if version starts with 1.x (potentially outdated for mature packages)
	if (cleanVersion.startsWith('1.')) {
		return true;
	}
	
	// Check for very old major versions (2.x and below for some packages)
	const majorVersion = parseInt(cleanVersion.split('.')[0]);
	if (majorVersion <= 2) {
		return true;
	}
	
	return false;
}

/**
 * Check if a package/version combination is known to be vulnerable
 * @param packageName - Name of the package
 * @param version - Version string
 * @returns true if known to be vulnerable
 */
function isKnownVulnerablePackage(packageName: string, version: string): boolean {
	// This is a simplified example. In production, you'd want to:
	// 1. Use a vulnerability database (npm audit, safety for Python, etc.)
	// 2. Make API calls to services like Snyk, WhiteSource, etc.
	// 3. Maintain a local database of known vulnerabilities
	
	const knownVulnerablePackages = [
		{ name: 'lodash', versions: ['4.17.15', '4.17.14', '4.17.13'] },
		{ name: 'express', versions: ['4.16.0', '4.15.0'] },
		{ name: 'flask', versions: ['1.0.0', '1.0.1', '1.1.0'] },
		{ name: 'django', versions: ['2.2.0', '2.1.0', '3.0.0'] },
		{ name: 'axios', versions: ['0.18.0', '0.19.0'] },
		{ name: 'moment', versions: ['2.24.0', '2.25.0'] }
	];
	
	const vulnerablePackage = knownVulnerablePackages.find(pkg => 
		pkg.name.toLowerCase() === packageName.toLowerCase()
	);
	
	if (vulnerablePackage) {
		// Check if the version matches any known vulnerable versions
		return vulnerablePackage.versions.some(vulnVersion => 
			version.includes(vulnVersion)
		);
	}
	
	return false;
}

/**
 * Display dependency check results to the user
 * @param issues - Array of detected issues
 * @param fileName - Name of the file that was checked
 */
function displayDependencyResults(issues: string[], fileName: string): void {
	const fileType = fileName.endsWith('package.json') ? 'package.json' : 'requirements.txt';
	
	if (issues.length > 0) {
		// Show warning notification with issue count
		vscode.window.showWarningMessage(
			`📦 ${issues.length} outdated/vulnerable package(s) detected in ${fileType}`,
			'Show Details',
			'Ignore'
		).then((selection) => {
			if (selection === 'Show Details') {
				showDependencyDetails(issues, fileType);
			}
		});
		
		console.log(`⚠️ Dependency issues found in ${fileType}:`, issues);
	} else {
		// Show success notification
		vscode.window.showInformationMessage(
			`✅ All dependencies in ${fileType} look up-to-date!`
		);
		
		console.log(`✅ No dependency issues found in ${fileType}`);
	}
}

/**
 * Show detailed information about dependency issues
 * @param issues - Array of issues to display
 * @param fileType - Type of file (package.json or requirements.txt)
 */
function showDependencyDetails(issues: string[], fileType: string): void {
	const issueList = issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n');
	
	const message = `🔍 Dependency Issues Found in ${fileType}:\n\n${issueList}\n\n` +
		`💡 Recommendations:\n` +
		`• Update packages to their latest stable versions\n` +
		`• Check package changelogs for breaking changes\n` +
		`• Run security audits (npm audit, pip-audit, etc.)\n` +
		`• Consider using dependency management tools`;
	
	vscode.window.showInformationMessage(
		message,
		{ modal: true },
		'OK'
	);
}
