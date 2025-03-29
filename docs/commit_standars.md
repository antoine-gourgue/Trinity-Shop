### 📝 **Commit Naming Convention: Conventional Commits**

```plaintext
<type>(<scope>): <description>
```

---

### 📜 **Commit Structure**

1. **type**: Describes the category of the change.
2. **!** *(optional)*: Indicates that the commit introduces a breaking change.
3. **scope** *(optional)*: Specifies the part of the project affected.
4. **description**: A brief description of the change.

---

### 🚀 **Standard Types**

| Type      | Description                                                |
|-----------|------------------------------------------------------------|
| `feat`    | A new feature.                                             |
| `fix`     | A bug fix.                                                 |
| `docs`    | Documentation changes only.                                |
| `style`   | Code style changes (e.g., formatting, missing spaces) with no logic impact. |
| `refactor`| Code changes that neither fix bugs nor add features.       |
| `test`    | Adding or modifying tests.                                 |
| `chore`   | Non-functional changes (e.g., dependency updates).         |

---

### ⚡ **Using `!` for Breaking Changes**

If a commit introduces a breaking change, add `!` after the type or scope:

1. **Breaking change without scope:**
   ```plaintext
   feat!: remove support for legacy API
   ```

2. **Breaking change with scope:**
   ```plaintext
   feat(auth)!: update login endpoint to OAuth 2.0
   ```

---

### 🖊️ **Commit Message Examples**

1. **Adding a feature:**
   ```plaintext
   feat(auth): add user login functionality
   ```

2. **Fixing a bug:**
   ```plaintext
   fix(ui): resolve alignment issue in the navigation bar
   ```

3. **Updating documentation:**
   ```plaintext
   docs(readme): update installation instructions
   ```

4. **Breaking change:**
   ```plaintext
   refactor(database)!: remove deprecated query methods
   ```

5. **Code styling:**
   ```plaintext
   style(api): fix formatting in user controller
   ```

6. **Refactoring code:**
   ```plaintext
   refactor(database): optimize query performance
   ```