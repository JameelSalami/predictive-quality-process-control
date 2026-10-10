# Verification receipts

Store durable verification-receipt files here when a material claim is independently checked.

Each receipt should bind:

- claim IDs
- verification method
- outcome
- summary
- exact evidence IDs

Add the relative receipt path to `state.json.verificationReceiptFiles`.

A receipt records verification evidence. It does not make the verified claim more authoritative than the underlying evidence supports.
