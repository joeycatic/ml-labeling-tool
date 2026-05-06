# Dataset Contract

## Primary Task

The first ML task is primary-label classification over:

- `important`
- `useful`
- `irrelevant`

`skip` is stored in the database but excluded from the default training export.

## Exported CSV Columns

```text
text,label,category,subject,senderEmail,receivedAt,id,messageId,snippet,bodyText
```

## Combined Text Field

The `text` column is built as:

```text
subject + "\n" + snippet + "\n" + bodyText
```

This makes the export usable directly with:

- TF-IDF + Logistic Regression
- linear SVM baselines
- transformer fine-tuning later

## Quality Rules

Default export excludes:

- rows labeled `skip`
- rows with empty `subject` and empty `bodyText`

## Category Field

`category` is optional metadata. It is useful for:

- slicing errors by email type
- later multi-task or hierarchical experiments
- manual audit and quality review

The initial model should use `label` as the target.

## Suggested Python Baseline

Typical first pass:

1. load the CSV
2. train on `text`
3. predict `label`
4. inspect confusion between `important`, `useful`, and `irrelevant`

Keep `category`, `subject`, and `senderEmail` as additional analysis fields even if the first model does not train on them.
