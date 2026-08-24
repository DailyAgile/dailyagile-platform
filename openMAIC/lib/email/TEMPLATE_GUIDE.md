# Email Template System Guide

## Overview

The email template system provides:
- **Externalized templates**: Email content is stored in files, not hardcoded
- **Multiple formats**: HTML, plain text, and subject line for each template
- **Variable substitution**: Automatic {{placeholder}} replacement with HTML escaping
- **Prepared for i18n**: Locale support for future internationalization
- **Validation**: Required variables checking and template registry

## Directory Structure

```
lib/email/
├── templates/
│   ├── enrollment-confirmation.html      ← HTML version
│   ├── enrollment-confirmation.txt       ← Plain text version
│   ├── enrollment-confirmation.subject   ← Subject line
│   │
│   ├── i18n/                             ← Future: localized versions
│   │   ├── es/                           (Spanish)
│   │   │   ├── enrollment-confirmation.html
│   │   │   ├── enrollment-confirmation.txt
│   │   │   └── enrollment-confirmation.subject
│   │   └── fr/                           (French)
│   │       └── ...
│   │
│   └── [future templates here]
│
├── template-renderer.ts                  ← Rendering engine (already exists)
├── email-template-loader.ts              ← Template loading & management (new)
├── email-queue-service.ts                ← (existing)
└── TEMPLATE_GUIDE.md                     ← This file
```

## How to Use Templates

### Basic Usage: Load and Render

```typescript
import { loadAndRenderEmailTemplate } from '@/lib/email/email-template-loader';

// Load and render the enrollment confirmation template
const rendered = await loadAndRenderEmailTemplate(
  'enrollment-confirmation',
  {
    firstName: 'Alice',
    courseId: 'COURSE-123',
    amount: '99.99',
    email: 'alice@example.com',
    courseName: 'AI Foundations',
    enrollmentDate: new Date().toLocaleDateString(),
    currentYear: new Date().getFullYear().toString(),
  }
);

// Use the rendered template
await sendEmail({
  to: rendered.to || 'alice@example.com',
  subject: rendered.subject,
  htmlContent: rendered.html,
  textContent: rendered.text,
});
```

### Get Template Metadata

```typescript
import { getTemplateMetadata } from '@/lib/email/email-template-loader';

const meta = getTemplateMetadata('enrollment-confirmation');
console.log(meta.requiredVariables);   // ['firstName', 'courseId', 'amount', 'email']
console.log(meta.optionalVariables);   // ['courseName', 'enrollmentDate', 'currentYear']
```

### List Available Templates

```typescript
import { listAvailableTemplates } from '@/lib/email/email-template-loader';

const templates = listAvailableTemplates();
// ['enrollment-confirmation', 'password-reset', ...]
```

### Check if Template Exists

```typescript
import { templateExists } from '@/lib/email/email-template-loader';

const exists = await templateExists('enrollment-confirmation', 'html');
// true or false
```

### Preload Templates at Startup

```typescript
import { preloadTemplates } from '@/lib/email/email-template-loader';

// In your app initialization:
const templateCache = await preloadTemplates([
  'enrollment-confirmation',
  'password-reset',
  'course-completion',
]);
```

## Adding a New Template

### Step 1: Create Template Files

Create three files in `lib/email/templates/`:

**1. HTML version: `{template-name}.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Title - DailyAgile</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    /* Your CSS here */
  </style>
</head>
<body>
  <div class="container">
    <h1>Hello {{firstName}}!</h1>
    <p>{{message}}</p>
  </div>
</body>
</html>
```

**2. Plain text version: `{template-name}.txt`**
```
HELLO {{firstName}}!

{{message}}

---
Copyright © {{currentYear}} DailyAgile
https://dailyagile.com
```

**3. Subject line: `{template-name}.subject`**
```
Hello {{firstName}} - Important Update from DailyAgile
```

### Step 2: Register Template Metadata

In `email-template-loader.ts`, add to `TEMPLATE_REGISTRY`:

```typescript
const TEMPLATE_REGISTRY: Record<string, TemplateMetadata> = {
  // ... existing templates ...
  'password-reset': {
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset link',
    requiredVariables: ['resetLink', 'email', 'firstName'],
    optionalVariables: ['expiresIn', 'supportEmail', 'currentYear'],
    locale: 'en',
    version: '1.0.0',
  },
};
```

**Metadata Fields:**
- `name` (string): Human-readable template name
- `description` (string): What this template is used for
- `requiredVariables` (string[]): Must be provided or template rendering fails
- `optionalVariables?` (string[]): Nice-to-have variables that enhance the email
- `locale` (string): Language code (default: 'en')
- `version` (string): Semantic version for tracking template evolution

### Step 3: Use the Template

```typescript
import { loadAndRenderEmailTemplate } from '@/lib/email/email-template-loader';

const rendered = await loadAndRenderEmailTemplate(
  'password-reset',
  {
    firstName: 'Bob',
    resetLink: 'https://dailyagile.com/reset?token=abc123',
    email: 'bob@example.com',
    expiresIn: '24 hours',
    currentYear: new Date().getFullYear().toString(),
  }
);

// Send via your email service
await sendEmail({
  to: 'bob@example.com',
  subject: rendered.subject,
  htmlContent: rendered.html,
  textContent: rendered.text,
});
```

## Variable Placeholder Syntax

### Basic Placeholder

```html
<p>Hello {{firstName}}!</p>
```
Replaces `{{firstName}}` with the value in the variables object.

### Escaped HTML

All variables are **automatically HTML-escaped** to prevent XSS:
```typescript
// Input: "<script>alert('xss')</script>"
// Output: "&lt;script&gt;alert('xss')&lt;/script&gt;"
```

### URL Fields

Fields ending with `Url`, named `link`, or named `href` use **URL escaping** instead:
```html
<a href="{{resetLink}}">Click here</a>  <!-- URL-escaped -->
<p>{{userName}}</p>                     <!-- HTML-escaped -->
```

### Empty/Null Values

Missing or null variables are replaced with empty strings:
```typescript
// If courseName is undefined:
renderTemplate("Course: {{courseName}}", {}) 
// Result: "Course: "
```

### Whitespace Handling

Spaces around placeholders are tolerated:
```html
<p>Hello {{ firstName }}</p>    <!-- OK -->
<p>Hello {{firstName}}</p>       <!-- OK -->
<p>Hello {{  firstName  }}</p>   <!-- OK -->
```

## Required vs Optional Variables

### Required Variables

If a required variable is missing, the template will still render, but a warning is logged:

```typescript
const meta = getTemplateMetadata('password-reset');
// requiredVariables: ['resetLink', 'email', 'firstName']

// This will render but log a warning:
const rendered = await loadAndRenderEmailTemplate(
  'password-reset',
  { email: 'user@example.com' }  // Missing resetLink and firstName
);
```

**Best Practice**: Always provide all required variables to the rendering function.

### Optional Variables

Optional variables enhance the template but aren't required:

```typescript
// This is fine - template will render without courseDetails:
const rendered = await loadAndRenderEmailTemplate(
  'enrollment-confirmation',
  {
    firstName: 'Alice',
    courseId: 'COURSE-123',
    amount: '99.99',
    email: 'alice@example.com',
    // courseName is optional - can be omitted
  }
);
```

## Best Practices

### 1. Use Semantic Variable Names

```html
<!-- Good -->
<p>Hello {{studentFirstName}}, your course {{courseName}} is ready!</p>

<!-- Avoid -->
<p>Hello {{name1}}, your course {{name2}} is ready!</p>
```

### 2. Separate Concerns

Keep the template focused on one purpose. Don't mix multiple email types in one template.

```
✓ enrollment-confirmation.html     (single purpose)
✗ enrollment-and-onboarding.html   (two purposes - split into two templates)
```

### 3. Always Provide currentYear

DailyAgile templates typically include copyright year:
```typescript
currentYear: new Date().getFullYear().toString()
```

### 4. Format Amounts Carefully

Always format monetary amounts before passing to template:
```typescript
// Good
amount: amount.toFixed(2)  // "99.99"

// Less good - formatting in template doesn't work well
amount: amount  // 99.989999 in template
```

### 5. Format Dates Consistently

```typescript
// Good
enrollmentDate: new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})  // "August 23, 2026"

// Less good
enrollmentDate: new Date().toString()  // Hard to read in different locales
```

### 6. Test Template Variables

```typescript
import { getTemplateMetadata } from '@/lib/email/email-template-loader';

const meta = getTemplateMetadata('my-template');
const provided = new Set(Object.keys(variables));

for (const required of meta.requiredVariables) {
  if (!provided.has(required)) {
    throw new Error(`Missing required variable: ${required}`);
  }
}
```

## Styling Email Templates

### DailyAgile Brand Colors

Always use the official brand colors in inline styles:

```html
<style>
  .header {
    background: linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%);
    /* Navy #1E3A5F + Teal #0891B2 */
  }
  .button {
    background-color: #0891B2;  /* Teal */
    color: #FFFFFF;              /* White text */
  }
  .success {
    background-color: #10B981;   /* Emerald for success states */
  }
</style>
```

### Responsive Design

Email clients have limited CSS support. Use:
- **Inline styles** (not `<style>` tags)
- **Table-based layouts** for complex structures
- **Max-width: 600px** for container
- **Fallback fonts**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

```html
<table role="presentation" style="max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="padding: 20px;">
      Content here
    </td>
  </tr>
</table>
```

## Future: Internationalization (i18n)

### Prepare Now

The template system is designed for future i18n support. To prepare:

1. **Use {{}} placeholders** consistently (already done)
2. **Never hardcode language text** in code - always use templates
3. **Separate content from presentation** (HTML structure vs text)

### When Adding i18n Support

1. Create locale subdirectories:
   ```
   lib/email/templates/
   └── i18n/
       ├── es/
       │   ├── enrollment-confirmation.html
       │   └── enrollment-confirmation.subject
       └── fr/
           └── ...
   ```

2. Update template loader to respect locale:
   ```typescript
   const rendered = await loadAndRenderEmailTemplate(
     'enrollment-confirmation',
     variables,
     { locale: 'es' }  // Spanish
   );
   ```

3. Update user model to store preferred language:
   ```sql
   ALTER TABLE students ADD COLUMN preferred_locale VARCHAR(5) DEFAULT 'en';
   ```

## Troubleshooting

### "Template file not found"

**Problem**: `Error: Template file not found: /path/to/lib/email/templates/{name}.html`

**Solution**:
1. Verify file exists: `ls -la lib/email/templates/{name}.*`
2. Check spelling of template name
3. Ensure all three files exist: `.html`, `.txt`, `.subject`

### "Missing required variables"

**Problem**: Warning logged: "Missing required template variables: firstName, courseId"

**Solution**:
```typescript
const meta = getTemplateMetadata('enrollment-confirmation');
console.log('Required:', meta.requiredVariables);

// Provide all required variables
const rendered = await loadAndRenderEmailTemplate(
  'enrollment-confirmation',
  {
    firstName: 'Alice',       // ← Add this
    courseId: 'COURSE-123',   // ← Add this
    amount: '99.99',
    email: 'alice@example.com',
  }
);
```

### "Unreplaced placeholders"

**Problem**: Warning logged: "Unreplaced placeholders in template: {{invalidVar}}"

**Solution**:
1. Check spelling: `{{firstName}}` not `{{first_name}}`
2. Verify variable name matches exactly
3. Update template to use correct placeholder name

### Email not sending

**Problem**: Email sent but variables show as {{placeholder}} in client

**Solution**:
1. Verify `loadAndRenderEmailTemplate` was called (not just `loadEmailTemplate`)
2. Check that Brevo API received `htmlContent` and `textContent`
3. Verify variables object is not empty

## Testing Templates

### Unit Test Example

```typescript
import { loadAndRenderEmailTemplate, getTemplateMetadata } from '@/lib/email/email-template-loader';

describe('enrollment-confirmation template', () => {
  it('renders with required variables', async () => {
    const rendered = await loadAndRenderEmailTemplate(
      'enrollment-confirmation',
      {
        firstName: 'Alice',
        courseId: 'COURSE-123',
        amount: '99.99',
        email: 'alice@example.com',
        enrollmentDate: 'August 23, 2026',
        currentYear: '2026',
      }
    );

    expect(rendered.html).toContain('Hello Alice');
    expect(rendered.html).toContain('COURSE-123');
    expect(rendered.text).toContain('$99.99');
    expect(rendered.subject).toContain('Welcome to Course');
  });

  it('has required variables in registry', () => {
    const meta = getTemplateMetadata('enrollment-confirmation');
    expect(meta.requiredVariables).toContain('firstName');
    expect(meta.requiredVariables).toContain('email');
  });
});
```

### Integration Test Example

```typescript
// Test email sending with template
it('sends enrollment confirmation email', async () => {
  const rendered = await loadAndRenderEmailTemplate(
    'enrollment-confirmation',
    testVariables
  );

  const result = await sendEmailViaBrevo({
    to: [{ email: 'test@example.com' }],
    subject: rendered.subject,
    htmlContent: rendered.html,
    textContent: rendered.text,
  });

  expect(result.success).toBe(true);
});
```

## Summary

| Task | Function | File |
|------|----------|------|
| Load & render template | `loadAndRenderEmailTemplate()` | `email-template-loader.ts` |
| Get template info | `getTemplateMetadata()` | `email-template-loader.ts` |
| List all templates | `listAvailableTemplates()` | `email-template-loader.ts` |
| Render variables | `renderTemplate()` | `template-renderer.ts` |
| HTML escape | `escapeHtml()` | `template-renderer.ts` |
| Add new template | Create `.html`, `.txt`, `.subject` files | `lib/email/templates/` |
| Register template | Add to `TEMPLATE_REGISTRY` | `email-template-loader.ts` |

---

**Last Updated**: 2026-08-23  
**Version**: 1.0.0  
**Maintained By**: DailyAgile Platform Team
