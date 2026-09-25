# CSV Upload Guide for Instructors

Complete guide to uploading questions and students via CSV files.

## Table of Contents

1. [Quiz Questions CSV](#quiz-questions-csv)
2. [Student Roster CSV](#student-roster-csv)
3. [CSV Best Practices](#csv-best-practices)
4. [Troubleshooting](#troubleshooting)

---

## Quiz Questions CSV

### CSV Format & Headers

Your CSV must have these exact headers in this order:

```
Question Number,Question,Option A,Option B,Option C,Option D,Option E,Correct Answer,Explanation,Source Link,Timer Seconds
```

**Column Definitions:**

| Header | Description | Required | Example |
|--------|-------------|----------|---------|
| Question Number | Sequential number starting at 1 | Yes | 1, 2, 3 |
| Question | The actual question text | Yes | "What is photosynthesis?" |
| Option A | First answer choice | Yes | "Process of making food from light" |
| Option B | Second answer choice | Yes | "Process of breaking down glucose" |
| Option C | Third answer choice | Yes | "Process of cell division" |
| Option D | Fourth answer choice | Yes | "Process of protein synthesis" |
| Option E | Fifth answer choice | Yes | "All of the above" |
| Correct Answer | The correct option (A, B, C, D, or E) | Yes | B |
| Explanation | Why this is correct (for student feedback) | Yes | "Photosynthesis is..." |
| Source Link | URL where question came from | Optional | https://example.com |
| Timer Seconds | Seconds allowed per question | Optional | 60 |

### Complete Example

Here's a full example with 3 questions:

```csv
Question Number,Question,Option A,Option B,Option C,Option D,Option E,Correct Answer,Explanation,Source Link,Timer Seconds
1,What is the capital of France?,London,Paris,Rome,Berlin,Madrid,B,Paris is located in north-central France and is the country's capital city,https://geography.example.com,60
2,Which planet is closest to the sun?,Venus,Mercury,Earth,Mars,Jupiter,B,Mercury is the closest planet to the sun at approximately 58 million km,https://astronomy.example.com,90
3,What is 15% of 200?,30,20,25,35,40,A,200 * 0.15 = 30,https://math.example.com,45
```

### Creating CSV Files

#### Option 1: Microsoft Excel

1. Create new spreadsheet
2. Enter headers in first row
3. Enter one question per row
4. **Save As** → File type: **CSV (Comma delimited)** (*.csv)
5. Choose **UTF-8** encoding

#### Option 2: Google Sheets

1. Create new sheet
2. Enter headers and data
3. File → **Download** → **CSV**
4. File automatically encodes as UTF-8

#### Option 3: Plain Text Editor

1. Create `.csv` file in Notepad/VS Code
2. Type headers and data with commas between columns
3. Wrap text in quotes if it contains commas:
   ```csv
   1,"What is 2+2, really?",3,4,5,6,7,B,"The answer is 4, which is common knowledge",https://example.com,60
   ```
4. Save as `.csv` file

---

## Student Roster CSV

### CSV Format for Bulk Import

Headers required:

```
Email,First Name,Last Name
```

**Column Definitions:**

| Header | Description | Required | Example |
|--------|-------------|----------|---------|
| Email | Student's email (must be unique) | Yes | john.doe@university.edu |
| First Name | Student's first name | Yes | John |
| Last Name | Student's last name | Yes | Doe |

### Example Student Roster

```csv
Email,First Name,Last Name
john.doe@university.edu,John,Doe
jane.smith@university.edu,Jane,Smith
robert.jones@university.edu,Robert,Jones
sarah.williams@university.edu,Sarah,Williams
michael.brown@university.edu,Michael,Brown
```

### Creating Student Roster

#### Option 1: From Your Learning Management System

Most LMS platforms (Canvas, Blackboard, etc.) let you export rosters:

1. Go to your course Roster
2. Click **Export** or **Download**
3. Choose CSV format
4. You'll get a file - may need to remove extra columns
5. Keep only: Email, First Name, Last Name
6. Upload to DailyAgile

#### Option 2: From Email List

If you have a list of student emails:

1. Copy emails into first column of spreadsheet
2. In second column, use formula to extract name:
   ```
   For email "john.doe@university.edu":
   - First Name: john
   - Last Name: doe
   ```
3. Or manually enter names
4. Save as CSV

#### Option 3: From Instructor Spreadsheet

1. Open your existing roster spreadsheet
2. Delete all columns except: Email, First Name, Last Name
3. Arrange in that exact order
4. Save as CSV

---

## CSV Best Practices

### 1. Column Order Matters

**Correct:**
```csv
Question Number,Question,Option A,Option B,Option C,Option D,Option E,Correct Answer,Explanation,Source Link,Timer Seconds
```

**Incorrect (columns out of order):**
```csv
Question,Question Number,Option A,Correct Answer,Option B,Option C,Option D,Option E,Explanation,Source Link,Timer Seconds
```

If columns are in wrong order, upload will fail.

### 2. Use Quotes for Complex Text

If your text contains commas, quotation marks, or line breaks, wrap in quotes:

**Correct:**
```csv
1,"What is 2+2, really?","1, the loneliest number","2, as in a couple","3, to be safe","4, the obvious answer","5, if you can't count",B,"The answer is 4 (obviously, since 2+2 always equals 4)","https://example.com",60
```

**Incorrect (confuses parser):**
```csv
1,What is 2+2, really?,1, the loneliest number,2, as in a couple,3, to be safe,4, the obvious answer,5, if you can't count,B,The answer is 4 (obviously, since 2+2 always equals 4),https://example.com,60
```

### 3. Encoding Matters

Always save as **UTF-8 encoding**:
- Excel: Save As → encoding dropdown → UTF-8
- Google Sheets: Auto UTF-8 when downloading
- Text editor: Save as UTF-8 (usually default)

**Why?** UTF-8 handles special characters: é, ñ, ü, etc.

### 4. No Extra Spaces

- ❌ ` email@example.com` (space before)
- ✅ `email@example.com`
- ❌ `John ` (space after)
- ✅ `John`

Use Find & Replace to trim:
```
Find: " ,
Replace: ,

Find: , "
Replace: ,
```

### 5. Correct Answer Format

Must be exactly one letter:
- ✅ `A`, `B`, `C`, `D`, `E`
- ❌ `a`, `b` (lowercase fails)
- ❌ `Option A` (too verbose)
- ❌ `1`, `2` (wrong format)

### 6. Unique Emails (For Student Upload)

Each student must have a unique email:
- ✅ All different emails in list
- ❌ Duplicate emails (second one fails)

Check for duplicates:
```
Excel: Data → Remove Duplicates
Google Sheets: Data → Data Cleanup → Remove duplicates
```

### 7. Timer Values (Optional)

If included, must be numbers:
- ✅ `60`, `90`, `120`
- ❌ `1 minute` (not a number)
- ❌ `60 seconds` (text fails)
- Leave blank or use `60` as default

### 8. Links Optional

The "Source Link" column is optional:
- ✅ `https://example.com/lesson-3`
- ✅ Empty/blank (students won't see source)
- ❌ `http://` incomplete links

---

## Troubleshooting CSV Issues

### "File format not recognized"

**Cause:** File is not actually CSV
**Solution:**
1. Verify file extension is `.csv` (not `.xls` or `.xlsx`)
2. Open in text editor to check format
3. Resave: Excel → Save As → select CSV (UTF-8)

### "Invalid CSV format"

**Causes:**
- Wrong number of columns
- Headers don't match exactly
- Text with commas not quoted
- Wrong encoding

**Solution:**
1. Count columns - should be 11 for questions, 3 for students
2. Check header spelling (case-sensitive)
3. Wrap complex text in quotes
4. Resave as UTF-8

### "Correct Answer not recognized"

**Causes:**
- Lowercase letter (must be uppercase)
- Extra spaces around letter
- Non-letter value

**Solution:**
1. Use UPPER() function in Excel:
   ```
   =UPPER(A1)
   ```
2. Or manually fix: Replace `a` with `A`, etc.
3. Trim spaces: Find ` A` → Replace `A`

### "Email already exists"

**Cause:** Student email already in system
**Solution:**
1. Check if student is already enrolled
2. Either: Remove from CSV or use different email variation:
   ```
   john.doe@university.edu → john.doe.2@university.edu
   ```

### "Some rows failed, others succeeded"

**Cause:** Mix of valid and invalid rows
**What happened:**
- Valid rows were imported
- Invalid rows were skipped
- Check error details for which rows failed

**Solution:**
1. Fix the failed rows
2. Upload again (valid rows already imported won't duplicate)
3. Or: Delete all, fix entire file, reimport

### File Too Large

**Cause:** File >50MB
**Solution:**
1. Split into smaller files:
   ```
   Large file: 10,000 students
   Split into: 10 files × 1,000 students each
   ```
2. Upload each file separately
3. Monitor upload progress

### "Encoding error" or Strange Characters

**Example:** `Question Text` appears as `ÒuÃ©stion TÃ©xt`

**Cause:** Wrong encoding
**Solution:**
1. Open CSV in text editor
2. File → Save With Encoding
3. Select **UTF-8** (or **UTF-8 with BOM**)
4. Re-upload

---

## Excel Tips & Tricks

### Formula: Generate Question Numbers

In column A, type:
```
=ROW()-1
```
This auto-generates: 1, 2, 3, 4... (starting from row 2)

### Formula: Trim Whitespace

If your data has extra spaces:
```
=TRIM(A1)
```

Apply to all cells:
1. Put formula in new column
2. Copy down
3. Copy results
4. Paste Special → Values Only
5. Delete original column

### Formula: Extract Email Domain

To verify all emails are same domain:
```
=RIGHT(A1,LEN(A1)-FIND("@",A1))
```
Should show all as `university.edu`

### Conditional Formatting: Check Correct Answers

Highlight cells that aren't A-E:
1. Select column with correct answers
2. Format → Conditional Formatting
3. Formula: `=NOT(OR(H:H="A",H:H="B",H:H="C",H:H="D",H:H="E"))`
4. Choose highlight color
5. Red cells = wrong values

---

## Example CSV Downloads

### Download Template Files

We provide blank templates:

**Quiz Questions Template:**
```csv
Question Number,Question,Option A,Option B,Option C,Option D,Option E,Correct Answer,Explanation,Source Link,Timer Seconds
```

**Student Roster Template:**
```csv
Email,First Name,Last Name
```

[Download Templates →](#)

---

## Validation Before Uploading

### Checklist

Before uploading, verify:

- [ ] File is saved as `.csv` (not `.xls`)
- [ ] Encoding is UTF-8
- [ ] No extra spaces in emails or names
- [ ] Column count is correct (11 for questions, 3 for students)
- [ ] Headers match exactly
- [ ] Correct Answer values are A, B, C, D, or E (uppercase)
- [ ] Emails are unique (student roster)
- [ ] Timer values are numbers only
- [ ] Complex text is wrapped in quotes
- [ ] No blank rows between data

### Test Upload

1. Create small test file (3-5 rows)
2. Upload it first
3. Verify it works
4. Then upload full file

---

## Getting Help

If you're still having issues:

1. **Download error report:**
   - Upload page shows which rows failed
   - Each error lists the issue
   - Fix those specific rows

2. **Email support:**
   - Include: Your CSV file + error message
   - Support@dailyagile.com
   - Response in 24 hours

3. **Use manual entry:**
   - Type in questions one-by-one
   - Takes longer but guaranteed to work

---

*Last updated: 2026-08-12*
*Version: 1.0*
