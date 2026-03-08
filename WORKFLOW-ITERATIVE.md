# Iterative Development Workflow for Steel and Sigils

## Overview

Continuous development loop with:
1. **Coder** implements feature
2. **Tester** verifies it works
3. **Feedback** determines next step
4. **Telegram Reporter** keeps user updated throughout

## Workflow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Coder     │────▶│   Tester    │────▶│   Feedback  │
│  Implements │     │   Verifies  │     │   Analysis  │
└─────────────┘     └─────────────┘     └──────┬──────┘
       ▲                                         │
       │                                         │ OK? 
       │                                         │
       │         ┌───────────────────────────────┘
       │         │ YES                    NO
       │         │                        │
       │    ┌────┴────┐              ┌────┴────┐
       │    │  Next   │              │  Re-    │
       └────│ Feature │              │  queue  │
            └─────────┘              │  Fix    │
                                     └────┬────┘
                                          │
                                          ▼
                                    ┌─────────────┐
                                    │   Coder     │
                                    │   Fixes Bug │
                                    └─────────────┘
```

## Agent Configuration

### 1. Coder Agent
```javascript
{
  label: "coder-[feature]",
  mode: "run",
  timeout: 600, // 10 min
  task: "Implement [FEATURE]. Follow existing patterns. Commit when complete."
}
```

### 2. Tester Agent
```javascript
{
  label: "tester-[feature]",
  mode: "run",
  timeout: 300, // 5 min
  task: "Test [FEATURE]. Verify functionality. Report bugs or ✅ confirm working."
}
```

### 3. Telegram Reporter (runs in parallel)
```javascript
{
  label: "reporter-[feature]",
  mode: "run",
  task: "Send progress updates to telegram:1262038373 every 2 minutes"
}
```

## Execution Flow

### Step 1: User Requests Feature
```
User: "Add a new boss: Dragon King with fire breath"
```

### Step 2: Spawn Coder
```javascript
const coder = sessions_spawn({
  label: "coder-dragon-king",
  mode: "run",
  task: "Implement Dragon King boss with fire breath..."
});
```

### Step 3: Parallel Reporter
```javascript
sessions_spawn({
  label: "reporter-dragon-king",
  mode: "run",
  task: `Send updates to telegram:1262038373:
    - "📝 Started: Dragon King implementation"
    - Every 2 min: Progress update
    - "✅ Complete: Dragon King pushed to GitHub"`
});
```

### Step 4: Coder Completes
- Coder commits and pushes code
- Returns: { success: true, commit: "abc123" }

### Step 5: Spawn Tester
```javascript
const tester = sessions_spawn({
  label: "tester-dragon-king",
  mode: "run",
  task: "Test Dragon King boss. Verify fire breath works..."
});
```

### Step 6: Tester Reports
**If SUCCESS:**
```
Tester returns: { success: true, issues: [] }
→ Main Agent: "✅ Dragon King tested and working!"
→ Next: Queue next feature
```

**If BUGS FOUND:**
```
Tester returns: { success: false, issues: ["Fire breath doesn't damage", "Sprite missing"] }
→ Main Agent: "❌ Issues found. Re-queueing fix..."
→ Spawn Coder with fix task
→ Loop back to Step 2
```

## Telegram Messages Template

### Coder Messages
```
📝 Started: [Feature Name]
⏳ [Feature]: 50% complete...
💾 Commit: [commit message]
✅ [Feature]: Complete and pushed!
❌ [Feature]: Error - [details]
```

### Tester Messages
```
🧪 Testing: [Feature Name]
📸 Screenshot: [description]
✅ [Feature]: Test passed!
❌ Issue found: [description]
   Expected: [X]
   Actual: [Y]
📋 Full report: [link]
```

### Main Agent Messages
```
🔄 Starting workflow: [Feature]
📊 Status: Coder 70% done, ETA 3 min
✅ Phase 1 complete: Coder finished
🧪 Phase 2: Tester verifying...
🎉 [Feature] complete and verified!
⚠️ Issues found, re-queueing fix...
```

## Example Session

### Request
```
User: "Add a Dragon King boss with fire breath ability"
```

### Execution
```
Main Agent: "Spawning coder and reporter..."

[Telegram DM 1]: 📝 Started: Dragon King implementation
[Telegram DM 2]: ⏳ Dragon King: 40% complete
[Telegram DM 3]: 💾 Commit: Add Dragon King boss sprite
[Telegram DM 4]: ✅ Dragon King: Complete and pushed!

Main Agent: "Coder done. Spawning tester..."

[Telegram DM 5]: 🧪 Testing: Dragon King boss
[Telegram DM 6]: 📸 Screenshot: Dragon King spawned
[Telegram DM 7]: ❌ Issue found: Fire breath doesn't damage
   Expected: 25 damage in cone
   Actual: No damage dealt

Main Agent: "Issues found. Re-queueing fix..."
[Spawns coder-dragon-king-fix]

[Telegram DM 8]: 📝 Started: Dragon King fire breath fix
[Telegram DM 9]: 💾 Commit: Fix fire breath damage calculation
[Telegram DM 10]: ✅ Fix complete!

Main Agent: "Spawning re-tester..."
[Telegram DM 11]: ✅ Dragon King: All tests passed!

Main Agent: "🎉 Dragon King complete! Next feature?"
```

## Queue Management

### Pending Features (example)
```javascript
const queue = [
  { id: 1, name: "Dragon King", status: "in_progress", coder: active },
  { id: 2, name: "Ice Queen", status: "pending" },
  { id: 3, name: "Loot rework", status: "pending" },
];
```

### User Commands
```
User: "Status?"
→ Main Agent: "Dragon King: Testing (70%), Ice Queen: Queued"

User: "Add Ice Queen after Dragon King"
→ Main Agent: "Added to queue position #2"

User: "Pause current work"
→ Main Agent: "Pausing Dragon King. Resumable."

User: "Priority: Fix bug X first"
→ Main Agent: "Reordering queue. Bug fix now #1."
```

## Error Handling

### Coder Timeout (>10 min)
```
Action: Check partial completion
If partial: Commit what works, spawn fix for remainder
If none: Respawn with simplified scope
```

### Tester Timeout (>5 min)
```
Action: Accept partial test results
If critical features tested: Mark as partial success
If insufficient coverage: Respawn with focused test scope
```

### Both Fail
```
Action: Main agent analyzes directly
Spawn simplified coder with specific instructions
Or implement directly if scope is small
```

## Best Practices

1. **Coder scope**: One feature per coder (don't overload)
2. **Tester coverage**: Test critical path + edge cases
3. **Commit early**: Coder commits working code frequently
4. **Clear feedback**: Tester reports specific expected vs actual
5. **Parallel reporter**: Always run reporter for visibility
6. **Queue transparency**: User can see what's pending
7. **Interruptible**: Can pause/resume/reorder queue

## Configuration

### timeouts
- Coder: 600s (10 min) - complex features
- Tester: 300s (5 min) - verification
- Reporter: As needed - parallel updates

### models
- Coder: kimi-coding/k2p5 (best for code)
- Tester: kimi-coding/k2p5 (or lighter model)
- Reporter: any (simple task)

---

*This workflow enables continuous, transparent development with real-time updates.*
