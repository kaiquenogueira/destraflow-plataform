#!/usr/bin/env python3
import os
import re
import sys
import argparse
from pathlib import Path

# ANSI colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

# Configuration
PATTERNS = {
    'CRITICAL': [
        (r'eval\(', 'Avoid eval() - allows arbitrary code execution'),
        (r'(?<!\.)exec\(', 'Avoid exec() - allows arbitrary code execution'),
        (r'new Function\(', 'Avoid new Function() - allows arbitrary code execution'),
        (r'dangerouslySetInnerHTML', 'Potential XSS via dangerouslySetInnerHTML'),
        (r'verify\s*[=:]\s*False', 'SSL verification disabled (verify=False)'),
        (r'strictSSL\s*:\s*false', 'SSL verification disabled (strictSSL: false)'),
        (r'rejectUnauthorized\s*:\s*false', 'SSL verification disabled (rejectUnauthorized: false)'),
    ],
    'HIGH': [
        (r'API_KEY\s*=\s*[\'"][a-zA-Z0-9_\-]{20,}[\'"]', 'Potential hardcoded API Key'),
        (r'PASSWORD\s*=\s*[\'"][^\'"]{4,}[\'"]', 'Potential hardcoded password'),
        (r'SECRET\s*=\s*[\'"][^\'"]{4,}[\'"]', 'Potential hardcoded secret'),
        (r'http://', 'Insecure HTTP protocol usage'),
    ],
    'MEDIUM': [
        (r'console\.log\(', 'Console log in production code (info leak/performance)'),
        (r'TODO:', 'Leftover TODO comment'),
    ]
}

IGNORE_DIRS = {
    'node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.vscode', '.idea', '__pycache__', '.agent'
}

IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'security_scan.py', '.DS_Store'
}

IGNORE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.map', '.css', '.scss', '.env', '.env.local', '.env.example'
}

def is_ignored(path):
    parts = path.split(os.sep)
    for part in parts:
        if part in IGNORE_DIRS:
            return True
    if os.path.basename(path) in IGNORE_FILES:
        return True
    _, ext = os.path.splitext(path)
    if ext in IGNORE_EXTENSIONS:
        return True
    return False

def scan_file(file_path):
    findings = []
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            
        for i, line in enumerate(lines):
            line_num = i + 1
            
            # Check patterns
            for severity, rules in PATTERNS.items():
                for pattern, message in rules:
                    if re.search(pattern, line):
                        # Filter out some false positives for console.log
                        if 'console.log' in pattern and 'scripts/' in file_path:
                            continue
                            
                        findings.append({
                            'file': file_path,
                            'line': line_num,
                            'severity': severity,
                            'message': message,
                            'content': line.strip()
                        })
                        
    except Exception as e:
        print(f"{YELLOW}Could not read {file_path}: {e}{RESET}")
        
    return findings

def main():
    parser = argparse.ArgumentParser(description='Simple Security Scanner')
    parser.add_argument('path', nargs='?', default='.', help='Path to scan')
    parser.add_argument('--output', choices=['text', 'summary'], default='text', help='Output format')
    args = parser.parse_args()
    
    root_dir = os.path.abspath(args.path)
    print(f"{BLUE}Starting security scan on {root_dir}...{RESET}\n")
    
    all_findings = []
    
    for root, dirs, files in os.walk(root_dir):
        # Filter directories in place
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            file_path = os.path.join(root, file)
            if not is_ignored(file_path):
                findings = scan_file(file_path)
                all_findings.extend(findings)

    # Sort findings by severity
    severity_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2}
    all_findings.sort(key=lambda x: (severity_order.get(x['severity'], 3), x['file'], x['line']))

    # Report
    counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0}
    
    for finding in all_findings:
        counts[finding['severity']] += 1
        
        if args.output == 'text':
            color = RED if finding['severity'] == 'CRITICAL' else (YELLOW if finding['severity'] == 'HIGH' else BLUE)
            print(f"{color}[{finding['severity']}] {finding['file']}:{finding['line']}{RESET}")
            print(f"  {finding['message']}")
            print(f"  Code: {finding['content'][:100]}")
            print()

    print("-" * 50)
    print(f"Scan Complete.")
    print(f"{RED}CRITICAL: {counts['CRITICAL']}{RESET}")
    print(f"{YELLOW}HIGH:     {counts['HIGH']}{RESET}")
    print(f"{BLUE}MEDIUM:   {counts['MEDIUM']}{RESET}")
    
    if counts['CRITICAL'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
