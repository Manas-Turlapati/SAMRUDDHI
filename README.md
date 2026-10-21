# SAMRUDDHI

Sustainable Agriculture Model for Resource Utilisation, Disease Diagnostics, and Health Initiative. Detect visible crop disease from a leaf image and receive targeted fertilizer guidance through one secure web application.

## Authentication configuration

Google sign-in uses Google Identity Services in the frontend and verifies the returned ID token in the backend. Set VITE_GOOGLE_CLIENT_ID in the frontend environment and the matching GOOGLE_CLIENT_ID in the backend environment. Add each local and deployed frontend origin to the OAuth client's authorized JavaScript origins.

Diagnosis PDFs can be downloaded and sent through WhatsApp. WhatsApp uses Twilio and requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, and `TWILIO_WHATSAPP_CONTENT_SID`. The Content SID must identify an active WhatsApp PDF media template in the same Twilio account or subaccount as `TWILIO_ACCOUNT_SID`; copy it from that account's Twilio Content Template Builder. The template media URL must be `https://your-api/api/predictions/delivery/{{1}}.pdf` and its body variables must be `{{2}}` for disease name and `{{3}}` for confidence. The public HTTPS backend URL in the template lets Twilio fetch short-lived signed PDF links. When using the deployed frontend, configure Twilio credentials in the deployed backend's environment and make sure the template media URL uses the deployed backend; the local `.env` does not change the deployed service. `REPORT_DELIVERY_SECRET` can be set to a dedicated signing key; otherwise `JWT_SECRET` is used. Location pins are only saved when the user opts in, and the map rounds coordinates before displaying them.
