---
description: Automatically stage, commit, and push changes after a task.
---

// turbo-all
1. Increment version in src/main.js
(Manually update the version string in src/main.js)

2. Stage all changes
git add .

2. Commit changes with a descriptive message
git commit -m "chore: automated sync after task completion"

3. Push to remote
git push
