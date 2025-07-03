/**
 * AI-Powered Security Fixer with Enhanced Reliability
 * 
 * Integrates with OpenAI and Groq to provide intelligent security refactoring suggestions
 * with fallback to deterministic manual fixes for better reliability
 * 
 * @author MananVyas01
 */

import { OpenAI } from 'openai';
import Groq from 'groq-sdk';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import { mlSecurityTrainer } from './mlTrainer';

// Load environment variables from .env file
dotenv.config();

/**
 * Manual fix patterns for fallback when AI fails
 */
const MANUAL_FIX_PATTERNS: Record<string, { pattern: RegExp; replacement: string }> = {
    'hardcoded-api-key': {
        pattern: /(const|let|var)\s+(API_KEY|api_key)\s*=\s*["'][^"']*["']/i,
        replacement: '$1 $2 = process.env.$2 || "default_api_key"'
    },
    'hardcoded-password': {
        pattern: /(const|let|var)\s+(PASSWORD|password)\s*=\s*["'][^"']*["']/i,
        replacement: '$1 $2 = process.env.$2 || "default_password"'
    },
    'xss-vulnerability': {
        pattern: /\.innerHTML\s*=/,
        replacement: '.textContent =' 
    },
    'code-injection': {
        pattern: /eval\s*\(\s*([^)]+)\s*\)/,
        replacement: 'JSON.parse($1) // TODO: Verify this is safe JSON'
    },
    'insecure-random': {
        pattern: /Math\.random\s*\(\s*\)/,
        replacement: 'crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1) // Crypto-secure random'
    }
};

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
 * Detect issue type from the actual code content
 */
function detectIssueTypeFromCode(code: string): string {
    const cleanCode = code.trim();
    
    if (cleanCode.includes('API_KEY') && cleanCode.includes('=') && cleanCode.includes('"')) {
        return 'hardcoded-api-key';
    } else if (cleanCode.includes('PASSWORD') && cleanCode.includes('=') && cleanCode.includes('"')) {
        return 'hardcoded-password';
    } else if (cleanCode.includes('.innerHTML')) {
        return 'xss-vulnerability';
    } else if (cleanCode.includes('eval(')) {
        return 'code-injection';
    } else if (cleanCode.includes('Math.random()')) {
        return 'insecure-random';
    }
    
    return 'security-issue';
}

/**
 * Apply manual fix using regex patterns
 */
function applyManualFix(code: string, issueType: string): string {
    const pattern = MANUAL_FIX_PATTERNS[issueType];
    if (!pattern) {
        return '';
    }
    
    const fixed = code.replace(pattern.pattern, pattern.replacement);
    return fixed !== code ? fixed : ''; // Only return if actually changed
}

/**
 * Check if two code strings are structurally similar
 */
function isStructurallySimilar(original: string, fixed: string): boolean {
    // If no original code, can't check similarity
    if (!original || original.trim().length === 0) {
        return true; // Allow it to pass this check
    }
    
    // Extract variable names from both
    const originalVars = original.match(/(?:const|let|var)\s+(\w+)/g) || [];
    const fixedVars = fixed.match(/(?:const|let|var)\s+(\w+)/g) || [];
    
    // Should have same number of variable declarations
    if (originalVars.length !== fixedVars.length) {
        return false;
    }
    
    // Should preserve variable names
    for (let i = 0; i < originalVars.length; i++) {
        const originalVar = originalVars[i].replace(/(?:const|let|var)\s+/, '');
        const fixedVar = fixedVars[i].replace(/(?:const|let|var)\s+/, '');
        if (originalVar !== fixedVar) {
            console.log('Variable mismatch:', { originalVar, fixedVar });
            return false;
        }
    }
    
    return true;
}

/**
 * Create simplified security prompt
 */
function createSimplifiedSecurityPrompt(code: string, issueType: string): string {
    const cleanCode = code.trim();
    
    const templates: Record<string, string> = {
        'hardcoded-api-key': `Fix this hardcoded API key vulnerability:
${cleanCode}

Replace the hardcoded string with process.env.API_KEY`,

        'hardcoded-password': `Fix this hardcoded password vulnerability:
${cleanCode}

Replace the hardcoded string with process.env.PASSWORD`,

        'xss-vulnerability': `Fix this XSS vulnerability:
${cleanCode}

Replace innerHTML with textContent`,

        'code-injection': `Fix this code injection vulnerability:
${cleanCode}

Replace eval() with JSON.parse()`,

        'insecure-random': `Fix this insecure random generation:
${cleanCode}

Replace Math.random() with crypto.getRandomValues()`,

        'default': `Fix this security issue:
${cleanCode}

Apply security best practices`
    };

    return templates[issueType] || templates['default'];
}

/**
 * Clean AI response with strict validation
 */
function cleanAIResponseStrict(response: string): string {
    if (!response || response.trim().length === 0) {
        return '';
    }
    
    let cleaned = response.trim();
    
    // Remove any markdown or formatting
    cleaned = cleaned.replace(/```[\w]*\n?/g, '');
    cleaned = cleaned.replace(/```/g, '');
    cleaned = cleaned.replace(/`/g, '');
    
    // Remove common AI prefixes
    cleaned = cleaned.replace(/^(Here's the fixed code:|Fixed code:|Solution:|Output:)/i, '');
    
    // Take only the first line that looks like code
    const lines = cleaned.split('\n');
    const codeLine = lines.find(line => {
        const trimmed = line.trim();
        return (trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('var ') ||
               trimmed.includes('=') || trimmed.includes('.textContent') || trimmed.includes('process.env')) &&
               !trimmed.toLowerCase().includes('explanation') &&
               !trimmed.toLowerCase().includes('note:');
    });
    
    cleaned = codeLine ? codeLine.trim() : '';
    
    // Ensure proper semicolon
    if (cleaned && !cleaned.endsWith(';') && !cleaned.endsWith('}')) {
        if (cleaned.includes(' = ') || cleaned.includes('.textContent') || cleaned.includes('.innerHTML')) {
            cleaned += ';';
        }
    }
    
    return cleaned;
}

/**
 * Validate AI response with strict checks
 */
function validateAIResponseStrict(original: string, fixed: string): boolean {
    if (!fixed || fixed.length === 0) {
        return false;
    }
    
    // Must be single line
    if (fixed.includes('\n')) {
        return false;
    }
    
    // Must not be too long
    if (fixed.length > 200) {
        return false;
    }
    
    // Must contain assignment or method call
    if (!fixed.includes('=') && !fixed.includes('.')) {
        return false;
    }
    
    // Must not contain unwanted phrases
    const badPhrases = ['explanation', 'note:', 'comment', 'here is', 'fixed version'];
    if (badPhrases.some(phrase => fixed.toLowerCase().includes(phrase))) {
        return false;
    }
    
    // Only check variable preservation if we have original code
    if (original && original.trim().length > 0) {
        // Should preserve variable names from original
        const originalVar = original.match(/(?:const|let|var)\s+(\w+)/)?.[1];
        if (originalVar && !fixed.includes(originalVar)) {
            console.log('Variable name validation failed:', { originalVar, fixed });
            return false;
        }
        
        // Should be related to the original issue
        if (original.includes('API_KEY') && !fixed.includes('API_KEY')) {
            return false;
        }
        if (original.includes('PASSWORD') && !fixed.includes('PASSWORD')) {
            return false;
        }
        if (original.includes('.innerHTML') && !fixed.includes('.textContent') && !fixed.includes('.innerHTML')) {
            return false;
        }
    }
    
    return true;
}

/**
 * Generate secure refactoring suggestions using AI with fallback to manual fixes
 * 
 * @param code - The vulnerable code to fix
 * @param issueType - Type of security issue detected
 * @param engine - AI engine to use ('openai' or 'groq')
 * @param useAIFirst - Whether to try AI first or fallback immediately to manual fix
 * @returns Promise<string> - Fixed code or empty string if failed
 */
export async function getSecureRefactor(
    code: string, 
    issueType: string = 'security-issue',
    engine: 'openai' | 'groq' = 'openai',
    useAIFirst: boolean = true
): Promise<string> {
    const detectedIssueType = detectIssueTypeFromCode(code);
    
    // Try manual fix first if AI is disabled or if requested
    if (!useAIFirst || !checkAIAvailability()[engine]) {
        const manualFix = applyManualFix(code, detectedIssueType);
        if (manualFix) {
            console.log('Applied manual fix for:', detectedIssueType);
            return manualFix;
        }
    }

    const { openai, groq } = initializeClients();

    // Check if the requested engine is available
    if (engine === 'openai' && !openai) {
        const manualFix = applyManualFix(code, detectedIssueType);
        if (manualFix) {
            vscode.window.showInformationMessage('OpenAI not available, applied manual fix instead.');
            return manualFix;
        }
        vscode.window.showWarningMessage('OpenAI API key not configured. Please set it in VS Code settings.');
        return '';
    }
    
    if (engine === 'groq' && !groq) {
        const manualFix = applyManualFix(code, detectedIssueType);
        if (manualFix) {
            vscode.window.showInformationMessage('Groq not available, applied manual fix instead.');
            return manualFix;
        }
        vscode.window.showWarningMessage('Groq API key not configured. Please set it in VS Code settings.');
        return '';
    }

    // Use ML to enhance the prompt and prediction
    const mlPrediction = mlSecurityTrainer.predict(code, issueType);
    const enhancedIssueType = mlPrediction.probability > 0.8 ? 'critical-' + issueType : issueType;

    // Create simplified, more deterministic prompt
    const prompt = createSimplifiedSecurityPrompt(code, detectedIssueType);

    const model = engine === 'groq' ? 'llama3-8b-8192' : 'gpt-3.5-turbo';

    const messages = [
        {
            role: 'system' as const,
            content: `You are a code security expert. Fix the security vulnerability in the provided code.

STRICT REQUIREMENTS:
1. Return ONLY the corrected line of code
2. NO explanations, comments, or markdown formatting
3. NO code blocks, backticks, or extra text
4. Keep the exact same variable names and structure
5. Only change what's necessary to fix the security issue

Examples:
Input: const API_KEY = "sk-123";
Output: const API_KEY = process.env.API_KEY;

Input: element.innerHTML = userInput;
Output: element.textContent = userInput;`
        },
        {
            role: 'user' as const,
            content: prompt
        }
    ];

    try {
        let response: string = '';

        if (engine === 'groq' && groq) {
            const res = await groq.chat.completions.create({
                model,
                messages,
                max_tokens: 80,   // Even more restrictive
                temperature: 0.0, // Completely deterministic
                top_p: 0.8,
            });
            response = res.choices[0]?.message?.content || '';
        } else if (engine === 'openai' && openai) {
            const res = await openai.chat.completions.create({
                model,
                messages,
                max_tokens: 80,   // Even more restrictive
                temperature: 0.0, // Completely deterministic
                top_p: 0.8,
            });
            response = res.choices[0]?.message?.content || '';
        }

        // Clean and validate the response with stricter validation
        const cleanedResponse = cleanAIResponseStrict(response);
        
        // Triple validation: AI response, manual comparison, and structure check
        if (!validateAIResponseStrict(code, cleanedResponse) || !isStructurallySimilar(code, cleanedResponse)) {
            console.warn('AI response failed strict validation, falling back to manual fix:', { 
                original: code, 
                aiResponse: cleanedResponse,
                detectedIssue: detectedIssueType,
                validationResult: validateAIResponseStrict(code, cleanedResponse),
                structuralSimilarity: isStructurallySimilar(code, cleanedResponse)
            });
            
            const manualFix = applyManualFix(code, detectedIssueType);
            if (manualFix) {
                vscode.window.showInformationMessage('AI fix was unreliable, applied manual fix instead.');
                return manualFix;
            }
            
            vscode.window.showWarningMessage('Both AI and manual fixes failed. Please fix manually.');
            return '';
        }
        
        // Record successful AI fix
        if (cleanedResponse && cleanedResponse.length > 0) {
            mlSecurityTrainer.trainModel(code, true, 0.9, issueType);
            console.log('AI fix applied successfully:', cleanedResponse);
        }
        
        return cleanedResponse;

    } catch (error: any) {
        console.error('AI API Error:', error);
        
        // Fallback to manual fix on any AI error
        const manualFix = applyManualFix(code, detectedIssueType);
        if (manualFix) {
            vscode.window.showInformationMessage('AI failed, applied manual fix instead.');
            return manualFix;
        }
        
        // Record failed prediction for ML learning
        mlSecurityTrainer.trainModel(code, true, -0.5, issueType);
        
        if (error.message?.includes('quota') || error.message?.includes('limit')) {
            vscode.window.showErrorMessage('AI API quota exceeded. Please check your API usage.');
        } else if (error.message?.includes('key') || error.message?.includes('authentication')) {
            vscode.window.showErrorMessage('AI API authentication failed. Please check your API keys.');
        } else {
            vscode.window.showErrorMessage(`AI fix failed: ${error.message}`);
        }
        
        return '';
    }
}

/**
 * Create a security-focused prompt based on the issue type
 */
function createSecurityPrompt(code: string, issueType: string): string {
    const cleanCode = code.trim();
    
    // Detect the actual issue type from the code
    let detectedIssue = issueType;
    if (cleanCode.includes('API_KEY') && cleanCode.includes('=') && cleanCode.includes('"')) {
        detectedIssue = 'hardcoded-api-key';
    } else if (cleanCode.includes('PASSWORD') && cleanCode.includes('=') && cleanCode.includes('"')) {
        detectedIssue = 'hardcoded-password';
    } else if (cleanCode.includes('.innerHTML')) {
        detectedIssue = 'xss-vulnerability';
    } else if (cleanCode.includes('eval(')) {
        detectedIssue = 'code-injection';
    } else if (cleanCode.includes('Math.random()')) {
        detectedIssue = 'insecure-random';
    }
    
    const specificPrompts: Record<string, string> = {
        'hardcoded-api-key': `TASK: Fix this hardcoded API key vulnerability by replacing it with an environment variable.

VULNERABLE CODE:
${cleanCode}

INSTRUCTIONS:
1. Replace ONLY the hardcoded string value with process.env.API_KEY
2. Keep the exact same variable name and structure
3. Do NOT add any other code, comments, or explanations
4. Return ONLY the single fixed line of code

EXAMPLE:
Input: const API_KEY = "sk-12345";
Output: const API_KEY = process.env.API_KEY;

FIXED CODE:`,

        'hardcoded-password': `TASK: Fix this hardcoded password vulnerability.

VULNERABLE CODE:
${cleanCode}

INSTRUCTIONS:
1. Replace the hardcoded password with process.env.PASSWORD
2. Keep the same variable name and structure
3. Return ONLY the fixed line of code

FIXED CODE:`,

        'xss-vulnerability': `TASK: Fix this XSS vulnerability by using textContent instead of innerHTML.

VULNERABLE CODE:
${cleanCode}

INSTRUCTIONS:
1. Replace .innerHTML with .textContent
2. Keep everything else exactly the same
3. Return ONLY the fixed line of code

FIXED CODE:`,

        'code-injection': `TASK: Fix this code injection vulnerability by removing eval().

VULNERABLE CODE:
${cleanCode}

INSTRUCTIONS:
1. Replace eval() with JSON.parse() for JSON data
2. Return ONLY the fixed line of code
3. Do not add explanations

FIXED CODE:`,

        'insecure-random': `TASK: Fix this insecure random generation.

VULNERABLE CODE:
${cleanCode}

INSTRUCTIONS:
1. Replace Math.random() with crypto.getRandomValues()
2. Return ONLY the fixed line of code

FIXED CODE:`,

        'default': `TASK: Fix this security vulnerability.

VULNERABLE CODE:
${cleanCode}

INSTRUCTIONS:
1. Apply security best practices
2. Keep the code structure similar
3. Return ONLY the fixed code

FIXED CODE:`
    };

    return specificPrompts[detectedIssue] || specificPrompts['default'];
}

/**
 * Create ML-enhanced security prompt based on analysis
 */
function createEnhancedSecurityPrompt(code: string, issueType: string, mlPrediction: any): string {
    const basePrompt = createSecurityPrompt(code, issueType);
    
    // Add ML insights to the prompt
    const mlInsights = `
ML Analysis Results:
- Vulnerability Probability: ${Math.round(mlPrediction.probability * 100)}%
- Confidence Score: ${Math.round(mlPrediction.confidence * 100)}%
- Recommendations: ${mlPrediction.recommendations.join(', ')}

Enhanced Context: This code has been analyzed using machine learning models trained on security patterns.
`;

    return basePrompt + '\n\n' + mlInsights;
}

/**
 * Clean and format the AI response with advanced processing
 */
function cleanAIResponse(response: string): string {
    if (!response || response.trim().length === 0) {
        return '';
    }
    
    let cleaned = response.trim();
    
    // Remove markdown code blocks and backticks
    cleaned = cleaned.replace(/```[\w]*\n?/g, '');
    cleaned = cleaned.replace(/```/g, '');
    cleaned = cleaned.replace(/`/g, '');
    
    // Remove common AI response prefixes and suffixes
    cleaned = cleaned.replace(/^(Here's the fixed code:|Fixed code:|Solution:|Output:|YOUR FIXED CODE:|Answer:|Result:|Here's|Fixed version:|Secure version:)/i, '');
    cleaned = cleaned.replace(/(That's it!|Hope this helps!|Let me know if you need help).*$/i, '');
    
    // Split by newlines and take only the first meaningful line
    const lines = cleaned.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && 
               !trimmed.toLowerCase().startsWith('explanation') &&
               !trimmed.toLowerCase().startsWith('note:') &&
               !trimmed.toLowerCase().startsWith('this ') &&
               !trimmed.toLowerCase().includes('vulnerability') &&
               trimmed.includes('=') || trimmed.includes('const') || trimmed.includes('let') || trimmed.includes('var');
    });
    
    if (lines.length > 0) {
        cleaned = lines[0].trim();
    } else {
        // Fallback: find any line that looks like code
        const codeLine = cleaned.split('\n').find(line => {
            const trimmed = line.trim();
            return (trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('var ') ||
                   trimmed.includes('.textContent') || trimmed.includes('process.env')) &&
                   !trimmed.toLowerCase().includes('explanation');
        });
        cleaned = codeLine ? codeLine.trim() : '';
    }
    
    // Remove extra whitespace
    cleaned = cleaned.trim();
    
    // Remove quotes if the entire response is wrapped in quotes
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1);
    }
    
    // Ensure proper semicolon
    if (cleaned && !cleaned.endsWith(';') && !cleaned.endsWith('}') && !cleaned.endsWith(')')) {
        // Only add semicolon for variable declarations and assignments
        if (cleaned.includes('const ') || cleaned.includes('let ') || cleaned.includes('var ') || 
            cleaned.includes(' = ') || cleaned.includes('.textContent') || cleaned.includes('.innerHTML')) {
            cleaned += ';';
        }
    }
    
    // Remove any remaining mixed content (common AI error)
    if (cleaned.includes('import ') && !cleaned.startsWith('import ')) {
        // Split at 'import' and take the part before it
        cleaned = cleaned.split('import ')[0].trim();
    }
    
    // Remove any content after semicolon that doesn't belong
    if (cleaned.includes(';') && cleaned.indexOf(';') < cleaned.length - 1) {
        const semicolonIndex = cleaned.indexOf(';');
        const afterSemicolon = cleaned.substring(semicolonIndex + 1).trim();
        if (afterSemicolon && !afterSemicolon.startsWith('//')) {
            cleaned = cleaned.substring(0, semicolonIndex + 1);
        }
    }
    
    // Final validation - ensure it looks like valid code
    if (cleaned.length > 200 || 
        cleaned.includes('```') || 
        cleaned.toLowerCase().includes('explanation') ||
        cleaned.includes('flask import') ||
        cleaned.includes('jsonify') ||
        (cleaned.split('"').length > 4)) { // Too many quotes indicates corrupted response
        return ''; // Response is corrupted or contains unwanted content
    }
    
    return cleaned;
}

/**
 * Validate that AI response is a proper code fix
 */
function validateAIResponse(original: string, fixed: string): boolean {
    // Basic validation checks
    if (!fixed || fixed.length === 0) {
        return false;
    }
    if (fixed.length > 300) {
        return false; // Too long
    }
    if (fixed.includes('import ') && !original.includes('import ')) {
        return false; // Unwanted imports
    }
    if (fixed.includes('flask') || fixed.includes('jsonify')) {
        return false; // Wrong language content
    }
    if ((fixed.match(/"/g) || []).length > 4) {
        return false; // Too many quotes (likely corrupted)
    }
    
    // Should contain some key elements from original
    const originalVarName = original.match(/(const|let|var)\s+(\w+)/)?.[2];
    if (originalVarName && !fixed.includes(originalVarName)) {
        return false;
    }
    
    // Should not contain common AI artifacts
    const badPhrases = ['explanation', 'note:', 'this is', 'here is', 'i hope', 'let me know'];
    if (badPhrases.some(phrase => fixed.toLowerCase().includes(phrase))) {
        return false;
    }
    
    return true;
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

/**
 * Record AI fix feedback for machine learning
 */
export async function recordAIFixFeedback(
    originalCode: string,
    fixedCode: string,
    issueType: string,
    success: boolean,
    userSatisfaction: number
): Promise<void> {
    try {
        // Record the fix outcome in the ML system
        mlSecurityTrainer.recordAIFixOutcome(
            originalCode,
            fixedCode,
            success,
            userSatisfaction
        );
        
        // Train the model with this feedback
        await mlSecurityTrainer.trainModel(
            originalCode,
            true, // Was vulnerable
            userSatisfaction,
            issueType
        );
        
        console.log('AI fix feedback recorded for ML learning');
    } catch (error) {
        console.error('Failed to record AI fix feedback:', error);
    }
}
