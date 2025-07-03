/**
 * Scan Intelligence and Metrics Tracking
 * 
 * Tracks security scan results, fixes applied, and provides analytics
 * 
 * @author MananVyas01
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface SecurityMetrics {
    totalIssues: number;
    totalFixes: number;
    aiFixesApplied: number;
    manualFixesApplied: number;
    issueTypes: Record<string, {
        count: number;
        fixed: number;
        lastSeen: string;
    }>;
    scanHistory: Array<{
        timestamp: string;
        issuesFound: number;
        fileScanned: string;
    }>;
    fixHistory: Array<{
        timestamp: string;
        issueType: string;
        fixMethod: 'ai' | 'manual' | 'code-action';
        engine?: 'openai' | 'groq';
    }>;
}

let metricsPath: string;

/**
 * Initialize metrics system
 */
export function initializeMetrics(extensionContext: vscode.ExtensionContext) {
    metricsPath = path.join(extensionContext.globalStorageUri?.fsPath || extensionContext.extensionPath, 'metrics.json');
    
    // Ensure directory exists
    const dir = path.dirname(metricsPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Get current metrics data
 */
function getMetrics(): SecurityMetrics {
    const defaultMetrics: SecurityMetrics = {
        totalIssues: 0,
        totalFixes: 0,
        aiFixesApplied: 0,
        manualFixesApplied: 0,
        issueTypes: {},
        scanHistory: [],
        fixHistory: []
    };

    if (!fs.existsSync(metricsPath)) {
        return defaultMetrics;
    }

    try {
        const content = fs.readFileSync(metricsPath, 'utf-8');
        const data = JSON.parse(content);
        
        // Ensure all required fields exist
        return {
            ...defaultMetrics,
            ...data,
            issueTypes: data.issueTypes || {},
            scanHistory: data.scanHistory || [],
            fixHistory: data.fixHistory || []
        };
    } catch (error) {
        console.warn('Failed to read metrics file:', error);
        return defaultMetrics;
    }
}

/**
 * Save metrics data
 */
function saveMetrics(metrics: SecurityMetrics) {
    try {
        fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    } catch (error) {
        console.error('Failed to save metrics:', error);
    }
}

/**
 * Update metrics when a security issue is detected
 */
export function recordIssueDetected(issueType: string, fileName: string) {
    const metrics = getMetrics();
    
    metrics.totalIssues += 1;
    
    // Update issue type tracking
    if (!metrics.issueTypes[issueType]) {
        metrics.issueTypes[issueType] = {
            count: 0,
            fixed: 0,
            lastSeen: new Date().toISOString()
        };
    }
    
    metrics.issueTypes[issueType].count += 1;
    metrics.issueTypes[issueType].lastSeen = new Date().toISOString();
    
    // Add to scan history (keep last 100 entries)
    metrics.scanHistory.push({
        timestamp: new Date().toISOString(),
        issuesFound: 1,
        fileScanned: fileName
    });
    
    if (metrics.scanHistory.length > 100) {
        metrics.scanHistory = metrics.scanHistory.slice(-100);
    }
    
    saveMetrics(metrics);
}

/**
 * Update metrics when a security issue is fixed
 */
export function recordIssueFixed(
    issueType: string, 
    fixMethod: 'ai' | 'manual' | 'code-action',
    engine?: 'openai' | 'groq'
) {
    const metrics = getMetrics();
    
    metrics.totalFixes += 1;
    
    if (fixMethod === 'ai') {
        metrics.aiFixesApplied += 1;
    } else {
        metrics.manualFixesApplied += 1;
    }
    
    // Update issue type fix count
    if (metrics.issueTypes[issueType]) {
        metrics.issueTypes[issueType].fixed += 1;
    }
    
    // Add to fix history (keep last 100 entries)
    metrics.fixHistory.push({
        timestamp: new Date().toISOString(),
        issueType,
        fixMethod,
        engine
    });
    
    if (metrics.fixHistory.length > 100) {
        metrics.fixHistory = metrics.fixHistory.slice(-100);
    }
    
    saveMetrics(metrics);
}

/**
 * Record a scan session
 */
export function recordScanSession(fileName: string, issuesFound: number) {
    const metrics = getMetrics();
    
    metrics.scanHistory.push({
        timestamp: new Date().toISOString(),
        issuesFound,
        fileScanned: fileName
    });
    
    if (metrics.scanHistory.length > 100) {
        metrics.scanHistory = metrics.scanHistory.slice(-100);
    }
    
    saveMetrics(metrics);
}

/**
 * Get formatted metrics for display
 */
export function getFormattedMetrics(): string {
    const metrics = getMetrics();
    
    const fixRate = metrics.totalIssues > 0 ? 
        Math.round((metrics.totalFixes / metrics.totalIssues) * 100) : 0;
    
    const topIssues = Object.entries(metrics.issueTypes)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([type, data]) => `${type}: ${data.count} (${data.fixed} fixed)`)
        .join('\n');
    
    const recentActivity = metrics.scanHistory
        .slice(-5)
        .map(scan => `${path.basename(scan.fileScanned)}: ${scan.issuesFound} issues`)
        .join('\n');
    
    return `
🛡️ SecureCodeGuard Metrics

📊 Overall Stats:
• Total Issues Detected: ${metrics.totalIssues}
• Total Fixes Applied: ${metrics.totalFixes}
• Fix Rate: ${fixRate}%
• AI Fixes: ${metrics.aiFixesApplied}
• Manual Fixes: ${metrics.manualFixesApplied}

🔥 Top Issue Types:
${topIssues || 'No issues detected yet'}

📈 Recent Activity:
${recentActivity || 'No recent scans'}
    `.trim();
}

/**
 * Show metrics in VS Code
 */
export function showMetricsDialog() {
    const metricsText = getFormattedMetrics();
    
    vscode.window.showInformationMessage(
        'SecureCodeGuard Statistics',
        { modal: true, detail: metricsText },
        'Export Data', 'Reset Stats'
    ).then(choice => {
        if (choice === 'Export Data') {
            exportMetrics();
        } else if (choice === 'Reset Stats') {
            resetMetrics();
        }
    });
}

/**
 * Export metrics to a file
 */
function exportMetrics() {
    const metrics = getMetrics();
    const exportData = JSON.stringify(metrics, null, 2);
    
    vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('securecodeguard-metrics.json'),
        filters: {
            'JSON Files': ['json'],
            'All Files': ['*']
        }
    }).then(uri => {
        if (uri) {
            fs.writeFileSync(uri.fsPath, exportData);
            vscode.window.showInformationMessage('Metrics exported successfully!');
        }
    });
}

/**
 * Reset all metrics
 */
function resetMetrics() {
    vscode.window.showWarningMessage(
        'Are you sure you want to reset all metrics?',
        'Yes, Reset', 'Cancel'
    ).then(choice => {
        if (choice === 'Yes, Reset') {
            const defaultMetrics: SecurityMetrics = {
                totalIssues: 0,
                totalFixes: 0,
                aiFixesApplied: 0,
                manualFixesApplied: 0,
                issueTypes: {},
                scanHistory: [],
                fixHistory: []
            };
            saveMetrics(defaultMetrics);
            vscode.window.showInformationMessage('Metrics reset successfully!');
        }
    });
}

/**
 * Get metrics summary for status bar
 */
export function getMetricsSummary(): string {
    const metrics = getMetrics();
    const fixRate = metrics.totalIssues > 0 ? 
        Math.round((metrics.totalFixes / metrics.totalIssues) * 100) : 0;
    
    return `🛡️ ${metrics.totalIssues} issues, ${metrics.totalFixes} fixes (${fixRate}%)`;
}
