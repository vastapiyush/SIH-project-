# Smart Crop Health Assistant

A React + TypeScript + Vite PWA for crop observations, field history, voice notes, treatment records, follow-ups and weather screening. No farmer account or paid AI service is required to run the demonstration.

## Run

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

The production build in `dist/` includes a service worker and app manifest. Offline shell caching applies to the production preview or an HTTPS deployment after the first successful online visit. Development mode does not register a service worker. Browser installation support varies.

## Implemented

- IndexedDB stores observations, compressed photos, audio notes, field sectors, chemical applications, outcomes and preferences on the device.
- A guided form collects crop, growth stage, symptoms, affected percentage and soil conditions.
- Local photo quality checks flag low resolution, extreme lighting and very low detail before paid analysis.
- Demo symptom rules suggest possible causes and ask questions to distinguish yellowing from root stress.
- An illustrative health index reports a range, evidence and trend. It is **not agronomically validated**. The index currently uses reported severity, affected percentage and drainage. Image availability controls uncertainty, not plant condition. Other contextual fields are passed to a configured AI service but do not pretend to be validated score factors.
- Chemical repetition checks compare ingredients and mode-of-action groups within each sector. Warnings indicate a need for review, not proven resistance or a validated rotation prescription.
- English/Hindi/Marathi navigation, voice controls, follow-up questions and demo advice summaries. Detailed demo explanations remain English. No claim of full dialect coverage.
- Browser speech-to-text when available and connected, with editable transcripts and speech playback. Speech recognition may use the browser vendor's server. Offline audio notes can be saved without transcription. Installed TTS voices vary.
- Live Open-Meteo weather requested by the farmer, cached for 30 minutes, and clearly labelled sample weather when no live forecast exists. Forecasts older than three hours are marked stale.
- Conservative spray screening based on entered product limits, rain-free hours, wind, heat, humidity and on-site pollinator/inversion checks. A candidate is not a guarantee of safe spraying.
- Follow-up popups when the app is opened, outcome history and repeated non-improvement flags. Feedback does not automatically train a model or change a measured health score.
- JSON backup export/import with validation and confirmation before replacement or deletion.
- Pending AI requests retained locally, submitted manually after reconnection. No hidden background uploads.

## AI connection and costs

Set `VITE_DIAGNOSIS_ENDPOINT` to your own HTTPS backend URL and rebuild. Leave it empty to use demo mode. **The demo does not analyze image content or identify pest life stages.** The interface and adapter support a future model capable of doing so.

The endpoint must keep provider secrets on the server, apply rate limits and request-size limits, and use a low-cost multimodal model. No provider key belongs in browser code. The frontend sends one compressed JPEG with a compact case summary, requested language, fresh weather where available, soil information and recent treatment groups. Identical requests reuse an exact-content local result for 30 minutes; changed evidence triggers a new request. Follow-up questions use local rules in demo mode.

Expected endpoint response:

```json
{
  "possibleConditions": [{"name":"Possible cause","type":"disease","confidence":0.5,"evidence":["Observed evidence"],"severity":"low"}],
  "nextQuestion":"One useful question",
  "immediateActions":["A low-risk next step"],
  "expertReviewNeeded":true,
  "reasonForEscalation":"Reason to seek expert review"
}
```

Supported types: `disease`, `pest`, `nutrient`, `water`, `weather`, `unknown`. Confidence must be 0–1, severity `low`, `medium` or `high`. Return one to three conditions. These model confidences are not validated probabilities. Validate responses server-side too. Invalid or failed responses retain the observation for retry; the client never silently labels mock content as AI results.

## Limits and next integrations

No backend or provider API key is included. A live diagnosis endpoint, expert-reviewed crop-specific treatment knowledge, validated crop-specific scoring and outbreak models, and opt-in anonymized community reports need integration before real agricultural use. Community risk currently shows only a labelled local weather/history heuristic. No confirmed outbreaks or neighbours' reports are fabricated.

The app does not produce pesticide doses, claim guaranteed diagnosis, recommend a rotation product without verification, or declare a product counterfeit. Follow local registered labels and expert guidance. Treatment suggestions currently prioritize observation, soil/drainage checks and confirmation.

Records belong to the current browser origin and can be lost if browser storage is cleared. Export a backup before changing the hosting URL/device. IndexedDB is not an encrypted vault. No cross-device sync is connected. Background notifications while the app is closed require a later notification service; current reminders appear on app opening.

Open-Meteo attribution and API documentation: https://open-meteo.com/en/docs
Browser speech support: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

## Structure

`src/engine.ts` has local rules, `src/services.ts` has image/weather/AI adapters, `src/storage.ts` owns local persistence and backup validation, `src/Panels.tsx` contains weather/treatment/settings/follow-up views, and `src/App.tsx` coordinates the crop-check flow. `scripts/build-sw.mjs` precaches the production shell. No registration, paid service or generated artwork is required.
