# Security Cleanup Instructions

**Date:** 2026-01-03
**Severity:** CRITICAL
**Issue:** GCP service account private key and sensitive data committed to git repository

---

## ⚠️ IMMEDIATE ACTION REQUIRED

### Step 1: Revoke the GCP Service Account Key

**DO THIS FIRST - BEFORE ANYTHING ELSE!**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: IAM & Admin → Service Accounts
3. Find the service account: `iep-copilot-docai@iep-copilot-prod.iam.gserviceaccount.com`
4. Click on the service account
5. Go to the "Keys" tab
6. Find key ID: `d8cf7fe2b1419a7788bb0e6cbb610d6eb0b0d581`
7. Click the menu (⋮) and select "Delete"
8. Confirm deletion
9. Generate a new key and store it securely (in environment variables or secret manager)

### Step 2: Clean Git History

**WARNING:** This will rewrite git history. All collaborators will need to re-clone the repository or reset their local branches.

#### Option A: Using BFG Repo-Cleaner (Recommended - Faster)

```bash
# Install BFG (if not already installed)
# On macOS:
brew install bfg

# On Linux:
# Download from https://rtyley.github.io/bfg-repo-cleaner/

# Navigate to parent directory
cd /Users/kkokoszka

# Clone a fresh bare copy
git clone --mirror IEP-Copilot IEP-Copilot-cleanup.git

# Remove the sensitive files from history
bfg --delete-files iep-copilot-prod-d8cf7fe2b141.json IEP-Copilot-cleanup.git
bfg --delete-files data.json IEP-Copilot-cleanup.git
bfg --delete-files parsedTexasResults.json IEP-Copilot-cleanup.git
bfg --delete-files logs_result.json IEP-Copilot-cleanup.git

# Navigate into the mirror repo
cd IEP-Copilot-cleanup.git

# Clean up and expire reflog
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Push the cleaned history
git push --force

# Clean up
cd /Users/kkokoszka
rm -rf IEP-Copilot-cleanup.git

# In your working repository, fetch the cleaned history
cd /Users/kkokoszka/IEP-Copilot
git fetch origin
git reset --hard origin/main  # Replace 'main' with your branch name
```

#### Option B: Using git filter-branch (Built-in, Slower)

```bash
cd /Users/kkokoszka/IEP-Copilot

# Remove each sensitive file from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch reference/iep-copilot-prod-d8cf7fe2b141.json" \
  --prune-empty --tag-name-filter cat -- --all

git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch reference/data.json" \
  --prune-empty --tag-name-filter cat -- --all

git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch reference/parsedTexasResults.json" \
  --prune-empty --tag-name-filter cat -- --all

git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch reference/logs_result.json" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up refs
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push to remote
git push origin --force --all
git push origin --force --tags
```

### Step 3: Verify Cleanup

```bash
# Search for any remaining traces
git log --all --full-history --source -- "*iep-copilot-prod*.json"
git log --all --full-history --source -- "*data.json"
git log --all --full-history --source -- "*parsedTexasResults.json"

# Should return no results
```

### Step 4: Notify Collaborators

Send this message to all team members:

```
URGENT: Security cleanup performed on the repository.

The git history has been rewritten to remove accidentally committed credentials.

Action required:
1. Backup any local uncommitted work
2. Delete your local repository
3. Re-clone from origin

Commands:
cd /path/to/parent/directory
rm -rf IEP-Copilot
git clone <repository-url>

DO NOT try to merge or pull - you must re-clone.
```

### Step 5: Additional Security Measures

1. **Rotate all potentially exposed credentials:**
   - Supabase service role key
   - Any API keys that might have been exposed
   - Database passwords

2. **Review GitHub security alerts:**
   - Check if GitHub detected the exposed key
   - Follow any recommendations from GitHub

3. **Update deployment environment variables:**
   - Ensure new GCP key is properly configured in Vercel
   - Test that services still work with new credentials

4. **Enable branch protection:**
   - Require pull request reviews
   - Enable secret scanning
   - Enable push protection

---

## Files Cleaned Up

✅ Updated .gitignore to prevent future commits:
- GCP service account keys
- Production logs
- Large data files

✅ Moved sensitive files to `reference/data-archive/` (gitignored):
- `iep-copilot-prod-d8cf7fe2b141.json.REVOKED`
- `data.json`
- `parsedTexasResults.json`
- `logs_result.json`

✅ Created security documentation

⬜ **YOU MUST DO:** Revoke GCP key in Google Cloud Console
⬜ **YOU MUST DO:** Clean git history
⬜ **YOU SHOULD DO:** Rotate other credentials
⬜ **YOU SHOULD DO:** Enable branch protection

---

## Questions?

If you have any questions about this process:
1. Do NOT push any more commits until the history is cleaned
2. Contact your security team if available
3. Review GitHub's guide: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

---

**Created by:** Claude Code
**Date:** 2026-01-03
**Status:** Action Required
