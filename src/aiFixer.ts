/**
 * AI-Powered Security Fixer
 * 
 * Integrates with OpenAI and Groq to provide intelligent security refactoring suggestions
 * 
 * @author MananVyas01
 */

import { OpenAI } from 'openai';
import Groq from 'groq-sdk';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Initialize AI clients with API keys from environment variables or VS Code settings
 */
function initializeClients() {
    // Try to get API keys from VS Code settings first, then environment variables
    const config = vscode.workspace.getConfiguration('secureCodeGuard');
    
    const openaiKey = config.get<string>('openaiApiKey') || process.env.OPENAI_API_KEY;
    const groqKey = config.get<string>('groqApiKey') || process.env.GROQ_API_KEY;

    const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
    const groq = groqKey ? new Groq({ apiKey: groqKey }) : null;

    return { openai, groq };
}

/**
 * Generate secure refactoring suggestions using AI
 * 
 * @param code - The vulnerable code to fix
 * @param issueType - Type of security issue detected
 * @param engine - AI engine to use ('openai' or 'groq')
 * @returns Promise<string> - Fixed code or empty string if failed
 */
export async function getSecureRefactor(
    code: string, 
    issueType: string = 'security-issue',
    engine: 'openai' | 'groq' = 'openai'
): Promise<string> {
    const { openai, groq } = initializeClients();

    // Check if the requested engine is available
    if (engine === 'openai' && !openai) {
        vscode.window.showWarningMessage('OpenAI API key not configured. Please set it in VS Code settings.');
        return '';
    }
    
    if (engine === 'groq' && !groq) {
        vscode.window.showWarningMessage('Groq API key not configured. Please set it in VS Code settings.');
        return '';
    }

    // Create security-focused prompt based on issue type
    const prompt = createSecurityPrompt(code, issueType);

    const model = engine === 'groq' ? 'llama3-8b-8192' : 'gpt-3.5-turbo';

    const messages = [
        {
            role: 'system' as const,
            content: 'You are a security expert. Provide only the fixed code without explanations or markdown formatting.'
        },
        {
            role: 'user' as const,
            content: prompt
        }
    ];

    try {
        vscode.window.showInformationMessage(`🤖 Generating secure fix using ${engine.toUpperCase()}...`);

        let response: string = '';

        if (engine === 'groq' && groq) {
            const res = await groq.chat.completions.create({
                model,
                messages,
                max_tokens: 500,
                temperature: 0.1,
            });
            response = res.choices[0]?.message?.content || '';
        } else if (engine === 'openai' && openai) {
            const res = await openai.chat.completions.create({
                model,
                messages,
                max_tokens: 500,
                temperature: 0.1,
            });
            response = res.choices[0]?.message?.content || '';
        }

        // Clean up the response
        return cleanAIResponse(response);

    } catch (error: any) {
        console.error(`AI Fix Error (${engine}):`, error);
        vscode.window.showErrorMessage(`Failed to generate AI fix: ${error.message}`);
        return '';
    }
}

/**
 * Create a security-focused prompt based on the issue type
 */
function createSecurityPrompt(code: string, issueType: string): string {
    const basePrompt = `Fix this security vulnerability in the following code:\n\n${code}\n\n`;
    
    const specificInstructions: Record<string, string> = {
        'hardcoded-secrets': 'Replace hardcoded secrets with environment variables or secure storage.',
        'xss-vulnerability': 'Fix XSS vulnerability by using safe DOM manipulation methods.',
        'code-injection': 'Remove eval() usage and replace with safe alternatives.',
        'insecure-random': 'Replace insecure randomization with cryptographically secure methods.',
        'missing-auth-express': 'Add authentication middleware to protect the route.',
        'missing-auth-flask': 'Add authorization decorators to protect the endpoint.',
        'sql-injection': 'Use parameterized queries to prevent SQL injection.',
        'default': 'Apply security best practices to fix the vulnerability.'
    };

    const instruction = specificInstructions[issueType] || specificInstructions['default'];
    
    return basePrompt + instruction + '\n\nReturn only the corrected code without any explanations or formatting.';
}

/**
 * Clean and format the AI response
 */
function cleanAIResponse(response: string): string {
    // Remove markdown code blocks if present
    let cleaned = response.replace(/```[\w]*\n?/g, '');
    
    // Remove common AI response prefixes
    cleaned = cleaned.replace(/^(Here's the fixed code:|Fixed code:|Solution:)/i, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
}

/**
 * Check if AI services are available
 */
export function checkAIAvailability(): { openai: boolean; groq: boolean } {
    const { openai, groq } = initializeClients();
    return {
        openai: !!openai,
        groq: !!groq
    };
}
