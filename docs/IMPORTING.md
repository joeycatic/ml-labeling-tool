# Importing Mail into Email Labeling Dashboard

## Supported Formats

The import page accepts:

- CSV
- JSON
- EML
- MBOX
- multiple EML files in one batch

## Recommended Import Order

### Structured data

Use CSV or JSON when you already have extracted email records.

Recommended fields:

- `messageId`
- `senderEmail`
- `subject`
- `snippet`
- `bodyText`
- `receivedAt`

### Mailbox files

Use EML or MBOX when you are exporting from a mail client.

- `.eml` is good for single messages
- multiple `.eml` files can be uploaded together
- `.mbox` is good for folders or batches

## WEB.DE Workflow

WEB.DE does not provide a clean native CSV/JSON mailbox export. The simplest free route is:

1. enable `POP3/IMAP Abruf` in WEB.DE
2. connect the account in Thunderbird via IMAP
3. export messages or folders locally
4. upload those files in this app

### Thunderbird path

1. Add the WEB.DE account in Thunderbird.
2. Let the mailbox sync.
3. Export:
   - selected messages as `.eml`, or
   - a folder as `.mbox`
4. Open `/import` in the dashboard.
5. Upload the file or files, review the import preview, and then confirm the write.

## Import Rules

- `messageId` is strongly recommended for deduplication
- `senderEmail` and `receivedAt` should always be present
- categories and labels can be imported, but unlabeled imports are fine
- extensionless mailbox files are detected by content, not only by filename
- the server previews creates, updates, invalid rows, and duplicates before committing anything
- importing real mailbox data automatically removes seeded placeholder emails from the sample dataset
- if an older local database already contains both sample and real emails, the app removes the seeded rows automatically on the next normal read

## Troubleshooting

### The file picker accepts the file but import seems slow

Large mailbox files are uploaded to the server and parsed there. For MBOX imports, wait for the import result instead of expecting an instant local parse.

### The import succeeds but the email body looks messy

That is normal for some plaintext conversions from HTML-heavy mail. Labeling uses the text body, and the raw body is still kept for later processing.

### Why not direct provider APIs?

The project is designed to stay free and local-first. File-based import keeps the workflow simple and avoids provider-specific API setup.
