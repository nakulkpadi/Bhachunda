# English land document forms

The home page links separately to `affidavit.html` and
`special-power-of-attorney.html`. Both are static pages for GitHub Pages.

## Document behaviour

- The document structure and substantive clauses follow the supplied joint
  affidavit and special power of attorney drafts.
- Each village and survey/subdivision has one parcel in Schedule A. The same
  owner may be linked to several parcels in different villages; different
  parcels may have different owners and shares.
- Villages are Bhavanipar, Bitta and Vandh Timbo. Taluka Abdasa, District Kutch
  and State Gujarat are fixed in both the input page and output.
- Farmers can be added and removed. In the power of attorney the Principals
  grant authority; the constituted Attorney is entered separately and may also
  be a co owner of selected parcels.
- Affidavit rent entitlement and bank credit percentages are separate and must
  each total 100% for each parcel. Credit to a single account does not change
  the recorded rent entitlement. Mode B requires an operative instrument.
- The power of attorney's unwanted Schedule C office/version/page-count table
  is removed. Approved NA documents and annexures are described in plain text.
- PDF downloads contain selectable text and handle growing documents across
  pages. Word downloads are real editable `.docx` OOXML files. Both exports
  use Letter paper, Times New Roman and the supplied drafts' margins.
- Empty optional entries become writing lines. Required farmer names,
  village/survey identity and affidavit allocation totals are checked before
  export. Optional personal, banking and instrument particulars must still be
  completed and checked before execution.

## Saved records and privacy

`Save record` stores form data in this browser under a separate key for each
document type. The list supports search, opening/editing, status tracking and
regenerating PDF/Word files. Updating a record keeps its ID.

The saved copy is device storage, not an off-site backup. Clearing browser data
removes it; download the documents to retain separate copies. Do not enter real
farmer information in public test fixtures or commit completed records to GitHub.
User-controlled text is rendered with text nodes and escaped for OOXML.

## Firebase status

Firebase integration is deliberately disabled with `CLOUD_READY = false` while
the owner resolves the administrative connection. The live forms make no
Firebase reads or writes and do not alter existing consent records or rules.

Before enabling shared records, inspect the authenticated project's existing
staff sign-in provider and rules, adapt the sign-in UI to that verified provider,
and restrict the separate `legal-documents-v1/{affidavit|spa}` paths to authorised
staff on the server. Never enable public read/write access to PAN or bank data.
Do not replace the project's current rules wholesale. The prepared cloud adapter
uses conditional ETag writes and a record's last known cloud revision to reject
concurrent overwrites; it has not been validated against a live staff account.

## Dependencies and checks

The existing local JSZip bundle in `../lease-deed/jszip.min.js` creates the Word
container. PDF export uses the vendored `pdf-lib` 1.17.1 bundle and accompanying
MIT licence. No package installation or build step is required to use the pages.

Run the offline logic regression checks from the repository root:

```sh
node legal-forms/tests/regression.cjs
```

The harness checks parcel identity, owner changes, allocations, persistence,
safe text rendering and the disabled cloud boundary. It does not replace live
browser or document rendering checks.
