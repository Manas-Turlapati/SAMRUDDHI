# SAMRUDDHI

Sustainable Agriculture Model for Resource Utilisation, Disease Diagnostics, and Health Initiative. Detect visible crop disease from a leaf image and receive targeted fertilizer guidance through one secure web application.

## Authentication configuration

Google sign-in uses Google Identity Services in the frontend and verifies the returned ID token in the backend. Set VITE_GOOGLE_CLIENT_ID in the frontend environment and the matching GOOGLE_CLIENT_ID in the backend environment. Add each local and deployed frontend origin to the OAuth client's authorized JavaScript origins.

Diagnosis PDFs can be downloaded or shared from a supported mobile browser. The Share PDF action opens the device share menu; choose WhatsApp there and confirm the recipient. Location pins are only saved when the user opts in, and the map rounds coordinates before displaying them.

## Expert diagnosis review

Low-confidence predictions (below 70%) or predictions with entropy above 1.2 are added to the expert review queue. A farmer can also request a review from the diagnosis status panel. Expert accounts must have the `expert` role and `expertProfile.isVerified: true`; assign and verify expert/admin accounts through a trusted database administration process. Never accept a role supplied by a public registration request.

To send review alerts, configure these variables on the **backend** deployment:

```env
FRONTEND_URL=https://your-frontend.example
BACKEND_URL=https://your-backend.example
EXPERT_REVIEW_WEBHOOK_URL=https://your-notification-endpoint.example/hitl
EXPERT_REVIEW_WEBHOOK_SECRET=use-a-long-random-secret
INFERENCE_CALLBACK_SECRET=use-a-different-long-random-secret
```

The webhook is optional; without it the in-app queue still works. The receiver gets a JSON payload with diagnosis details and a one-time 48-hour review link, signed in `X-LDFRS-Signature` as `sha256=<hex HMAC-SHA256>`. Validate that signature using the exact request body and `EXPERT_REVIEW_WEBHOOK_SECRET`. Treat the link as a password: do not log or forward it, since opening it consumes it and creates a short-lived review session. `INFERENCE_CALLBACK_SECRET` protects `POST /api/diagnoses/infer-callback` for trusted inference integrations. The current browser prediction route creates the diagnosis directly and does not require that callback.

MongoDB transactions require a replica set (MongoDB Atlas provides one). Expert submissions update the diagnosis, review, and active-learning sample in one transaction. Administrators can download verified samples from `GET /api/reviews/active-learning/export`; the COCO JSON includes image data as base64 and can be large.

## Role-based login

The Login page provides separate **Farmer**, **Expert**, and **Admin** choices. All roles use the same email and password fields, and the backend checks that the account actually has the selected role. Public registration creates farmer accounts only. To prepare an expert or admin account for a demonstration, create the account normally, then assign `role: "expert"` and `expertProfile.isVerified: true` for the expert, or `role: "admin"` for the administrator through trusted database administration. Never let a public signup form assign privileged roles. After signing in, experts go to the review queue and admins go to Admin Tools.
