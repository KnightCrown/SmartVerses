# Report Transcript API Spec

This document describes the HTTP API that the ProAssist/SmartVerses app uses when a user reports that a scripture reference was **not** detected in a transcript segment. The backend should implement this endpoint so the team can improve detection.

---

## Endpoint

- **Method:** `POST`
- **Path:** `{baseUrl}/report-transcript`  
  The app uses the base URL from the build-time env var `VITE_REPORT_TRANSCRIPT_URL` (e.g. `https://your-api.example.com`). The full URL is therefore `https://your-api.example.com/report-transcript`.
- **Request headers:** `Content-Type: application/json`
- **Body:** JSON object (see payload shape below).

---

## Request payload shape

The body is a single JSON object with the same structure as the app's "Download as JSON" export, but limited to **the reported segment plus the previous two segments** for context.

| Field | Type | Description |
|-------|------|-------------|
| `generatedAt` | string | ISO 8601 timestamp when the report was generated (e.g. `"2025-02-02T14:30:00.000Z"`). |
| `reportedSegmentId` | string | `id` of the segment the user reported (the one where scripture was missed). |
| `segments` | array | Up to 3 segments: the reported segment plus the previous 2 (for context). Order is chronological (oldest first). |
| `interim` | string \| null | Interim (in-progress) transcript at time of report, if any. |
| `references` | object | All detected references in the included segments only (see below). |

### `segments[]` item

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique segment id (e.g. from transcription engine). |
| `text` | string | Transcript text for this segment. |
| `timestamp` | number | Unix ms timestamp. |
| `isFinal` | boolean | Whether the segment was final (not interim). |
| `references` | array \| undefined | Detected Bible references for this segment (see `DetectedBibleReference`). |
| `keyPoints` | array \| undefined | Key points extracted for this segment (see `KeyPoint`). |

### `references` (top-level)

| Field | Type | Description |
|-------|------|-------------|
| `direct` | array | References detected as direct (e.g. "John 3:16"). |
| `paraphrase` | array | References detected as paraphrase (AI-matched). |

### `DetectedBibleReference` (used in `segments[].references`, `references.direct`, `references.paraphrase`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique id for this detection. |
| `reference` | string | Normalized reference (e.g. `"John 3:16"`). |
| `displayRef` | string | Human-readable reference. |
| `verseText` | string | Resolved verse text. |
| `source` | `"direct"` \| `"paraphrase"` | How it was detected. |
| `confidence` | number \| undefined | For paraphrase: 0–1 confidence. |
| `matchedPhrase` | string \| undefined | For paraphrase: phrase that matched. |
| `transcriptText` | string \| undefined | Transcript text that contained this reference. |
| `timestamp` | number | Unix ms. |
| `translationId` | string \| undefined | Bible translation id. |
| `book` | string \| undefined | Book name/code. |
| `chapter` | number \| undefined | Chapter number. |
| `verse` | number \| undefined | Verse number. |
| `highlight` | string[] \| undefined | Words to highlight in verse text. |

### `KeyPoint` (used in `segments[].keyPoints`)

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Key point text. |
| `category` | string | One of: `"quote"`, `"action"`, `"principle"`, `"encouragement"`. |

---

## Example request body

```json
{
  "generatedAt": "2025-02-02T14:30:00.000Z",
  "reportedSegmentId": "seg-abc123",
  "segments": [
    {
      "id": "seg-prev2",
      "text": "So we're going to look at a few verses today.",
      "timestamp": 1706880000000,
      "isFinal": true,
      "references": null,
      "keyPoints": null
    },
    {
      "id": "seg-prev1",
      "text": "Turn with me to John chapter 3.",
      "timestamp": 1706880015000,
      "isFinal": true,
      "references": [
        {
          "id": "ref-1",
          "reference": "John 3:1",
          "displayRef": "John 3:1",
          "verseText": "There was a man of the Pharisees...",
          "source": "direct",
          "timestamp": 1706880016000
        }
      ],
      "keyPoints": null
    },
    {
      "id": "seg-abc123",
      "text": "Verse 16 says for God so loved the world.",
      "timestamp": 1706880030000,
      "isFinal": true,
      "references": null,
      "keyPoints": null
    }
  ],
  "interim": null,
  "references": {
    "direct": [
      {
        "id": "ref-1",
        "reference": "John 3:1",
        "displayRef": "John 3:1",
        "verseText": "There was a man of the Pharisees...",
        "source": "direct",
        "timestamp": 1706880016000
      }
    ],
    "paraphrase": []
  }
}
```

In this example, the user reported the third segment (`seg-abc123`) because "verse 16" / "for God so loved the world" was not detected as John 3:16.

---

## Response

- **Success:** HTTP `200` (or `2xx`). Body is not required; the app only checks `res.ok`.
- **Failure:** HTTP `4xx` or `5xx`. The app does not show the response body to the user; it only stops the loading state.

---

## Anti-abuse / anti-spam (options)

The app is open source, so the request format and URL are visible. To reduce spam or abuse from arbitrary `curl`/scripts, consider one or more of the following on the **server** side (the app can be extended to support signing if you choose that option).

1. **Rate limiting (recommended)**  
   - Limit reports per IP (and optionally per some client id) per hour/day.  
   - Reject or throttle above the limit.  


5. **Validation**  
   - Reject requests with invalid JSON, missing required fields, or obviously bogus data (e.g. empty `segments`, future `generatedAt`).  
   - Helps filter low-effort spam.

**Recommendation:** Start with **rate limiting** and **validation**; add **CORS** for your known origins. Add **signing** only if you want to reject requests that don't come from a build that has the secret (with the caveat above).

---
