# SAMRUDDHI

Sustainable Agriculture Model for Resource Utilisation, Disease Diagnostics, and Health Initiative. Detect visible crop disease from a leaf image and receive targeted fertilizer guidance through one secure web application.

## Authentication configuration

Google sign-in uses Google Identity Services in the frontend and verifies the returned ID token in the backend. Set VITE_GOOGLE_CLIENT_ID in the frontend environment and the matching GOOGLE_CLIENT_ID in the backend environment. Add each local and deployed frontend origin to the OAuth client's authorized JavaScript origins.

Diagnosis PDFs can be downloaded or shared from a supported mobile browser. The Share PDF action opens the device share menu; choose WhatsApp there and confirm the recipient. Location pins are only saved when the user opts in, and the map rounds coordinates before displaying them.
