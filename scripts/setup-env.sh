#!/bin/bash

# IEP Copilot - Environment Setup Script
# Run this to set up your .env.local file from the template

echo "🚀 Setting up IEP Copilot environment..."
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Copy the template
cp .env.example .env.local
echo "✅ Created .env.local from template"

echo ""
echo "📝 Next steps:"
echo "1. Edit .env.local with your actual credentials"
echo "2. Fill in the REQUIRED variables first"
echo "3. Run 'npm run dev' to start development"
echo ""
echo "💡 Remember: .env.local contains secrets and is git-ignored!"
